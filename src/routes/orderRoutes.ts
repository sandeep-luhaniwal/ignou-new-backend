import express from "express"
import { createOrder, getOrders, getOrderById, verifyPayment } from "../controllers/orderController"
import { protect } from "../middleware/authMiddleware"

const router = express.Router()

router.post("/", protect, createOrder)
router.post("/verify", protect, verifyPayment)
router.get("/", protect, getOrders)
router.get("/:id", protect, getOrderById)

export default router
