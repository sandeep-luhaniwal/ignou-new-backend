"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPayment = exports.getOrderById = exports.getOrders = exports.createOrder = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
// Initialize Razorpay client lazily (so dotenv has loaded environment variables)
let razorpayInstance = null;
const getRazorpay = () => {
    if (!razorpayInstance) {
        razorpayInstance = new razorpay_1.default({
            key_id: process.env.RAZORPAY_KEY_ID || "",
            key_secret: process.env.RAZORPAY_KEY_SECRET || ""
        });
    }
    return razorpayInstance;
};
const createOrder = async (req, res) => {
    try {
        const { items, deliveryType, shippingAddress, subtotal, shippingFee, discount, grandTotal } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No items in order" });
        }
        const orderItems = items.map((item) => ({
            product: item.id,
            code: item.code,
            title: item.title,
            price: item.price,
            quantity: item.quantity
        }));
        // 1. Create order in MongoDB (with default paymentStatus: "Pending")
        const order = await Order_1.default.create({
            user: req.user._id,
            items: orderItems,
            deliveryType,
            shippingAddress,
            subtotal,
            shippingFee,
            discount,
            grandTotal,
            paymentStatus: "Pending"
        });
        // 2. Create Razorpay order
        const amountInPaise = Math.round(grandTotal * 100);
        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_order_${order._id}`
        };
        const razorpay = getRazorpay();
        const razorpayOrder = await razorpay.orders.create(options);
        // 3. Save the Razorpay Order ID to the MongoDB document
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();
        // 4. Return both the DB order and Razorpay order info
        res.status(201).json({
            order,
            razorpayOrder
        });
    }
    catch (error) {
        console.error("CREATE ORDER ERROR:", error);
        res.status(500).json({ message: "Error creating order" });
    }
};
exports.createOrder = createOrder;
const getOrders = async (req, res) => {
    try {
        const orders = await Order_1.default.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        console.error("GET ORDERS ERROR:", error);
        res.status(500).json({ message: "Error fetching orders" });
    }
};
exports.getOrders = getOrders;
const getOrderById = async (req, res) => {
    try {
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Verify ownership
        if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }
        res.json(order);
    }
    catch (error) {
        console.error("GET ORDER BY ID ERROR:", error);
        res.status(500).json({ message: "Error fetching order" });
    }
};
exports.getOrderById = getOrderById;
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Missing payment verification parameters" });
        }
        // Verify the payment signature using HMAC SHA-256
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto_1.default
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
            .update(sign.toString())
            .digest("hex");
        if (razorpay_signature === expectedSign) {
            // Payment matches signature: Update local database
            const order = await Order_1.default.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, {
                paymentStatus: "Paid",
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature
            }, { new: true });
            if (!order) {
                return res.status(404).json({ message: "Order not found for verification" });
            }
            res.status(200).json({
                message: "Payment verified successfully",
                order
            });
        }
        else {
            res.status(400).json({ message: "Invalid signature, verification failed" });
        }
    }
    catch (error) {
        console.error("VERIFY PAYMENT ERROR:", error);
        res.status(500).json({ message: "Error verifying payment" });
    }
};
exports.verifyPayment = verifyPayment;
