import { Router } from "express";
import { FetchProducts, FetchProductById, FetchProductBySlug } from "../controllers/Product.controller.js";

const ProductRouter = Router();

ProductRouter.get("/fetch-products", FetchProducts);
ProductRouter.get("/fetch-products/id/:id", FetchProductById);
ProductRouter.get("/fetch-products/slug/:slug", FetchProductBySlug);

export default ProductRouter;