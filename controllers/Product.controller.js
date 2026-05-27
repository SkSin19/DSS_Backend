import mongoose from "mongoose";
import ProductModel from "../models/Product.model.js";

const ensureDatabaseReady = (res) => {
    if (mongoose.connection.readyState !== 1) {
        res.status(503).json({
            message: "MongoDB is not connected yet. Set MONGODB_URI in backend/.env to enable product fetching.",
        });

        return false;
    }

    return true;
};

const normalizeQueryValues = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const buildProductFilter = (query) => {
    const filter = {};

    const companyValues = normalizeQueryValues(query.company);
    const categoryValues = normalizeQueryValues(query.category);
    const subCategoryValues = normalizeQueryValues(query.subCategory || query.subCategories);

    if (companyValues.length === 1) {
        filter.company = companyValues[0];
    } else if (companyValues.length > 1) {
        filter.company = { $in: companyValues };
    }

    if (categoryValues.length === 1) {
        filter.category = categoryValues[0];
    } else if (categoryValues.length > 1) {
        filter.category = { $in: categoryValues };
    }

    if (subCategoryValues.length === 1) {
        filter.subCategories = subCategoryValues[0];
    } else if (subCategoryValues.length > 1) {
        filter.subCategories = { $in: subCategoryValues };
    }

    if (query.isFeatured === "true") {
        filter.isFeatured = true;
    }

    if (query.isBestSeller === "true") {
        filter.isBestSeller = true;
    }

    if (query.isActive === "false") {
        filter.isActive = false;
    } else {
        filter.isActive = true;
    }

    if (query.name) {
        filter.name = new RegExp(query.name, "i");
    }

    if (query.model) {
        filter.model = new RegExp(query.model, "i");
    }

    if (query.search) {
        const searchRegex = new RegExp(query.search, "i");
        filter.$or = [
            { name: searchRegex },
            { model: searchRegex },
            { company: searchRegex },
            { description: searchRegex },
            { shortDescription: searchRegex },
            { category: searchRegex },
            { subCategories: searchRegex },
            { tags: searchRegex },
        ];
    }

    return filter;
};

const FetchProducts = async (req, res) => {
    try {
        if (!ensureDatabaseReady(res)) {
            return;
        }

        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.max(Number(req.query.limit) || 20, 1);
        const skip = (page - 1) * limit;
        const filter = buildProductFilter(req.query);

        const [products, totalProducts] = await Promise.all([
            ProductModel.find(filter)
                .sort({ sortOrder: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ProductModel.countDocuments(filter),
        ]);

        return res.status(200).json({
            message: "Products fetched successfully.",
            products,
            pagination: {
                totalProducts,
                currentPage: page,
                totalPages: Math.ceil(totalProducts / limit),
                limit,
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch products.",
            error: error.message,
        });
    }
};

const FetchProductById = async (req, res) => {
    try {
        if (!ensureDatabaseReady(res)) {
            return;
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product id." });
        }

        const product = await ProductModel.findById(id).lean();

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        return res.status(200).json({
            message: "Product fetched successfully.",
            product,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch product.",
            error: error.message,
        });
    }
};

const FetchProductBySlug = async (req, res) => {
    try {
        if (!ensureDatabaseReady(res)) {
            return;
        }

        const { slug } = req.params;

        const product = await ProductModel.findOne({ slug }).lean();

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        return res.status(200).json({
            message: "Product fetched successfully.",
            product,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch product.",
            error: error.message,
        });
    }
};

export { FetchProducts, FetchProductById, FetchProductBySlug };