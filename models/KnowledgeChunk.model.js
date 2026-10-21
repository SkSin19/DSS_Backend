import mongoose from "mongoose";

// One searchable piece of the AI assistant's knowledge base.
const KnowledgeChunkSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "product:<slug>"
    source: { type: String, enum: ["product", "blog", "knowledge"], required: true },
    title: { type: String, required: true },
    url: { type: String, default: "" },
    text: { type: String, required: true },
    hash: { type: String, required: true }, // skips re-embedding unchanged text
    embedding: { type: [Number], required: true },
  },
  { timestamps: true },
);

export default mongoose.model("KnowledgeChunk", KnowledgeChunkSchema);
