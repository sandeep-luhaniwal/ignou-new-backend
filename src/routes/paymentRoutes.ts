import express from "express"
import { getPaymentHistory } from "../controllers/paymentController"
import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"

const router = express.Router()

router.get("/history", protect, adminOnly, getPaymentHistory)
router.get("/admin", protect, adminOnly, getPaymentHistory)
router.get("/", protect, adminOnly, getPaymentHistory)

export default router
