import mongoose, { Schema, Document } from "mongoose"

export interface IProduct extends Document {
  title: string
  price: number
  oldPrice?: number
  description: string
  image: string
  category: mongoose.Types.ObjectId
  subCategory: mongoose.Types.ObjectId
  code?: string
  year?: string
  rating?: number
  reviews?: number
}

const productSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    oldPrice: {
      type: Number
    },

    description: String,

    image: String,
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
      trim: true
    },

    year: {
      type: String,
      trim: true
    },

    rating: {
      type: Number,
      default: 5
    },

    reviews: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

export default mongoose.model<IProduct>("Product", productSchema)