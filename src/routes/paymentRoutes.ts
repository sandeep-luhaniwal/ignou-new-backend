import express from "express"
import { getPaymentHistory, getPaymentGraphAnalytics } from "../controllers/paymentController"
import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"

const router = express.Router()

// Payment analytics & graph API
router.get("/graph", protect, adminOnly, getPaymentGraphAnalytics)
router.get("/analytics", protect, adminOnly, getPaymentGraphAnalytics)

// Payment transaction history & embedded chart metrics
router.get("/history", protect, adminOnly, getPaymentHistory)
router.get("/admin", protect, adminOnly, getPaymentHistory)
router.get("/", protect, adminOnly, getPaymentHistory)

export default router
