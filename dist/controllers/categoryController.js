"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSingleCategory = exports.getChooseCategories = exports.getSubCategories = exports.getCategories = exports.createSubCategory = exports.createCategory = void 0;
const Category_1 = __importDefault(require("../models/Category"));
const apiFeatures_1 = require("../utils/apiFeatures");
const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const existingCategory = await Category_1.default.findOne({ name: name.toLowerCase() });
        if (existingCategory) {
            return res.status(400).json({
                message: "Category already exists"
            });
        }
        const category = await Category_1.default.create({
            name
        });
        const result = category.toObject();
        delete result.parent;
        res.json(category);
    }
    catch (error) {
        return res.status(500).json({ message: "Error creating category" });
    }
};
exports.createCategory = createCategory;
const createSubCategory = async (req, res) => {
    try {
        const { name, categoryId } = req.body;
        if (!name || !categoryId) {
            return res.status(400).json({
                message: "name and categoryId required"
            });
        }
        const existing = await Category_1.default.findOne({
            name: name.toLowerCase(),
            parent: categoryId
        });
        if (existing) {
            return res.status(400).json({
                message: "Sub category already exists"
            });
        }
        const subCategory = await Category_1.default.create({
            name: name.toLowerCase(),
            parent: categoryId
        });
        res.json(subCategory);
    }
    catch (error) {
        console.log("CREATE SUBCATEGORY ERROR:", error);
        return res.status(500).json({ message: "Error creating sub category" });
    }
};
exports.createSubCategory = createSubCategory;
// export const getCategories = async (req: Request, res: Response) => {
//     try {
//         const categories = await Category.find({ parent: null })
//         res.json(categories)
//     } catch (error) {
//         return res.status(500).json({ message: "Error fetching categories" })
//     }
// }
const getCategories = async (req, res) => {
    try {
        const { page, limit, skip } = (0, apiFeatures_1.getPagination)(req.query);
        const searchQuery = (0, apiFeatures_1.getSearch)(req.query, "name");
        const query = {
            parent: null,
            ...searchQuery
        };
        const total = await Category_1.default.countDocuments(query);
        const categories = await Category_1.default.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
        res.json({
            data: categories,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Error fetching categories" });
    }
};
exports.getCategories = getCategories;
const getSubCategories = async (req, res) => {
    try {
        const { page, limit, skip } = (0, apiFeatures_1.getPagination)(req.query);
        const total = await Category_1.default.countDocuments({ parent: null });
        const subcategories = await Category_1.default.aggregate([
            {
                $match: {
                    parent: null
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "parent",
                    as: "subCategories"
                }
            },
            {
                $project: {
                    name: 1,
                    subCategories: {
                        $map: {
                            input: "$subCategories",
                            as: "sub",
                            in: {
                                _id: "$$sub._id",
                                name: "$$sub.name"
                            }
                        }
                    }
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);
        res.json({
            data: subcategories,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Error fetching sub categories" });
    }
};
exports.getSubCategories = getSubCategories;
const getChooseCategories = async (req, res) => {
    try {
        const categories = await Category_1.default.aggregate([
            {
                $match: {
                    parent: null
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "parent",
                    as: "subCategories"
                }
            },
            {
                $project: {
                    name: 1,
                    subCategories: {
                        $map: {
                            input: "$subCategories",
                            as: "sub",
                            in: {
                                _id: "$$sub._id",
                                name: "$$sub.name"
                            }
                        }
                    }
                }
            }
        ]);
        res.json({
            data: categories
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Error fetching sub categories" });
    }
};
exports.getChooseCategories = getChooseCategories;
const getSingleCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findById(req.params.id);
        if (!category) {
            return res.status(404).json({
                message: "Category not found"
            });
        }
        res.json({
            data: category
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error fetching category"
        });
    }
};
exports.getSingleCategory = getSingleCategory;
