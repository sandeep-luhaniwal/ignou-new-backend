import { Request, Response } from "express"
import Category from "../models/Category"
import { getPagination, getSearch } from "../utils/apiFeatures";

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;

        const existingCategory = await Category.findOne({ name: name.toLowerCase() })
        if (existingCategory) {
            return res.status(400).json({
                message: "Category already exists"
            })
        }

        const category = await Category.create({
            name
        })
        const result = category.toObject()

        delete result.parent
        res.json(category);

    } catch (error) {
        return res.status(500).json({ message: "Error creating category" })
    }
}

export const createSubCategory = async (req: Request, res: Response) => {
    try {
        const { name, categoryId } = req.body
        if (!name || !categoryId) {
            return res.status(400).json({
                message: "name and categoryId required"
            })
        }
        const existing = await Category.findOne({
            name: name.toLowerCase(),
            parent: categoryId
        })

        if (existing) {
            return res.status(400).json({
                message: "Sub category already exists"
            })
        }
        const subCategory = await Category.create({
            name: name.toLowerCase(),
            parent: categoryId
        })

        res.json(subCategory)
    } catch (error) {
        console.log("CREATE SUBCATEGORY ERROR:", error)
        return res.status(500).json({ message: "Error creating sub category" })
    }
}


// export const getCategories = async (req: Request, res: Response) => {
//     try {
//         const categories = await Category.find({ parent: null })
//         res.json(categories)
//     } catch (error) {
//         return res.status(500).json({ message: "Error fetching categories" })
//     }
// }
export const getCategories = async (req: Request, res: Response) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const searchQuery = getSearch(req.query, "name");
        const query = {
            parent: null,
            ...searchQuery
        }
        const total = await Category.countDocuments(query)
        const categories = await Category.find(query).skip(skip).limit(limit).sort({ createdAt: -1 })

        res.json({
            data: categories,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })


    } catch (error) {
        return res.status(500).json({ message: "Error fetching categories" })
    }
}

export const getSubCategories = async (req: Request, res: Response) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const total = await Category.countDocuments({ parent: null });
        const subcategories = await Category.aggregate([
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
        ])
        res.json({
            data: subcategories,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        return res.status(500).json({ message: "Error fetching sub categories" })
    }
}


export const getChooseCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Category.aggregate([
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
        ])
        res.json({
            data: categories
        })
    } catch (error) {
        return res.status(500).json({ message: "Error fetching sub categories" })
    }
}

export const getAllCategoriesList = async (req: Request, res: Response) => {
    try {
        const categories = await Category.find().populate("parent", "name").sort({ name: 1 })
        res.json(categories)
    } catch (error) {
        return res.status(500).json({ message: "Error fetching categories list" })
    }
}

export const getSingleCategory = async (req: Request, res: Response) => {
    try {
        const category = await Category.findById(req.params.id).populate("parent", "name")
        if (!category) {
            return res.status(404).json({
                message: "Category not found"
            })
        }

        res.json({
            data: category
        })
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching category"
        })
    }
}

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { name } = req.body
        if (!name) {
            return res.status(400).json({ message: "Name is required" })
        }

        const category = await Category.findById(req.params.id)
        if (!category) {
            return res.status(404).json({ message: "Category not found" })
        }

        category.name = name.toLowerCase().trim()
        await category.save()

        res.json({
            message: "Category updated successfully",
            category
        })
    } catch (error) {
        console.error("UPDATE CATEGORY ERROR:", error)
        return res.status(500).json({ message: "Error updating category" })
    }
}

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const category = await Category.findById(req.params.id)
        if (!category) {
            return res.status(404).json({ message: "Category not found" })
        }

        // Delete all subcategories if this is a parent category
        await Category.deleteMany({ parent: category._id })
        await Category.findByIdAndDelete(category._id)

        res.json({
            message: "Category and associated subcategories deleted successfully"
        })
    } catch (error) {
        console.error("DELETE CATEGORY ERROR:", error)
        return res.status(500).json({ message: "Error deleting category" })
    }
}

export const getFilterOptions = async (req: Request, res: Response) => {
    try {
        // 1. Get distinct programs with product counts
        const subCategories = await Category.find({ parent: { $ne: null } })
        
        const Product = (await import("../models/Product")).default
        const programCounts = await Product.aggregate([
            { $match: { program: { $exists: true, $ne: "" } } },
            { $group: { _id: "$program", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ])

        const programDisplayNames: { [key: string]: string } = {
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
        }

        const defaultPrograms = ["BCA", "MCA", "MBA", "BAG", "BCOMG", "BSCG", "MCOM", "MEG"]
        const programMap = new Map<string, { code: string; name: string; count: number }>()

        // Initialize default programs
        defaultPrograms.forEach(p => {
            const code = p.toUpperCase()
            programMap.set(code, {
                code,
                name: programDisplayNames[code] || `${code} Programs`,
                count: 0
            })
        })

        // Add subcategories
        subCategories.forEach(sub => {
            const code = sub.name.toUpperCase()
            if (!programMap.has(code)) {
                programMap.set(code, {
                    code,
                    name: programDisplayNames[code] || `${code} Programs`,
                    count: 0
                })
            }
        })

        // Update counts from Product database
        programCounts.forEach(p => {
            const code = p._id ? p._id.toString().toUpperCase() : ""
            if (code) {
                if (programMap.has(code)) {
                    const item = programMap.get(code)!
                    item.count = p.count
                } else {
                    programMap.set(code, {
                        code,
                        name: programDisplayNames[code] || `${code} Programs`,
                        count: p.count
                    })
                }
            }
        })

        const programs = Array.from(programMap.values())

        // 2. Get distinct sessions / years with product counts
        const defaultYears = ["2025-26", "2024-25", "2023-24", "2022-23"]
        const yearCounts = await Product.aggregate([
            { $match: { year: { $exists: true, $ne: "" } } },
            { $group: { _id: "$year", count: { $sum: 1 } } }
        ])

        const yearCountMap = new Map<string, number>()
        yearCounts.forEach(y => {
            if (y._id) yearCountMap.set(y._id.toString(), y.count)
        })

        const sessions = defaultYears.map(year => ({
            year,
            label: `${year} Session`,
            count: yearCountMap.get(year) || 0
        }))

        // 3. Hierarchical Categories with Subcategories & count
        const categories = await Category.aggregate([
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
        ])

        // 4. Product types
        const typeCounts = await Product.aggregate([
            { $group: { _id: "$productType", count: { $sum: 1 } } }
        ])
        const typeMap = new Map<string, number>()
        typeCounts.forEach(t => {
            if (t._id) typeMap.set(t._id, t.count)
        })

        const productTypes = [
            { label: "Solved Assignments", value: "assignment", count: typeMap.get("assignment") || 0 },
            { label: "Handwritten Hardcopy", value: "handwritten", count: typeMap.get("handwritten") || 0 },
            { label: "Project & Synopsis", value: "project", count: typeMap.get("project") || 0 },
            { label: "Guide Books & E-Books", value: "guide", count: typeMap.get("guide") || 0 }
        ]

        res.json({
            programs,
            sessions,
            categories,
            productTypes
        })
    } catch (error) {
        console.error("GET FILTER OPTIONS ERROR:", error)
        return res.status(500).json({ message: "Error fetching filter options" })
    }
}