import mongoose, { Schema, Document } from "mongoose"

export interface ITempUser extends Document {
  name: string
  email: string
  password: string
  role: string
  enrolmentNo?: string
  program?: string
  session?: string
  otp: string
  createdAt: Date
}

const tempUserSchema = new Schema<ITempUser>({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: "user"
  },
  enrolmentNo: {
    type: String,
    default: ""
  },
  program: {
    type: String,
    default: ""
  },
  session: {
    type: String,
    default: ""
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: 300 } // Automatically expires and gets deleted after 5 minutes (300 seconds)
  }
})

export default mongoose.model<ITempUser>("TempUser", tempUserSchema)
