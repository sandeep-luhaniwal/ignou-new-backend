import express from "express"
import {
  validatePromoCode,
  getAllPromoCodesAdmin,
  createPromoCodeAdmin,
  updatePromoCodeAdmin,
  togglePromoCodeStatusAdmin,
  deletePromoCodeAdmin
} from "../controllers/promoController"
import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"

const router = express.Router()

// Public / Student route to validate a promo code
router.post("/validate", validatePromoCode)

// Admin routes for promo code management & blocking/unblocking
router.get("/admin/all", protect, adminOnly, getAllPromoCodesAdmin)
router.post("/admin/create", protect, adminOnly, createPromoCodeAdmin)
router.put("/admin/:id/update", protect, adminOnly, updatePromoCodeAdmin)
router.patch("/admin/:id/toggle-status", protect, adminOnly, togglePromoCodeStatusAdmin)
router.put("/admin/:id/toggle-status", protect, adminOnly, togglePromoCodeStatusAdmin)
router.delete("/admin/:id", protect, adminOnly, deletePromoCodeAdmin)

export default router
