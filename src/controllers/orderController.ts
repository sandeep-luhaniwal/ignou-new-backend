import mongoose from "mongoose"
import { Response } from "express"
import { AuthRequest } from "../middleware/authMiddleware"
import Order from "../models/Order"
import Product from "../models/Product"
import User from "../models/User"
import Razorpay from "razorpay"
import crypto from "crypto"

// Initialize Razorpay client lazily
let razorpayInstance: Razorpay | null = null
const getRazorpay = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "",
      key_secret: process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || ""
    })
  }
  return razorpayInstance
}

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, deliveryType, shippingAddress, subtotal, shippingFee, discount, grandTotal } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items in order" })
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" })
    }

    const orderItems = await Promise.all(
      items.map(async (item: any) => {
        const productId = item.id || item.product || item._id
        let productDoc: any = null
        if (productId && mongoose.Types.ObjectId.isValid(productId)) {
          try {
            productDoc = await Product.findById(productId)
          } catch (e) {
            console.error("Error looking up product:", e)
          }
        }

        return {
          product: productId,
          code: item.code || productDoc?.code || "N/A",
          title: item.title || productDoc?.title || item.code || "Item",
          price: Number(item.price) || productDoc?.price || 0,
          quantity: Number(item.quantity) || 1,
          fileUrl: item.fileUrl || productDoc?.fileUrl || ""
        }
      })
    )

    // 1. Create order in MongoDB (with default paymentStatus: "Pending")
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      deliveryType: deliveryType || "PDF",
      shippingAddress,
      subtotal: Number(subtotal) || 0,
      shippingFee: Number(shippingFee) || 0,
      discount: Number(discount) || 0,
      grandTotal: Number(grandTotal) || 0,
      paymentStatus: "Pending",
      orderStatus: "Processing"
    })

    // 2. Create Razorpay order
    const amountInPaise = Math.round(Number(grandTotal || subtotal || 0) * 100)
    let razorpayOrder = null
    if (amountInPaise > 0) {
      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_order_${order._id}`
      }

      try {
        const razorpay = getRazorpay()
        razorpayOrder = await razorpay.orders.create(options)
        order.razorpayOrderId = razorpayOrder.id
        await order.save()
      } catch (rzpErr) {
        console.error("Razorpay order creation warning:", rzpErr)
      }
    }

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone enrolmentNo")
      .populate("items.product", "title code image")

    // Before payment is confirmed, do not expose fileUrl in createOrder response
    const sanitizedOrder = populatedOrder?.toObject()
    if (sanitizedOrder && sanitizedOrder.paymentStatus !== "Paid") {
      sanitizedOrder.items = sanitizedOrder.items.map((i: any) => ({
        ...i,
        fileUrl: undefined,
        product: i.product ? { ...i.product, fileUrl: undefined } : undefined
      }))
    }

    res.status(201).json({
      order: sanitizedOrder,
      razorpayOrder
    })
  } catch (error: any) {
    console.error("CREATE ORDER ERROR:", error)
    res.status(500).json({ 
      message: "Error creating order",
      error: error?.message || "Internal server error"
    })
  }
}

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const total = await Order.countDocuments({ user: req.user._id })
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "title code image fileUrl")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })

    // Hide fileUrl for unpaid orders
    const sanitizedOrders = orders.map((orderDoc) => {
      const orderObj = orderDoc.toObject()
      if (orderObj.paymentStatus !== "Paid") {
        orderObj.items = orderObj.items.map((i: any) => ({
          ...i,
          fileUrl: undefined,
          product: i.product ? { ...i.product, fileUrl: undefined } : undefined
        }))
      }
      return orderObj
    })

    res.json({
      data: sanitizedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("GET ORDERS ERROR:", error)
    res.status(500).json({ message: "Error fetching orders" })
  }
}

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone enrolmentNo")
      .populate("items.product", "title code image fileUrl")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Verify ownership or admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" })
    }

    const orderObj = order.toObject()
    // If not paid and not admin, hide fileUrl
    if (orderObj.paymentStatus !== "Paid" && req.user.role !== "admin") {
      orderObj.items = orderObj.items.map((i: any) => ({
        ...i,
        fileUrl: undefined,
        product: i.product ? { ...i.product, fileUrl: undefined } : undefined
      }))
    }

    res.json(orderObj)
  } catch (error) {
    console.error("GET ORDER BY ID ERROR:", error)
    res.status(500).json({ message: "Error fetching order" })
  }
}

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification parameters" })
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" })
    }

    const secretKey = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || ""
    const sign = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSign = crypto
      .createHmac("sha256", secretKey)
      .update(sign.toString())
      .digest("hex")

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid payment signature, verification failed" })
    }

    // Securely update the order belonging to THIS authenticated user
    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, user: req.user._id },
      {
        paymentStatus: "Paid",
        orderStatus: "Completed",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature
      },
      { new: true }
    )
      .populate("user", "name email phone")
      .populate("items.product", "title code image fileUrl")

    if (!order) {
      return res.status(404).json({ message: "Order not found or does not belong to this user" })
    }

    // Provide immediate list of downloadable purchased files
    const purchasedFiles = order.items.map((item: any) => ({
      itemId: item._id,
      productId: item.product?._id || item.product,
      code: item.code || item.product?.code || "N/A",
      title: item.title || item.product?.title || "Product",
      fileUrl: item.fileUrl || item.product?.fileUrl || "",
      price: item.price,
      quantity: item.quantity
    }))

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      order,
      downloads: purchasedFiles
    })
  } catch (error: any) {
    console.error("VERIFY PAYMENT ERROR:", error)
    res.status(500).json({ 
      message: "Error verifying payment",
      error: error?.message || "Internal server error"
    })
  }
}

export const downloadOrderItem = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = String(req.params.id)
    const itemId = String(req.params.itemId)

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" })
    }

    const order = await Order.findById(orderId)
      .populate("items.product", "title code fileUrl")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // 1. Verify user ownership
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to access this order" })
    }

    // 2. Verify payment status
    if (order.paymentStatus !== "Paid") {
      return res.status(403).json({ 
        message: "Payment not completed for this order. Please complete payment to download files." 
      })
    }

    // 3. Find requested item by item ID, product ID, or course code
    const item = order.items.find((i: any) => 
      i._id?.toString() === itemId || 
      (i.product && (i.product._id?.toString() === itemId || i.product.toString() === itemId)) ||
      (i.code && i.code.toLowerCase() === itemId.toLowerCase())
    )

    if (!item) {
      return res.status(404).json({ message: "Item not found in your purchased order" })
    }

    const downloadUrl = item.fileUrl || (item.product as any)?.fileUrl
    if (!downloadUrl) {
      return res.status(404).json({ message: "PDF file is not uploaded or available for this product yet" })
    }

    res.json({
      success: true,
      title: item.title || (item.product as any)?.title,
      code: item.code || (item.product as any)?.code,
      downloadUrl
    })
  } catch (error: any) {
    console.error("DOWNLOAD ORDER ITEM ERROR:", error)
    res.status(500).json({ 
      message: "Error processing download request",
      error: error?.message || "Internal server error"
    })
  }
}

// Admin APIs
export const getAllOrdersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit
    const search = (req.query.search as string || "").trim()
    const paymentStatus = req.query.paymentStatus as string
    const orderStatus = req.query.orderStatus as string
    const deliveryType = req.query.deliveryType as string

    const query: any = {}
    if (paymentStatus && paymentStatus !== "All") {
      query.paymentStatus = paymentStatus
    }
    if (orderStatus && orderStatus !== "All") {
      query.orderStatus = orderStatus
    }
    if (deliveryType && deliveryType !== "All") {
      query.deliveryType = deliveryType
    }

    if (search) {
      const searchRegex = new RegExp(search, "i")
      
      // Find matching user IDs
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
        { "shippingAddress.name": searchRegex },
        { "shippingAddress.phone": searchRegex },
        { razorpayOrderId: searchRegex },
        { razorpayPaymentId: searchRegex },
        { "items.code": searchRegex },
        { "items.title": searchRegex }
      ]
    }

    // 1. Fetch paginated orders
    const total = await Order.countDocuments(query)
    const orders = await Order.find(query)
      .populate("user", "name email phone enrolmentNo")
      .populate("items.product", "title code image fileUrl")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })

    // 2. Fetch overall payment analytics summary
    const [totalAll, paidAll, failedAll, pendingAll, revenueAgg] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ paymentStatus: "Paid" }),
      Order.countDocuments({ paymentStatus: "Failed" }),
      Order.countDocuments({ paymentStatus: "Pending" }),
      Order.aggregate([
        { $match: { paymentStatus: "Paid" } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
      ])
    ])

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0

    res.json({
      success: true,
      data: orders,
      summary: {
        totalOrders: totalAll,
        paidOrders: paidAll,
        failedOrders: failedAll,
        pendingOrders: pendingAll,
        totalRevenue
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error("GET ALL ORDERS ADMIN ERROR:", error)
    res.status(500).json({ 
      message: "Error fetching orders for admin",
      error: error?.message || "Internal server error"
    })
  }
}

export const updateOrderStatusAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentStatus, orderStatus, trackingNumber, courierName, adminNotes } = req.body
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (paymentStatus) order.paymentStatus = paymentStatus
    if (orderStatus) order.orderStatus = orderStatus
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber
    if (courierName !== undefined) order.courierName = courierName
    if (adminNotes !== undefined) order.adminNotes = adminNotes

    await order.save()

    const updated = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("items.product", "title code image fileUrl")

    res.json({
      message: "Order updated successfully",
      order: updated
    })
  } catch (error) {
    console.error("UPDATE ORDER STATUS ERROR:", error)
    res.status(500).json({ message: "Error updating order" })
  }
}

export const deleteOrderAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id)
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }
    res.json({ message: "Order deleted successfully" })
  } catch (error) {
    console.error("DELETE ORDER ERROR:", error)
    res.status(500).json({ message: "Error deleting order" })
  }
}
