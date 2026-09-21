import { Response } from "express"
import { AuthRequest } from "../middleware/authMiddleware"
import User from "../models/User"
import Order from "../models/Order"
import Product from "../models/Product"
import Query from "../models/Query"
import Category from "../models/Category"

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Total counts
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      totalCategories,
      totalQueries,
      pendingQueries
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Order.countDocuments(),
      Product.countDocuments(),
      Category.countDocuments({ parent: null }),
      Query.countDocuments(),
      Query.countDocuments({ status: "Pending" })
    ])

    // 2. Revenue calculation (paid orders)
    const revenueAgg = await Order.aggregate([
      { $match: { paymentStatus: "Paid" } },
      { $group: { _id: null, totalRevenue: { $sum: "$grandTotal" } } }
    ])
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0

    // 3. Orders by payment status
    const ordersByPaymentStatus = await Order.aggregate([
      { $group: { _id: "$paymentStatus", count: { $sum: 1 } } }
    ])

    // 4. Orders by delivery status
    const ordersByDeliveryStatus = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
    ])

    // 5. Recent 8 orders
    const recentOrders = await Order.find()
      .populate("user", "name email phone")
      .populate("items.product", "title code")
      .sort({ createdAt: -1 })
      .limit(8)

    // 6. Recent 5 queries
    const recentQueries = await Query.find()
      .sort({ createdAt: -1 })
      .limit(5)

    // 7. Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const monthlySales = await Order.aggregate([
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
    ])

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
    })
  } catch (error) {
    console.error("GET DASHBOARD STATS ERROR:", error)
    res.status(500).json({ message: "Error fetching dashboard stats" })
  }
}
