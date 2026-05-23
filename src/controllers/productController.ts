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
    const { name, categoryId, barcode } = req.body;
    const costPrice = parseFloat(req.body.costPrice);
    const sellingPrice = parseFloat(req.body.sellingPrice);
    const quantity = parseInt(req.body.quantity);
    const imageUrl = (req as any).file?.path;
    const createProduct = await prisma.product.create({
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
    const { name } = req.body;
    const costPrice = parseFloat(req.body.costPrice);
    const sellingPrice = parseFloat(req.body.sellingPrice);
    const quantity = parseInt(req.body.quantity);
    const imageUrl = (req as any).file?.path;
    const updateProduct = await prisma.product.update({
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

    const salesCount = await prisma.saleItem.count({
      where: { productId: id },
    });
    if (salesCount > 0) {
      return res.status(400).json({
        status: "failed",
        message: "Cannot delete a product that has sales history",
      });
    }

    const updateProduct = await prisma.product.delete({
      where: { id, organizationId: req.user.organizationId },
    });
    res.status(200).json({
      status: "success",
      data: updateProduct,
      message: "Product deleted successfully",
    });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

const getProductByBarcode = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }
    const { barcode } = req.params as { barcode: string };
    const product = await prisma.product.findFirst({
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
  getProductByBarcode,
};
