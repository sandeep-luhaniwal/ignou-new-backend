import express from "express"
import {
  createProduct,
  getProducts,
  getFeaturedProducts,
  deleteProduct,
  updateProduct,
  toggleBlockProduct,
  getSingleProduct
} from "../controllers/productController"

import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"
import { upload } from "../config/multer"

import { getFilterOptions } from "../controllers/categoryController"

const router = express.Router()

// Multer upload config for image, solved file, and sample/question paper fields
const productUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
  { name: "assignmentPage", maxCount: 1 },
  { name: "assignment_page", maxCount: 1 },
  { name: "samplePage", maxCount: 1 },
  { name: "samplePdf", maxCount: 1 },
  { name: "sampleFile", maxCount: 1 },
  { name: "questionPaper", maxCount: 1 },
  { name: "questionPage", maxCount: 1 },
  { name: "questionPdf", maxCount: 1 },
  { name: "questionPaperPdf", maxCount: 1 },
  { name: "questionFile", maxCount: 1 }
])

// Public routes
router.get("/filters", getFilterOptions)
router.get("/featured", getFeaturedProducts)
router.get("/", getProducts)
router.get("/:id", getSingleProduct)

// Admin protected routes
router.post("/", protect, adminOnly, productUpload, createProduct)
router.put("/:id", protect, adminOnly, productUpload, updateProduct)
router.patch("/:id/toggle-block", protect, adminOnly, toggleBlockProduct)
router.put("/:id/toggle-block", protect, adminOnly, toggleBlockProduct)
router.patch("/:id/block", protect, adminOnly, toggleBlockProduct)
router.delete("/:id", protect, adminOnly, deleteProduct)

export default router