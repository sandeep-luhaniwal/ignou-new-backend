"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
// Payment analytics & graph API
router.get("/graph", authMiddleware_1.protect, adminMiddleware_1.adminOnly, paymentController_1.getPaymentGraphAnalytics);
router.get("/analytics", authMiddleware_1.protect, adminMiddleware_1.adminOnly, paymentController_1.getPaymentGraphAnalytics);
// Payment transaction history & embedded chart metrics
router.get("/history", authMiddleware_1.protect, adminMiddleware_1.adminOnly, paymentController_1.getPaymentHistory);
router.get("/admin", authMiddleware_1.protect, adminMiddleware_1.adminOnly, paymentController_1.getPaymentHistory);
router.get("/", authMiddleware_1.protect, adminMiddleware_1.adminOnly, paymentController_1.getPaymentHistory);
exports.default = router;
