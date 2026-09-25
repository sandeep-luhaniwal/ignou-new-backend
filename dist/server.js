"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const db_1 = __importDefault(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const queryRoutes_1 = __importDefault(require("./routes/queryRoutes"));
const noticeRoutes_1 = __importDefault(require("./routes/noticeRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const promoRoutes_1 = __importDefault(require("./routes/promoRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://ignoupower.shop",
    "https://ignoupower.shop/",
    "https://admin.ignoupower.shop",
    "https://admin.ignoupower.shop/"
];
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin) || origin.endsWith("ignoupower.shop")) {
                callback(null, true);
            }
            else {
                callback(null, true); // Allow during dev/preview
            }
        },
        credentials: true
    }
});
exports.io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.on("join-product", (productId) => {
        socket.join(productId);
        console.log(`Socket ${socket.id} joined room ${productId}`);
    });
    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
    });
});
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith("ignoupower.shop")) {
            callback(null, true);
        }
        else {
            callback(null, true); // Allow development origins
        }
    },
    credentials: true
}));
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express_1.default.static("uploads"));
// Connect to Database
(0, db_1.default)();
// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "IGNOUPower Backend API"
    });
});
// Application Routes
app.use("/api/auth", authRoutes_1.default);
app.use("/api/users", authRoutes_1.default);
app.use("/api/products", productRoutes_1.default);
app.use("/api/assignments", productRoutes_1.default);
app.use("/api/category", categoryRoutes_1.default);
app.use("/api/comments", commentRoutes_1.default);
app.use("/api/orders", orderRoutes_1.default);
app.use("/api/promos", promoRoutes_1.default);
app.use("/api/coupons", promoRoutes_1.default);
app.use("/api/queries", queryRoutes_1.default);
app.use("/api/notices", noticeRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/payments", paymentRoutes_1.default);
app.use("/api/payment-history", paymentRoutes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: `API route ${req.method} ${req.originalUrl} not found` });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error("GLOBAL SERVER ERROR:", err);
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error"
    });
});
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
