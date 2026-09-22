import { Response } from "express"
import { AuthRequest } from "../middleware/authMiddleware"
import Order from "../models/Order"
import User from "../models/User"

// Helper function to build 14-day and 30-day filled time series
const buildFilledTimeSeries = (dailyAgg: any[], daysCount: number = 14) => {
  const map: Record<string, { revenue: number; paidOrders: number; pendingOrders: number; refundedAmount: number; totalOrders: number }> = {}
  dailyAgg.forEach((item) => {
    map[item._id] = {
      revenue: item.totalRevenue || 0,
      paidOrders: item.paidOrders || 0,
      pendingOrders: item.pendingOrders || 0,
      refundedAmount: item.refundedAmount || 0,
      totalOrders: item.totalOrders || 0
    }
  })

  const result = []
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    const label = `${d.getDate()} ${monthNames[d.getMonth()]}`

    const entry = map[dateStr] || {
      revenue: 0,
      paidOrders: 0,
      pendingOrders: 0,
      refundedAmount: 0,
      totalOrders: 0
    }

    result.push({
      date: dateStr,
      label,
      revenue: entry.revenue,
      paidOrders: entry.paidOrders,
      pendingOrders: entry.pendingOrders,
      refundedAmount: entry.refundedAmount,
      totalOrders: entry.totalOrders
    })
  }

  return result
}

