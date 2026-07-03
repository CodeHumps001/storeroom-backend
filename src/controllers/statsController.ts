// controllers/statsController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getPublicStats = async (req: Request, res: Response) => {
  try {
    const [organizationsCount, salesCount, inventoryAgg] = await Promise.all([
      prisma.organization.count(),
      prisma.sale.count(),
      prisma.product.aggregate({
        _sum: {
          // value of stock currently sitting in the system
          quantity: true,
        },
      }),
    ]);

    // Sum of totalAmount across all sales = real money processed through the platform
    const salesTotalAgg = await prisma.sale.aggregate({
      _sum: { totalAmount: true },
    });

    res.status(200).json({
      status: "success",
      data: {
        organizationsCount,
        salesCount,
        totalSalesValue: salesTotalAgg._sum.totalAmount || 0,
        totalUnitsTracked: inventoryAgg._sum.quantity || 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ status: "failed", message: err.message });
  }
};
