import { Router } from "express";
import ProductRouter from "./Product.route.js";

const MainRouter = Router();

MainRouter.get("/health", (req,res) => {
  res.status(200).json({ message: "Server is healthy!" });
});

MainRouter.use(ProductRouter);

export default MainRouter;