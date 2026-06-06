"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const inviteStaff = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const { name, email } = req.body;
        const userExist = await prisma_1.default.user.findUnique({ where: { email } });
        if (userExist) {
            return res
                .status(409)
                .json({ status: "failed", message: "User already exist" });
        }
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashTempPass = await bcrypt_1.default.hash(tempPassword, 10);
        const newUser = await prisma_1.default.user.create({
            data: {
                name,
                email,
                role: "CASHIER",
                password: hashTempPass,
                organizationId: req.user.organizationId,
            },
            include: {
                organization: {
                    select: { organizationName: true },
                },
            },
        });
        // Send email using Brevo API (fetch)
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": process.env.BREVO_API_KEY,
            },
            body: JSON.stringify({
                sender: { name: "Storeroom", email: "codehumps00233@gmail.com" },
                to: [{ email: email }],
                subject: "Welcome to Storeroom",
                htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Welcome to Storeroom</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; }
              .container { max-width: 500px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f97316; }
              .logo { font-size: 24px; font-weight: bold; }
              .logo span:first-child { color: #000; }
              .logo span:last-child { color: #f97316; }
              .content { padding: 30px 0; }
              .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">
                  <span>Store</span><span>room</span>
                </div>
              </div>
              <div class="content">
                <h2>You have been invited to join ${newUser.organization.organizationName}</h2>
                <p>Your login credentials:</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                <p>Please login and change your password.</p>
                <p><a href="${process.env.FRONTEND_URL}login" style="display: inline-block; background-color: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Storeroom</a></p>
              </div>
              <div class="footer">
                <p>Storeroom · Smart Inventory Management for African Businesses</p>
              </div>
            </div>
          </body>
          </html>
        `,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Brevo API error:", errorData);
            throw new Error("Failed to send invitation email");
        }
        res
            .status(201)
            .json({ status: "success", message: "Cashier added successfully" });
    }
    catch (err) {
        res.status(500).json({ status: "failed", message: err.message });
    }
};
const getStaff = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const staff = await prisma_1.default.user.findMany({
            where: { organizationId: req.user.organizationId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        res.status(200).json({ status: "success", data: staff });
    }
    catch (err) {
        res.status(500).json({ status: "failed", message: err.message });
    }
};
const deleteStaff = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const { id } = req.params;
        // Prevent deleting yourself
        if (id === req.user.userId) {
            return res.status(400).json({
                status: "failed",
                message: "You cannot remove yourself",
            });
        }
        await prisma_1.default.user.delete({
            where: { id, organizationId: req.user.organizationId },
        });
        res
            .status(200)
            .json({ status: "success", message: "Staff member removed" });
    }
    catch (err) {
        res.status(500).json({ status: "failed", message: err.message });
    }
};
exports.default = { inviteStaff, getStaff, deleteStaff };
