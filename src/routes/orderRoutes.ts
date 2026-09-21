import express from "express"
import { 
    createOrder, 
    getOrders, 
    getOrderById, 
    verifyPayment,
    getAllOrdersAdmin,
    updateOrderStatusAdmin,
    deleteOrderAdmin
} from "../controllers/orderController"
import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"

const router = express.Router()

// Student routes
router.post("/", protect, createOrder)
router.post("/verify", protect, verifyPayment)
router.get("/my-orders", protect, getOrders)
router.get("/", protect, getOrders)
router.get("/:id", protect, getOrderById)

// Admin routes
router.get("/admin/all", protect, adminOnly, getAllOrdersAdmin)
router.put("/admin/:id/status", protect, adminOnly, updateOrderStatusAdmin)
router.delete("/admin/:id", protect, adminOnly, deleteOrderAdmin)

export default router

