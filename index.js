import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import MainRouter from './routes/Main.route.js';

dotenv.config({ path: './.env' });

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/v1", MainRouter);

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server is running on port ${process.env.PORT || 3001}`);
});