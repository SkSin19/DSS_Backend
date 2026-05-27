import dotenv from "dotenv";
import connectMongoDB from "../db/MongoDB.js";
import ProductModel from "../models/Product.model.js";
import { PRODUCT_SEED_DATA } from "../data/products.seed.js";

dotenv.config({ path: "./.env" });

const seedProducts = async () => {
  try {
    const connected = await connectMongoDB();

    if (!connected) {
      console.error("MongoDB URI is not configured. Add MONGODB_URI to backend/.env before seeding.");
      process.exit(1);
    }

    await ProductModel.deleteMany({});
    const insertedProducts = await ProductModel.insertMany(PRODUCT_SEED_DATA);

    console.log(`Seeded ${insertedProducts.length} products successfully.`);
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seedProducts();
