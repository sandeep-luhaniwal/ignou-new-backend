import "dotenv/config"
import { v2 as cloudinary } from "cloudinary"
import { addWatermarkToPdf, isPdfBuffer } from "./pdfWatermark"

const getCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  return cloudinary
}

export const uploadToCloudinary = async (
  fileBuffer: Buffer, 
  folder: string = "ignoupower",
  watermarkText: string = "IGNOU-POWER"
): Promise<string> => {
  let finalBuffer = fileBuffer

  // Automatically apply watermark if the uploaded file is a PDF
  if (isPdfBuffer(fileBuffer)) {
    try {
      finalBuffer = await addWatermarkToPdf(fileBuffer, watermarkText)
    } catch (err) {
      console.warn("Watermarking failed, uploading original PDF:", err)
    }
  }

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
    uploadStream.end(finalBuffer);
  });
};
