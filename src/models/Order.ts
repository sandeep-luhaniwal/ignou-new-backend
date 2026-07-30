import mongoose, { Schema, Document } from "mongoose"

export interface IOrderItem {
  product: mongoose.Types.ObjectId
  code: string
  title: string
  price: number
  quantity: number
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId
  items: IOrderItem[]
  deliveryType: "PDF" | "Handwritten"
  shippingAddress?: {
    name: string
    phone: string
    address: string
    pincode: string
  }
  subtotal: number
  shippingFee: number
  discount: number
  grandTotal: number
  paymentStatus: "Pending" | "Paid" | "Failed"
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  createdAt: Date
  updatedAt: Date
}

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        code: {
          type: String,
          required: true
        },
        title: {
          type: String,
          required: true
        },
        price: {
          type: Number,
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          default: 1
        }
      }
    ],
    deliveryType: {
      type: String,
      enum: ["PDF", "Handwritten"],
      required: true
    },
    shippingAddress: {
      name: String,
      phone: String,
      address: String,
      pincode: String
    },
    subtotal: {
      type: Number,
      required: true
    },
    shippingFee: {
      type: Number,
      required: true,
      default: 0
    },
    discount: {
      type: Number,
      required: true,
      default: 0
    },
    grandTotal: {
      type: Number,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending"
    },
    razorpayOrderId: {
      type: String
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    }
  },
  { timestamps: true }
)

export default mongoose.model<IOrder>("Order", orderSchema)
