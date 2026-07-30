"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const multer_1 = require("../config/multer");
const router = express_1.default.Router();
router.get("/", productController_1.getProducts);
router.get("/:id", productController_1.getSingleProduct);
router.post("/", authMiddleware_1.protect, adminMiddleware_1.adminOnly, multer_1.upload.single("image"), productController_1.createProduct);
router.put("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, productController_1.updateProduct);
router.delete("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, productController_1.deleteProduct);
exports.default = router;
