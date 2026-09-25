"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const User_1 = __importDefault(require("../models/User"));
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const Query_1 = __importDefault(require("../models/Query"));
const Category_1 = __importDefault(require("../models/Category"));
const getDashboardStats = async (req, res) => {
    try {
        // 1. Total counts
        const [totalUsers, totalOrders, totalProducts, totalCategories, totalQueries, pendingQueries] = await Promise.all([
            User_1.default.countDocuments({ role: "user" }),
            Order_1.default.countDocuments(),
            Product_1.default.countDocuments(),
            Category_1.default.countDocuments({ parent: null }),
            Query_1.default.countDocuments(),
            Query_1.default.countDocuments({ status: "Pending" })
        ]);
        // 2. Revenue calculation (paid orders)
        const revenueAgg = await Order_1.default.aggregate([
            { $match: { paymentStatus: "Paid" } },
            { $group: { _id: null, totalRevenue: { $sum: "$grandTotal" } } }
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;
        // 3. Orders by payment status
        const ordersByPaymentStatus = await Order_1.default.aggregate([
            { $group: { _id: "$paymentStatus", count: { $sum: 1 } } }
        ]);
        // 4. Orders by delivery status
        const ordersByDeliveryStatus = await Order_1.default.aggregate([
            { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
        ]);
        // 5. Recent 8 orders
        const recentOrders = await Order_1.default.find()
            .populate("user", "name email phone")
            .populate("items.product", "title code")
            .sort({ createdAt: -1 })
            .limit(8);
        // 6. Recent 5 queries
        const recentQueries = await Query_1.default.find()
            .sort({ createdAt: -1 })
            .limit(5);
        // 7. Monthly revenue (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);
        const monthlySales = await Order_1.default.aggregate([
            {
                $match: {
                    paymentStatus: "Paid",
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    revenue: { $sum: "$grandTotal" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        res.json({
            counts: {
                totalUsers,
                totalOrders,
                totalProducts,
                totalCategories,
                totalQueries,
                pendingQueries,
                totalRevenue
            },
            ordersByPaymentStatus,
            ordersByDeliveryStatus,
            monthlySales,
            recentOrders,
            recentQueries
        });
    }
    catch (error) {
        console.error("GET DASHBOARD STATS ERROR:", error);
        res.status(500).json({ message: "Error fetching dashboard stats" });
    }
};
exports.getDashboardStats = getDashboardStats;
