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
const categoryController_1 = require("../controllers/categoryController");
const router = express_1.default.Router();
// Multer upload config for image, solved file, and sample/question paper fields
const productUpload = multer_1.upload.fields([
    { name: "image", maxCount: 1 },
    { name: "file", maxCount: 1 },
    { name: "assignmentPage", maxCount: 1 },
    { name: "assignment_page", maxCount: 1 },
    { name: "samplePage", maxCount: 1 },
    { name: "samplePdf", maxCount: 1 },
    { name: "sampleFile", maxCount: 1 },
    { name: "questionPaper", maxCount: 1 },
    { name: "questionPage", maxCount: 1 },
    { name: "questionPdf", maxCount: 1 },
    { name: "questionPaperPdf", maxCount: 1 },
    { name: "questionFile", maxCount: 1 }
]);
// Public routes
router.get("/filters", categoryController_1.getFilterOptions);
router.get("/featured", productController_1.getFeaturedProducts);
router.get("/", productController_1.getProducts);
router.get("/:id", productController_1.getSingleProduct);
// Admin protected routes
router.post("/", authMiddleware_1.protect, adminMiddleware_1.adminOnly, productUpload, productController_1.createProduct);
router.put("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, productUpload, productController_1.updateProduct);
router.patch("/:id/toggle-block", authMiddleware_1.protect, adminMiddleware_1.adminOnly, productController_1.toggleBlockProduct);
router.put("/:id/toggle-block", authMiddleware_1.protect, adminMiddleware_1.adminOnly, productController_1.toggleBlockProduct);
router.patch("/:id/block", authMiddleware_1.protect, adminMiddleware_1.adminOnly, productController_1.toggleBlockProduct);
router.delete("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, productController_1.deleteProduct);
exports.default = router;
