"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const promoController_1 = require("../controllers/promoController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
// Public / Student route to validate a promo code
router.post("/validate", promoController_1.validatePromoCode);
// Admin routes for promo code management & blocking/unblocking
router.get("/admin/all", authMiddleware_1.protect, adminMiddleware_1.adminOnly, promoController_1.getAllPromoCodesAdmin);
router.post("/admin/create", authMiddleware_1.protect, adminMiddleware_1.adminOnly, promoController_1.createPromoCodeAdmin);
router.put("/admin/:id/update", authMiddleware_1.protect, adminMiddleware_1.adminOnly, promoController_1.updatePromoCodeAdmin);
router.patch("/admin/:id/toggle-status", authMiddleware_1.protect, adminMiddleware_1.adminOnly, promoController_1.togglePromoCodeStatusAdmin);
router.put("/admin/:id/toggle-status", authMiddleware_1.protect, adminMiddleware_1.adminOnly, promoController_1.togglePromoCodeStatusAdmin);
router.delete("/admin/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, promoController_1.deletePromoCodeAdmin);
exports.default = router;
