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
      isBlocked,
      fileUrl: bodyFileUrl,
      questionPaperUrl: bodyQuestionPaperUrl,
      questionPageUrl: bodyQuestionPageUrl,
      questionPaper: bodyQuestionPaper,
      questionPdf: bodyQuestionPdf,
      image: bodyImage
    } = req.body

    if (!category || category === "null" || category === "undefined" || category === "") {
      return res.status(400).json({ message: "Category is required" })
    }

    const catId = typeof category === "object" && category._id ? category._id : category
    if (!mongoose.Types.ObjectId.isValid(catId)) {
      return res.status(400).json({ message: "Invalid Category ID" })
    }

    let validSubCategory: any = undefined
    if (subCategory && subCategory !== "null" && subCategory !== "undefined" && subCategory !== "none" && subCategory !== "") {
      const subCatId = typeof subCategory === "object" && subCategory._id ? subCategory._id : subCategory
      if (mongoose.Types.ObjectId.isValid(subCatId)) {
        validSubCategory = subCatId
      }
    }

    let image = bodyImage || ""
    let fileUrl = bodyFileUrl || ""
    let questionPaperUrl = bodyQuestionPaperUrl || bodyQuestionPageUrl || bodyQuestionPaper || bodyQuestionPdf || ""

    // Check if files are uploaded via multer (single or fields)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    if (files) {
      if (files["image"] && files["image"][0]) {
        image = await uploadToCloudinary(files["image"][0].buffer, "ignoupower/images")
      }
      if (files["file"] && files["file"][0]) {
        fileUrl = await uploadToCloudinary(files["file"][0].buffer, "ignoupower/files")
      }
      const qFile = 
        files["assignmentPage"]?.[0] || 
        files["assignment_page"]?.[0] || 
        files["samplePage"]?.[0] || 
        files["samplePdf"]?.[0] || 
        files["sampleFile"]?.[0] || 
        files["questionPaper"]?.[0] || 
        files["questionPage"]?.[0] || 
        files["questionPdf"]?.[0] || 
        files["questionPaperPdf"]?.[0] || 
        files["questionFile"]?.[0]
      if (qFile) {
        questionPaperUrl = await uploadToCloudinary(qFile.buffer, "ignoupower/question_papers")
      }
    } else if (req.file) {
      image = await uploadToCloudinary(req.file.buffer, "ignoupower/images")
    }

    let normalizedProductType = "assignment"
    if (productType) {
      const pt = String(productType).toLowerCase().trim()
      if (["assignment", "handwritten", "project", "synopsis", "ebook", "guide"].includes(pt)) {
        normalizedProductType = pt
      } else if (pt.includes("project") || pt.includes("synopsis")) {
        normalizedProductType = "project"
      } else if (pt.includes("handwritten")) {
        normalizedProductType = "handwritten"
      } else if (pt.includes("guide") || pt.includes("ebook")) {
        normalizedProductType = "guide"
      }
    }

    const product = await Product.create({
      title: title || "",
      price: price !== undefined && price !== "" && !isNaN(Number(price)) ? Number(price) : 0,
      oldPrice: oldPrice !== undefined && oldPrice !== "" && !isNaN(Number(oldPrice)) ? Number(oldPrice) : 0,
      description: description || "",
      image,
      fileUrl,
      questionPaperUrl,
      questionPageUrl: questionPaperUrl,
      category: catId,
      subCategory: validSubCategory,
      code: code ? String(code).trim().toUpperCase() : "",
      year: year ? String(year).trim() : "",
      session: session ? String(session).trim() : "",
      semester: semester ? String(semester).trim() : "",
      program: program ? String(program).trim().toUpperCase() : "",
      productType: normalizedProductType as any,
      rating: rating !== undefined && rating !== "" && !isNaN(Number(rating)) ? Number(rating) : 5,
      reviews: reviews !== undefined && reviews !== "" && !isNaN(Number(reviews)) ? Number(reviews) : 0,
      isFeatured: isFeatured === true || isFeatured === "true",
      inStock: inStock === undefined || inStock === true || inStock === "true",
      isBlocked: isBlocked === true || isBlocked === "true"
    })

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name")
      .populate("subCategory", "name")

    res.status(201).json(populatedProduct)
  } catch (error: any) {
    console.error("CREATE PRODUCT ERROR:", error)
    res.status(500).json({ message: "Error creating product", error: error?.message || "Internal server error" })
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

    // 8.1 Blocked / Active filter
    if (req.query.isBlocked !== undefined) {
      query.isBlocked = req.query.isBlocked === "true";
    } else if (req.query.status === "blocked") {
      query.isBlocked = true;
    } else if (req.query.status === "active") {
      query.isBlocked = { $ne: true };
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
      .select("-fileUrl")
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
  } catch (error: any) {
    console.error("GET PRODUCTS ERROR:", error);
    return res.status(500).json({ message: "Error fetching products", error: error?.message || "Internal server error" });
  }
}

