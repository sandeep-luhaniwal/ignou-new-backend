import mongoose, { Schema, Document } from "mongoose"

export interface IOrderItem {
  product: mongoose.Types.ObjectId
  code: string
  title: string
  price: number
  quantity: number
  fileUrl?: string
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
    city?: string
    state?: string
  }
  subtotal: number
  shippingFee: number
  discount: number
  grandTotal: number
  paymentStatus: "Pending" | "Paid" | "Failed"
  orderStatus: "Processing" | "Dispatched" | "Delivered" | "Completed" | "Cancelled"
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  trackingNumber?: string
  courierName?: string
  adminNotes?: string
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
          default: ""
        },
        title: {
          type: String,
          default: ""
        },
        price: {
          type: Number,
          default: 0
        },
        quantity: {
          type: Number,
          default: 1
        },
        fileUrl: {
          type: String,
          default: ""
        }
      }
    ],
    deliveryType: {
      type: String,
      enum: ["PDF", "Handwritten"],
      default: "PDF"
    },
    shippingAddress: {
      name: String,
      phone: String,
      address: String,
      pincode: String,
      city: String,
      state: String
    },
    subtotal: {
      type: Number,
      default: 0
    },
    shippingFee: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    grandTotal: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending"
    },
    orderStatus: {
      type: String,
      enum: ["Processing", "Dispatched", "Delivered", "Completed", "Cancelled"],
      default: "Processing"
    },
    razorpayOrderId: {
      type: String
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    },
    trackingNumber: {
      type: String,
      default: ""
    },
    courierName: {
      type: String,
      default: ""
    },
    adminNotes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
)

export default mongoose.model<IOrder>("Order", orderSchema)
