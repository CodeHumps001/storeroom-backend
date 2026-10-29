"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const MAX_ROWS = 1000;
const isMoney = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
/**
 * PATCH /products/bulk
 * body: { updates: [{ id, name?, categoryId?, costPrice?, sellingPrice?, quantity? }] }
 *
 * - Every row is validated first; bad rows are skipped and reported back.
 * - All valid rows are written in ONE transaction (all succeed or none do).
 * - Only products in the caller's organization can be touched.
 */
const bulkUpdateProducts = async (req, res) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "failed", message: "Unauthorized" });
        }
        const { updates } = req.body ?? {};
        if (!Array.isArray(updates) || updates.length === 0) {
            return res
                .status(400)
                .json({ status: "failed", message: "No updates provided" });
        }
        if (updates.length > MAX_ROWS) {
            return res.status(400).json({
                status: "failed",
                message: `Too many rows. Maximum is ${MAX_ROWS} per upload`,
            });
        }
        const orgId = req.user.organizationId;
        const ids = updates
            .map((u) => u?.id)
            .filter((id) => typeof id === "string");
        const [existing, categories] = await Promise.all([
            prisma_1.default.product.findMany({
                where: { id: { in: ids }, organizationId: orgId },
                select: { id: true },
            }),
            prisma_1.default.category.findMany({
                where: { organizationId: orgId },
                select: { id: true },
            }),
        ]);
        const existingIds = new Set(existing.map((p) => p.id));
        const categoryIds = new Set(categories.map((c) => c.id));
        const valid = [];
        const failed = [];
        const seen = new Set();
        updates.forEach((u, index) => {
            const id = typeof u?.id === "string" ? u.id : null;
            const fail = (error) => failed.push({ index, id, error });
            if (!id)
                return fail("Missing product id");
            if (!existingIds.has(id))
                return fail("Product not found");
            if (seen.has(id))
                return fail("Duplicate product in upload");
            const data = {};
            if (u.name !== undefined) {
                if (typeof u.name !== "string" || !u.name.trim())
                    return fail("Name cannot be empty");
                data.name = u.name.trim();
            }
            if (u.categoryId !== undefined) {
                if (!categoryIds.has(u.categoryId))
                    return fail("Unknown category");
                data.categoryId = u.categoryId;
            }
            if (u.costPrice !== undefined) {
                if (!isMoney(u.costPrice))
                    return fail("Invalid cost price");
                data.costPrice = u.costPrice;
            }
            if (u.sellingPrice !== undefined) {
                if (!isMoney(u.sellingPrice))
                    return fail("Invalid selling price");
                data.sellingPrice = u.sellingPrice;
            }
            if (u.quantity !== undefined) {
                if (!Number.isInteger(u.quantity) || u.quantity < 0)
                    return fail("Quantity must be a whole number, 0 or more");
                data.quantity = u.quantity;
            }
            if (Object.keys(data).length === 0)
                return fail("Nothing to update");
            seen.add(id);
            valid.push({ id, data });
        });
        if (valid.length === 0) {
            return res.status(400).json({
                status: "failed",
                message: "No valid rows to update",
                data: { updated: 0, failed },
            });
        }
        await prisma_1.default.$transaction(valid.map((v) => prisma_1.default.product.update({
            where: { id: v.id, organizationId: orgId },
            data: v.data,
        })));
        res.status(200).json({
            status: "success",
            message: `${valid.length} product(s) updated`,
            data: { updated: valid.length, failed },
        });
    }
    catch (err) {
        return res.status(500).json({ status: "failed", message: err.message });
    }
};
exports.default = { bulkUpdateProducts };
