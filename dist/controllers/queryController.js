"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteQuery = exports.updateQueryStatus = exports.getQueryById = exports.getQueries = exports.createQuery = void 0;
const Query_1 = __importDefault(require("../models/Query"));
const createQuery = async (req, res) => {
    try {
        const { name, email, phone, type, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: "Name, email and message are required" });
        }
        const query = await Query_1.default.create({
            name,
            email,
            phone: phone || "",
            type: type || "contact",
            message
        });
        res.status(201).json({
            message: "Query submitted successfully. We will get back to you soon!",
            data: query
        });
    }
    catch (error) {
        console.error("CREATE QUERY ERROR:", error);
        res.status(500).json({ message: "Error creating inquiry" });
    }
};
exports.createQuery = createQuery;
const getQueries = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const type = req.query.type;
        const status = req.query.status;
        const search = req.query.search;
        const query = {};
        if (type)
            query.type = type;
        if (status)
            query.status = status;
        if (search) {
            const searchRegex = new RegExp(search, "i");
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { message: searchRegex }
            ];
        }
        const total = await Query_1.default.countDocuments(query);
        const queries = await Query_1.default.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        res.json({
            data: queries,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error("GET QUERIES ERROR:", error);
        res.status(500).json({ message: "Error fetching inquiries" });
    }
};
exports.getQueries = getQueries;
const getQueryById = async (req, res) => {
    try {
        const query = await Query_1.default.findById(req.params.id);
        if (!query) {
            return res.status(404).json({ message: "Query not found" });
        }
        res.json(query);
    }
    catch (error) {
        console.error("GET QUERY BY ID ERROR:", error);
        res.status(500).json({ message: "Error fetching inquiry" });
    }
};
exports.getQueryById = getQueryById;
const updateQueryStatus = async (req, res) => {
    try {
        const { status, adminReply } = req.body;
        const query = await Query_1.default.findById(req.params.id);
        if (!query) {
            return res.status(404).json({ message: "Query not found" });
        }
        if (status)
            query.status = status;
        if (adminReply !== undefined)
            query.adminReply = adminReply;
        await query.save();
        res.json({
            message: "Query status updated successfully",
            data: query
        });
    }
    catch (error) {
        console.error("UPDATE QUERY STATUS ERROR:", error);
        res.status(500).json({ message: "Error updating inquiry" });
    }
};
exports.updateQueryStatus = updateQueryStatus;
const deleteQuery = async (req, res) => {
    try {
        const query = await Query_1.default.findByIdAndDelete(req.params.id);
        if (!query) {
            return res.status(404).json({ message: "Query not found" });
        }
        res.json({ message: "Query deleted successfully" });
    }
    catch (error) {
        console.error("DELETE QUERY ERROR:", error);
        res.status(500).json({ message: "Error deleting inquiry" });
    }
};
exports.deleteQuery = deleteQuery;
