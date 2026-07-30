"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = void 0;
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role.toLowerCase() === "admin") {
        next();
    }
    else {
        res.status(403).json({
            message: "Admin access required"
        });
    }
};
exports.adminOnly = adminOnly;
