"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQuery = void 0;
const Query_1 = __importDefault(require("../models/Query"));
const createQuery = async (req, res) => {
    try {
        const { name, email, phone, type, message } = req.body;
        if (!name || !email || !type || !message) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const query = await Query_1.default.create({
            name,
            email,
            phone,
            type,
            message
        });
        res.status(201).json(query);
    }
    catch (error) {
        console.error("CREATE QUERY ERROR:", error);
        res.status(500).json({ message: "Error creating inquiry" });
    }
};
exports.createQuery = createQuery;
