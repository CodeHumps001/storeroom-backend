import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const createSale = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }

  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const { items } = req.body;

    // Step 1: Validate stock for every item
    let totalAmount = 0;
    const productSnapshots: {
      productId: string;
      quantity: number;
      priceAtSale: number;
    }[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
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

    // Step 2: Create Sale + SaleItems + decrement stock in one transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create the sale
      const newSale = await tx.sale.create({
        data: {
          totalAmount,
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
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

const getSales = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  try {
    const sales = await prisma.sale.findMany({
      where: { organizationId: req.user.organizationId },
      include: { items: true },
    });

    res.status(200).json({ status: "success", data: sales });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

const getSale = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  try {
    const { id } = req.params as { id: string };
    const sale = await prisma.sale.findUnique({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!sale) {
      return res
        .status(404)
        .json({ status: "failed", message: "Sale not found" });
    }

    res.status(200).json({ status: "success", data: sale });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

export default { createSale, getSale, getSales };
