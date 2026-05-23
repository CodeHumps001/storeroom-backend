"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const gatingFeature = async (req, res, next) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const organizationId = req.user.organizationId;
        const result = await prisma_1.default.organization.findUnique({
            where: { id: organizationId },
        });
        if (!result) {
            return res.status(404).json({ status: "failed", message: "Not found" });
        }
        if (result.plan === "FREE" || result.subscriptionStatus !== "ACTIVE") {
            return res.status(403).json({
                status: "failed",
                message: "Please upgrade to continue using this feature",
            });
        }
        if (result.subscriptionExpiry && result.subscriptionExpiry < new Date()) {
            return res.status(403).json({
                status: "failed",
                message: "Subscription expired. Please renew.",
            });
        }
        next();
    }
    catch (err) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
};
exports.default = gatingFeature;