// 1. Get Payment History with Transaction list, KPI summary, and embedded Chart Data
export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10)
    const skip = (page - 1) * limit
    const search = (req.query.search as string || "").trim()
    const status = (req.query.status as string || req.query.paymentStatus as string || "All").trim()
    const deliveryType = (req.query.deliveryType as string || "All").trim()

    const query: any = {}

    // Status filter
    if (status && status !== "All" && status !== "all") {
      query.paymentStatus = { $regex: new RegExp("^" + status + "$", "i") }
    }

    // Delivery type filter
    if (deliveryType && deliveryType !== "All" && deliveryType !== "all") {
      query.deliveryType = { $regex: new RegExp("^" + deliveryType + "$", "i") }
    }

    // Search filter across users, order IDs, razorpay IDs, items
    if (search) {
      const searchRegex = new RegExp(search, "i")
      
      const matchedUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { enrolmentNo: searchRegex }
        ]
      }).select("_id")
      const userIds = matchedUsers.map(u => u._id)

      query.$or = [
        { user: { $in: userIds } },
        { razorpayOrderId: searchRegex },
        { razorpayPaymentId: searchRegex },
        { refundId: searchRegex },
        { "shippingAddress.name": searchRegex },
        { "shippingAddress.phone": searchRegex },
        { "shippingAddress.address": searchRegex },
        { "shippingAddress.state": searchRegex },
        { "shippingAddress.district": searchRegex },
        { "shippingAddress.city": searchRegex },
        { "shippingAddress.pincode": searchRegex },
        { "items.title": searchRegex },
        { "items.code": searchRegex }
      ]

      // Check if search is a valid Mongo ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(search)) {
        query.$or.push({ _id: search })
      }
    }

    // Calculate dates for summary
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Parallel aggregate queries for metrics, items, and chart points
    const [
      total,
      payments,
      totalAll,
      paidAll,
      pendingAll,
      failedAll,
      refundedAll,
      revenueAgg,
      refundAgg,
      todayRevenueAgg,
      monthRevenueAgg,
      dailyChartAgg,
      deliveryTypeAgg
    ] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query)
        .populate("user", "name email phone enrolmentNo role")
        .populate("items.product", "title code image price fileUrl category semester")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(),
      Order.countDocuments({ paymentStatus: { $regex: /^paid$/i } }),
      Order.countDocuments({ paymentStatus: { $regex: /^pending$/i } }),
      Order.countDocuments({ paymentStatus: { $regex: /^failed$/i } }),
      Order.countDocuments({ 
        $or: [
          { paymentStatus: { $regex: /^refunded$/i } },
          { refundId: { $exists: true, $ne: "" } }
        ]
      }),
      Order.aggregate([
        { $match: { paymentStatus: { $regex: /^paid$/i } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
      ]),
      Order.aggregate([
        { 
          $match: { 
            $or: [
              { paymentStatus: { $regex: /^refunded$/i } },
              { refundId: { $exists: true, $ne: "" } }
            ]
          } 
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$refundAmount", "$grandTotal"] } } } }
      ]),
      Order.aggregate([
        { 
          $match: { 
            paymentStatus: { $regex: /^paid$/i },
            createdAt: { $gte: startOfToday }
          } 
        },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
      ]),
      Order.aggregate([
        { 
          $match: { 
            paymentStatus: { $regex: /^paid$/i },
            createdAt: { $gte: startOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
      ]),
      // Daily revenue aggregations for chart (last 30 days)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            totalRevenue: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$grandTotal", 0]
              }
            },
            paidOrders: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0]
              }
            },
            pendingOrders: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "Pending"] }, 1, 0]
              }
            },
            refundedAmount: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$paymentStatus", "Refunded"] }, { $ne: ["$refundId", ""] }] },
                  { $ifNull: ["$refundAmount", "$grandTotal"] },
                  0
                ]
              }
            },
            totalOrders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Delivery type breakdown
      Order.aggregate([
        {
          $group: {
            _id: "$deliveryType",
            revenue: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$grandTotal", 0]
              }
            },
            count: { $sum: 1 },
            paidCount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0]
              }
            }
          }
        }
      ])
    ])

    const totalRevenue = revenueAgg.length > 0 ? (revenueAgg[0].total || 0) : 0
    const totalRefunded = refundAgg.length > 0 ? (refundAgg[0].total || 0) : 0
    const todayRevenue = todayRevenueAgg.length > 0 ? (todayRevenueAgg[0].total || 0) : 0
    const monthRevenue = monthRevenueAgg.length > 0 ? (monthRevenueAgg[0].total || 0) : 0
    const avgOrderValue = paidAll > 0 ? Math.round(totalRevenue / paidAll) : 0

    // Format payment records
    const formattedPayments = payments.map((order: any) => ({
      _id: order._id,
      orderId: order._id,
      razorpayOrderId: order.razorpayOrderId || "N/A",
      razorpayPaymentId: order.razorpayPaymentId || "N/A",
      razorpaySignature: order.razorpaySignature || "",
      user: order.user ? {
        _id: order.user._id,
        name: order.user.name || "Guest Student",
        email: order.user.email || "",
        phone: order.user.phone || "",
        enrolmentNo: order.user.enrolmentNo || ""
      } : {
        name: order.shippingAddress?.name || "Guest Student",
        email: "N/A",
        phone: order.shippingAddress?.phone || "",
        enrolmentNo: ""
      },
      items: (order.items || []).map((item: any) => ({
        product: item.product?._id || item.product,
        title: item.title || item.product?.title || "Product Item",
        code: item.code || item.product?.code || "",
        price: item.price ?? 0,
        quantity: item.quantity ?? 1,
        session: item.session || "",
        fileUrl: item.fileUrl || item.product?.fileUrl || ""
      })),
      itemCount: (order.items || []).reduce((acc: number, curr: any) => acc + (curr?.quantity || 1), 0),
      deliveryType: order.deliveryType || "PDF",
      shippingAddress: order.shippingAddress || null,
      subtotal: order.subtotal || 0,
      shippingFee: order.shippingFee || 0,
      discount: order.discount || 0,
      appliedPromo: order.appliedPromo || "",
      grandTotal: order.grandTotal || (order.subtotal - (order.discount || 0) + (order.shippingFee || 0)) || 0,
      paymentStatus: order.paymentStatus || "Pending",
      orderStatus: order.orderStatus || "Processing",
      paymentMethod: order.razorpayPaymentId ? "Razorpay" : "Online Gateway",
      trackingNumber: order.trackingNumber || "",
      courierName: order.courierName || "",
      adminNotes: order.adminNotes || "",
      refundId: order.refundId || "",
      refundAmount: order.refundAmount || (order.paymentStatus === "Refunded" ? order.grandTotal : 0),
      cancellationReason: order.cancellationReason || "",
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }))

    // Build filled 14-day and 30-day timeline graph data
    const daily14Days = buildFilledTimeSeries(dailyChartAgg, 14)
    const daily30Days = buildFilledTimeSeries(dailyChartAgg, 30)

    // Calculate delivery type breakdown
    let pdfRev = 0, handwrittenRev = 0, pdfOrders = 0, handwrittenOrders = 0
    deliveryTypeAgg.forEach((d: any) => {
      const type = String(d._id || "").toLowerCase()
      if (type.includes("handwritten")) {
        handwrittenRev += d.revenue || 0
        handwrittenOrders += d.paidCount || d.count || 0
      } else {
        pdfRev += d.revenue || 0
        pdfOrders += d.paidCount || d.count || 0
      }
    })

    res.json({
      success: true,
      data: formattedPayments,
      summary: {
        totalTransactions: totalAll,
        successfulTransactions: paidAll,
        pendingTransactions: pendingAll,
        failedTransactions: failedAll,
        refundedTransactions: refundedAll,
        totalRevenue,
        totalRefunded,
        netRevenue: Math.max(0, totalRevenue - totalRefunded),
        todayRevenue,
        monthRevenue,
        avgOrderValue
      },
      chartData: {
        daily14Days,
        daily30Days,
        deliveryBreakdown: {
          pdfRevenue: pdfRev,
          handwrittenRevenue: handwrittenRev,
          pdfOrders,
          handwrittenOrders
        },
        statusDistribution: {
          paid: paidAll,
          pending: pendingAll,
          failed: failedAll,
          refunded: refundedAll
        }
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    })
  } catch (error: any) {
    console.error("GET PAYMENT HISTORY ERROR:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching payment history",
      error: error?.message || "Internal server error"
    })
  }
}

