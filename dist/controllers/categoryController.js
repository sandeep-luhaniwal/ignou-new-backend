"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilterOptions = exports.deleteCategory = exports.updateCategory = exports.getSingleCategory = exports.getAllCategoriesList = exports.getChooseCategories = exports.getSubCategories = exports.getCategories = exports.createSubCategory = exports.createCategory = void 0;
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
const getAllCategoriesList = async (req, res) => {
    try {
        const categories = await Category_1.default.find().populate("parent", "name").sort({ name: 1 });
        res.json(categories);
    }
    catch (error) {
        return res.status(500).json({ message: "Error fetching categories list" });
    }
};
exports.getAllCategoriesList = getAllCategoriesList;
const getSingleCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findById(req.params.id).populate("parent", "name");
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
const updateCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }
        const category = await Category_1.default.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        category.name = name.toLowerCase().trim();
        await category.save();
        res.json({
            message: "Category updated successfully",
            category
        });
    }
    catch (error) {
        console.error("UPDATE CATEGORY ERROR:", error);
        return res.status(500).json({ message: "Error updating category" });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        // Delete all subcategories if this is a parent category
        await Category_1.default.deleteMany({ parent: category._id });
        await Category_1.default.findByIdAndDelete(category._id);
        res.json({
            message: "Category and associated subcategories deleted successfully"
        });
    }
    catch (error) {
        console.error("DELETE CATEGORY ERROR:", error);
        return res.status(500).json({ message: "Error deleting category" });
    }
};
exports.deleteCategory = deleteCategory;
const getFilterOptions = async (req, res) => {
    try {
        // 1. Get distinct programs with product counts
        const subCategories = await Category_1.default.find({ parent: { $ne: null } });
        const Product = (await Promise.resolve().then(() => __importStar(require("../models/Product")))).default;
        const programCounts = await Product.aggregate([
            { $match: { program: { $exists: true, $ne: "" } } },
            { $group: { _id: "$program", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const programDisplayNames = {
            BCA: "BCA Programs",
            MCA: "MCA Programs",
            MBA: "MBA Programs",
            BAG: "BA Programs",
            BA: "BA Programs",
            BCOMG: "B.Com Programs",
            BCOM: "B.Com Programs",
            BSCG: "B.Sc Programs",
            BSC: "B.Sc Programs",
            MCOM: "M.Com Programs",
            MEG: "MA English Programs",
            MA: "MA Programs",
            PGDCA: "PGDCA Programs",
            DECE: "DECE Diploma"
        };
        const defaultPrograms = ["BCA", "MCA", "MBA", "BAG", "BCOMG", "BSCG", "MCOM", "MEG"];
        const programMap = new Map();
        // Initialize default programs
        defaultPrograms.forEach(p => {
            const code = p.toUpperCase();
            programMap.set(code, {
                code,
                name: programDisplayNames[code] || `${code} Programs`,
                count: 0
            });
        });
        // Add subcategories
        subCategories.forEach(sub => {
            const code = sub.name.toUpperCase();
            if (!programMap.has(code)) {
                programMap.set(code, {
                    code,
                    name: programDisplayNames[code] || `${code} Programs`,
                    count: 0
                });
            }
        });
        // Update counts from Product database
        programCounts.forEach(p => {
            const code = p._id ? p._id.toString().toUpperCase() : "";
            if (code) {
                if (programMap.has(code)) {
                    const item = programMap.get(code);
                    item.count = p.count;
                }
                else {
                    programMap.set(code, {
                        code,
                        name: programDisplayNames[code] || `${code} Programs`,
                        count: p.count
                    });
                }
            }
        });
        const programs = Array.from(programMap.values());
        // 2. Get distinct sessions / years with product counts
        const defaultYears = ["2025-26", "2024-25", "2023-24", "2022-23"];
        const yearCounts = await Product.aggregate([
            { $match: { year: { $exists: true, $ne: "" } } },
            { $group: { _id: "$year", count: { $sum: 1 } } }
        ]);
        const yearCountMap = new Map();
        yearCounts.forEach(y => {
            if (y._id)
                yearCountMap.set(y._id.toString(), y.count);
        });
        const sessions = defaultYears.map(year => ({
            year,
            label: `${year} Session`,
            count: yearCountMap.get(year) || 0
        }));
        // 3. Hierarchical Categories with Subcategories & count
        const categories = await Category_1.default.aggregate([
            { $match: { parent: null } },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "parent",
                    as: "subCategories"
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "category",
                    as: "products"
                }
            },
            {
                $project: {
                    name: 1,
                    displayName: {
                        $concat: [
                            { $toUpper: { $substrCP: ["$name", 0, 1] } },
                            { $substrCP: ["$name", 1, { $strLenCP: "$name" }] }
                        ]
                    },
                    count: { $size: "$products" },
                    subCategories: {
                        $map: {
                            input: "$subCategories",
                            as: "sub",
                            in: {
                                _id: "$$sub._id",
                                name: "$$sub.name",
                                displayName: {
                                    $concat: [{ $toUpper: "$$sub.name" }, " Programs"]
                                }
                            }
                        }
                    }
                }
            },
            { $sort: { name: 1 } }
        ]);
        // 4. Product types
        const typeCounts = await Product.aggregate([
            { $group: { _id: "$productType", count: { $sum: 1 } } }
        ]);
        const typeMap = new Map();
        typeCounts.forEach(t => {
            if (t._id)
                typeMap.set(t._id, t.count);
        });
        const productTypes = [
            { label: "Solved Assignments", value: "assignment", count: typeMap.get("assignment") || 0 },
            { label: "Handwritten Hardcopy", value: "handwritten", count: typeMap.get("handwritten") || 0 },
            { label: "Project & Synopsis", value: "project", count: typeMap.get("project") || 0 },
            { label: "Guide Books & E-Books", value: "guide", count: typeMap.get("guide") || 0 }
        ];
        res.json({
            programs,
            sessions,
            categories,
            productTypes
        });
    }
    catch (error) {
        console.error("GET FILTER OPTIONS ERROR:", error);
        return res.status(500).json({ message: "Error fetching filter options" });
    }
};
exports.getFilterOptions = getFilterOptions;
