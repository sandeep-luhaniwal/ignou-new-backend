import { Request, Response } from "express"
import User from "../models/User"
import TempUser from "../models/TempUser"
import bcrypt from "bcryptjs"
import generateToken from "../utils/generateToken"
import { AuthRequest } from "../middleware/authMiddleware";
import { sendEmail } from "../utils/sendEmail"
import { generateOtpEmailHtml } from "../utils/emailTemplates"

export const signup = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, enrolmentNo, program, session } = req.body
        const userExists = await User.findOne({ email })
        if (userExists) {
            return res.status(400).json({ message: "User already exists" })
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const hashPassword = await bcrypt.hash(password, 10);
        
        // Clean up any existing temp signup for this email to avoid duplicates
        await TempUser.deleteOne({ email })
        
        await TempUser.create({
            name,
            email,
            password: hashPassword,
            role,
            enrolmentNo,
            program,
            session,
            otp
        })

        // Send Registration OTP via Email
        await sendEmail({
            to: email,
            subject: "IGNOUPower - Account Verification OTP",
            html: generateOtpEmailHtml({ name, otp, type: "verification" })
        })

        res.json({
            message: "OTP sent to email for account verification",
            email
        })
    } catch (error) {
        console.error("SIGNUP ERROR:", error)
        res.status(500).json({ message: "Internal server error" })
    }
};

export const verifySignupOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" })
        }

        const tempUser = await TempUser.findOne({ email })
        if (!tempUser) {
            return res.status(400).json({ message: "No registration in progress for this email, or OTP has expired" })
        }

        if (tempUser.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" })
        }

        // Create the actual user
        const user = await User.create({
            name: tempUser.name,
            email: tempUser.email,
            password: tempUser.password, // already hashed
            role: tempUser.role,
            enrolmentNo: tempUser.enrolmentNo,
            program: tempUser.program,
            session: tempUser.session
        })

        // Clean up the temp registration record
        await TempUser.deleteOne({ email })

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            enrolmentNo: user.enrolmentNo,
            program: user.program,
            session: user.session,
            token: generateToken(user._id.toString())
        })
    } catch (error) {
        console.error("VERIFY SIGNUP OTP ERROR:", error)
        res.status(500).json({ message: "Internal server error" })
    }
}

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password, role } = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" })
        }
        if (role && user.role.toLowerCase() !== role.toLowerCase()) {
            return res.status(403).json({
                message: "You are not authorized as admin"
            })
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            enrolmentNo: user.enrolmentNo,
            program: user.program,
            session: user.session,
            token: generateToken(user._id.toString())
        })
    } catch (error) {
        console.error("LOGIN ERROR:", error)
        res.status(500).json({ message: "Internal server error" })
    }
}

export const getUsers = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const skip = (page - 1) * limit
        const search = req.query.search as string
        const role = req.query.role as string

        const query: any = {}
        if (role) {
            query.role = role
        }
        if (search) {
            const searchRegex = new RegExp(search, "i")
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { enrolmentNo: searchRegex },
                { program: searchRegex }
            ]
        }

        const total = await User.countDocuments(query)
        const users = await User.find(query)
            .select("-password -otp -otpExpiry")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })

        res.json({
            data: users,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error("GET USERS ERROR:", error)
        return res.status(500).json({ message: "Error fetching users" })
    }
}

export const getUserById = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id).select("-password -otp -otpExpiry")
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        res.json(user)
    } catch (error) {
        console.error("GET USER BY ID ERROR:", error)
        return res.status(500).json({ message: "Error fetching user" })
    }
}

export const updateUserByAdmin = async (req: Request, res: Response) => {
    try {
        const { name, email, role, enrolmentNo, program, session } = req.body
        const user = await User.findById(req.params.id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        if (name) user.name = name
        if (email) user.email = email
        if (role) user.role = role
        if (enrolmentNo !== undefined) user.enrolmentNo = enrolmentNo
        if (program !== undefined) user.program = program
        if (session !== undefined) user.session = session

        await user.save()
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
        })
    } catch (error) {
        console.error("UPDATE USER BY ADMIN ERROR:", error)
        return res.status(500).json({ message: "Error updating user" })
    }
}

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        res.json({ message: "User deleted successfully" })
    } catch (error) {
        console.error("DELETE USER ERROR:", error)
        return res.status(500).json({ message: "Error deleting user" })
    }
}

export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const { oldPassword, newPassword } = req.body
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Old password and new password are required" })
        }

        const user = await User.findById(req.user._id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect current password" })
        }

        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()

        res.json({ message: "Password updated successfully" })
    } catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error)
        return res.status(500).json({ message: "Error changing password" })
    }
}

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: "No data provided" })
        }
        const user = await User.findById(req.user._id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        const { name, password, enrolmentNo, program, session } = req.body;
        
        if (name) user.name = name
        if (enrolmentNo !== undefined) user.enrolmentNo = enrolmentNo
        if (program !== undefined) user.program = program
        if (session !== undefined) user.session = session
        
        if (password) {
            user.password = await bcrypt.hash(password, 10)
        }
        
        const updatedUser = await user.save()
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            enrolmentNo: updatedUser.enrolmentNo,
            program: updatedUser.program,
            session: updatedUser.session,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error updating profile" })
    }
}

export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user._id).select("-password")
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        res.json(user)
    } catch (error) {
        return res.status(500).json({ message: "Error fetching profile" })
    }
}

export const verifyLoginOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" })
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        // Check if OTP matches and is not expired
        if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" })
        }

        // Clear OTP fields
        user.otp = undefined
        user.otpExpiry = undefined
        await user.save()

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            enrolmentNo: user.enrolmentNo,
            program: user.program,
            session: user.session,
            token: generateToken(user._id.toString())
        })
    } catch (error) {
        console.error("VERIFY LOGIN OTP ERROR:", error)
        res.status(500).json({ message: "Internal server error" })
    }
}

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body
        if (!email) {
            return res.status(400).json({ message: "Email is required" })
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        user.otp = otp
        user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        await user.save()

        // Send OTP email
        await sendEmail({
            to: user.email,
            subject: "IGNOUPower - Password Reset OTP",
            html: generateOtpEmailHtml({ name: user.name, otp, type: "reset" })
        })

        res.json({ message: "OTP sent to email for password reset" })
    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error)
        res.status(500).json({ message: "Internal server error" })
    }
}

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, otp, newPassword } = req.body
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "Email, OTP and newPassword are required" })
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        // Check if OTP matches and is not expired
        if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" })
        }

        // Hash new password
        const hashPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashPassword

        // Clear OTP fields
        user.otp = undefined
        user.otpExpiry = undefined
        await user.save()

        res.json({ message: "Password reset successful. You can now login." })
    } catch (error) {
        console.error("RESET PASSWORD ERROR:", error)
        res.status(500).json({ message: "Internal server error" })
    }
}