export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ isFeatured: true, isBlocked: { $ne: true } })
      .select("-fileUrl")
      .populate("category", "name")
      .populate("subCategory", "name")
      .limit(10)
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error: any) {
    console.error("GET FEATURED PRODUCTS ERROR:", error);
    return res.status(500).json({ message: "Error fetching featured products", error: error?.message || "Internal server error" });
  }
}

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = await Product.findByIdAndDelete(id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }
    res.json({
      message: "Product deleted successfully"
    })
  } catch (error: any) {
    console.error("DELETE PRODUCT ERROR:", error)
    return res.status(500).json({ message: "Error deleting product", error: error?.message || "Internal server error" })
  }
}

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
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
      isBlocked,
      fileUrl: bodyFileUrl,
      questionPaperUrl: bodyQuestionPaperUrl,
      questionPageUrl: bodyQuestionPageUrl,
      questionPaper: bodyQuestionPaper,
      questionPdf: bodyQuestionPdf,
      image: bodyImage
    } = req.body

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let image = product.image
    let fileUrl = bodyFileUrl !== undefined ? bodyFileUrl : product.fileUrl
    let questionPaperUrl = bodyQuestionPaperUrl !== undefined
      ? bodyQuestionPaperUrl
      : (bodyQuestionPageUrl !== undefined
          ? bodyQuestionPageUrl
          : (bodyQuestionPaper !== undefined
              ? bodyQuestionPaper
              : (bodyQuestionPdf !== undefined
                  ? bodyQuestionPdf
                  : (product.questionPaperUrl || product.questionPageUrl || ""))))

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    if (files) {
      if (files["image"] && files["image"][0]) {
        image = await uploadToCloudinary(files["image"][0].buffer, "ignoupower/images")
      }
      if (files["file"] && files["file"][0]) {
        fileUrl = await uploadToCloudinary(files["file"][0].buffer, "ignoupower/files")
      }
      const qFile = 
        files["assignmentPage"]?.[0] || 
        files["assignment_page"]?.[0] || 
        files["samplePage"]?.[0] || 
        files["samplePdf"]?.[0] || 
        files["sampleFile"]?.[0] || 
        files["questionPaper"]?.[0] || 
        files["questionPage"]?.[0] || 
        files["questionPdf"]?.[0] || 
        files["questionPaperPdf"]?.[0] || 
        files["questionFile"]?.[0]
      if (qFile) {
        questionPaperUrl = await uploadToCloudinary(qFile.buffer, "ignoupower/question_papers")
      }
    } else if (req.file) {
      image = await uploadToCloudinary(req.file.buffer, "ignoupower/images")
    } else if (bodyImage !== undefined && bodyImage !== "") {
      image = bodyImage
    }

    if (title !== undefined && title !== "") product.title = title
    if (price !== undefined && price !== "" && !isNaN(Number(price))) product.price = Number(price)
    if (oldPrice !== undefined && oldPrice !== "" && !isNaN(Number(oldPrice))) product.oldPrice = Number(oldPrice)
    if (description !== undefined) product.description = description
    
    if (category && category !== "null" && category !== "undefined" && category !== "") {
      const catId = typeof category === "object" && category._id ? category._id : category;
      if (mongoose.Types.ObjectId.isValid(catId)) {
        product.category = catId;
      }
    }

    if (subCategory !== undefined) {
      const subCatId = typeof subCategory === "object" && subCategory._id ? subCategory._id : subCategory;
      if (subCatId && subCatId !== "null" && subCatId !== "undefined" && subCatId !== "none" && subCatId !== "" && mongoose.Types.ObjectId.isValid(subCatId)) {
        product.subCategory = subCatId;
      } else {
        product.set("subCategory", undefined);
      }
    }

    if (image) product.image = image
    if (fileUrl !== undefined) product.fileUrl = fileUrl
    if (questionPaperUrl !== undefined) {
      product.questionPaperUrl = questionPaperUrl
      product.questionPageUrl = questionPaperUrl
    }
    if (code !== undefined) product.code = String(code).trim().toUpperCase()
    if (year !== undefined) product.year = String(year).trim()
    if (session !== undefined) product.session = String(session).trim()
    if (semester !== undefined) product.semester = String(semester).trim()
    if (program !== undefined) product.program = String(program).trim().toUpperCase()
    
    if (productType !== undefined && productType !== "") {
      const pt = String(productType).toLowerCase().trim()
      if (["assignment", "handwritten", "project", "synopsis", "ebook", "guide"].includes(pt)) {
        product.productType = pt as any
      } else if (pt.includes("project") || pt.includes("synopsis")) {
        product.productType = "project"
      } else if (pt.includes("handwritten")) {
        product.productType = "handwritten"
      } else if (pt.includes("guide") || pt.includes("ebook")) {
        product.productType = "guide"
      } else {
        product.productType = "assignment"
      }
    }

    if (rating !== undefined && rating !== "" && !isNaN(Number(rating))) product.rating = Number(rating)
    if (reviews !== undefined && reviews !== "" && !isNaN(Number(reviews))) product.reviews = Number(reviews)
    if (isFeatured !== undefined) product.isFeatured = isFeatured === true || isFeatured === "true"
    if (inStock !== undefined) product.inStock = inStock === true || inStock === "true"
    if (isBlocked !== undefined) product.isBlocked = isBlocked === true || isBlocked === "true"

    await product.save();
    
    const updated = await Product.findById(product._id)
      .populate("category", "name")
      .populate("subCategory", "name")

    res.json(updated);
  } catch (error: any) {
    console.error("UPDATE PRODUCT ERROR:", error)
    return res.status(500).json({ message: "Error updating product", error: error?.message || "Internal server error" })
  }
}

export const toggleBlockProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (req.body && req.body.isBlocked !== undefined) {
      product.isBlocked = req.body.isBlocked === true || req.body.isBlocked === "true";
    } else {
      product.isBlocked = !product.isBlocked;
    }

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name")
      .populate("subCategory", "name");

    res.json({
      message: product.isBlocked ? "Product blocked successfully" : "Product unblocked (activated) successfully",
      isBlocked: product.isBlocked,
      data: populatedProduct
    });
  } catch (error: any) {
    console.error("TOGGLE BLOCK PRODUCT ERROR:", error);
    return res.status(500).json({ message: "Error toggling product block status", error: error?.message || "Internal server error" });
  }
}

export const getSingleProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = await Product.findById(id)
      .select("-fileUrl")
      .populate("category", "name")
      .populate("subCategory", "name")
      
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error: any) {
    console.error("GET SINGLE PRODUCT ERROR:", error)
    return res.status(500).json({ message: "Error fetching product", error: error?.message || "Internal server error" })
  }
}

