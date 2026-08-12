import express from "express"
import { createQuery, getQueries } from "../controllers/queryController"
import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"

const router = express.Router()

router.post("/", createQuery)
router.get("/", protect, adminOnly, getQueries)

export default router
