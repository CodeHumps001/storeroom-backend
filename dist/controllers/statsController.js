"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicStats = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getPublicStats = async (req, res) => {
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
    }
    catch (err) {
        res.status(500).json({ status: "failed", message: err.message });
    }
};
exports.getPublicStats = getPublicStats;
