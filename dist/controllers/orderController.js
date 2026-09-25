"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelAndRefundOrderAdmin = exports.updateHandwrittenOrderAdmin = exports.getHandwrittenOrdersAdmin = exports.deleteOrderAdmin = exports.updateOrderStatusAdmin = exports.getAllOrdersAdmin = exports.downloadOrderItem = exports.verifyPayment = exports.getOrderById = exports.getOrders = exports.createOrder = exports.validatePromo = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const User_1 = __importDefault(require("../models/User"));
const PromoCode_1 = __importDefault(require("../models/PromoCode"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const sendEmail_1 = require("../utils/sendEmail");
const cloudinary_1 = require("../utils/cloudinary");
// Initialize Razorpay client lazily
let razorpayInstance = null;
const getRazorpay = () => {
    if (!razorpayInstance) {
        razorpayInstance = new razorpay_1.default({
            key_id: process.env.RAZORPAY_KEY_ID || "",
            key_secret: process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || ""
        });
    }
    return razorpayInstance;
};
const validatePromo = async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        if (!code || typeof code !== "string") {
            return res.status(400).json({ valid: false, message: "Promo code is required" });
        }
        const cleanCode = code.trim().toUpperCase();
        const amount = Number(subtotal) || 0;
        const promo = await PromoCode_1.default.findOne({ code: cleanCode });
        if (promo) {
            if (!promo.isActive) {
                return res.status(400).json({
                    valid: false,
                    message: "This promo code is currently disabled or blocked by admin."
                });
            }
            if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
                return res.status(400).json({ valid: false, message: "This promo code has expired." });
            }
            if (promo.minOrderAmount && amount < promo.minOrderAmount) {
                return res.status(400).json({
                    valid: false,
                    message: `Minimum order amount of ₹${promo.minOrderAmount} is required for this code.`
                });
            }
            let discount = 0;
            if (promo.discountType === "percentage") {
                discount = Math.round((amount * promo.discountValue) / 100);
                if (promo.maxDiscount && promo.maxDiscount > 0) {
                    discount = Math.min(discount, promo.maxDiscount);
                }
            }
            else {
                discount = Math.min(promo.discountValue, amount);
            }
            return res.json({
                valid: true,
                code: promo.code,
                discount,
                message: `${promo.code} applied successfully! You saved ₹${discount}.`
            });
        }
        // Fallback built-in codes
        let discount = 0;
        let message = "";
        if (cleanCode === "IGNOU10") {
            discount = Math.round(amount * 0.10);
            message = "10% discount applied successfully!";
        }
        else if (cleanCode === "WELCOME50") {
            discount = Math.min(50, amount);
            message = "₹50 flat discount applied successfully!";
        }
        else if (cleanCode === "IGNOU20" || cleanCode === "FIRST20") {
            discount = Math.round(amount * 0.20);
            message = "20% discount applied successfully!";
        }
        else if (cleanCode === "FLAT100") {
            if (amount < 200) {
                return res.status(400).json({ valid: false, message: "Minimum cart value of ₹200 required for FLAT100" });
            }
            discount = 100;
            message = "₹100 flat discount applied successfully!";
        }
        else {
            return res.status(400).json({ valid: false, message: "Invalid or expired promo code" });
        }
        res.json({
            valid: true,
            code: cleanCode,
            discount,
            message
        });
    }
    catch (error) {
        console.error("VALIDATE PROMO ERROR:", error);
        res.status(500).json({ valid: false, message: "Error validating promo code", error: error?.message });
    }
};
exports.validatePromo = validatePromo;
const createOrder = async (req, res) => {
    try {
        const { items, deliveryType, shippingAddress, subtotal, shippingFee, discount, grandTotal, appliedPromo, promoCode } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "No items in order" });
        }
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        // Normalize deliveryType (handle "handwritten", "Handwritten", "pdf", "PDF")
        const normalizedDeliveryType = (deliveryType && typeof deliveryType === "string" && deliveryType.toLowerCase() === "handwritten")
            ? "Handwritten"
            : "PDF";
        const isHandwrittenOrder = normalizedDeliveryType === "Handwritten";
        const orderItems = await Promise.all(items.map(async (item) => {
            const productId = item.id || item.product || item._id;
            let productDoc = null;
            if (productId && mongoose_1.default.Types.ObjectId.isValid(productId)) {
                try {
                    productDoc = await Product_1.default.findById(productId);
                }
                catch (e) {
                    console.error("Error looking up product:", e);
                }
            }
            return {
                product: productId,
                code: item.code || productDoc?.code || "N/A",
                title: item.title || productDoc?.title || item.code || "Item",
                price: Number(item.price) || productDoc?.price || 0,
                quantity: Number(item.quantity) || 1,
                session: item.session || productDoc?.session || "",
                fileUrl: isHandwrittenOrder ? "" : (item.fileUrl || productDoc?.fileUrl || "")
            };
        }));
        const promo = String(appliedPromo || promoCode || "").trim().toUpperCase();
        // Calculate subtotal from items if not provided or to ensure accuracy
        const calculatedSubtotal = orderItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
        const finalSubtotal = Number(subtotal) > 0 ? Number(subtotal) : calculatedSubtotal;
        // Calculate discount based on active promo code
        let finalDiscount = Number(discount) || 0;
        let validatedPromoCode = "";
        if (promo) {
            const promoDoc = await PromoCode_1.default.findOne({ code: promo });
            if (promoDoc) {
                // Only apply discount if promo code is ACTIVE and not blocked / expired
                if (promoDoc.isActive && (!promoDoc.expiresAt || new Date() <= new Date(promoDoc.expiresAt))) {
                    if (!promoDoc.minOrderAmount || finalSubtotal >= promoDoc.minOrderAmount) {
                        if (promoDoc.discountType === "percentage") {
                            finalDiscount = Math.round((finalSubtotal * promoDoc.discountValue) / 100);
                            if (promoDoc.maxDiscount && promoDoc.maxDiscount > 0) {
                                finalDiscount = Math.min(finalDiscount, promoDoc.maxDiscount);
                            }
                        }
                        else {
                            finalDiscount = Math.min(promoDoc.discountValue, finalSubtotal);
                        }
                        validatedPromoCode = promoDoc.code;
                        promoDoc.usedCount = (promoDoc.usedCount || 0) + 1;
                        await promoDoc.save().catch(e => console.error("Error saving promo usedCount:", e));
                    }
                }
            }
            else {
                if (promo === "IGNOU10") {
                    finalDiscount = Math.round(finalSubtotal * 0.10);
                    validatedPromoCode = "IGNOU10";
                }
                else if (promo === "WELCOME50") {
                    finalDiscount = Math.min(50, finalSubtotal);
                    validatedPromoCode = "WELCOME50";
                }
                else if (promo === "IGNOU20" || promo === "FIRST20") {
                    finalDiscount = Math.round(finalSubtotal * 0.20);
                    validatedPromoCode = promo;
                }
                else if (promo === "FLAT100") {
                    finalDiscount = finalSubtotal >= 200 ? 100 : Math.min(finalDiscount, finalSubtotal);
                    validatedPromoCode = "FLAT100";
                }
            }
        }
        const calculatedShippingFee = isHandwrittenOrder
            ? (Number(shippingFee) > 0 ? Number(shippingFee) : orderItems.reduce((acc, it) => acc + (60 * it.quantity), 0))
            : 0;
        // Ensure grandTotal accurately reflects the reduced balance after discount
        const calculatedGrandTotal = Math.max(0, finalSubtotal + calculatedShippingFee - finalDiscount);
        const finalGrandTotal = grandTotal !== undefined ? Math.min(Number(grandTotal), calculatedGrandTotal) : calculatedGrandTotal;
        // 1. Create order in MongoDB (with default paymentStatus: "Pending")
        const order = await Order_1.default.create({
            user: req.user._id,
            items: orderItems,
            deliveryType: normalizedDeliveryType,
            shippingAddress: shippingAddress ? {
                name: shippingAddress.name || "",
                phone: shippingAddress.phone || "",
                address: shippingAddress.address || "",
                pincode: shippingAddress.pincode || "",
                city: shippingAddress.city || "",
                state: shippingAddress.state || "",
                district: shippingAddress.district || ""
            } : undefined,
            subtotal: finalSubtotal,
            shippingFee: calculatedShippingFee,
            discount: finalDiscount,
            grandTotal: finalGrandTotal,
            appliedPromo: promo,
            paymentStatus: finalGrandTotal === 0 ? "Paid" : "Pending",
            orderStatus: (finalGrandTotal === 0 && !isHandwrittenOrder) ? "Completed" : "Processing"
        });
        // 2. Create Razorpay order with the reduced grandTotal amount
        const amountInPaise = Math.round(finalGrandTotal * 100);
        let razorpayOrder = null;
        if (amountInPaise > 0) {
            const options = {
                amount: amountInPaise,
                currency: "INR",
                receipt: `receipt_order_${order._id}`
            };
            try {
                const razorpay = getRazorpay();
                razorpayOrder = await razorpay.orders.create(options);
                order.razorpayOrderId = razorpayOrder.id;
                await order.save();
            }
            catch (rzpErr) {
                console.error("Razorpay order creation warning:", rzpErr);
            }
        }
        const populatedOrder = await Order_1.default.findById(order._id)
            .populate("user", "name email phone enrolmentNo")
            .populate("items.product", "title code image");
        // Before payment is confirmed or for handwritten delivery, do not expose fileUrl in createOrder response
        const sanitizedOrder = populatedOrder?.toObject();
        if (sanitizedOrder && (sanitizedOrder.paymentStatus !== "Paid" || sanitizedOrder.deliveryType === "Handwritten")) {
            sanitizedOrder.items = sanitizedOrder.items.map((i) => ({
                ...i,
                fileUrl: undefined,
                product: i.product ? { ...i.product, fileUrl: undefined } : undefined
            }));
        }
        res.status(201).json({
            order: sanitizedOrder,
            razorpayOrder
        });
    }
    catch (error) {
        console.error("CREATE ORDER ERROR:", error);
        res.status(500).json({
            message: "Error creating order",
            error: error?.message || "Internal server error"
        });
    }
};
exports.createOrder = createOrder;
const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const isAdmin = req.user && req.user.role === "admin";
        const myOnly = req.query.myOnly === "true";
        // If admin and didn't specify myOnly=true, return all orders; otherwise return user's orders
        const query = (isAdmin && !myOnly) ? {} : { user: req.user._id };
        const total = await Order_1.default.countDocuments(query);
        let orderQuery = Order_1.default.find(query)
            .populate("items.product", "title code image fileUrl")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        if (isAdmin) {
            orderQuery = orderQuery.populate("user", "name email phone enrolmentNo");
        }
        const orders = await orderQuery;
        // Hide fileUrl for unpaid orders or handwritten orders (unless admin)
        const sanitizedOrders = orders.map((orderDoc) => {
            const orderObj = orderDoc.toObject();
            if ((orderObj.paymentStatus !== "Paid" || orderObj.deliveryType === "Handwritten") && !isAdmin) {
                orderObj.items = orderObj.items.map((i) => ({
                    ...i,
                    fileUrl: undefined,
                    product: i.product ? { ...i.product, fileUrl: undefined } : undefined
                }));
            }
            return orderObj;
        });
        res.json({
            success: true,
            data: sanitizedOrders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error("GET ORDERS ERROR:", error);
        res.status(500).json({ message: "Error fetching orders" });
    }
};
exports.getOrders = getOrders;
const getOrderById = async (req, res) => {
    try {
        const order = await Order_1.default.findById(req.params.id)
            .populate("user", "name email phone enrolmentNo")
            .populate("items.product", "title code image fileUrl");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Verify ownership or admin
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }
        const orderObj = order.toObject();
        // If not paid and not admin, or if handwritten delivery for normal user, hide fileUrl
        if ((orderObj.paymentStatus !== "Paid" || orderObj.deliveryType === "Handwritten") && req.user.role !== "admin") {
            orderObj.items = orderObj.items.map((i) => ({
                ...i,
                fileUrl: undefined,
                product: i.product ? { ...i.product, fileUrl: undefined } : undefined
            }));
        }
        res.json(orderObj);
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
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const secretKey = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || "";
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto_1.default
            .createHmac("sha256", secretKey)
            .update(sign.toString())
            .digest("hex");
        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ message: "Invalid payment signature, verification failed" });
        }
        // Find the order first to check delivery type
        const existingOrder = await Order_1.default.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });
        if (!existingOrder) {
            return res.status(404).json({ message: "Order not found or does not belong to this user" });
        }
        const isHandwritten = existingOrder.deliveryType === "Handwritten";
        // Securely update the order:
        // Handwritten orders remain 'Processing' until courier dispatched. PDF orders become 'Completed'.
        const order = await Order_1.default.findOneAndUpdate({ razorpayOrderId: razorpay_order_id, user: req.user._id }, {
            paymentStatus: "Paid",
            orderStatus: isHandwritten ? "Processing" : "Completed",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature
        }, { new: true })
            .populate("user", "name email phone")
            .populate("items.product", "title code image fileUrl");
        if (!order) {
            return res.status(404).json({ message: "Order not found or does not belong to this user" });
        }
        // Provide downloadable purchased files ONLY for PDF/Digital delivery
        const purchasedFiles = isHandwritten
            ? []
            : order.items.map((item) => {
                let fileUrl = item.fileUrl || item.product?.fileUrl || "";
                if (fileUrl.includes("res.cloudinary.com") && fileUrl.includes("/upload/") && !fileUrl.includes("/fl_attachment")) {
                    fileUrl = fileUrl.replace("/upload/", "/upload/fl_attachment/");
                }
                return {
                    itemId: item._id,
                    productId: item.product?._id || item.product,
                    code: item.code || item.product?.code || "N/A",
                    title: item.title || item.product?.title || "Product",
                    fileUrl,
                    price: item.price,
                    quantity: item.quantity
                };
            });
        const sanitizedOrder = order.toObject();
        if (isHandwritten) {
            sanitizedOrder.items = sanitizedOrder.items.map((i) => ({
                ...i,
                fileUrl: undefined,
                product: i.product ? { ...i.product, fileUrl: undefined } : undefined
            }));
        }
        res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            order: sanitizedOrder,
            downloads: purchasedFiles
        });
    }
    catch (error) {
        console.error("VERIFY PAYMENT ERROR:", error);
        res.status(500).json({
            message: "Error verifying payment",
            error: error?.message || "Internal server error"
        });
    }
};
exports.verifyPayment = verifyPayment;
const downloadOrderItem = async (req, res) => {
    try {
        const orderId = String(req.params.id);
        const itemId = String(req.params.itemId);
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const order = await Order_1.default.findById(orderId)
            .populate("items.product", "title code fileUrl");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // 1. Verify user ownership
        if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to access this order" });
        }
        // 2. Verify payment status
        if (order.paymentStatus !== "Paid") {
            return res.status(403).json({
                message: "Payment not completed for this order. Please complete payment to download files."
            });
        }
        // 3. Block PDF download if deliveryType is Handwritten (physical courier)
        if (order.deliveryType === "Handwritten" && req.user.role !== "admin") {
            return res.status(400).json({
                message: "This is a physical handwritten order to be delivered by courier. PDF download is not applicable."
            });
        }
        // 3. Find requested item by item ID, product ID, or course code
        const item = order.items.find((i) => i._id?.toString() === itemId ||
            (i.product && (i.product._id?.toString() === itemId || i.product.toString() === itemId)) ||
            (i.code && i.code.toLowerCase() === itemId.toLowerCase()));
        if (!item) {
            return res.status(404).json({ message: "Item not found in your purchased order" });
        }
        let downloadUrl = item.fileUrl || item.product?.fileUrl;
        if (!downloadUrl) {
            return res.status(404).json({ message: "PDF file is not uploaded or available for this product yet" });
        }
        // Force direct download on mobile/desktop by adding fl_attachment for Cloudinary URLs
        if (downloadUrl.includes("res.cloudinary.com") && downloadUrl.includes("/upload/") && !downloadUrl.includes("/fl_attachment")) {
            downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
        }
        res.json({
            success: true,
            title: item.title || item.product?.title,
            code: item.code || item.product?.code,
            downloadUrl
        });
    }
    catch (error) {
        console.error("DOWNLOAD ORDER ITEM ERROR:", error);
        res.status(500).json({
            message: "Error processing download request",
            error: error?.message || "Internal server error"
        });
    }
};
exports.downloadOrderItem = downloadOrderItem;
// Admin APIs
const getAllOrdersAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = (req.query.search || "").trim();
        const paymentStatus = req.query.paymentStatus;
        const orderStatus = req.query.orderStatus;
        const deliveryType = req.query.deliveryType;
        const query = {};
        if (paymentStatus && paymentStatus !== "All" && paymentStatus !== "all") {
            query.paymentStatus = { $regex: new RegExp("^" + paymentStatus + "$", "i") };
        }
        if (orderStatus && orderStatus !== "All" && orderStatus !== "all") {
            query.orderStatus = { $regex: new RegExp("^" + orderStatus + "$", "i") };
        }
        if (deliveryType && deliveryType !== "All" && deliveryType !== "all") {
            query.deliveryType = { $regex: new RegExp("^" + deliveryType + "$", "i") };
        }
        if (search) {
            const searchRegex = new RegExp(search, "i");
            // Find matching user IDs
            const matchedUsers = await User_1.default.find({
                $or: [
                    { name: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex },
                    { enrolmentNo: searchRegex }
                ]
            }).select("_id");
            const userIds = matchedUsers.map(u => u._id);
            query.$or = [
                { user: { $in: userIds } },
                { "shippingAddress.name": searchRegex },
                { "shippingAddress.phone": searchRegex },
                { "shippingAddress.address": searchRegex },
                { "shippingAddress.state": searchRegex },
                { "shippingAddress.district": searchRegex },
                { "shippingAddress.city": searchRegex },
                { "shippingAddress.pincode": searchRegex },
                { razorpayOrderId: searchRegex },
                { razorpayPaymentId: searchRegex },
                { "items.code": searchRegex },
                { "items.title": searchRegex }
            ];
        }
        // 1. Fetch paginated orders
        const total = await Order_1.default.countDocuments(query);
        const orders = await Order_1.default.find(query)
            .populate("user", "name email phone enrolmentNo")
            .populate("items.product", "title code image fileUrl")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        // 2. Fetch overall payment analytics summary
        const [totalAll, paidAll, failedAll, pendingAll, revenueAgg] = await Promise.all([
            Order_1.default.countDocuments(),
            Order_1.default.countDocuments({ paymentStatus: "Paid" }),
            Order_1.default.countDocuments({ paymentStatus: "Failed" }),
            Order_1.default.countDocuments({ paymentStatus: "Pending" }),
            Order_1.default.aggregate([
                { $match: { paymentStatus: "Paid" } },
                { $group: { _id: null, total: { $sum: "$grandTotal" } } }
            ])
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
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
        });
    }
    catch (error) {
        console.error("GET ALL ORDERS ADMIN ERROR:", error);
        res.status(500).json({
            message: "Error fetching orders for admin",
            error: error?.message || "Internal server error"
        });
    }
};
exports.getAllOrdersAdmin = getAllOrdersAdmin;
const updateOrderStatusAdmin = async (req, res) => {
    try {
        const { paymentStatus, orderStatus, trackingNumber, courierName, adminNotes } = req.body;
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (paymentStatus)
            order.paymentStatus = paymentStatus;
        if (orderStatus)
            order.orderStatus = orderStatus;
        if (trackingNumber !== undefined)
            order.trackingNumber = trackingNumber;
        if (courierName !== undefined)
            order.courierName = courierName;
        if (adminNotes !== undefined)
            order.adminNotes = adminNotes;
        await order.save();
        const updated = await Order_1.default.findById(order._id)
            .populate("user", "name email phone")
            .populate("items.product", "title code image fileUrl");
        res.json({
            message: "Order updated successfully",
            order: updated
        });
    }
    catch (error) {
        console.error("UPDATE ORDER STATUS ERROR:", error);
        res.status(500).json({ message: "Error updating order" });
    }
};
exports.updateOrderStatusAdmin = updateOrderStatusAdmin;
const deleteOrderAdmin = async (req, res) => {
    try {
        const order = await Order_1.default.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.json({ message: "Order deleted successfully" });
    }
    catch (error) {
        console.error("DELETE ORDER ERROR:", error);
        res.status(500).json({ message: "Error deleting order" });
    }
};
exports.deleteOrderAdmin = deleteOrderAdmin;
// 1. Get ONLY Handwritten orders for Admin
const getHandwrittenOrdersAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = (req.query.search || "").trim();
        const paymentStatus = req.query.paymentStatus;
        const orderStatus = req.query.orderStatus;
        const query = {
            deliveryType: { $regex: /^handwritten$/i }
        };
        if (paymentStatus && paymentStatus !== "All" && paymentStatus !== "all") {
            query.paymentStatus = { $regex: new RegExp("^" + paymentStatus + "$", "i") };
        }
        if (orderStatus && orderStatus !== "All" && orderStatus !== "all") {
            query.orderStatus = { $regex: new RegExp("^" + orderStatus + "$", "i") };
        }
        if (search) {
            const searchRegex = new RegExp(search, "i");
            const matchedUsers = await User_1.default.find({
                $or: [
                    { name: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex },
                    { enrolmentNo: searchRegex }
                ]
            }).select("_id");
            const userIds = matchedUsers.map(u => u._id);
            query.$or = [
                { user: { $in: userIds } },
                { "shippingAddress.name": searchRegex },
                { "shippingAddress.phone": searchRegex },
                { "shippingAddress.city": searchRegex },
                { "shippingAddress.state": searchRegex },
                { "shippingAddress.district": searchRegex },
                { "shippingAddress.pincode": searchRegex },
                { "shippingAddress.address": searchRegex },
                { razorpayOrderId: searchRegex },
                { razorpayPaymentId: searchRegex },
                { trackingNumber: searchRegex },
                { courierName: searchRegex },
                { "items.code": searchRegex },
                { "items.title": searchRegex }
            ];
        }
        const total = await Order_1.default.countDocuments(query);
        const orders = await Order_1.default.find(query)
            .populate("user", "name email phone enrolmentNo")
            .populate("items.product", "title code image")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        // Summary counts for handwritten orders
        const [totalHandwritten, processingCount, dispatchedCount, deliveredCount, cancelledCount, paidCount, revenueAgg] = await Promise.all([
            Order_1.default.countDocuments({ deliveryType: { $regex: /^handwritten$/i } }),
            Order_1.default.countDocuments({ deliveryType: { $regex: /^handwritten$/i }, orderStatus: "Processing" }),
            Order_1.default.countDocuments({ deliveryType: { $regex: /^handwritten$/i }, orderStatus: "Dispatched" }),
            Order_1.default.countDocuments({ deliveryType: { $regex: /^handwritten$/i }, orderStatus: "Delivered" }),
            Order_1.default.countDocuments({ deliveryType: { $regex: /^handwritten$/i }, orderStatus: "Cancelled" }),
            Order_1.default.countDocuments({ deliveryType: { $regex: /^handwritten$/i }, paymentStatus: "Paid" }),
            Order_1.default.aggregate([
                { $match: { deliveryType: { $regex: /^handwritten$/i }, paymentStatus: "Paid" } },
                { $group: { _id: null, total: { $sum: "$grandTotal" } } }
            ])
        ]);
        const totalRevenue = revenueAgg.length > 0 ? (revenueAgg[0].total || 0) : 0;
        res.json({
            success: true,
            data: orders,
            summary: {
                totalOrders: totalHandwritten,
                processingOrders: processingCount,
                dispatchedOrders: dispatchedCount,
                deliveredOrders: deliveredCount,
                cancelledOrders: cancelledCount,
                paidOrders: paidCount,
                totalRevenue
            },
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error("GET HANDWRITTEN ORDERS ERROR:", error);
        res.status(500).json({
            message: "Error fetching handwritten orders",
            error: error?.message || "Internal server error"
        });
    }
};
exports.getHandwrittenOrdersAdmin = getHandwrittenOrdersAdmin;
// 2. Edit Handwritten Order with images and notify customer via Email
const updateHandwrittenOrderAdmin = async (req, res) => {
    try {
        const { orderStatus, paymentStatus, trackingNumber, courierName, adminNotes, notifyCustomer } = req.body;
        const order = await Order_1.default.findById(req.params.id)
            .populate("user", "name email phone enrolmentNo")
            .populate("items.product", "title code image");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Handle new uploaded proof/preview images via multer
        const uploadedImages = [];
        const files = req.files;
        if (Array.isArray(files) && files.length > 0) {
            for (const file of files) {
                const url = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, "ignoupower/handwritten_proofs");
                uploadedImages.push(url);
            }
        }
        else if (files && typeof files === "object") {
            const allFiles = Object.values(files).flat();
            for (const file of allFiles) {
                const url = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, "ignoupower/handwritten_proofs");
                uploadedImages.push(url);
            }
        }
        else if (req.file) {
            const url = await (0, cloudinary_1.uploadToCloudinary)(req.file.buffer, "ignoupower/handwritten_proofs");
            uploadedImages.push(url);
        }
        if (uploadedImages.length > 0) {
            order.previewImages = [...(order.previewImages || []), ...uploadedImages];
        }
        // Direct previewImages passed as array or string URLs
        if (req.body.previewImages) {
            let passedUrls = [];
            if (Array.isArray(req.body.previewImages)) {
                passedUrls = req.body.previewImages;
            }
            else if (typeof req.body.previewImages === "string") {
                try {
                    const parsed = JSON.parse(req.body.previewImages);
                    passedUrls = Array.isArray(parsed) ? parsed : [req.body.previewImages];
                }
                catch {
                    passedUrls = [req.body.previewImages];
                }
            }
            order.previewImages = Array.from(new Set([...(order.previewImages || []), ...passedUrls]));
        }
        if (orderStatus)
            order.orderStatus = orderStatus;
        if (paymentStatus)
            order.paymentStatus = paymentStatus;
        if (trackingNumber !== undefined)
            order.trackingNumber = trackingNumber;
        if (courierName !== undefined)
            order.courierName = courierName;
        if (adminNotes !== undefined)
            order.adminNotes = adminNotes;
        await order.save();
        // Send email to customer
        const userEmail = order.user?.email;
        const userName = order.user?.name || order.shippingAddress?.name || "Student";
        const shouldNotify = notifyCustomer !== false && notifyCustomer !== "false";
        if (shouldNotify && userEmail) {
            try {
                const itemsListHtml = order.items.map(i => `
          <li style="margin-bottom: 8px;">
            <strong>${i.code || "Item"}</strong> - ${i.title} (Qty: ${i.quantity})
          </li>
        `).join("");
                const imagesHtml = (order.previewImages && order.previewImages.length > 0) ? `
          <div style="margin-top: 15px;">
            <h4 style="color: #333; margin-bottom: 8px;">Attached Images / Preview Proof:</h4>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              ${order.previewImages.map(imgUrl => `
                <a href="${imgUrl}" target="_blank" style="display: inline-block; margin-right: 10px;">
                  <img src="${imgUrl}" alt="Proof" style="width: 140px; height: 140px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;" />
                </a>
              `).join("")}
            </div>
          </div>
        ` : "";
                const trackingHtml = order.trackingNumber ? `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 15px 0;">
            <p style="margin: 0; color: #166534; font-weight: 600;">🚚 Courier / Tracking Details:</p>
            <p style="margin: 4px 0 0 0; color: #15803d;">Courier: <strong>${order.courierName || "Speed Post"}</strong></p>
            <p style="margin: 2px 0 0 0; color: #15803d;">Tracking No: <strong>${order.trackingNumber}</strong></p>
          </div>
        ` : "";
                const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <h2 style="color: #4f46e5; margin-top: 0;">IGNOU Power - Handwritten Order Update</h2>
            <p>Dear <strong>${userName}</strong>,</p>
            <p>There is an update regarding your Handwritten Hardcopy Assignment order <strong>#${order._id}</strong>.</p>
            
            <div style="background: #f8fafc; padding: 14px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0 0 6px 0;"><strong>Order Status:</strong> <span style="color: #4f46e5; font-weight: bold;">${order.orderStatus}</span></p>
              <p style="margin: 0 0 6px 0;"><strong>Payment Status:</strong> ${order.paymentStatus}</p>
              <p style="margin: 0;"><strong>Total Amount:</strong> ₹${order.grandTotal}</p>
            </div>

            ${trackingHtml}

            <h4 style="margin-bottom: 6px;">Ordered Items:</h4>
            <ul style="padding-left: 20px; margin-top: 0;">
              ${itemsListHtml}
            </ul>

            ${order.adminNotes ? `<p><strong>Admin Note:</strong> ${order.adminNotes}</p>` : ""}

            ${imagesHtml}

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              If you have any questions, feel free to reply to this email or contact support.
            </p>
          </div>
        `;
                await (0, sendEmail_1.sendEmail)({
                    to: userEmail,
                    subject: `Order Update #${order._id} - ${order.orderStatus} (Handwritten Hardcopy)`,
                    html: emailHtml
                });
            }
            catch (emailErr) {
                console.error("Failed to send customer notification email:", emailErr);
            }
        }
        res.json({
            success: true,
            message: "Handwritten order updated and customer notified successfully",
            order
        });
    }
    catch (error) {
        console.error("UPDATE HANDWRITTEN ORDER ERROR:", error);
        res.status(500).json({
            message: "Error updating handwritten order",
            error: error?.message || "Internal server error"
        });
    }
};
exports.updateHandwrittenOrderAdmin = updateHandwrittenOrderAdmin;
// 3. Cancel Order & Automatic Razorpay Refund API
const cancelAndRefundOrderAdmin = async (req, res) => {
    try {
        const { cancellationReason, refundAmount: customRefundAmount } = req.body;
        const order = await Order_1.default.findById(req.params.id)
            .populate("user", "name email phone enrolmentNo")
            .populate("items.product", "title code");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.orderStatus === "Cancelled" && order.paymentStatus === "Refunded") {
            return res.status(400).json({ message: "Order is already cancelled and refunded" });
        }
        let refundResult = null;
        const finalRefundAmount = Number(customRefundAmount) || order.grandTotal || 0;
        // If order was Paid via Razorpay, trigger automatic refund
        if (order.paymentStatus === "Paid" && order.razorpayPaymentId) {
            try {
                const razorpay = getRazorpay();
                const amountInPaise = Math.round(finalRefundAmount * 100);
                refundResult = await razorpay.payments.refund(order.razorpayPaymentId, {
                    amount: amountInPaise,
                    notes: {
                        orderId: order._id.toString(),
                        reason: cancellationReason || "Order cancelled by admin"
                    }
                });
                order.refundId = refundResult?.id || "REFUND_SUCCESS";
                order.refundAmount = finalRefundAmount;
                order.paymentStatus = "Refunded";
            }
            catch (rzpErr) {
                console.error("Razorpay refund error:", rzpErr);
                return res.status(500).json({
                    message: "Failed to process Razorpay refund. Please check Razorpay keys or transaction status.",
                    error: rzpErr?.error?.description || rzpErr?.message || rzpErr
                });
            }
        }
        else {
            order.paymentStatus = order.paymentStatus === "Paid" ? "Refunded" : order.paymentStatus;
        }
        order.orderStatus = "Cancelled";
        order.cancellationReason = cancellationReason || "Order cancelled by admin";
        await order.save();
        // Send Cancellation & Refund email to user
        const userEmail = order.user?.email;
        const userName = order.user?.name || order.shippingAddress?.name || "Student";
        if (userEmail) {
            try {
                const refundInfoHtml = order.refundId ? `
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin: 15px 0;">
            <p style="margin: 0; color: #065f46; font-weight: 600;">💰 Refund Processed Successfully:</p>
            <p style="margin: 4px 0 0 0; color: #047857;">Refund ID: <strong>${order.refundId}</strong></p>
            <p style="margin: 2px 0 0 0; color: #047857;">Refund Amount: <strong>₹${order.refundAmount || order.grandTotal}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #047857;">The amount will reflect in your original payment method in 5-7 business days.</p>
          </div>
        ` : "";
                const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <h2 style="color: #dc2626; margin-top: 0;">Order Cancelled & Refund Notification</h2>
            <p>Dear <strong>${userName}</strong>,</p>
            <p>Your order <strong>#${order._id}</strong> has been cancelled.</p>
            
            <p><strong>Reason for cancellation:</strong> ${order.cancellationReason}</p>

            ${refundInfoHtml}

            <p style="margin-top: 20px; font-size: 13px; color: #64748b;">
              If you have any questions regarding your refund or cancellation, please reach out to our support team.
            </p>
          </div>
        `;
                await (0, sendEmail_1.sendEmail)({
                    to: userEmail,
                    subject: `Order #${order._id} Cancelled & Refund Initiated - IGNOU Power`,
                    html: emailHtml
                });
            }
            catch (emailErr) {
                console.error("Failed to send cancellation email:", emailErr);
            }
        }
        res.json({
            success: true,
            message: "Order cancelled and payment refund processed successfully",
            order,
            refund: refundResult
        });
    }
    catch (error) {
        console.error("CANCEL AND REFUND ERROR:", error);
        res.status(500).json({
            message: "Error cancelling order and processing refund",
            error: error?.message || "Internal server error"
        });
    }
};
exports.cancelAndRefundOrderAdmin = cancelAndRefundOrderAdmin;
