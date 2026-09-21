import { Request, Response } from "express"
import mongoose from "mongoose"
import Product from "../models/Product"
import Category from "../models/Category"
import { getPagination } from "../utils/apiFeatures"
import { uploadToCloudinary } from "../utils/cloudinary"

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      price, 
      oldPrice, 
      description, 
      category, 
      subCategory, 
      code, 
      year, 
      session,
      semester,
      program,
      productType,
      rating, 
      reviews,
      isFeatured,
      inStock,
      fileUrl: bodyFileUrl
    } = req.body

    if (!category) {
      return res.status(400).json({ message: "Category is required" })
    }

    let image = ""
    let fileUrl = bodyFileUrl || ""

    // Check if files are uploaded via multer (single or fields)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    if (files) {
      if (files["image"] && files["image"][0]) {
        image = await uploadToCloudinary(files["image"][0].buffer, "ignoupower/images")
      }
      if (files["file"] && files["file"][0]) {
        fileUrl = await uploadToCloudinary(files["file"][0].buffer, "ignoupower/files")
      }
    } else if (req.file) {
      image = await uploadToCloudinary(req.file.buffer, "ignoupower/images")
    }

    const product = await Product.create({
      title,
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : 0,
      description,
      image,
      fileUrl,
      category,
      subCategory: subCategory || undefined,
      code: code ? code.toUpperCase() : "",
      year,
      session,
      semester,
      program: program ? program.toUpperCase() : "",
      productType: productType || "assignment",
      rating: rating ? Number(rating) : 5,
      reviews: reviews ? Number(reviews) : 0,
      isFeatured: isFeatured === true || isFeatured === "true",
      inStock: inStock === undefined || inStock === true || inStock === "true"
    })

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name")
      .populate("subCategory", "name")

    res.status(201).json(populatedProduct)
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error)
    res.status(500).json({ message: "Error creating product" })
  }
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const query: any = {};

    // 1. Search Query (title, description, code, or program)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { code: searchRegex },
        { program: searchRegex }
      ];
    }

    // 2. Category filter (can be comma-separated names or IDs)
    if (req.query.category) {
      const categoryList = (req.query.category as string)
        .split(",")
        .map(c => c.trim())
        .filter(Boolean);

      if (categoryList.length > 0) {
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

    // 3. SubCategory filter
    if (req.query.subCategory) {
      if (mongoose.Types.ObjectId.isValid(req.query.subCategory as string)) {
        query.subCategory = req.query.subCategory;
      } else {
        const subCat = await Category.findOne({ name: new RegExp(`^${req.query.subCategory}$`, "i") });
        if (subCat) {
          query.subCategory = subCat._id;
        }
      }
    }

    // 4. Year filter
    if (req.query.year) {
      const years = (req.query.year as string)
        .split(",")
        .map(y => y.trim())
        .filter(Boolean);
      if (years.length > 0) {
        query.year = { $in: years };
      }
    }

    // 5. Program filter (BCA, MCA, MBA, etc.)
    if (req.query.program) {
      const programs = (req.query.program as string)
        .split(",")
        .map(p => new RegExp(`^${p.trim()}$`, "i"))
        .filter(Boolean);
      if (programs.length > 0) {
        query.program = { $in: programs };
      }
    }

    // 6. Semester filter
    if (req.query.semester) {
      query.semester = new RegExp(req.query.semester as string, "i");
    }

    // 7. Product Type filter
    if (req.query.productType) {
      query.productType = req.query.productType;
    }

    // 8. Featured filter
    if (req.query.isFeatured !== undefined) {
      query.isFeatured = req.query.isFeatured === "true";
    }

    // 9. Price range filters
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) {
        query.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        query.price.$lte = Number(req.query.maxPrice);
      }
    }

    // 10. Sorting
    let sort: any = { createdAt: -1 };
    if (req.query.sortBy) {
      const sortBy = req.query.sortBy as string;
      if (sortBy === "priceAsc" || sortBy === "price_low") {
        sort = { price: 1 };
      } else if (sortBy === "priceDesc" || sortBy === "price_high") {
        sort = { price: -1 };
      } else if (sortBy === "rating") {
        sort = { rating: -1 };
      } else if (sortBy === "popular") {
        sort = { reviews: -1 };
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

export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ isFeatured: true })
      .populate("category", "name")
      .populate("subCategory", "name")
      .limit(10)
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error("GET FEATURED PRODUCTS ERROR:", error);
    return res.status(500).json({ message: "Error fetching featured products" });
  }
}

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }
    res.json({
      message: "Product deleted successfully"
    })
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error)
    return res.status(500).json({ message: "Error deleting product" })
  }
}

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      price, 
      oldPrice, 
      description, 
      category, 
      subCategory, 
      code, 
      year, 
      session,
      semester,
      program,
      productType,
      rating, 
      reviews,
      isFeatured,
      inStock,
      fileUrl: bodyFileUrl
    } = req.body

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let image = product.image
    let fileUrl = bodyFileUrl !== undefined ? bodyFileUrl : product.fileUrl

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    if (files) {
      if (files["image"] && files["image"][0]) {
        image = await uploadToCloudinary(files["image"][0].buffer, "ignoupower/images")
      }
      if (files["file"] && files["file"][0]) {
        fileUrl = await uploadToCloudinary(files["file"][0].buffer, "ignoupower/files")
      }
    } else if (req.file) {
      image = await uploadToCloudinary(req.file.buffer, "ignoupower/images")
    }

    product.title = title || product.title
    if (price !== undefined) product.price = Number(price)
    if (oldPrice !== undefined) product.oldPrice = Number(oldPrice)
    if (description !== undefined) product.description = description
    if (category) product.category = category
    if (subCategory !== undefined) product.subCategory = subCategory || undefined
    if (image) product.image = image
    if (fileUrl !== undefined) product.fileUrl = fileUrl
    if (code !== undefined) product.code = code.toUpperCase()
    if (year !== undefined) product.year = year
    if (session !== undefined) product.session = session
    if (semester !== undefined) product.semester = semester
    if (program !== undefined) product.program = program.toUpperCase()
    if (productType !== undefined) product.productType = productType
    if (rating !== undefined) product.rating = Number(rating)
    if (reviews !== undefined) product.reviews = Number(reviews)
    if (isFeatured !== undefined) product.isFeatured = isFeatured === true || isFeatured === "true"
    if (inStock !== undefined) product.inStock = inStock === true || inStock === "true"

    await product.save();
    
    const updated = await Product.findById(product._id)
      .populate("category", "name")
      .populate("subCategory", "name")

    res.json(updated);
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error)
    return res.status(500).json({ message: "Error updating product" })
  }
}

export const getSingleProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .populate("subCategory", "name")
      
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("GET SINGLE PRODUCT ERROR:", error)
    return res.status(500).json({ message: "Error fetching product" })
  }
}

