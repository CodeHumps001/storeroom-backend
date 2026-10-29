"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        // check if req.user.role is in the roles array
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: "failed",
                message: "You are not allowed to access this route",
            });
        }
        next();
    };
};
exports.default = restrictTo;
