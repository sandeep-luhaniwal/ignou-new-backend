import express from "express"
import { 
    createOrder, 
    validatePromo,
    getOrders, 
    getOrderById, 
    verifyPayment,
    downloadOrderItem,
    getAllOrdersAdmin,
    getHandwrittenOrdersAdmin,
    updateHandwrittenOrderAdmin,
    cancelAndRefundOrderAdmin,
    updateOrderStatusAdmin,
    deleteOrderAdmin
} from "../controllers/orderController"
import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"
import { upload } from "../config/multer"

const router = express.Router()

// Promo code verification route (Public / Authenticated)
router.post("/validate-promo", validatePromo)

// Student routes
router.post("/", protect, createOrder)
router.post("/verify", protect, verifyPayment)
router.get("/my-orders", protect, getOrders)
router.get("/", protect, getOrders)
router.get("/:id", protect, getOrderById)
router.get("/:id/download/:itemId", protect, downloadOrderItem)

// Admin routes
router.get("/admin/all", protect, adminOnly, getAllOrdersAdmin)
router.get("/admin/handwritten", protect, adminOnly, getHandwrittenOrdersAdmin)
router.put("/admin/:id/update-handwritten", protect, adminOnly, upload.array("images", 5), updateHandwrittenOrderAdmin)
router.post("/admin/:id/cancel-refund", protect, adminOnly, cancelAndRefundOrderAdmin)
router.put("/admin/:id/status", protect, adminOnly, updateOrderStatusAdmin)
router.delete("/admin/:id", protect, adminOnly, deleteOrderAdmin)

export default router


