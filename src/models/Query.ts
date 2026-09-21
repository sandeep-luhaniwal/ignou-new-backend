import mongoose, { Schema, Document } from "mongoose"

export interface IQuery extends Document {
  name: string
  email: string
  phone?: string
  type: "contact" | "admission" | "project" | "assignment" | "general"
  message: string
  status: "Pending" | "In Progress" | "Resolved"
  adminReply?: string
  createdAt: Date
  updatedAt: Date
}

const querySchema = new Schema<IQuery>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      default: ""
    },
    type: {
      type: String,
      enum: ["contact", "admission", "project", "assignment", "general"],
      default: "contact"
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending"
    },
    adminReply: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
)

export default mongoose.model<IQuery>("Query", querySchema)
