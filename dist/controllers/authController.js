"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.verifyLoginOtp = exports.getProfile = exports.updateProfile = exports.changePassword = exports.deleteUser = exports.updateUserByAdmin = exports.getUserById = exports.getUsers = exports.login = exports.verifySignupOtp = exports.signup = void 0;
const User_1 = __importDefault(require("../models/User"));
const TempUser_1 = __importDefault(require("../models/TempUser"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const generateToken_1 = __importDefault(require("../utils/generateToken"));
const sendEmail_1 = require("../utils/sendEmail");
const emailTemplates_1 = require("../utils/emailTemplates");
const signup = async (req, res) => {
    try {
        const { name, email, password, role, enrolmentNo, program, session } = req.body;
        const userExists = await User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashPassword = await bcryptjs_1.default.hash(password, 10);
        // Clean up any existing temp signup for this email to avoid duplicates
        await TempUser_1.default.deleteOne({ email });
        await TempUser_1.default.create({
            name,
            email,
            password: hashPassword,
            role,
            enrolmentNo,
            program,
            session,
            otp
        });
        // Send Registration OTP via Email
        await (0, sendEmail_1.sendEmail)({
            to: email,
            subject: "IGNOUPower - Account Verification OTP",
            html: (0, emailTemplates_1.generateOtpEmailHtml)({ name, otp, type: "verification" })
        });
        res.json({
            message: "OTP sent to email for account verification",
            email
        });
    }
    catch (error) {
        console.error("SIGNUP ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.signup = signup;
const verifySignupOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }
        const tempUser = await TempUser_1.default.findOne({ email });
        if (!tempUser) {
            return res.status(400).json({ message: "No registration in progress for this email, or OTP has expired" });
        }
        if (tempUser.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }
        // Create the actual user
        const user = await User_1.default.create({
            name: tempUser.name,
            email: tempUser.email,
            password: tempUser.password, // already hashed
            role: tempUser.role,
            enrolmentNo: tempUser.enrolmentNo,
            program: tempUser.program,
            session: tempUser.session
        });
        // Clean up the temp registration record
        await TempUser_1.default.deleteOne({ email });
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
        console.error("VERIFY SIGNUP OTP ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.verifySignupOtp = verifySignupOtp;
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
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.login = login;
const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const role = req.query.role;
        const query = {};
        if (role) {
            query.role = role;
        }
        if (search) {
            const searchRegex = new RegExp(search, "i");
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { enrolmentNo: searchRegex },
                { program: searchRegex }
            ];
        }
        const total = await User_1.default.countDocuments(query);
        const users = await User_1.default.find(query)
            .select("-password -otp -otpExpiry")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        res.json({
            data: users,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error("GET USERS ERROR:", error);
        return res.status(500).json({ message: "Error fetching users" });
    }
};
exports.getUsers = getUsers;
const getUserById = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id).select("-password -otp -otpExpiry");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        console.error("GET USER BY ID ERROR:", error);
        return res.status(500).json({ message: "Error fetching user" });
    }
};
exports.getUserById = getUserById;
const updateUserByAdmin = async (req, res) => {
    try {
        const { name, email, role, enrolmentNo, program, session } = req.body;
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (name)
            user.name = name;
        if (email)
            user.email = email;
        if (role)
            user.role = role;
        if (enrolmentNo !== undefined)
            user.enrolmentNo = enrolmentNo;
        if (program !== undefined)
            user.program = program;
        if (session !== undefined)
            user.session = session;
        await user.save();
        res.json({
            message: "User updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                enrolmentNo: user.enrolmentNo,
                program: user.program,
                session: user.session
            }
        });
    }
    catch (error) {
        console.error("UPDATE USER BY ADMIN ERROR:", error);
        return res.status(500).json({ message: "Error updating user" });
    }
};
exports.updateUserByAdmin = updateUserByAdmin;
const deleteUser = async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        console.error("DELETE USER ERROR:", error);
        return res.status(500).json({ message: "Error deleting user" });
    }
};
exports.deleteUser = deleteUser;
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Old password and new password are required" });
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isMatch = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect current password" });
        }
        user.password = await bcryptjs_1.default.hash(newPassword, 10);
        await user.save();
        res.json({ message: "Password updated successfully" });
    }
    catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);
        return res.status(500).json({ message: "Error changing password" });
    }
};
exports.changePassword = changePassword;
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
            subject: "IGNOUPower - Password Reset OTP",
            html: (0, emailTemplates_1.generateOtpEmailHtml)({ name: user.name, otp, type: "reset" })
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
