import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const MAX_ROWS = 1000;

type ProductChanges = {
  name?: string;
  categoryId?: string;
  costPrice?: number;
  sellingPrice?: number;
  quantity?: number;
};

type RowError = { index: number; id: string | null; error: string };

const isMoney = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

/**
 * PATCH /products/bulk
 * body: { updates: [{ id, name?, categoryId?, costPrice?, sellingPrice?, quantity? }] }
 *
 * - Every row is validated first; bad rows are skipped and reported back.
 * - All valid rows are written in ONE transaction (all succeed or none do).
 * - Only products in the caller's organization can be touched.
 */
const bulkUpdateProducts = async (req: AuthenticatedRequest, res: Response) => {
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
      .map((u: any) => u?.id)
      .filter((id: unknown): id is string => typeof id === "string");

    const [existing, categories] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: ids }, organizationId: orgId },
        select: { id: true },
      }),
      prisma.category.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      }),
    ]);
    const existingIds = new Set(existing.map((p) => p.id));
    const categoryIds = new Set(categories.map((c) => c.id));

    const valid: { id: string; data: ProductChanges }[] = [];
    const failed: RowError[] = [];
    const seen = new Set<string>();

    updates.forEach((u: any, index: number) => {
      const id = typeof u?.id === "string" ? u.id : null;
      const fail = (error: string) => failed.push({ index, id, error });

      if (!id) return fail("Missing product id");
      if (!existingIds.has(id)) return fail("Product not found");
      if (seen.has(id)) return fail("Duplicate product in upload");

      const data: ProductChanges = {};

      if (u.name !== undefined) {
        if (typeof u.name !== "string" || !u.name.trim())
          return fail("Name cannot be empty");
        data.name = u.name.trim();
      }
      if (u.categoryId !== undefined) {
        if (!categoryIds.has(u.categoryId)) return fail("Unknown category");
        data.categoryId = u.categoryId;
      }
      if (u.costPrice !== undefined) {
        if (!isMoney(u.costPrice)) return fail("Invalid cost price");
        data.costPrice = u.costPrice;
      }
      if (u.sellingPrice !== undefined) {
        if (!isMoney(u.sellingPrice)) return fail("Invalid selling price");
        data.sellingPrice = u.sellingPrice;
      }
      if (u.quantity !== undefined) {
        if (!Number.isInteger(u.quantity) || u.quantity < 0)
          return fail("Quantity must be a whole number, 0 or more");
        data.quantity = u.quantity;
      }

      if (Object.keys(data).length === 0) return fail("Nothing to update");

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

    await prisma.$transaction(
      valid.map((v) =>
        prisma.product.update({
          where: { id: v.id, organizationId: orgId },
          data: v.data,
        }),
      ),
    );

    res.status(200).json({
      status: "success",
      message: `${valid.length} product(s) updated`,
      data: { updated: valid.length, failed },
    });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

export default { bulkUpdateProducts };