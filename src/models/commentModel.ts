import mongoose from "mongoose"

const commentSchema = new mongoose.Schema(
{
product:{
type:mongoose.Schema.Types.ObjectId,
ref:"Product",
required:true
},

user:{
type:mongoose.Schema.Types.ObjectId,
ref:"User",
required:true
},

message:{
type:String,
required:true
},

role:{
type:String,
enum:["admin","client"],
required:true
}

},
{timestamps:true}
)

export default mongoose.model("Comment",commentSchema)