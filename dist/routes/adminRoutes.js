"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
router.get("/stats", authMiddleware_1.protect, adminMiddleware_1.adminOnly, adminController_1.getDashboardStats);
router.get("/payments", authMiddleware_1.protect, adminMiddleware_1.adminOnly, paymentController_1.getPaymentHistory);
router.get("/payment-history", authMiddleware_1.protect, adminMiddleware_1.adminOnly, paymentController_1.getPaymentHistory);
exports.default = router;
