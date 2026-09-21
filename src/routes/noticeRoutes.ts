import express from "express"
import {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice
} from "../controllers/noticeController"
import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"

const router = express.Router()

// Public
router.get("/", getNotices)
router.get("/:id", getNoticeById)

// Admin Protected
router.post("/", protect, adminOnly, createNotice)
router.put("/:id", protect, adminOnly, updateNotice)
router.delete("/:id", protect, adminOnly, deleteNotice)

export default router
