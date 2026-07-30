import mongoose, { Schema, Document } from "mongoose"

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: string
  enrolmentNo?: string
  program?: string
  session?: string
  otp?: string
  otpExpiry?: Date
}

const userSchema = new Schema<IUser>({
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
    type: String
  },
  otpExpiry: {
    type: Date
  }
})

export default mongoose.model<IUser>("User", userSchema)