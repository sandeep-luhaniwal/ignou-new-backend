"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const orderSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [
        {
            product: {
                type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
exports.default = mongoose_1.default.model("Order", orderSchema);
