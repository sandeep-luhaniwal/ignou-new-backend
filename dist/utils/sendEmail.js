"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendEmail = async ({ to, subject, html }) => {
    const transporter = nodemailer_1.default.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    });
    const mailOptions = {
        from: `"IGNOU Portal" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html
    };
    await transporter.sendMail(mailOptions);
};
exports.sendEmail = sendEmail;
