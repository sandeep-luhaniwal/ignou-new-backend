"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const multer_1 = require("../config/multer");
const router = express_1.default.Router();
// Promo code verification route (Public / Authenticated)
router.post("/validate-promo", orderController_1.validatePromo);
// Student routes
router.post("/", authMiddleware_1.protect, orderController_1.createOrder);
router.post("/verify", authMiddleware_1.protect, orderController_1.verifyPayment);
router.get("/my-orders", authMiddleware_1.protect, orderController_1.getOrders);
router.get("/", authMiddleware_1.protect, orderController_1.getOrders);
router.get("/:id", authMiddleware_1.protect, orderController_1.getOrderById);
router.get("/:id/download/:itemId", authMiddleware_1.protect, orderController_1.downloadOrderItem);
// Admin routes
router.get("/admin/all", authMiddleware_1.protect, adminMiddleware_1.adminOnly, orderController_1.getAllOrdersAdmin);
router.get("/admin/handwritten", authMiddleware_1.protect, adminMiddleware_1.adminOnly, orderController_1.getHandwrittenOrdersAdmin);
router.put("/admin/:id/update-handwritten", authMiddleware_1.protect, adminMiddleware_1.adminOnly, multer_1.upload.array("images", 5), orderController_1.updateHandwrittenOrderAdmin);
router.post("/admin/:id/cancel-refund", authMiddleware_1.protect, adminMiddleware_1.adminOnly, orderController_1.cancelAndRefundOrderAdmin);
router.put("/admin/:id/status", authMiddleware_1.protect, adminMiddleware_1.adminOnly, orderController_1.updateOrderStatusAdmin);
router.delete("/admin/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, orderController_1.deleteOrderAdmin);
exports.default = router;
