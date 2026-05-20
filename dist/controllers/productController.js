"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
//1: createProduct
const createProduct = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const { name, costPrice, sellingPrice, quantity, categoryId } = req.body;
        const createProduct = await prisma_1.default.product.create({
            data: {
                name,
                costPrice,
                sellingPrice,
                quantity,
                categoryId,
                organizationId: req.user.organizationId,
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
        const { name, costPrice, sellingPrice, quantity } = req.body;
        const updateProduct = await prisma_1.default.product.update({
            where: { id, organizationId: req.user.organizationId },
            data: {
                name,
                costPrice,
                sellingPrice,
                quantity,
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
        const updateProduct = await prisma_1.default.product.delete({
            where: { id, organizationId: req.user.organizationId },
        });
        res.status(200).json({
            status: "success",
            data: updateProduct,
            message: "Product deleted successfuly",
        });
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
};
