import express from "express";
import { signup, login, getUsers, updateProfile, getProfile, verifyLoginOtp, forgotPassword, resetPassword, verifySignupOtp } from "../controllers/authController"
import { protect } from "../middleware/authMiddleware";
const router = express.Router();

router.post("/signup", signup)
router.post("/register", signup)
router.post("/login", login)
router.post("/verify-otp", verifyLoginOtp)
router.post("/verify-signup-otp", verifySignupOtp)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.get("/getusers", getUsers)
router.get("/profile", protect, getProfile)
router.put("/profile", protect, updateProfile)

export default router