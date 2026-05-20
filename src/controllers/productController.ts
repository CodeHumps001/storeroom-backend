import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

//1: createProduct
const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }
    const { name, costPrice, sellingPrice, quantity, categoryId } = req.body;
    const createProduct = await prisma.product.create({
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
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

//2: get Products
const getProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }

    const products = await prisma.product.findMany({
      where: { organizationId: req.user.organizationId },
      include: {
        category: { select: { name: true } },
      },
    });
    res.status(200).json({ status: "success", data: products });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

//3: getProduct
const getProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }

    const { id } = req.params as { id: string };

    const products = await prisma.product.findUnique({
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
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

//4: updateProduct
const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }

    const { id } = req.params as { id: string };
    const { name, costPrice, sellingPrice, quantity } = req.body;
    const updateProduct = await prisma.product.update({
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
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

//5: deleteProduct

const deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }

    const { id } = req.params as { id: string };
    const updateProduct = await prisma.product.delete({
      where: { id, organizationId: req.user.organizationId },
    });
    res.status(200).json({
      status: "success",
      data: updateProduct,
      message: "Product deleted successfuly",
    });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

export default {
  createProduct,
  getProduct,
  getProducts,
  updateProduct,
  deleteProduct,
};
