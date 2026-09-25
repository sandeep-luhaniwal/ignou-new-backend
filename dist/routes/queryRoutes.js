"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const queryController_1 = require("../controllers/queryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
// Public
router.post("/", queryController_1.createQuery);
// Admin
router.get("/", authMiddleware_1.protect, adminMiddleware_1.adminOnly, queryController_1.getQueries);
router.get("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, queryController_1.getQueryById);
router.put("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, queryController_1.updateQueryStatus);
router.delete("/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, queryController_1.deleteQuery);
exports.default = router;
