"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.getComments = exports.createComment = void 0;
const commentModel_1 = __importDefault(require("../models/commentModel"));
const server_1 = require("../server");
const createComment = async (req, res) => {
    try {
        const { productId, message } = req.body;
        if (!productId || !message) {
            return res.status(400).json({ message: "Product ID and message are required" });
        }
        const comment = await commentModel_1.default.create({
            product: productId,
            user: req.user._id,
            role: req.user.role,
            message
        });
        const populatedComment = await commentModel_1.default.findById(comment._id)
            .populate("user", "name email")
            .populate("product", "title");
        server_1.io.to(productId).emit("receive-comment", populatedComment);
        res.json(populatedComment);
    }
    catch (error) {
        console.log("CREATE COMMENT ERROR:", error);
        res.status(500).json({ message: "Error creating comment" });
    }
};
exports.createComment = createComment;
const getComments = async (req, res) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const query = { product: productId };
        const total = await commentModel_1.default.countDocuments(query);
        const comments = await commentModel_1.default.find(query)
            .populate("user", "name email")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        res.json({
            data: comments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.log("GET COMMENTS ERROR:", error);
        res.status(500).json({ message: "Error fetching comments" });
    }
};
exports.getComments = getComments;
const deleteComment = async (req, res) => {
    try {
        const comment = await commentModel_1.default.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }
        if (comment.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }
        await commentModel_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Comment deleted" });
    }
    catch (error) {
        console.log("DELETE COMMENT ERROR:", error);
        res.status(500).json({ message: "Error deleting comment" });
    }
};
exports.deleteComment = deleteComment;
