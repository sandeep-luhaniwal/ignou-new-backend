import { Request, Response } from "express"
import mongoose from "mongoose"
import Product from "../models/Product"
import Category from "../models/Category"
import { getPagination } from "../utils/apiFeatures"

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { title, price, oldPrice, description, category, subCategory, code, year, rating, reviews } = req.body

    if (!category) {
      return res.status(400).json({ message: "Category is required" })
    }

    const image = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : ""
    const product = await Product.create({
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
    })
    res.json(product)
  } catch (error) {
    console.log("CREATE PRODUCT ERROR:", error)
    res.status(500).json({ message: "Error creating product" })
  }
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const query: any = {};

    // 1. Search Query (on title, description, or code)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { code: searchRegex }
      ];
    }

    // 2. Category filter (can be comma-separated names or IDs)
    if (req.query.category) {
      const categoryList = (req.query.category as string)
        .split(",")
        .map(c => c.trim())
        .filter(Boolean);

      if (categoryList.length > 0) {
        // Try finding category IDs by name first (case-insensitive) or by direct ID
        const categories = await Category.find({
          $or: [
            { name: { $in: categoryList.map(name => new RegExp(`^${name}$`, "i")) } },
            { _id: { $in: categoryList.filter(id => mongoose.Types.ObjectId.isValid(id)) } }
          ]
        });
        const categoryIds = categories.map(c => c._id);
        query.category = { $in: categoryIds };
      }
    }

    // 3. Year filter (comma-separated, e.g., "2024-25,2025-26")
    if (req.query.year) {
      const years = (req.query.year as string)
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
    let sort: any = { createdAt: -1 };
    if (req.query.sortBy) {
      const sortBy = req.query.sortBy as string;
      if (sortBy === "priceAsc") {
        sort = { price: 1 };
      } else if (sortBy === "priceDesc") {
        sort = { price: -1 };
      } else if (sortBy === "rating") {
        sort = { rating: -1 };
      } else if (sortBy === "newest") {
        sort = { createdAt: -1 };
      }
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
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
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);
    return res.status(500).json({ message: "Error fetching products" });
  }
}

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    await Product.findByIdAndDelete(req.params.id)
    res.json({
      message: "Product deleted"
    })
  } catch (error) {
    return res.status(500).json({ message: "Error deleting product" })
  }
}

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { title, price, oldPrice, description, category, subCategory, code, year, rating, reviews } = req.body
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const image = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : product.image
    product.title = title || product.title
    product.price = price || product.price
    product.oldPrice = oldPrice !== undefined ? oldPrice : product.oldPrice
    product.description = description || product.description
    product.category = category || product.category
    product.subCategory = subCategory || product.subCategory
    product.image = image
    product.code = code || product.code
    product.year = year || product.year
    product.rating = rating !== undefined ? rating : product.rating
    product.reviews = reviews !== undefined ? reviews : product.reviews
    await product.save();
    res.json(product);

  } catch (error) {
    return res.status(500).json({ message: "Error updating product" })
  }
}

export const getSingleProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name").populate("subCategory", "name")
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching product" })
  }
}

