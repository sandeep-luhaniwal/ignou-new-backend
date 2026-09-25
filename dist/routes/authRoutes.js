"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
// Public Auth Endpoints
router.post("/signup", authController_1.signup);
router.post("/register", authController_1.signup);
router.post("/verify-signup-otp", authController_1.verifySignupOtp);
router.post("/login", authController_1.login);
router.post("/verify-otp", authController_1.verifyLoginOtp);
router.post("/forgot-password", authController_1.forgotPassword);
router.post("/reset-password", authController_1.resetPassword);
// Student / User Profile Endpoints
router.get("/profile", authMiddleware_1.protect, authController_1.getProfile);
router.put("/profile", authMiddleware_1.protect, authController_1.updateProfile);
router.put("/change-password", authMiddleware_1.protect, authController_1.changePassword);
// Admin User Management Endpoints
router.get("/getusers", authMiddleware_1.protect, adminMiddleware_1.adminOnly, authController_1.getUsers);
router.get("/users", authMiddleware_1.protect, adminMiddleware_1.adminOnly, authController_1.getUsers);
router.get("/users/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, authController_1.getUserById);
router.put("/users/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, authController_1.updateUserByAdmin);
router.delete("/users/:id", authMiddleware_1.protect, adminMiddleware_1.adminOnly, authController_1.deleteUser);
exports.default = router;
