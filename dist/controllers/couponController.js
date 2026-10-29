"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discounts_1 = require("../lib/discounts");
const prisma_1 = __importDefault(require("../lib/prisma"));
const CODE_RE = /^[A-Z0-9_-]{3,20}$/;
const optNum = (v) => v === null || v === undefined || v === "" ? null : Number(v);
const uniqStrings = (v) => Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string"))] : [];
async function parseCoupon(body, orgId) {
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!CODE_RE.test(code))
        return { error: "Code must be 3-20 characters: letters, numbers, - or _" };
    const type = body.type;
    if (type !== "PERCENTAGE" && type !== "FIXED_AMOUNT")
        return { error: "Invalid discount type" };
    const value = Number(body.value);
    if (!Number.isFinite(value) || value <= 0)
        return { error: "Discount value must be greater than 0" };
    if (type === "PERCENTAGE" && value > 100)
        return { error: "Percentage cannot exceed 100" };
    const maxDiscountAmount = type === "PERCENTAGE" ? optNum(body.maxDiscountAmount) : null;
    if (maxDiscountAmount !== null && !(maxDiscountAmount > 0))
        return { error: "Maximum discount must be greater than 0" };
    const minPurchaseAmount = optNum(body.minPurchaseAmount);
    if (minPurchaseAmount !== null && !(minPurchaseAmount >= 0))
        return { error: "Minimum purchase is invalid" };
    const scope = body.scope ?? "CART";
    if (!["CART", "PRODUCT", "CATEGORY"].includes(scope))
        return { error: "Invalid scope" };
    const productIds = scope === "PRODUCT" ? uniqStrings(body.productIds) : [];
    const categoryIds = scope === "CATEGORY" ? uniqStrings(body.categoryIds) : [];
    if (scope === "PRODUCT" && productIds.length === 0)
        return { error: "Pick at least one product" };
    if (scope === "CATEGORY" && categoryIds.length === 0)
        return { error: "Pick at least one category" };
    if (productIds.length) {
        const n = await prisma_1.default.product.count({ where: { id: { in: productIds }, organizationId: orgId } });
        if (n !== productIds.length)
            return { error: "Some selected products don't exist" };
    }
    if (categoryIds.length) {
        const n = await prisma_1.default.category.count({ where: { id: { in: categoryIds }, organizationId: orgId } });
        if (n !== categoryIds.length)
            return { error: "Some selected categories don't exist" };
    }
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if ((startsAt && isNaN(startsAt.getTime())) || (expiresAt && isNaN(expiresAt.getTime()))) {
        return { error: "Invalid date" };
    }
    if (startsAt && expiresAt && expiresAt <= startsAt)
        return { error: "Expiry must be after the start date" };
    const usageLimit = optNum(body.usageLimit);
    if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
        return { error: "Usage limit must be a whole number of 1 or more" };
    }
    return {
        data: {
            code,
            description: body.description ? String(body.description).slice(0, 200) : null,
            type: type,
            value,
            maxDiscountAmount,
            minPurchaseAmount,
            scope: scope,
            productIds,
            categoryIds,
            startsAt,
            expiresAt,
            usageLimit,
            isActive: body.isActive !== false,
        },
    };
}
const fail = (res, err) => {
    if (err?.code === "P2002") {
        return res.status(409).json({ status: "failed", message: "A coupon with this code already exists" });
    }
    return res.status(500).json({ status: "failed", message: err.message });
};
const listCoupons = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ status: "failed", message: "Unauthorized" });
        const coupons = await prisma_1.default.coupon.findMany({
            where: { organizationId: req.user.organizationId },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json({ status: "success", data: coupons });
    }
    catch (err) {
        return fail(res, err);
    }
};
const createCoupon = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ status: "failed", message: "Unauthorized" });
        const parsed = await parseCoupon(req.body ?? {}, req.user.organizationId);
        if (parsed.error)
            return res.status(400).json({ status: "failed", message: parsed.error });
        const coupon = await prisma_1.default.coupon.create({
            data: { ...parsed.data, organizationId: req.user.organizationId },
        });
        res.status(201).json({ status: "success", message: "Coupon created", data: coupon });
    }
    catch (err) {
        return fail(res, err);
    }
};
const updateCoupon = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ status: "failed", message: "Unauthorized" });
        const { id } = req.params;
        const body = req.body ?? {};
        // Quick enable/disable toggle
        const keys = Object.keys(body);
        if (keys.length === 1 && keys[0] === "isActive") {
            const coupon = await prisma_1.default.coupon.update({
                where: { id, organizationId: req.user.organizationId },
                data: { isActive: !!body.isActive },
            });
            return res.status(200).json({ status: "success", data: coupon });
        }
        const parsed = await parseCoupon(body, req.user.organizationId);
        if (parsed.error)
            return res.status(400).json({ status: "failed", message: parsed.error });
        const coupon = await prisma_1.default.coupon.update({
            where: { id, organizationId: req.user.organizationId },
            data: parsed.data,
        });
        res.status(200).json({ status: "success", message: "Coupon updated", data: coupon });
    }
    catch (err) {
        return fail(res, err);
    }
};
const deleteCoupon = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ status: "failed", message: "Unauthorized" });
        const { id } = req.params;
        const used = await prisma_1.default.sale.count({ where: { couponId: id, organizationId: req.user.organizationId } });
        if (used > 0) {
            return res.status(400).json({
                status: "failed",
                message: "This coupon has been used on sales. Disable it instead of deleting it.",
            });
        }
        await prisma_1.default.coupon.delete({ where: { id, organizationId: req.user.organizationId } });
        res.status(200).json({ status: "success", message: "Coupon deleted" });
    }
    catch (err) {
        return fail(res, err);
    }
};
// POST /coupons/preview: prices a cart with a coupon/manual discount. No side effects.
const previewDiscount = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ status: "failed", message: "Unauthorized" });
        const { items, couponCode, manualDiscount } = req.body ?? {};
        const pricing = await (0, discounts_1.priceCart)(prisma_1.default, req.user, items, {
            couponCode,
            manual: manualDiscount,
        });
        res.status(200).json({ status: "success", data: pricing });
    }
    catch (err) {
        if (err instanceof discounts_1.DiscountError) {
            return res.status(err.status).json({ status: "failed", message: err.message });
        }
        return fail(res, err);
    }
};
const getPolicy = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ status: "failed", message: "Unauthorized" });
        const org = await prisma_1.default.organization.findUnique({
            where: { id: req.user.organizationId },
            select: { maxCashierDiscountPercent: true },
        });
        res.status(200).json({
            status: "success",
            data: { maxCashierDiscountPercent: org?.maxCashierDiscountPercent ?? 10 },
        });
    }
    catch (err) {
        return fail(res, err);
    }
};
const updatePolicy = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ status: "failed", message: "Unauthorized" });
        const value = Number(req.body?.maxCashierDiscountPercent);
        if (!Number.isFinite(value) || value < 0 || value > 100) {
            return res.status(400).json({ status: "failed", message: "Enter a percentage between 0 and 100" });
        }
        await prisma_1.default.organization.update({
            where: { id: req.user.organizationId },
            data: { maxCashierDiscountPercent: value },
        });
        res.status(200).json({ status: "success", data: { maxCashierDiscountPercent: value } });
    }
    catch (err) {
        return fail(res, err);
    }
};
exports.default = {
    listCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    previewDiscount,
    getPolicy,
    updatePolicy,
};
