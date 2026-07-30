"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.verifyLoginOtp = exports.getProfile = exports.updateProfile = exports.getUsers = exports.login = exports.signup = void 0;
const User_1 = __importDefault(require("../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const generateToken_1 = __importDefault(require("../utils/generateToken"));
const sendEmail_1 = require("../utils/sendEmail");
const signup = async (req, res) => {
    try {
        const { name, email, password, role, enrolmentNo, program, session } = req.body;
        const userExists = await User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await User_1.default.create({
            name,
            email,
            password: hashPassword,
            role,
            enrolmentNo,
            program,
            session
        });
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            enrolmentNo: user.enrolmentNo,
            program: user.program,
            session: user.session,
            token: (0, generateToken_1.default)(user._id.toString())
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        if (role && user.role.toLowerCase() !== role.toLowerCase()) {
            return res.status(403).json({
                message: "You are not authorized as admin"
            });
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
        await user.save();
        // Send Login OTP via Email
        await (0, sendEmail_1.sendEmail)({
            to: user.email,
            subject: "IGNOU Portal - Login OTP Verification",
            html: `
                <h3>Hello ${user.name},</h3>
                <p>Your one-time password (OTP) for logging in is <b>${otp}</b>.</p>
                <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
            `
        });
        res.json({
            message: "OTP sent to email",
            email: user.email
        });
    }
    catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.login = login;
const getUsers = async (req, res) => {
    try {
        const user = await User_1.default.find({ role: "user" }).select("-password");
        res.json({ data: user });
    }
    catch (error) {
        return res.status(500).json({ message: "Error fetching users" });
    }
};
exports.getUsers = getUsers;
const updateProfile = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: "No data provided" });
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const { name, password, enrolmentNo, program, session } = req.body;
        if (name)
            user.name = name;
        if (enrolmentNo !== undefined)
            user.enrolmentNo = enrolmentNo;
        if (program !== undefined)
            user.program = program;
        if (session !== undefined)
            user.session = session;
        if (password) {
            user.password = await bcryptjs_1.default.hash(password, 10);
        }
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            enrolmentNo: updatedUser.enrolmentNo,
            program: updatedUser.program,
            session: updatedUser.session,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error updating profile" });
    }
};
exports.updateProfile = updateProfile;
const getProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        return res.status(500).json({ message: "Error fetching profile" });
    }
};
exports.getProfile = getProfile;
const verifyLoginOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Check if OTP matches and is not expired
        if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        // Clear OTP fields
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            enrolmentNo: user.enrolmentNo,
            program: user.program,
            session: user.session,
            token: (0, generateToken_1.default)(user._id.toString())
        });
    }
    catch (error) {
        console.error("VERIFY LOGIN OTP ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.verifyLoginOtp = verifyLoginOtp;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await user.save();
        // Send OTP email
        await (0, sendEmail_1.sendEmail)({
            to: user.email,
            subject: "IGNOU Portal - Password Reset OTP",
            html: `
                <h3>Hello ${user.name},</h3>
                <p>You requested to reset your password.</p>
                <p>Your one-time password (OTP) for password reset is <b>${otp}</b>.</p>
                <p>This OTP is valid for 5 minutes.</p>
            `
        });
        res.json({ message: "OTP sent to email for password reset" });
    }
    catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "Email, OTP and newPassword are required" });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Check if OTP matches and is not expired
        if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        // Hash new password
        const hashPassword = await bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashPassword;
        // Clear OTP fields
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();
        res.json({ message: "Password reset successful. You can now login." });
    }
    catch (error) {
        console.error("RESET PASSWORD ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.resetPassword = resetPassword;
