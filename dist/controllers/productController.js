"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSingleProduct = exports.updateProduct = exports.deleteProduct = exports.getProducts = exports.createProduct = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = __importDefault(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
const apiFeatures_1 = require("../utils/apiFeatures");
const createProduct = async (req, res) => {
    try {
        const { title, price, oldPrice, description, category, subCategory, code, year, rating, reviews } = req.body;
        if (!category) {
            return res.status(400).json({ message: "Category is required" });
        }
        const image = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : "";
        const product = await Product_1.default.create({
            title,
            price,
            oldPrice,
            description,
            image,
            category,
            subCategory,
            code,
            year,
            rating,
            reviews
        });
        res.json(product);
    }
    catch (error) {
        console.log("CREATE PRODUCT ERROR:", error);
        res.status(500).json({ message: "Error creating product" });
    }
};
exports.createProduct = createProduct;
const getProducts = async (req, res) => {
    try {
        const { page, limit, skip } = (0, apiFeatures_1.getPagination)(req.query);
        const query = {};
        // 1. Search Query (on title, description, or code)
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, "i");
            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { code: searchRegex }
            ];
        }
        // 2. Category filter (can be comma-separated names or IDs)
        if (req.query.category) {
            const categoryList = req.query.category
                .split(",")
                .map(c => c.trim())
                .filter(Boolean);
            if (categoryList.length > 0) {
                // Try finding category IDs by name first (case-insensitive) or by direct ID
                const categories = await Category_1.default.find({
                    $or: [
                        { name: { $in: categoryList.map(name => new RegExp(`^${name}$`, "i")) } },
                        { _id: { $in: categoryList.filter(id => mongoose_1.default.Types.ObjectId.isValid(id)) } }
                    ]
                });
                const categoryIds = categories.map(c => c._id);
                query.category = { $in: categoryIds };
            }
        }
        // 3. Year filter (comma-separated, e.g., "2024-25,2025-26")
        if (req.query.year) {
            const years = req.query.year
                .split(",")
                .map(y => y.trim())
                .filter(Boolean);
            if (years.length > 0) {
                query.year = { $in: years };
            }
        }
        // 4. Price range filters
        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) {
                query.price.$gte = Number(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                query.price.$lte = Number(req.query.maxPrice);
            }
        }
        // 5. Sorting
        let sort = { createdAt: -1 };
        if (req.query.sortBy) {
            const sortBy = req.query.sortBy;
            if (sortBy === "priceAsc") {
                sort = { price: 1 };
            }
            else if (sortBy === "priceDesc") {
                sort = { price: -1 };
            }
            else if (sortBy === "rating") {
                sort = { rating: -1 };
            }
            else if (sortBy === "newest") {
                sort = { createdAt: -1 };
            }
        }
        const total = await Product_1.default.countDocuments(query);
        const products = await Product_1.default.find(query)
            .populate("category", "name")
            .populate("subCategory", "name")
            .skip(skip)
            .limit(limit)
            .sort(sort);
        res.json({
            data: products,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error("GET PRODUCTS ERROR:", error);
        return res.status(500).json({ message: "Error fetching products" });
    }
};
exports.getProducts = getProducts;
const deleteProduct = async (req, res) => {
    try {
        await Product_1.default.findByIdAndDelete(req.params.id);
        res.json({
            message: "Product deleted"
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Error deleting product" });
    }
};
exports.deleteProduct = deleteProduct;
const updateProduct = async (req, res) => {
    try {
        const { title, price, oldPrice, description, category, subCategory, code, year, rating, reviews } = req.body;
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        const image = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : product.image;
        product.title = title || product.title;
        product.price = price || product.price;
        product.oldPrice = oldPrice !== undefined ? oldPrice : product.oldPrice;
        product.description = description || product.description;
        product.category = category || product.category;
        product.subCategory = subCategory || product.subCategory;
        product.image = image;
        product.code = code || product.code;
        product.year = year || product.year;
        product.rating = rating !== undefined ? rating : product.rating;
        product.reviews = reviews !== undefined ? reviews : product.reviews;
        await product.save();
        res.json(product);
    }
    catch (error) {
        return res.status(500).json({ message: "Error updating product" });
    }
};
exports.updateProduct = updateProduct;
const getSingleProduct = async (req, res) => {
    try {
        const product = await Product_1.default.findById(req.params.id).populate("category", "name").populate("subCategory", "name");
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json(product);
    }
    catch (error) {
        return res.status(500).json({ message: "Error fetching product" });
    }
};
exports.getSingleProduct = getSingleProduct;
