"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
//1: create a category
const createCategory = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const { name } = req.body;
        const category = await prisma_1.default.category.create({
            data: {
                name,
                organizationId: req.user.organizationId,
            },
        });
        res.status(201).json({
            status: "success",
            message: "category created successfuly",
            data: category,
        });
    }
    catch (err) {
        return res
            .status(500)
            .json({ status: "failed", message: "Something went wrong" });
    }
};
//2: get all category
const getCategories = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const categories = await prisma_1.default.category.findMany({
            where: { organizationId: req.user.organizationId },
        });
        res.status(200).json({ status: "success", data: categories });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
//3: deleteCategory
const deleteCategory = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const { id } = req.params;
        const deleteCat = await prisma_1.default.category.delete({
            where: { id, organizationId: req.user.organizationId },
        });
        res
            .status(200)
            .json({
            status: "success",
            message: "category deleted successfuly",
            data: deleteCat,
        });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
exports.default = { createCategory, getCategories, deleteCategory };
