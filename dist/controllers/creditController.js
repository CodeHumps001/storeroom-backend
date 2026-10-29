"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
// Create credit
const createCredit = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const { customerName, customerPhone, amount, note } = req.body;
        if (!customerName || !amount) {
            return res.status(400).json({
                status: "failed",
                message: "Customer name and amount are required",
            });
        }
        const credit = await prisma_1.default.credit.create({
            data: {
                customerName,
                customerPhone,
                amount: parseFloat(amount),
                note,
                organizationId: req.user.organizationId,
            },
        });
        res.status(201).json({
            status: "success",
            message: "Credit record created successfully",
            data: credit,
        });
    }
    catch (err) {
        res.status(500).json({ status: "failed", message: err.message });
    }
};
// Get all credits
const getCredits = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const credits = await prisma_1.default.credit.findMany({
            where: { organizationId: req.user.organizationId },
            orderBy: { createdAt: "desc" },
        });
        const totalOwed = credits
            .filter((c) => !c.isPaid)
            .reduce((sum, c) => sum + (c.amount - c.amountPaid), 0);
        res.status(200).json({
            status: "success",
            data: credits,
            meta: {
                total: credits.length,
                unpaid: credits.filter((c) => !c.isPaid).length,
                totalOwed,
            },
        });
    }
    catch (err) {
        res.status(500).json({ status: "failed", message: err.message });
    }
};
// Record a payment
const recordPayment = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const { id } = req.params;
        const { amountPaid } = req.body;
        const credit = await prisma_1.default.credit.findUnique({
            where: { id, organizationId: req.user.organizationId },
        });
        if (!credit) {
            return res
                .status(404)
                .json({ status: "failed", message: "Credit record not found" });
        }
        const newAmountPaid = credit.amountPaid + parseFloat(amountPaid);
        const isPaid = newAmountPaid >= credit.amount;
        const updated = await prisma_1.default.credit.update({
            where: { id },
            data: {
                amountPaid: newAmountPaid,
                isPaid,
            },
        });
        res.status(200).json({
            status: "success",
            message: isPaid ? "Credit fully paid!" : "Payment recorded",
            data: updated,
        });
    }
    catch (err) {
        res.status(500).json({ status: "failed", message: err.message });
    }
};
// Delete credit
const deleteCredit = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const { id } = req.params;
        const credit = await prisma_1.default.credit.findUnique({
            where: { id, organizationId: req.user.organizationId },
        });
        if (!credit) {
            return res
                .status(404)
                .json({ status: "failed", message: "Credit record not found" });
        }
        await prisma_1.default.credit.delete({ where: { id } });
        res.status(200).json({
            status: "success",
            message: "Credit record deleted",
        });
    }
    catch (err) {
        res.status(500).json({ status: "failed", message: err.message });
    }
};
exports.default = { createCredit, getCredits, recordPayment, deleteCredit };
