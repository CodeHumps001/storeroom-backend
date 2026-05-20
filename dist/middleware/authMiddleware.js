"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMIddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMIddleware = async (req, res, next) => {
    try {
        //1: read token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res
                .status(401)
                .json({ status: "failed", message: "token not found" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            organizationId: decoded.organizationId,
            role: decoded.role,
        };
        next();
    }
    catch (err) {
        return res
            .status(401)
            .json({ status: "failed", message: "Invalid or expired token" });
    }
};
exports.authMIddleware = authMIddleware;
