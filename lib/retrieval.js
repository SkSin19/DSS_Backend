import KnowledgeChunk from "../models/KnowledgeChunk.model.js";
import { EMBED_DIMENSIONS } from "./gemini.js";

export const VECTOR_INDEX_NAME = "knowledge_vector_index";

export const vectorIndexDefinition = {
  name: VECTOR_INDEX_NAME,
  type: "vectorSearch",
  definition: {
    fields: [
      { type: "vector", path: "embedding", numDimensions: EMBED_DIMENSIONS, similarity: "cosine" },
      { type: "filter", path: "source" },
    ],
  },
};

const cosine = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
};

// In-memory fallback for when Atlas Vector Search isn't available (local
// MongoDB, or the index is still building). The knowledge base is a few
// hundred chunks, so brute-force cosine is fast enough.
let cache = { chunks: null, loadedAt: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000;

const loadChunks = async () => {
  if (!cache.chunks || Date.now() - cache.loadedAt > CACHE_TTL_MS) {
    cache = {
      chunks: await KnowledgeChunk.find({}, { key: 1, source: 1, title: 1, url: 1, text: 1, embedding: 1 }).lean(),
      loadedAt: Date.now(),
    };
  }
  return cache.chunks;
};

let atlasAvailable = true;

/** Returns the `limit` chunks most similar to the query vector. */
export const searchKnowledge = async (queryVector, limit = 6) => {
  if (atlasAvailable) {
    try {
      const results = await KnowledgeChunk.aggregate([
        {
          $vectorSearch: {
            index: VECTOR_INDEX_NAME,
            path: "embedding",
            queryVector,
            numCandidates: 100,
            limit,
          },
        },
        { $project: { source: 1, title: 1, url: 1, text: 1, score: { $meta: "vectorSearchScore" } } },
      ]);
      if (results.length) return results;
    } catch (error) {
      atlasAvailable = false;
      console.warn("Atlas Vector Search unavailable, using in-memory search:", error.message);
    }
  }

  const chunks = await loadChunks();
  return chunks
    .map(({ embedding, ...chunk }) => ({ ...chunk, score: cosine(queryVector, embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
