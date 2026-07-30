"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post("/signup", authController_1.signup);
router.post("/register", authController_1.signup);
router.post("/login", authController_1.login);
router.post("/verify-otp", authController_1.verifyLoginOtp);
router.post("/forgot-password", authController_1.forgotPassword);
router.post("/reset-password", authController_1.resetPassword);
router.get("/getusers", authController_1.getUsers);
router.get("/profile", authMiddleware_1.protect, authController_1.getProfile);
router.put("/profile", authMiddleware_1.protect, authController_1.updateProfile);
exports.default = router;
