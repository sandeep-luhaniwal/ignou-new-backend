import mongoose, { Schema, Document } from "mongoose"

export interface ICategory extends Document {
    name: string
    parent?: string
}

const categorySchema = new Schema<ICategory>(
    {
        name: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        parent: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null
        }
    },
    { timestamps: true }
)

categorySchema.index(
    { name: 1, parent: 1 },
    { unique: true }
)

export default mongoose.model<ICategory>("Category", categorySchema)