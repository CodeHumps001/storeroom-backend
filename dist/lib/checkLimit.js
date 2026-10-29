"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkProductLimit = checkProductLimit;
const prisma_1 = __importDefault(require("./prisma"));
async function checkProductLimit(organizationId, res) {
    // Get organization with plan info
    const org = await prisma_1.default.organization.findUnique({
        where: { id: organizationId },
        select: { plan: true, trialEnd: true },
    });
    if (!org) {
        return res
            .status(404)
            .json({ status: "failed", message: "Organization not found" });
    }
    // Check if trial is still active
    const now = new Date();
    const trialEnd = org.trialEnd;
    const isTrialActive = trialEnd ? trialEnd > now : false;
    // FREE plan with no active trial = limited
    const isFreeRestricted = org.plan === "FREE" && !isTrialActive;
    if (isFreeRestricted) {
        // Count current products
        const productCount = await prisma_1.default.product.count({
            where: { organizationId },
        });
        if (productCount >= 50) {
            return res.status(403).json({
                status: "failed",
                message: "Free plan limited to 50 products. Upgrade to PRO for unlimited products.",
                currentCount: productCount,
                limit: 50,
            });
        }
    }
    return null; // No error, proceed
}
