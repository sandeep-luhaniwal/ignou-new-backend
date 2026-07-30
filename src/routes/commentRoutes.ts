import express from "express"
import { createComment, getComments, deleteComment } from "../controllers/commentController"
import { protect } from "../middleware/authMiddleware"

const router = express.Router()

router.post("/", protect, createComment)
router.get("/:productId", getComments)
router.delete("/:id", protect, deleteComment)

export default router
