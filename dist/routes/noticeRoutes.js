"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const noticeController_1 = require("../controllers/noticeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
// Public
router.get("/", noticeController_1.getNotices);
router.get("/:id", noticeController_1.getNoticeById);
// Admin Protected
router.post("/", authMiddleware_1.protect, adminMiddleware_1.adminOnly, noticeController_1.createNotice);
router.put("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, noticeController_1.updateNotice);
router.delete("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, noticeController_1.deleteNotice);
exports.default = router;
