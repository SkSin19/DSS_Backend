import mongoose from "mongoose";

const connectMongoDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

  if (!mongoUri) {
    console.log(
      "MongoDB URI not configured. Product endpoints will return a setup message until a URI is provided.",
    );

    return false;
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");

  return true;
};

export default connectMongoDB;