// 2. Dedicated Payment Analytics & Revenue Graph Endpoint
export const getPaymentGraphAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(req.query.days as string) || 30))
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const [
      dailyAgg,
      monthlyAgg,
      statusAgg,
      deliveryAgg,
      kpis
    ] = await Promise.all([
      // Daily revenue aggregation
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalRevenue: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$grandTotal", 0] }
            },
            paidOrders: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] }
            },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "Pending"] }, 1, 0] }
            },
            refundedAmount: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$paymentStatus", "Refunded"] }, { $ne: ["$refundId", ""] }] },
                  { $ifNull: ["$refundAmount", "$grandTotal"] },
                  0
                ]
              }
            },
            totalOrders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Monthly revenue aggregation
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfYear } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$grandTotal", 0] }
            },
            paidOrders: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] }
            },
            refunds: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$paymentStatus", "Refunded"] }, { $ne: ["$refundId", ""] }] },
                  { $ifNull: ["$refundAmount", "$grandTotal"] },
                  0
                ]
              }
            },
            totalOrders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Status breakdown
      Order.aggregate([
        {
          $group: {
            _id: "$paymentStatus",
            count: { $sum: 1 },
            amount: { $sum: "$grandTotal" }
          }
        }
      ]),
      // Delivery breakdown
      Order.aggregate([
        {
          $group: {
            _id: "$deliveryType",
            revenue: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$grandTotal", 0] }
            },
            orders: { $sum: 1 }
          }
        }
      ]),
      // KPI summary
      Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ paymentStatus: "Paid" }),
        Order.aggregate([
          { $match: { paymentStatus: "Paid" } },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } }
        ]),
        Order.aggregate([
          { $match: { paymentStatus: "Paid", createdAt: { $gte: startOfToday } } },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } }
        ]),
        Order.aggregate([
          { $match: { paymentStatus: "Paid", createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } }
        ])
      ])
    ])

    const totalOrders = kpis[0] || 0
    const paidOrders = kpis[1] || 0
    const totalRev = kpis[2][0]?.total || 0
    const todayRev = kpis[3][0]?.total || 0
    const monthRev = kpis[4][0]?.total || 0

    const dailyTimeSeries = buildFilledTimeSeries(dailyAgg, days)

    res.json({
      success: true,
      kpis: {
        totalRevenue: totalRev,
        todayRevenue: todayRev,
        monthRevenue: monthRev,
        totalOrders,
        paidOrders,
        avgOrderValue: paidOrders > 0 ? Math.round(totalRev / paidOrders) : 0
      },
      dailyGraph: dailyTimeSeries,
      monthlyGraph: monthlyAgg,
      statusBreakdown: statusAgg,
      deliveryBreakdown: deliveryAgg
    })
  } catch (error: any) {
    console.error("GET PAYMENT GRAPH ERROR:", error)
    res.status(500).json({
      success: false,
      message: "Error generating payment graph",
      error: error?.message || "Internal server error"
    })
  }
}
