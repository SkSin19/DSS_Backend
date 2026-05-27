import { Router } from "express";
import { FetchProducts } from "../controllers/Product.controller";

const ProductRouter = Router();

ProductRouter.get("/fetch-products", FetchProducts);

export default ProductRouter;