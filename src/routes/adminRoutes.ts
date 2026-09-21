import express from "express"
import { getDashboardStats } from "../controllers/adminController"
import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"

const router = express.Router()

router.get("/stats", protect, adminOnly, getDashboardStats)

export default router
