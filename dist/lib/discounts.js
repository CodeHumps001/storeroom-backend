"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountError = void 0;
exports.priceCart = priceCart;
exports.redeemCoupon = redeemCoupon;
exports.redeemVoucher = redeemVoucher;
class DiscountError extends Error {
    constructor() {
        super(...arguments);
        this.status = 400;
    }
}
exports.DiscountError = DiscountError;
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
function allocate(lines, eligible, discount) {
    const eligibleTotal = eligible.reduce((s, i) => s + lines[i].lineTotal, 0);
    let remaining = discount;
    eligible.forEach((lineIndex, k) => {
        const line = lines[lineIndex];
        const share = k === eligible.length - 1
            ? remaining
            : r2((discount * line.lineTotal) / eligibleTotal);
        line.discountAmount = Math.min(r2(share), line.lineTotal);
        line.netTotal = r2(line.lineTotal - line.discountAmount);
        remaining = r2(remaining - line.discountAmount);
    });
}
async function priceCart(db, user, rawItems, input = {}) {
    // 1. Normalise the cart
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new DiscountError("Cart is empty");
    }
    if (rawItems.length > 200)
        throw new DiscountError("Too many items in cart");
    const qtyById = new Map();
    for (const it of rawItems) {
        const id = it?.productId;
        const qty = Number(it?.quantity);
        if (typeof id !== "string" || !Number.isInteger(qty) || qty < 1) {
            throw new DiscountError("Invalid cart item");
        }
        qtyById.set(id, (qtyById.get(id) ?? 0) + qty);
    }
    // 2. Prices come from the database, scoped to this organization
    const products = await db.product.findMany({
        where: { id: { in: [...qtyById.keys()] }, organizationId: user.organizationId },
        select: { id: true, name: true, sellingPrice: true, costPrice: true, categoryId: true },
    });
    if (products.length !== qtyById.size) {
        throw new DiscountError("One or more products were not found");
    }
    const lines = products.map((p) => {
        const quantity = qtyById.get(p.id);
        const lineTotal = r2(p.sellingPrice * quantity);
        return {
            productId: p.id,
            name: p.name,
            categoryId: p.categoryId,
            unitPrice: p.sellingPrice,
            costPrice: p.costPrice,
            quantity,
            lineTotal,
            discountAmount: 0,
            netTotal: lineTotal,
        };
    });
    const subtotal = r2(lines.reduce((s, l) => s + l.lineTotal, 0));
    const totalCost = r2(lines.reduce((s, l) => s + l.costPrice * l.quantity, 0));
    const result = {
        lines,
        subtotal,
        discountAmount: 0,
        total: subtotal,
        discountSource: null,
        couponId: null,
        voucherId: null,
        couponCode: null,
        discountNote: null,
        belowCost: subtotal < totalCost,
    };
    const couponCode = input.couponCode?.trim();
    if (couponCode && input.manual) {
        throw new DiscountError("Use either a coupon or a manual discount, not both");
    }
    let discount = 0;
    let eligible = lines.map((_, i) => i);
    // 3a. Coupon
    if (couponCode) {
        const typed = couponCode.toUpperCase();
        let coupon = await db.coupon.findUnique({
            where: { organizationId_code: { organizationId: user.organizationId, code: typed } },
        });
        // Not a shared coupon code? Then it may be a personal voucher code (dashes/spaces ignored)
        let voucher = null;
        if (!coupon) {
            const found = await db.voucher.findFirst({
                where: { code: typed.replace(/[^A-Z0-9]/g, ""), organizationId: user.organizationId },
                include: { coupon: true },
            });
            if (found) {
                voucher = found;
                coupon = found.coupon;
            }
        }
        const now = new Date();
        if (voucher?.redeemedAt)
            throw new DiscountError("This voucher has already been used");
        if (voucher?.expiresAt && now > voucher.expiresAt)
            throw new DiscountError("This voucher has expired");
        if (!coupon || !coupon.isActive)
            throw new DiscountError("Invalid or inactive coupon code");
        if (coupon.startsAt && now < coupon.startsAt)
            throw new DiscountError("This coupon isn't active yet");
        if (coupon.expiresAt && now > coupon.expiresAt)
            throw new DiscountError("This coupon has expired");
        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
            throw new DiscountError("This coupon has been fully redeemed");
        }
        if (coupon.minPurchaseAmount !== null && subtotal < coupon.minPurchaseAmount) {
            throw new DiscountError(`Spend at least GHS ${coupon.minPurchaseAmount.toFixed(2)} to use this coupon`);
        }
        if (coupon.scope === "PRODUCT") {
            eligible = eligible.filter((i) => coupon.productIds.includes(lines[i].productId));
        }
        else if (coupon.scope === "CATEGORY") {
            eligible = eligible.filter((i) => coupon.categoryIds.includes(lines[i].categoryId));
        }
        const eligibleTotal = r2(eligible.reduce((s, i) => s + lines[i].lineTotal, 0));
        if (eligibleTotal <= 0)
            throw new DiscountError("This coupon doesn't apply to the items in the cart");
        discount =
            coupon.type === "PERCENTAGE"
                ? r2((eligibleTotal * coupon.value) / 100)
                : coupon.value;
        if (coupon.type === "PERCENTAGE" && coupon.maxDiscountAmount !== null) {
            discount = Math.min(discount, coupon.maxDiscountAmount);
        }
        discount = r2(Math.min(discount, eligibleTotal));
        result.discountSource = "COUPON";
        result.couponId = coupon.id;
        result.couponCode = coupon.code;
        result.voucherId = voucher?.id ?? null;
        result.discountNote = coupon.description ?? null;
    }
    // 3b. Manual discount (cashier or owner)
    if (input.manual) {
        const m = input.manual;
        const value = Number(m.value);
        const reason = typeof m.reason === "string" ? m.reason.trim() : "";
        if (m.type !== "PERCENTAGE" && m.type !== "FIXED_AMOUNT")
            throw new DiscountError("Invalid discount type");
        if (!Number.isFinite(value) || value <= 0)
            throw new DiscountError("Discount must be greater than 0");
        if (reason.length < 3)
            throw new DiscountError("Please give a reason for the discount");
        if (reason.length > 200)
            throw new DiscountError("Discount reason is too long");
        const amount = m.type === "PERCENTAGE" ? r2((subtotal * value) / 100) : r2(value);
        if (m.type === "PERCENTAGE" && value > 100)
            throw new DiscountError("Percentage cannot exceed 100");
        if (amount > subtotal)
            throw new DiscountError("Discount can't be more than the order total");
        if (user.role === "CASHIER") {
            const org = await db.organization.findUnique({
                where: { id: user.organizationId },
                select: { maxCashierDiscountPercent: true },
            });
            const maxPercent = org?.maxCashierDiscountPercent ?? 10;
            const percent = (amount / subtotal) * 100;
            if (percent > maxPercent + 1e-9) {
                throw new DiscountError(`Cashiers can give up to ${maxPercent}% off. Ask the owner to approve a bigger discount.`);
            }
            if (r2(subtotal - amount) < totalCost) {
                throw new DiscountError("That discount would sell below cost. Ask the owner to approve it.");
            }
        }
        discount = amount;
        result.discountSource = "MANUAL";
        result.discountNote = reason;
    }
    // 4. Split the discount across eligible lines and finish
    if (discount > 0) {
        allocate(lines, eligible, discount);
        result.discountAmount = discount;
        result.total = r2(subtotal - discount);
        result.belowCost = result.total < totalCost;
    }
    return result;
}
/**
 * Call INSIDE the sale transaction, after the sale is created.
 * One atomic UPDATE, so two cashiers can't both use the last redemption.
 */
async function redeemCoupon(tx, couponId) {
    const updated = await tx.$executeRaw `
    UPDATE "Coupon"
    SET "usedCount" = "usedCount" + 1
    WHERE "id" = ${couponId}
      AND "isActive" = true
      AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")
  `;
    if (updated === 0) {
        throw new DiscountError("This coupon has just been fully redeemed");
    }
}
/** Marks a personal voucher as used. One atomic UPDATE: a second attempt matches 0 rows. */
async function redeemVoucher(tx, voucherId, saleId) {
    const updated = await tx.$executeRaw `
    UPDATE "Voucher"
    SET "redeemedAt" = NOW(), "redeemedSaleId" = ${saleId}
    WHERE "id" = ${voucherId} AND "redeemedAt" IS NULL
  `;
    if (updated === 0) {
        throw new DiscountError("This voucher has already been used");
    }
}
