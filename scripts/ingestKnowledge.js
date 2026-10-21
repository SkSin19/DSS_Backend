/**
 * Builds the AI assistant's knowledge base and stores it (with embeddings) in
 * MongoDB. Re-run whenever products, blog posts or data/knowledge.md change:
 *
 *   npm run ingest:knowledge
 *
 * Only new or changed chunks are re-embedded, so re-runs are cheap.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import KnowledgeChunk from "../models/KnowledgeChunk.model.js";
import { embedTexts } from "../lib/gemini.js";
import { vectorIndexDefinition, VECTOR_INDEX_NAME } from "../lib/retrieval.js";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, "../.env") });

// Blog posts live in the frontend repo; point this elsewhere if it moves.
const BLOG_SOURCE = process.env.BLOG_SOURCE_PATH || path.join(here, "../../dss/lib/blog.ts");

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const stripMarkdown = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "");
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s);

const knowledgeChunks = () => {
  const raw = fs.readFileSync(path.join(here, "../data/knowledge.md"), "utf8");
  return raw
    .split(/^## /m)
    .slice(1)
    .map((section) => {
      const [heading, ...body] = section.split("\n");
      return {
        key: `knowledge:${slugify(heading)}`,
        source: "knowledge",
        title: heading.trim(),
        url: "",
        text: body.join("\n").trim(),
      };
    });
};

const productChunks = async () => {
  const products = await Product.find({ isActive: { $ne: false } }).lean();
  return products.map((p) => {
    const specs = (p.specs || []).slice(0, 10).map((s) => `${s.label}: ${s.value.replace(/\s*\|\s*/g, ", ")}`);
    const lines = [
      `${p.name} (model ${p.model}) by ${p.company}. Category: ${[p.category, ...(p.subCategories || [])].filter(Boolean).join(" / ")}.`,
      p.shortDescription || p.description,
      p.highlights?.length ? `Highlights: ${p.highlights.join("; ")}.` : "",
      specs.length ? `Key specifications: ${specs.join("; ")}.` : "",
      p.applications?.length ? `Best for: ${p.applications.join(", ")}.` : "",
    ];
    return {
      key: `product:${p.slug}`,
      source: "product",
      title: `${p.name} ${p.model}`.trim(),
      url: `/products/${p.slug}`,
      text: clip(lines.filter(Boolean).join("\n"), 1800),
    };
  });
};

const blockText = (block) => {
  switch (block.type) {
    case "p":
    case "tip":
      return stripMarkdown(block.text);
    case "ul":
    case "ol":
      return block.items.map((i) => `- ${stripMarkdown(i)}`).join("\n");
    case "table":
      return [block.head, ...block.rows].map((r) => r.map(stripMarkdown).join(" | ")).join("\n");
    default:
      return "";
  }
};

const blogChunks = async () => {
  if (!fs.existsSync(BLOG_SOURCE)) {
    console.warn(`Blog source not found at ${BLOG_SOURCE}; skipping blog posts.`);
    return [];
  }
  const { BLOG_POSTS } = await import(pathToFileURL(BLOG_SOURCE).href);
  const chunks = [];
  for (const post of BLOG_POSTS) {
    // One chunk per h2 section (the intro counts as its own section).
    let section = { heading: "Introduction", parts: [] };
    const flush = () => {
      if (!section.parts.length) return;
      chunks.push({
        key: `blog:${post.slug}:${slugify(section.heading)}`,
        source: "blog",
        title: `${post.title} — ${section.heading}`,
        url: `/blogs/${post.slug}`,
        text: clip(section.parts.join("\n"), 2500),
      });
    };
    for (const block of post.content) {
      if (block.type === "h2") {
        flush();
        section = { heading: block.text, parts: [] };
      } else {
        const text = block.type === "h3" ? `${block.text}:` : blockText(block);
        if (text) section.parts.push(text);
      }
    }
    flush();
    if (post.faqs?.length) {
      chunks.push({
        key: `blog:${post.slug}:faqs`,
        source: "blog",
        title: `${post.title} — FAQs`,
        url: `/blogs/${post.slug}`,
        text: post.faqs.map((f) => `Q: ${f.q}\nA: ${stripMarkdown(f.a)}`).join("\n"),
      });
    }
  }
  return chunks;
};

const ensureVectorIndex = async () => {
  const collection = KnowledgeChunk.collection;
  try {
    const existing = await collection.listSearchIndexes(VECTOR_INDEX_NAME).toArray();
    if (existing.length) {
      console.log(`Vector index "${VECTOR_INDEX_NAME}" already exists (${existing[0].status ?? "ok"}).`);
      return;
    }
    await collection.createSearchIndex(vectorIndexDefinition);
    console.log(`Created Atlas vector index "${VECTOR_INDEX_NAME}" (takes a minute to build).`);
  } catch (error) {
    console.warn(`Could not create Atlas vector index (${error.message}). The chat will use in-memory search instead.`);
  }
};

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const chunks = [...knowledgeChunks(), ...(await productChunks()), ...(await blogChunks())].map((c) => ({
    ...c,
    hash: crypto.createHash("sha1").update(`${c.title}\n${c.text}`).digest("hex"),
  }));
  console.log(`Built ${chunks.length} chunks.`);

  const existing = new Map(
    (await KnowledgeChunk.find({}, { key: 1, hash: 1 }).lean()).map((c) => [c.key, c.hash]),
  );
  const changed = chunks.filter((c) => existing.get(c.key) !== c.hash);
  console.log(`${changed.length} new or changed chunks to embed.`);

  // Saved batch by batch, so an interrupted run picks up where it stopped.
  const BATCH = 90;
  for (let i = 0; i < changed.length; i += BATCH) {
    const batch = changed.slice(i, i + BATCH);
    const vectors = await embedTexts(batch.map((c) => `${c.title}\n${c.text}`), "RETRIEVAL_DOCUMENT", { retries: 5 });
    await KnowledgeChunk.bulkWrite(
      batch.map((c, j) => ({
        updateOne: { filter: { key: c.key }, update: { $set: { ...c, embedding: vectors[j] } }, upsert: true },
      })),
    );
    console.log(`Embedded ${Math.min(i + BATCH, changed.length)}/${changed.length}`);
  }

  const removed = await KnowledgeChunk.deleteMany({ key: { $nin: chunks.map((c) => c.key) } });
  if (removed.deletedCount) console.log(`Removed ${removed.deletedCount} stale chunks.`);

  await ensureVectorIndex();
  await mongoose.disconnect();
  console.log("Knowledge base is up to date.");
};

main().catch(async (error) => {
  console.error("Ingest failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
