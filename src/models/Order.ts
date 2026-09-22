import mongoose, { Schema, Document } from "mongoose"

export interface IOrderItem {
  product: mongoose.Types.ObjectId
  code: string
  title: string
  price: number
  quantity: number
  session?: string
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
    district?: string
  }
  subtotal: number
  shippingFee: number
  discount: number
  grandTotal: number
  appliedPromo?: string
  paymentStatus: "Pending" | "Paid" | "Failed" | "Refunded"
  orderStatus: "Processing" | "Dispatched" | "Delivered" | "Completed" | "Cancelled"
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  refundId?: string
  refundAmount?: number
  cancellationReason?: string
  previewImages?: string[]
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
        session: {
          type: String,
          default: ""
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
      state: String,
      district: String
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
    appliedPromo: {
      type: String,
      default: ""
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
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
    refundId: {
      type: String,
      default: ""
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    cancellationReason: {
      type: String,
      default: ""
    },
    previewImages: {
      type: [String],
      default: []
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

