import mongoose from "mongoose"
import dns from "dns"

const connectDB = async () => {
  try {
    // Force Node.js to use Google's public DNS servers to resolve MongoDB SRV records
    dns.setServers(["8.8.8.8", "8.8.4.4"])
    
    await mongoose.connect(process.env.MONGO_URI as string)
    console.log("MongoDB Connected")
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

export default connectDB