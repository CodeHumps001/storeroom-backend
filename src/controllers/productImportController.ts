import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { generateBarcodes } from "../lib/barcodeGenerator";

const MAX_ROWS = 1000;
const FREE_PRODUCT_LIMIT = 50;

type Row = {
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
};
type RowIssue = { index: number; name: string | null; reason: string };

const toNum = (v: unknown) =>
  v === "" || v === null || v === undefined ? NaN : Number(v);

/**
 * How many more products this organization may add.
 * NOTE: mirrors the frontend rule (FREE plan with no active trial => 50 max).
 * If your lib/checkLimit.ts differs, change this function to match it.
 */
async function remainingSlots(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, trialEnd: true },
  });
  const onTrial = !!org?.trialEnd && org.trialEnd > new Date();
  if (org?.plan !== "FREE" || onTrial) return Infinity;

  const count = await prisma.product.count({ where: { organizationId: orgId } });
  return Math.max(0, FREE_PRODUCT_LIMIT - count);
}

/**
 * POST /products/bulk-import
 * body: { products: [{ name, category, costPrice, sellingPrice, quantity }], createMissingCategories?: boolean }
 *
 * Invalid rows and duplicates (same name already in the shop, or twice in the file)
 * are skipped and reported. Everything else is created in ONE transaction, each with
 * an auto-generated barcode.
 */
const bulkImportProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    const orgId = req.user.organizationId;
    const { products, createMissingCategories = true } = req.body ?? {};

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ status: "failed", message: "No products provided" });
    }
    if (products.length > MAX_ROWS) {
      return res.status(400).json({
        status: "failed",
        message: `Too many rows. Maximum is ${MAX_ROWS} per import`,
      });
    }

    const [existingProducts, existingCategories] = await Promise.all([
      prisma.product.findMany({ where: { organizationId: orgId }, select: { name: true } }),
      prisma.category.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
    ]);
    const existingNames = new Set(existingProducts.map((p) => p.name.trim().toLowerCase()));
    const categoryIdByName = new Map(
      existingCategories.map((c) => [c.name.trim().toLowerCase(), c.id]),
    );

    const valid: Row[] = [];
    const skipped: RowIssue[] = [];
    const failed: RowIssue[] = [];
    const seen = new Set<string>();

    products.forEach((raw: any, index: number) => {
      const name = typeof raw?.name === "string" ? raw.name.trim() : "";
      const bad = (reason: string) => failed.push({ index, name: name || null, reason });

      if (!name) return bad("Name is required");
      if (name.length > 120) return bad("Name is too long (max 120 characters)");

      const category = typeof raw.category === "string" ? raw.category.trim() : "";
      if (!category) return bad("Category is required");

      const costPrice = toNum(raw.costPrice);
      const sellingPrice = toNum(raw.sellingPrice);
      const quantity =
        raw.quantity === "" || raw.quantity === null || raw.quantity === undefined
          ? 0
          : Number(raw.quantity);

      if (!Number.isFinite(costPrice) || costPrice < 0) return bad("Invalid cost price");
      if (!Number.isFinite(sellingPrice) || sellingPrice < 0) return bad("Invalid selling price");
      if (!Number.isInteger(quantity) || quantity < 0) return bad("Quantity must be a whole number, 0 or more");

      const key = name.toLowerCase();
      if (existingNames.has(key)) {
        skipped.push({ index, name, reason: "A product with this name already exists" });
        return;
      }
      if (seen.has(key)) {
        skipped.push({ index, name, reason: "Duplicate name in this file" });
        return;
      }
      if (!categoryIdByName.has(category.toLowerCase()) && !createMissingCategories) {
        return bad(`Unknown category "${category}"`);
      }

      seen.add(key);
      valid.push({ name, category, costPrice, sellingPrice, quantity });
    });

    if (valid.length === 0) {
      return res.status(400).json({
        status: "failed",
        message: "No new products to import",
        data: { created: 0, skipped, failed },
      });
    }

    const slots = await remainingSlots(orgId);
    if (valid.length > slots) {
      return res.status(403).json({
        status: "failed",
        message: `Your free plan has room for ${slots} more product${slots === 1 ? "" : "s"}, but this file adds ${valid.length}. Remove some rows or upgrade to PRO.`,
      });
    }

    // Categories that don't exist yet (keep the first spelling used in the file)
    const newCategories = new Map<string, string>();
    valid.forEach((r) => {
      const key = r.category.toLowerCase();
      if (!categoryIdByName.has(key) && !newCategories.has(key)) newCategories.set(key, r.category);
    });

    const barcodes = await generateBarcodes(valid.length);

    const created = await prisma.$transaction(
      async (tx) => {
        for (const [key, name] of newCategories) {
          const cat = await tx.category.create({ data: { name, organizationId: orgId } });
          categoryIdByName.set(key, cat.id);
        }
        const result = await tx.product.createMany({
          data: valid.map((r, i) => ({
            name: r.name,
            categoryId: categoryIdByName.get(r.category.toLowerCase())!,
            costPrice: r.costPrice,
            sellingPrice: r.sellingPrice,
            quantity: r.quantity,
            barcode: barcodes[i],
            organizationId: orgId,
          })),
        });
        return result.count;
      },
      { timeout: 30000 },
    );

    res.status(201).json({
      status: "success",
      message: `${created} product(s) imported`,
      data: { created, categoriesCreated: newCategories.size, skipped, failed },
    });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

export default { bulkImportProducts };