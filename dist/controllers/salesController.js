"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const createSale = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const organizationId = req.user.organizationId;
        const userId = req.user.userId;
        const { items, amountPaid, paymentMethod } = req.body;
        // Step 1: Validate stock for every item
        let totalAmount = 0;
        const productSnapshots = [];
        for (const item of items) {
            const product = await prisma_1.default.product.findUnique({
                where: { id: item.productId, organizationId },
            });
            if (!product) {
                return res.status(404).json({
                    status: "failed",
                    message: `Product ${item.productId} not found`,
                });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({
                    status: "failed",
                    message: `Not enough stock for ${product.name}. Available: ${product.quantity}`,
                });
            }
            totalAmount += product.sellingPrice * item.quantity;
            productSnapshots.push({
                productId: product.id,
                quantity: item.quantity,
                priceAtSale: product.sellingPrice,
            });
        }
        if (amountPaid < totalAmount) {
            return res.status(400).json({
                status: "failed",
                message: "Amount paid is less than total amount",
            });
        }
        // Step 2: Create Sale + SaleItems + decrement stock in one transaction
        const sale = await prisma_1.default.$transaction(async (tx) => {
            // Create the sale
            const change = amountPaid - totalAmount;
            const newSale = await tx.sale.create({
                data: {
                    totalAmount,
                    amountPaid,
                    change,
                    paymentMethod,
                    organizationId,
                    userId,
                    items: {
                        create: productSnapshots.map((snapshot) => ({
                            productId: snapshot.productId,
                            quantity: snapshot.quantity,
                            priceAtSale: snapshot.priceAtSale,
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });
            // Decrement stock for each product
            for (const snapshot of productSnapshots) {
                await tx.product.update({
                    where: { id: snapshot.productId },
                    data: { quantity: { decrement: snapshot.quantity } },
                });
            }
            return newSale;
        });
        res.status(201).json({
            status: "success",
            message: "Sale recorded successfully",
            data: sale,
        });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
const getSales = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const sales = await prisma_1.default.sale.findMany({
            where: { organizationId: req.user.organizationId },
            include: { items: true },
        });
        res.status(200).json({ status: "success", data: sales });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
const getSale = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const { id } = req.params;
        const sale = await prisma_1.default.sale.findUnique({
            where: { id, organizationId: req.user.organizationId },
            include: { items: true },
        });
        if (!sale) {
            return res
                .status(404)
                .json({ status: "failed", message: "Sale not found" });
        }
        res.status(200).json({ status: "success", data: sale });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
//PDF RECEIPT
const generateReceipt = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const { id } = req.params;
        const sale = await prisma_1.default.sale.findFirst({
            where: { id, organizationId: req.user.organizationId },
            include: {
                items: {
                    include: {
                        product: { select: { name: true } },
                    },
                },
                organization: {
                    select: { organizationName: true, location: true, contact: true },
                },
            },
        });
        if (!sale) {
            return res
                .status(404)
                .json({ status: "failed", message: "Sale not found" });
        }
        const doc = new pdfkit_1.default({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=receipt-${id}.pdf`);
        doc.pipe(res);
        const strokeColor = "#E4E4E7";
        const primaryTextColor = "#18181B";
        const secondaryTextColor = "#71717A";
        const accentColor = "#16A34A"; // Green accent for totals
        // ── HEADER ──────────────────────────────────────────────
        doc
            .fillColor(primaryTextColor)
            .fontSize(22)
            .font("Helvetica-Bold")
            .text(sale.organization.organizationName, 50, 50);
        doc
            .fillColor(secondaryTextColor)
            .fontSize(9)
            .font("Helvetica")
            .text(sale.organization.location)
            .text(sale.organization.contact);
        doc
            .fillColor(primaryTextColor)
            .fontSize(16)
            .font("Helvetica-Bold")
            .text("RECEIPT", 400, 50, { align: "right", width: 160 });
        doc
            .fillColor(secondaryTextColor)
            .fontSize(9)
            .font("Helvetica")
            .text(`ID: #${id.slice(-8).toUpperCase()}`, 400, 72, {
            align: "right",
            width: 160,
        })
            .text(`Date: ${new Date(sale.createdAt).toLocaleDateString()}`, 400, 85, {
            align: "right",
            width: 160,
        });
        // ── DIVIDER ─────────────────────────────────────────────
        doc.moveDown(2);
        doc
            .moveTo(50, doc.y)
            .lineTo(560, doc.y)
            .strokeColor(strokeColor)
            .lineWidth(1)
            .stroke();
        doc.moveDown(1.5);
        // ── TABLE HEADERS ────────────────────────────────────────
        const currentY = doc.y;
        doc.fillColor(secondaryTextColor).fontSize(9).font("Helvetica-Bold");
        doc.text("ITEM DESCRIPTION", 50, currentY, { width: 240 });
        doc.text("QTY", 300, currentY, { width: 50, align: "center" });
        doc.text("PRICE", 360, currentY, { width: 90, align: "right" });
        doc.text("SUBTOTAL", 460, currentY, { width: 100, align: "right" });
        doc.moveDown(0.8);
        doc
            .moveTo(50, doc.y)
            .lineTo(560, doc.y)
            .strokeColor(strokeColor)
            .lineWidth(1)
            .stroke();
        doc.moveDown(0.8);
        // ── ITEMS ────────────────────────────────────────────────
        doc.fillColor(primaryTextColor);
        for (const item of sale.items) {
            const subtotal = item.quantity * item.priceAtSale;
            const itemY = doc.y;
            doc
                .font("Helvetica-Bold")
                .fontSize(10)
                .text(item.product.name, 50, itemY, { width: 240 });
            doc.font("Helvetica").fontSize(10);
            doc.text(String(item.quantity), 300, itemY, {
                width: 50,
                align: "center",
            });
            doc.text(`GHS ${item.priceAtSale.toFixed(2)}`, 360, itemY, {
                width: 90,
                align: "right",
            });
            doc
                .font("Helvetica-Bold")
                .text(`GHS ${subtotal.toFixed(2)}`, 460, itemY, {
                width: 100,
                align: "right",
            });
            doc.moveDown(1.2);
        }
        // ── TOTALS SECTION ───────────────────────────────────────
        doc
            .moveTo(350, doc.y)
            .lineTo(560, doc.y)
            .strokeColor(strokeColor)
            .lineWidth(1)
            .stroke();
        doc.moveDown(1);
        // Total Due
        const totalY = doc.y;
        doc.fillColor(secondaryTextColor).font("Helvetica-Bold").fontSize(10);
        doc.text("TOTAL DUE", 350, totalY, { width: 100, align: "left" });
        doc.fillColor(accentColor).fontSize(16).font("Helvetica-Bold");
        doc.text(`GHS ${sale.totalAmount.toFixed(2)}`, 450, totalY - 5, {
            width: 110,
            align: "right",
        });
        doc.moveDown(1.5);
        // Payment Method
        if (sale.paymentMethod) {
            const pmY = doc.y;
            doc.fillColor(secondaryTextColor).font("Helvetica").fontSize(9);
            doc.text("Payment Method", 350, pmY, { width: 110, align: "left" });
            doc.fillColor(primaryTextColor).font("Helvetica-Bold").fontSize(9);
            doc.text(sale.paymentMethod, 460, pmY, { width: 100, align: "right" });
            doc.moveDown(0.8);
        }
        // Amount Paid
        if (sale.amountPaid) {
            const apY = doc.y;
            doc.fillColor(secondaryTextColor).font("Helvetica").fontSize(9);
            doc.text("Amount Paid", 350, apY, { width: 110, align: "left" });
            doc.fillColor(primaryTextColor).font("Helvetica-Bold").fontSize(9);
            doc.text(`GHS ${sale.amountPaid.toFixed(2)}`, 460, apY, {
                width: 100,
                align: "right",
            });
            doc.moveDown(0.8);
            // Change
            const change = sale.amountPaid - sale.totalAmount;
            const chY = doc.y;
            doc.fillColor(secondaryTextColor).font("Helvetica").fontSize(9);
            doc.text("Change", 350, chY, { width: 110, align: "left" });
            doc.fillColor(accentColor).font("Helvetica-Bold").fontSize(9);
            doc.text(`GHS ${change.toFixed(2)}`, 460, chY, {
                width: 100,
                align: "right",
            });
        }
        // ── FOOTER ───────────────────────────────────────────────
        doc.moveDown(4);
        doc
            .moveTo(50, doc.y)
            .lineTo(560, doc.y)
            .strokeColor(strokeColor)
            .lineWidth(0.5)
            .stroke();
        doc.moveDown(1.5);
        doc
            .fillColor(secondaryTextColor)
            .fontSize(9)
            .font("Helvetica")
            .text("Thank you for your patronage!", { align: "center" });
        doc.moveDown(0.5);
        doc.text("Powered by Storeroom", { align: "center" });
        doc.end();
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
exports.default = { createSale, getSale, getSales, generateReceipt };
