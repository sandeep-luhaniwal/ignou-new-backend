"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const categoryController_1 = require("../controllers/categoryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
// Public / Student endpoints
router.get("/filters", categoryController_1.getFilterOptions);
router.get("/filter-options", categoryController_1.getFilterOptions);
router.get("/", categoryController_1.getCategories);
router.get("/all", categoryController_1.getAllCategoriesList);
router.get("/sub", categoryController_1.getSubCategories);
router.get("/choosecategory", categoryController_1.getChooseCategories);
router.get("/:id", categoryController_1.getSingleCategory);
// Protected / Admin endpoints
router.post("/create", authMiddleware_1.protect, adminMiddleware_1.adminOnly, categoryController_1.createCategory);
router.post("/sub-create", authMiddleware_1.protect, adminMiddleware_1.adminOnly, categoryController_1.createSubCategory);
router.put("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, categoryController_1.updateCategory);
router.delete("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, categoryController_1.deleteCategory);
exports.default = router;
