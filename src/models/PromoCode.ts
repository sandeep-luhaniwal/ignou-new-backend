import mongoose, { Schema, Document } from "mongoose"

export interface IPromoCode extends Document {
  code: string
  description?: string
  discountType: "percentage" | "flat"
  discountValue: number
  minOrderAmount?: number
  maxDiscount?: number
  isActive: boolean
  usageLimit?: number
  usedCount: number
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const promoCodeSchema = new Schema<IPromoCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      default: ""
    },
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      default: "percentage"
    },
    discountValue: {
      type: Number,
      required: true,
      default: 10
    },
    minOrderAmount: {
      type: Number,
      default: 0
    },
    maxDiscount: {
      type: Number,
      default: 0 // 0 means no cap
    },
    isActive: {
      type: Boolean,
      default: true
    },
    usageLimit: {
      type: Number,
      default: 0 // 0 means unlimited
    },
    usedCount: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date
    }
  },
  { timestamps: true }
)

export default mongoose.model<IPromoCode>("PromoCode", promoCodeSchema)
