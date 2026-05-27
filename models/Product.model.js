import mongoose from "mongoose";

const FeatureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const SpecSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const ImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
  },
  { _id: false },
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    model: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    company: { type: String, required: true, trim: true },
    brand: { type: String, default: "" },
    description: { type: String, required: true },
    shortDescription: { type: String, default: "" },
    category: { type: String, required: true },
    subCategories: { type: [String], default: [] },
    subCategory_1: { type: String, default: "" },
    subCategory_2: { type: String, default: "" },
    images: {
      type: [ImageSchema],
      default: [],
    },
    featuredImage: { type: String, default: "" },
    galleryImages: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    features: { type: [FeatureSchema], default: [] },
    specs: { type: [SpecSchema], default: [] },
    applications: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
    downloads: {
      manual: { type: String, default: "" },
      brochure: { type: String, default: "" },
      datasheet: { type: String, default: "" },
    },
    isFeatured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    tags: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("Product", ProductSchema);
