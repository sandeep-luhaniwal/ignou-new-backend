"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const categoryController_1 = require("../controllers/categoryController");
const router = express_1.default.Router();
router.post("/create", categoryController_1.createCategory);
router.post("/sub-create", categoryController_1.createSubCategory);
router.get("/", categoryController_1.getCategories);
router.get("/sub", categoryController_1.getSubCategories);
router.get("/choosecategory", categoryController_1.getChooseCategories);
exports.default = router;
