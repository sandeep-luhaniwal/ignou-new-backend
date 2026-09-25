import "dotenv/config"
import { v2 as cloudinary } from "cloudinary"

const getCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  return cloudinary
}

export const uploadToCloudinary = (fileBuffer: Buffer, folder: string = "ignoupower"): Promise<string> => {
  return new Promise((resolve, reject) => {
    const cloud = getCloudinary()
    const uploadStream = cloud.uploader.upload_stream(
      { 
        folder,
        resource_type: "auto"
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        if (result) {
          return resolve(result.secure_url);
        }
        return reject(new Error("Cloudinary upload failed"));
      }
    );
    uploadStream.end(fileBuffer);
  });
};
