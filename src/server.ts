import express from "express"
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

dotenv.config()

const app = express()
const httpServer = createServer(app)
export const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://ignoupower.shop", "https://ignoupower.shop/"],
    credentials: true
  }
})

app.use(cors({
  origin: ["http://localhost:3000", "https://ignoupower.shop", "https://ignoupower.shop/"],
  credentials: true
}))

app.use(express.json())
app.use("/uploads", express.static("uploads"))

connectDB()

app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/assignments", productRoutes)
app.use("/api/category", categoryRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/queries", queryRoutes)

httpServer.listen(5000, () => {
  console.log("Server started on 5000")
})