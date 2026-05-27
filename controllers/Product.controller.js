import ProductModel from "../models/Product.model.js";

const FetchProducts = (req,res) => {
    res.status(200).json({ message: "Products route is working!" });
}

export { FetchProducts };