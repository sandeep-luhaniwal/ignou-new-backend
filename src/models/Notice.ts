import mongoose, { Schema, Document } from "mongoose"

export interface INotice extends Document {
  title: string
  description?: string
  link?: string
  category: "exam" | "admission" | "assignment" | "result" | "general"
  isImportant: boolean
  isActive: boolean
  publishDate?: Date
  createdAt: Date
  updatedAt: Date
}

const noticeSchema = new Schema<INotice>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    link: {
      type: String,
      default: ""
    },
    category: {
      type: String,
      enum: ["exam", "admission", "assignment", "result", "general"],
      default: "general"
    },
    isImportant: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    publishDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
)

export default mongoose.model<INotice>("Notice", noticeSchema)
