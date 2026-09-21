import express, { Request, Response, NextFunction } from "express"
import dotenv from "dotenv"
import cors from "cors"
import { createServer } from "http"
import { Server } from "socket.io"
import connectDB from "./config/db"
import authRoutes from "./routes/authRoutes"
import productRoutes from "./routes/productRoutes"
import categoryRoutes from "./routes/categoryRoutes"
import commentRoutes from "./routes/commentRoutes"
import orderRoutes from "./routes/orderRoutes"
import queryRoutes from "./routes/queryRoutes"
import noticeRoutes from "./routes/noticeRoutes"
import adminRoutes from "./routes/adminRoutes"

dotenv.config()

const app = express()
const httpServer = createServer(app)

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "https://ignoupower.shop",
  "https://ignoupower.shop/",
  "https://admin.ignoupower.shop",
  "https://admin.ignoupower.shop/"
]

export const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith("ignoupower.shop")) {
        callback(null, true)
      } else {
        callback(null, true) // Allow during dev/preview
      }
    },
    credentials: true
  }
})

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id)
  
  socket.on("join-product", (productId) => {
    socket.join(productId)
    console.log(`Socket ${socket.id} joined room ${productId}`)
  })

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id)
  })
})

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith("ignoupower.shop")) {
      callback(null, true)
    } else {
      callback(null, true) // Allow development origins
    }
  },
  credentials: true
}))

app.use(express.json({ limit: "20mb" }))
app.use(express.urlencoded({ extended: true, limit: "20mb" }))
app.use("/uploads", express.static("uploads"))

// Connect to Database
connectDB()

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "IGNOUPower Backend API"
  })
})

// Application Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/assignments", productRoutes)
app.use("/api/category", categoryRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/queries", queryRoutes)
app.use("/api/notices", noticeRoutes)
app.use("/api/admin", adminRoutes)

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `API route ${req.method} ${req.originalUrl} not found` })
})

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("GLOBAL SERVER ERROR:", err)
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  })
})

const PORT = process.env.PORT || 5000

httpServer.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`)
})