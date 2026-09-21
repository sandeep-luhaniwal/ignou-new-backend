import express from "express"
import { 
  createQuery, 
  getQueries, 
  getQueryById, 
  updateQueryStatus, 
  deleteQuery 
} from "../controllers/queryController"
import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"

const router = express.Router()

// Public
router.post("/", createQuery)

// Admin
router.get("/", protect, adminOnly, getQueries)
router.get("/:id", protect, adminOnly, getQueryById)
router.put("/:id", protect, adminOnly, updateQueryStatus)
router.delete("/:id", protect, adminOnly, deleteQuery)

export default router
