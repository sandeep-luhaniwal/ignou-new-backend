"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
require("dotenv/config");
const cloudinary_1 = require("cloudinary");
const pdfWatermark_1 = require("./pdfWatermark");
const getCloudinary = () => {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return cloudinary_1.v2;
};
const uploadToCloudinary = async (fileBuffer, folder = "ignoupower", watermarkText = "IGNOU-POWER") => {
    let finalBuffer = fileBuffer;
    // Automatically apply watermark if the uploaded file is a PDF
    if ((0, pdfWatermark_1.isPdfBuffer)(fileBuffer)) {
        try {
            finalBuffer = await (0, pdfWatermark_1.addWatermarkToPdf)(fileBuffer, watermarkText);
        }
        catch (err) {
            console.warn("Watermarking failed, uploading original PDF:", err);
        }
    }
    return new Promise((resolve, reject) => {
        const cloud = getCloudinary();
        const uploadStream = cloud.uploader.upload_stream({
            folder,
            resource_type: "auto"
        }, (error, result) => {
            if (error) {
                console.error("Cloudinary upload error:", error);
                return reject(error);
            }
            if (result) {
                return resolve(result.secure_url);
            }
            return reject(new Error("Cloudinary upload failed"));
        });
        uploadStream.end(finalBuffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
