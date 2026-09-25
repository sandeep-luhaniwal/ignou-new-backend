"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
require("dotenv/config");
const cloudinary_1 = require("cloudinary");
const getCloudinary = () => {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return cloudinary_1.v2;
};
const uploadToCloudinary = (fileBuffer, folder = "ignoupower") => {
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
        uploadStream.end(fileBuffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
