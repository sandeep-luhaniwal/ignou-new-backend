import mongoose, { Schema, Document } from "mongoose"

export interface IQuery extends Document {
  name: string
  email: string
  phone?: string
  type: "contact" | "admission" | "project"
  message: string
  createdAt: Date
  updatedAt: Date
}

const querySchema = new Schema<IQuery>(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String
    },
    type: {
      type: String,
      enum: ["contact", "admission", "project"],
      required: true
    },
    message: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
)

export default mongoose.model<IQuery>("Query", querySchema)
