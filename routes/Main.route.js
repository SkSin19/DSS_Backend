import { Router } from "express";
import ProductRouter from "./Product.route.js";
import EnquiryRouter from "./Enquiry.route.js";
import ChatRouter from "./Chat.route.js";

const MainRouter = Router();

MainRouter.get("/health", (req,res) => {
  res.status(200).json({ message: "Server is healthy!" });
});

MainRouter.use(ProductRouter);
MainRouter.use(EnquiryRouter);
MainRouter.use(ChatRouter);

export default MainRouter;