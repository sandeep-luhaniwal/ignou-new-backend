import Comment from "../models/commentModel"
import { Request, Response } from "express"
import { io } from "../server"
import { AuthRequest } from "../middleware/authMiddleware"

export const createComment = async (req: AuthRequest, res: Response) => {
    try {
        const { productId, message } = req.body
        if (!productId || !message) {
            return res.status(400).json({ message: "Product ID and message are required" })
        }
        const comment = await Comment.create({
            product: productId,
            user: req.user._id,
            role: req.user.role,
            message
        })
        const populatedComment = await Comment.findById(comment._id)
            .populate("user", "name email")
            .populate("product", "title")
        
        io.to(productId).emit("receive-comment", populatedComment)
        res.json(populatedComment)
    } catch (error) {
        console.log("CREATE COMMENT ERROR:", error)
        res.status(500).json({ message: "Error creating comment" })
    }
}

export const getComments = async (req: Request | AuthRequest, res: Response) => {
    try {
        const { productId } = req.params
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const skip = (page - 1) * limit

        const query = { product: productId }
        const total = await Comment.countDocuments(query)
        const comments = await Comment.find(query)
            .populate("user", "name email")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })

        res.json({
            data: comments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.log("GET COMMENTS ERROR:", error)
        res.status(500).json({ message: "Error fetching comments" })
    }
}

export const deleteComment = async (req: AuthRequest, res: Response) => {
    try {
        const comment = await Comment.findById(req.params.id)
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" })
        }
        if (comment.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" })
        }
        await Comment.findByIdAndDelete(req.params.id)
        res.json({ message: "Comment deleted" })
    } catch (error) {
        console.log("DELETE COMMENT ERROR:", error)
        res.status(500).json({ message: "Error deleting comment" })
    }
}
