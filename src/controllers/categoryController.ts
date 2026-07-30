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

export const getSingleCategory = async (req: Request, res: Response) => {
    try {
        const category = await Category.findById(req.params.id)
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