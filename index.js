import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import MainRouter from './routes/Main.route.js';
import connectMongoDB from './db/MongoDB.js';

dotenv.config({ path: './.env' });

const app = express();
const port = process.env.PORT || 3001;

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use("/api/v1", MainRouter);

const startServer = async () => {
  try {
    await connectMongoDB();

    // app.listen(port, () => {
    app.listen(port, '127.0.0.1', () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
};

startServer();