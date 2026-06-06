"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const checkLimit_1 = require("../lib/checkLimit");
//1: createProduct
const createProduct = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        // Check product limit for FREE users
        const limitError = await (0, checkLimit_1.checkProductLimit)(req.user.organizationId, res);
        if (limitError)
            return; // Response already sent, stop execution
        const { name, categoryId, barcode } = req.body;
        const costPrice = parseFloat(req.body.costPrice);
        const sellingPrice = parseFloat(req.body.sellingPrice);
        const quantity = parseInt(req.body.quantity);
        const imageUrl = req.file?.path;
        const createProduct = await prisma_1.default.product.create({
            data: {
                name,
                costPrice,
                sellingPrice,
                quantity,
                barcode,
                categoryId,
                organizationId: req.user.organizationId,
                ...(imageUrl && { imageUrl }),
            },
        });
        res.status(201).json({
            status: "success",
            message: "product created succesffuly",
            data: createProduct,
        });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
//2: get Products
const getProducts = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const products = await prisma_1.default.product.findMany({
            where: { organizationId: req.user.organizationId },
            include: {
                category: { select: { name: true } },
            },
        });
        res.status(200).json({ status: "success", data: products });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
//3: getProduct
const getProduct = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const { id } = req.params;
        const products = await prisma_1.default.product.findUnique({
            where: { id, organizationId: req.user.organizationId },
        });
        if (!products) {
            return res
                .status(404)
                .json({ status: "failed", message: "Product not found" });
        }
        res.status(200).json({
            status: "success",
            data: products,
        });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
//4: updateProduct
const updateProduct = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const { id } = req.params;
        const { name } = req.body;
        const costPrice = parseFloat(req.body.costPrice);
        const sellingPrice = parseFloat(req.body.sellingPrice);
        const quantity = parseInt(req.body.quantity);
        const imageUrl = req.file?.path;
        const updateProduct = await prisma_1.default.product.update({
            where: { id, organizationId: req.user.organizationId },
            data: {
                name,
                costPrice,
                sellingPrice,
                quantity,
                ...(imageUrl && { imageUrl }),
            },
        });
        res.status(200).json({
            status: "success",
            data: updateProduct,
            message: "Product updated successfuly",
        });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
//5: deleteProduct
const deleteProduct = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const { id } = req.params;
        const salesCount = await prisma_1.default.saleItem.count({
            where: { productId: id },
        });
        if (salesCount > 0) {
            return res.status(400).json({
                status: "failed",
                message: "Cannot delete a product that has sales history",
            });
        }
        const updateProduct = await prisma_1.default.product.delete({
            where: { id, organizationId: req.user.organizationId },
        });
        res.status(200).json({
            status: "success",
            data: updateProduct,
            message: "Product deleted successfully",
        });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
const getProductByBarcode = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const { barcode } = req.params;
        const product = await prisma_1.default.product.findFirst({
            where: {
                organizationId: req.user.organizationId,
                barcode,
            },
            include: {
                category: {
                    select: { name: true },
                },
            },
        });
        if (!product) {
            return res
                .status(404)
                .json({ status: "failed", message: "product not found" });
        }
        res.status(200).json({ status: "success", data: product });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
exports.default = {
    createProduct,
    getProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    getProductByBarcode,
};
