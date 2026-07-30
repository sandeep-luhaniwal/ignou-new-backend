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
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true
    }
});
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express_1.default.json());
app.use("/uploads", express_1.default.static("uploads"));
(0, db_1.default)();
app.use("/api/auth", authRoutes_1.default);
app.use("/api/products", productRoutes_1.default);
app.use("/api/assignments", productRoutes_1.default);
app.use("/api/category", categoryRoutes_1.default);
app.use("/api/comments", commentRoutes_1.default);
app.use("/api/orders", orderRoutes_1.default);
app.use("/api/queries", queryRoutes_1.default);
httpServer.listen(5000, () => {
    console.log("Server started on 5000");
});
