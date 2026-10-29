"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const initializePayment = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const { amount } = req.body;
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.userId },
            select: { email: true },
        });
        if (!user) {
            return res
                .status(404)
                .json({ status: "failed", message: "User not found" });
        }
        const response = await axios_1.default.post("https://api.paystack.co/transaction/initialize", {
            email: user.email,
            amount: amount * 100,
            callback_url: `${process.env.FRONTEND_URL}/settings?payment=success`,
        }, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
        });
        res.status(200).json({
            status: "success",
            data: {
                authorizationUrl: response.data.data.authorization_url,
                reference: response.data.data.reference,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
const handleWebhook = async (req, res) => {
    try {
        ("Webhook hit");
        // Get raw body for signature verification
        const rawBody = req.body instanceof Buffer
            ? req.body.toString("utf8")
            : JSON.stringify(req.body);
        const hash = crypto_1.default
            .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
            .update(rawBody)
            .digest("hex");
        const paystackSignature = req.headers["x-paystack-signature"];
        if (hash !== paystackSignature) {
            return res
                .status(401)
                .json({ status: "failed", message: "Invalid signature" });
        }
        const event = req.body instanceof Buffer
            ? JSON.parse(req.body.toString("utf8"))
            : req.body;
        if (event.event === "charge.success") {
            const customerEmail = event.data.customer.email;
            const user = await prisma_1.default.user.findUnique({
                where: { email: customerEmail },
            });
            if (!user) {
                return res.status(200).json({ status: "success" });
            }
            await prisma_1.default.organization.update({
                where: { id: user.organizationId },
                data: {
                    plan: "PRO",
                    subscriptionStatus: "ACTIVE",
                    subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });
        }
        res.status(200).json({ status: "success" });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
exports.default = { initializePayment, handleWebhook };
