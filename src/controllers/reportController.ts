import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const getSaleSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }

    const { from, to } = req.query;
    const dateFilter =
      from && to
        ? {
            createdAt: {
              gte: new Date(from as string),
              lte: new Date(to as string),
            },
          }
        : {};

    const result = await prisma.sale.aggregate({
      where: { organizationId: req.user.organizationId, ...dateFilter },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const saleItems = await prisma.saleItem.findMany({
      where: {
        sales: { organizationId: req.user.organizationId, ...dateFilter },
      },
      include: { product: { select: { costPrice: true } } },
    });

    const totalProfit = saleItems.reduce((acc, item) => {
      const profit =
        (item.priceAtSale - item.product.costPrice) * item.quantity;
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
  } catch (err: any) {
    return res
      .status(500)
      .json({ status: "failed", message: "something went wrong" });
  }
};

const getTopProduct = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }

  try {
    const result = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sales: { organizationId: req.user.organizationId } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const productsWithNames = await Promise.all(
      result.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true },
        });
        return { ...item, productName: product?.name };
      }),
    );

    res.status(200).json({ status: "success", data: productsWithNames });
  } catch (err: any) {
    return res
      .status(500)
      .json({ status: "failed", message: "something went wrong" });
  }
};

const getStockValue = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }

  try {
    const sumOfQuantity = await prisma.product.aggregate({
      where: { organizationId: req.user.organizationId },
      _sum: { quantity: true },
    });

    const result = await prisma.product.findMany({
      where: { organizationId: req.user.organizationId },
    });
    const stockValue = result.reduce((acc, product) => {
      return acc + product.costPrice * product.quantity;
    }, 0);

    res.status(200).json({ status: "success", data: { stockValue } });
  } catch (err: any) {
    return res
      .status(500)
      .json({ status: "failed", message: "something went wrong" });
  }
};

const getLowStock = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }

  try {
    const result = await prisma.product.findMany({
      where: { organizationId: req.user.organizationId, quantity: { lte: 10 } },
    });

    return res.status(200).json({ status: "success", data: result });
  } catch (err: any) {
    return res
      .status(500)
      .json({ status: "failed", message: "something went wrong" });
  }
};

export default { getLowStock, getStockValue, getTopProduct, getSaleSummary };
