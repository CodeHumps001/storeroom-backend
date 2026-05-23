"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const getSaleSummary = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const { from, to } = req.query;
        const dateFilter = from && to
            ? {
                createdAt: {
                    gte: new Date(from),
                    lte: new Date(to),
                },
            }
            : {};
        const result = await prisma_1.default.sale.aggregate({
            where: { organizationId: req.user.organizationId, ...dateFilter },
            _sum: { totalAmount: true },
            _count: { id: true },
        });
        const saleItems = await prisma_1.default.saleItem.findMany({
            where: {
                sales: { organizationId: req.user.organizationId, ...dateFilter },
            },
            include: { product: { select: { costPrice: true } } },
        });
        const totalProfit = saleItems.reduce((acc, item) => {
            const profit = (item.priceAtSale - item.product.costPrice) * item.quantity;
            return acc + profit;
        }, 0);
        res.status(200).json({
            status: "success",
            data: {
                totalRevenue: result._sum.totalAmount,
                totalSales: result._count.id,
                totalProfit,
            },
        });
    }
    catch (err) {
        return res
            .status(500)
            .json({ status: "failed", message: "something went wrong" });
    }
};
const getTopProduct = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const result = await prisma_1.default.saleItem.groupBy({
            by: ["productId"],
            where: { sales: { organizationId: req.user.organizationId } },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: "desc" } },
            take: 10,
        });
        const productsWithNames = await Promise.all(result.map(async (item) => {
            const product = await prisma_1.default.product.findUnique({
                where: { id: item.productId },
                select: { name: true },
            });
            return { ...item, productName: product?.name };
        }));
        res.status(200).json({ status: "success", data: productsWithNames });
    }
    catch (err) {
        return res
            .status(500)
            .json({ status: "failed", message: "something went wrong" });
    }
};
const getStockValue = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const sumOfQuantity = await prisma_1.default.product.aggregate({
            where: { organizationId: req.user.organizationId },
            _sum: { quantity: true },
        });
        const result = await prisma_1.default.product.findMany({
            where: { organizationId: req.user.organizationId },
        });
        const stockValue = result.reduce((acc, product) => {
            return acc + product.costPrice * product.quantity;
        }, 0);
        res.status(200).json({ status: "success", data: { stockValue } });
    }
    catch (err) {
        return res
            .status(500)
            .json({ status: "failed", message: "something went wrong" });
    }
};
const getLowStock = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const result = await prisma_1.default.product.findMany({
            where: { organizationId: req.user.organizationId, quantity: { lte: 10 } },
        });
        return res.status(200).json({ status: "success", data: result });
    }
    catch (err) {
        return res
            .status(500)
            .json({ status: "failed", message: "something went wrong" });
    }
};
exports.default = { getLowStock, getStockValue, getTopProduct, getSaleSummary };
