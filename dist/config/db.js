"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dns_1 = __importDefault(require("dns"));
const connectDB = async () => {
    try {
        // Force Node.js to use Google's public DNS servers to resolve MongoDB SRV records
        dns_1.default.setServers(["8.8.8.8", "8.8.4.4"]);
        await mongoose_1.default.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
};
exports.default = connectDB;
