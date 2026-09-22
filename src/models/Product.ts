import mongoose, { Schema, Document } from "mongoose"

export interface IProduct extends Document {
  title: string
  price: number
  oldPrice?: number
  description?: string
  image?: string
  fileUrl?: string
  questionPaperUrl?: string
  questionPageUrl?: string
  category: mongoose.Types.ObjectId
  subCategory?: mongoose.Types.ObjectId
  code?: string
  year?: string
  session?: string
  semester?: string
  program?: string
  productType?: "assignment" | "handwritten" | "project" | "synopsis" | "ebook" | "guide"
  rating?: number
  reviews?: number
  isFeatured?: boolean
  inStock?: boolean
  createdAt: Date
  updatedAt: Date
}

const productSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true
    },
    oldPrice: {
      type: Number,
      default: 0
    },
    description: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      default: ""
    },
    fileUrl: {
      type: String,
      default: ""
    },
    questionPaperUrl: {
      type: String,
      default: ""
    },
    questionPageUrl: {
      type: String,
      default: ""
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    subCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category"
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: ""
    },
    year: {
      type: String,
      trim: true,
      default: ""
    },
    session: {
      type: String,
      trim: true,
      default: ""
    },
    semester: {
      type: String,
      trim: true,
      default: ""
    },
    program: {
      type: String,
      trim: true,
      uppercase: true,
      default: ""
    },
    productType: {
      type: String,
      enum: ["assignment", "handwritten", "project", "synopsis", "ebook", "guide"],
      default: "assignment"
    },
    rating: {
      type: Number,
      default: 5
    },
    reviews: {
      type: Number,
      default: 0
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    inStock: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

export default mongoose.model<IProduct>("Product", productSchema)