import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    model: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    subCategory_1: { type: String, required: true },
    subCategory_2: { type: String, required: true },
    imageUrl: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Product", ProductSchema);
