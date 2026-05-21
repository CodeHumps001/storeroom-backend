"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const mailer_1 = __importDefault(require("../lib/mailer"));
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
        await mailer_1.default.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: "Welcome to Storeroom",
            html: `
    <h2>You have been invited to join ${newUser.organization.organizationName}</h2>
    <p>Your login credentials:</p>
    <p>Email: ${email}</p>
    <p>Temporary Password: ${tempPassword}</p>
    <p>Please login and change your password.</p>
  `,
        });
        res
            .status(201)
            .json({ status: "success", message: "Cashier added successfully" });
    }
    catch (err) {
        res.status(500).json({ status: "failed", message: err.message });
    }
};
exports.default = inviteStaff;
