import { Response } from "express"
import { AuthRequest } from "../middleware/authMiddleware"
import Order from "../models/Order"
import User from "../models/User"

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
        { "shippingAddress.name": searchRegex },
        { "shippingAddress.phone": searchRegex },
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

    // Parallel aggregate queries for metrics and items
    const [
      total,
      payments,
      totalAll,
      paidAll,
      pendingAll,
      failedAll,
      revenueAgg,
      todayRevenueAgg,
      monthRevenueAgg
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
      Order.aggregate([
        { $match: { paymentStatus: { $regex: /^paid$/i } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
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
      ])
    ])

    const totalRevenue = revenueAgg.length > 0 ? (revenueAgg[0].total || 0) : 0
    const todayRevenue = todayRevenueAgg.length > 0 ? (todayRevenueAgg[0].total || 0) : 0
    const monthRevenue = monthRevenueAgg.length > 0 ? (monthRevenueAgg[0].total || 0) : 0
    const avgOrderValue = paidAll > 0 ? Math.round(totalRevenue / paidAll) : 0

    // Format payment records with convenient normalized fields
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
        fileUrl: item.fileUrl || item.product?.fileUrl || ""
      })),
      itemCount: (order.items || []).reduce((acc: number, curr: any) => acc + (curr?.quantity || 1), 0),
      deliveryType: order.deliveryType || "PDF",
      shippingAddress: order.shippingAddress || null,
      subtotal: order.subtotal || 0,
      shippingFee: order.shippingFee || 0,
      discount: order.discount || 0,
      grandTotal: order.grandTotal || (order.subtotal - (order.discount || 0) + (order.shippingFee || 0)) || 0,
      paymentStatus: order.paymentStatus || "Pending",
      orderStatus: order.orderStatus || "Processing",
      paymentMethod: order.razorpayPaymentId ? "Razorpay" : "Online Gateway",
      trackingNumber: order.trackingNumber || "",
      courierName: order.courierName || "",
      adminNotes: order.adminNotes || "",
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }))

    res.json({
      success: true,
      data: formattedPayments,
      summary: {
        totalTransactions: totalAll,
        successfulTransactions: paidAll,
        pendingTransactions: pendingAll,
        failedTransactions: failedAll,
        totalRevenue,
        todayRevenue,
        monthRevenue,
        avgOrderValue
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
