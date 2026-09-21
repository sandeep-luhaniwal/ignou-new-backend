import express from "express";
import { 
    signup, 
    login, 
    getUsers, 
    getUserById,
    updateUserByAdmin,
    deleteUser,
    updateProfile, 
    getProfile, 
    changePassword,
    verifyLoginOtp, 
    forgotPassword, 
    resetPassword, 
    verifySignupOtp 
} from "../controllers/authController"
import { protect } from "../middleware/authMiddleware";
import { adminOnly } from "../middleware/adminMiddleware";

const router = express.Router();

// Public Auth Endpoints
router.post("/signup", signup)
router.post("/register", signup)
router.post("/verify-signup-otp", verifySignupOtp)
router.post("/login", login)
router.post("/verify-otp", verifyLoginOtp)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)

// Student / User Profile Endpoints
router.get("/profile", protect, getProfile)
router.put("/profile", protect, updateProfile)
router.put("/change-password", protect, changePassword)

// Admin User Management Endpoints
router.get("/getusers", protect, adminOnly, getUsers)
router.get("/users", protect, adminOnly, getUsers)
router.get("/users/:id", protect, adminOnly, getUserById)
router.put("/users/:id", protect, adminOnly, updateUserByAdmin)
router.delete("/users/:id", protect, adminOnly, deleteUser)

export default router