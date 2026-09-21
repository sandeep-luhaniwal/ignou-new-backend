import { Response } from "express"
import { AuthRequest } from "../middleware/authMiddleware"
import Order from "../models/Order"
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

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" })
    }

    const orderItems = items.map((item: any) => ({
      product: item.id || item.product || item._id,
      code: item.code || "",
      title: item.title || "",
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
      fileUrl: item.fileUrl || ""
    }))

    // 1. Create order in MongoDB (with default paymentStatus: "Pending")
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      deliveryType: deliveryType || "PDF",
      shippingAddress,
      subtotal: Number(subtotal),
      shippingFee: Number(shippingFee) || 0,
      discount: Number(discount) || 0,
      grandTotal: Number(grandTotal),
      paymentStatus: "Pending",
      orderStatus: "Processing"
    })

    // 2. Create Razorpay order
    const amountInPaise = Math.round(Number(grandTotal) * 100)
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_order_${order._id}`
    }

    let razorpayOrder = null
    try {
      const razorpay = getRazorpay()
      razorpayOrder = await razorpay.orders.create(options)
      order.razorpayOrderId = razorpayOrder.id
      await order.save()
    } catch (rzpErr) {
      console.error("Razorpay order creation warning:", rzpErr)
    }

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone enrolmentNo")
      .populate("items.product", "title code image fileUrl")

    res.status(201).json({
      order: populatedOrder,
      razorpayOrder
    })
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error)
    res.status(500).json({ message: "Error creating order" })
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

    res.json({
      data: orders,
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

    res.json(order)
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

    const secretKey = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || ""
    const sign = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSign = crypto
      .createHmac("sha256", secretKey)
      .update(sign.toString())
      .digest("hex")

    if (razorpay_signature === expectedSign) {
      const order = await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          paymentStatus: "Paid",
          orderStatus: "Completed",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        },
        { new: true }
      )
        .populate("user", "name email")
        .populate("items.product", "title code fileUrl")

      if (!order) {
        return res.status(404).json({ message: "Order not found for verification" })
      }

      res.status(200).json({
        message: "Payment verified successfully",
        order
      })
    } else {
      res.status(400).json({ message: "Invalid signature, verification failed" })
    }
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error)
    res.status(500).json({ message: "Error verifying payment" })
  }
}

// Admin APIs
export const getAllOrdersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit
    const search = req.query.search as string
    const paymentStatus = req.query.paymentStatus as string
    const orderStatus = req.query.orderStatus as string
    const deliveryType = req.query.deliveryType as string

    const query: any = {}
    if (paymentStatus) query.paymentStatus = paymentStatus
    if (orderStatus) query.orderStatus = orderStatus
    if (deliveryType) query.deliveryType = deliveryType

    if (search) {
      const searchRegex = new RegExp(search, "i")
      query.$or = [
        { "shippingAddress.name": searchRegex },
        { "shippingAddress.phone": searchRegex },
        { razorpayOrderId: searchRegex },
        { razorpayPaymentId: searchRegex },
        { "items.code": searchRegex },
        { "items.title": searchRegex }
      ]
    }

    const total = await Order.countDocuments(query)
    const orders = await Order.find(query)
      .populate("user", "name email phone enrolmentNo")
      .populate("items.product", "title code image fileUrl")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })

    res.json({
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("GET ALL ORDERS ADMIN ERROR:", error)
    res.status(500).json({ message: "Error fetching orders for admin" })
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
