import express from "express"
import {
  createProduct,
  getProducts,
  deleteProduct,
  updateProduct,
  getSingleProduct
} from "../controllers/productController"

import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"
import { upload } from "../config/multer"

const router = express.Router()

router.get("/", getProducts)

router.get("/:id", getSingleProduct)

router.post("/", protect, adminOnly, upload.single("image"), createProduct)

router.put("/:id", protect, adminOnly, upload.single("image"), updateProduct)

router.delete("/:id", protect, adminOnly, deleteProduct)

export default router