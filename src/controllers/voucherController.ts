import { Response } from "express";
import { randomInt } from "crypto";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import smsService from "../lib/sms";

/**
 * Personal vouchers: one unique, single-use code per customer, delivered by SMS.
 * The SMS carries a link (/v/CODE) that shows a QR the cashier scans, AND the plain
 * code, so customers on basic phones can simply read it out for the cashier to type.
 *
 * Requires FRONTEND_URL in the backend .env, e.g. https://app.yourdomain.com
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L look-alikes
const MAX_PER_BATCH = 100;
const PHONE_RE = /^\+?\d{9,15}$/;

const makeCode = () =>
  Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const pretty = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;
const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const cleanPhone = (p: unknown) => String(p ?? "").replace(/[\s\-().]/g, "");
const baseUrl = () => (process.env.FRONTEND_URL || "").replace(/\/+$/, "");

type CouponLite = {
  type: string;
  value: number;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
};
type VoucherLite = { code: string; redeemedAt: Date | null; expiresAt: Date | null };

const offerText = (c: Pick<CouponLite, "type" | "value">) =>
  c.type === "PERCENTAGE" ? `${c.value}% off` : `GHS ${c.value} off`;

/** Earlier of the voucher's own expiry and the campaign's end date. */
const effectiveExpiry = (v: Pick<VoucherLite, "expiresAt">, c: Pick<CouponLite, "expiresAt">) => {
  const times = [v.expiresAt, c.expiresAt].filter((d): d is Date => !!d).map((d) => d.getTime());
  return times.length ? new Date(Math.min(...times)) : null;
};

const statusOf = (v: VoucherLite, c: CouponLite) => {
  if (v.redeemedAt) return "USED";
  if (!c.isActive) return "DISABLED";
  const exp = effectiveExpiry(v, c);
  if (exp && exp.getTime() < Date.now()) return "EXPIRED";
  if (c.startsAt && c.startsAt.getTime() > Date.now()) return "NOT_STARTED";
  return "ACTIVE";
};

// Plain ASCII only, so it stays a normal 160-character SMS
const buildMessage = (shop: string, v: VoucherLite, c: CouponLite) => {
  const exp = effectiveExpiry(v, c);
  const until = exp
    ? ` Valid till ${exp.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`
    : "";
  const name = shop.length > 22 ? shop.slice(0, 22) : shop;
  return `${name}: ${offerText(c)}! Show this at the till: ${baseUrl()}/v/${v.code} Code ${pretty(v.code)}.${until}`;
};
const segmentsOf = (m: string) => (m.length <= 160 ? 1 : Math.ceil(m.length / 153));

const fail = (res: Response, err: any) =>
  res.status(500).json({ status: "failed", message: err?.message || "Something went wrong" });

const smsErrorText = (e: any) =>
  String(e?.response?.data?.message || e?.message || "SMS failed").slice(0, 200);

// ── POST /vouchers/issue ─────────────────────────────────────────────────────
const issueVouchers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ status: "failed", message: "Unauthorized" });
    const orgId = req.user.organizationId;
    const { couponId, recipients, validDays = 14, sendSms = true } = req.body ?? {};

    if (!baseUrl()) {
      return res.status(500).json({ status: "failed", message: "FRONTEND_URL is not set on the server" });
    }
    if (typeof couponId !== "string") {
      return res.status(400).json({ status: "failed", message: "Pick a coupon" });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ status: "failed", message: "Add at least one phone number" });
    }
    if (recipients.length > MAX_PER_BATCH) {
      return res.status(400).json({ status: "failed", message: `Send up to ${MAX_PER_BATCH} vouchers at a time` });
    }
    const days = Number(validDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return res.status(400).json({ status: "failed", message: "Validity must be 1 to 365 days" });
    }

    const coupon = await prisma.coupon.findFirst({ where: { id: couponId, organizationId: orgId } });
    if (!coupon || !coupon.isActive) {
      return res.status(400).json({ status: "failed", message: "Coupon not found or disabled" });
    }
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { organizationName: true },
    });
    const shop = org?.organizationName ?? "Our store";

    // Clean, validate, de-duplicate
    const invalid: { phone: string; reason: string }[] = [];
    const clean: { phone: string; name: string | null }[] = [];
    const seen = new Set<string>();
    recipients.forEach((r: any) => {
      const phone = cleanPhone(r?.phone);
      if (!PHONE_RE.test(phone)) return invalid.push({ phone: String(r?.phone ?? ""), reason: "Invalid phone number" });
      if (seen.has(phone)) return invalid.push({ phone, reason: "Listed twice" });
      seen.add(phone);
      clean.push({ phone, name: r?.name ? String(r.name).trim().slice(0, 60) : null });
    });

    // One voucher per customer per coupon (stops one person farming a campaign)
    const already = await prisma.voucher.findMany({
      where: { couponId: coupon.id, organizationId: orgId, phone: { in: clean.map((c) => c.phone) } },
      select: { phone: true },
    });
    const alreadySet = new Set(already.map((a) => a.phone));
    const toCreate = clean.filter((c) => {
      if (alreadySet.has(c.phone)) {
        invalid.push({ phone: c.phone, reason: "Already has a voucher for this coupon" });
        return false;
      }
      return true;
    });

    if (toCreate.length === 0) {
      return res.status(400).json({ status: "failed", message: "No new vouchers to send", data: { invalid } });
    }

    const expiresAt = new Date(Date.now() + days * 86400000);
    const vouchers = [];
    for (const r of toCreate) {
      let created = null;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        try {
          created = await prisma.voucher.create({
            data: {
              code: makeCode(),
              phone: r.phone,
              customerName: r.name,
              expiresAt,
              couponId: coupon.id,
              organizationId: orgId,
            },
          });
        } catch (e: any) {
          if (e.code !== "P2002") throw e; // only retry on a code collision
        }
      }
      if (!created) throw new Error("Could not generate a unique voucher code");
      vouchers.push(created);
    }

    // SMS, five at a time so the provider isn't flooded
    const outcome = new Map<string, { sent: boolean; error: string | null }>();
    if (sendSms) {
      for (let i = 0; i < vouchers.length; i += 5) {
        await Promise.all(
          vouchers.slice(i, i + 5).map(async (v) => {
            try {
              await smsService.sendSMS(v.phone!, buildMessage(shop, v, coupon));
              await prisma.voucher.update({ where: { id: v.id }, data: { smsSentAt: new Date(), smsError: null } });
              outcome.set(v.id, { sent: true, error: null });
            } catch (e: any) {
              const error = smsErrorText(e);
              await prisma.voucher.update({ where: { id: v.id }, data: { smsError: error } });
              outcome.set(v.id, { sent: false, error });
            }
          }),
        );
      }
    }

    const items = vouchers.map((v) => ({
      id: v.id,
      code: pretty(v.code),
      phone: v.phone,
      customerName: v.customerName,
      link: `${baseUrl()}/v/${v.code}`,
      message: buildMessage(shop, v, coupon),
      smsSent: outcome.get(v.id)?.sent ?? false,
      smsError: outcome.get(v.id)?.error ?? null,
    }));

    res.status(201).json({
      status: "success",
      message: `${vouchers.length} voucher(s) created`,
      data: {
        created: vouchers.length,
        smsSent: items.filter((i) => i.smsSent).length,
        smsFailed: items.filter((i) => i.smsError).length,
        smsSegmentsEach: segmentsOf(items[0].message),
        invalid,
        items,
      },
    });
  } catch (err) {
    return fail(res, err);
  }
};

// ── GET /vouchers ────────────────────────────────────────────────────────────
const listVouchers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ status: "failed", message: "Unauthorized" });
    const vouchers = await prisma.voucher.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { coupon: true },
    });
    res.status(200).json({
      status: "success",
      data: vouchers.map((v) => ({
        id: v.id,
        code: pretty(v.code),
        phone: v.phone,
        customerName: v.customerName,
        campaign: v.coupon.code,
        offer: offerText(v.coupon),
        status: statusOf(v, v.coupon),
        expiresAt: effectiveExpiry(v, v.coupon),
        smsSentAt: v.smsSentAt,
        smsError: v.smsError,
        link: `${baseUrl()}/v/${v.code}`,
      })),
    });
  } catch (err) {
    return fail(res, err);
  }
};

// ── DELETE /vouchers/:id (void an unused voucher) ────────────────────────────
const voidVoucher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ status: "failed", message: "Unauthorized" });
    const { id } = req.params as { id: string };
    const r = await prisma.voucher.deleteMany({
      where: { id, organizationId: req.user.organizationId, redeemedAt: null },
    });
    if (r.count === 0) {
      return res.status(400).json({ status: "failed", message: "Voucher not found or already used" });
    }
    res.status(200).json({ status: "success", message: "Voucher removed" });
  } catch (err) {
    return fail(res, err);
  }
};

// ── POST /vouchers/:id/resend ────────────────────────────────────────────────
const resendVoucher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ status: "failed", message: "Unauthorized" });
    const { id } = req.params as { id: string };
    const v = await prisma.voucher.findFirst({
      where: { id, organizationId: req.user.organizationId },
      include: { coupon: true, organization: { select: { organizationName: true } } },
    });
    if (!v || !v.phone) return res.status(404).json({ status: "failed", message: "Voucher not found" });
    if (statusOf(v, v.coupon) !== "ACTIVE") {
      return res.status(400).json({ status: "failed", message: "Only active vouchers can be resent" });
    }
    try {
      await smsService.sendSMS(v.phone, buildMessage(v.organization.organizationName, v, v.coupon));
      await prisma.voucher.update({ where: { id }, data: { smsSentAt: new Date(), smsError: null } });
    } catch (e: any) {
      const error = smsErrorText(e);
      await prisma.voucher.update({ where: { id }, data: { smsError: error } });
      return res.status(502).json({ status: "failed", message: `SMS failed: ${error}` });
    }
    res.status(200).json({ status: "success", message: "SMS sent" });
  } catch (err) {
    return fail(res, err);
  }
};

// ── GET /vouchers/lookup?phone=... (cashier: customer forgot their phone / has none) ──
const lookupByPhone = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ status: "failed", message: "Unauthorized" });
    const digits = cleanPhone(req.query.phone).replace(/\D/g, "");
    if (digits.length < 7) {
      return res.status(400).json({ status: "failed", message: "Enter at least 7 digits of the phone number" });
    }
    // Match on the last 9 digits so 024..., +233 24... and 233 24... all find the same customer
    const tail = digits.slice(-9);
    const vouchers = await prisma.voucher.findMany({
      where: {
        organizationId: req.user.organizationId,
        redeemedAt: null,
        phone: { endsWith: tail },
        coupon: { isActive: true },
      },
      include: { coupon: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    res.status(200).json({
      status: "success",
      data: vouchers
        .filter((v) => statusOf(v, v.coupon) === "ACTIVE")
        .map((v) => ({
          id: v.id,
          code: v.code,
          displayCode: pretty(v.code),
          customerName: v.customerName,
          offer: offerText(v.coupon),
          description: v.coupon.description,
          expiresAt: effectiveExpiry(v, v.coupon),
        })),
    });
  } catch (err) {
    return fail(res, err);
  }
};

// ── GET /public/vouchers/:code (NO login: powers the customer's voucher page) ──
const publicVoucher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const code = cleanCode(String(req.params.code ?? ""));
    const v = code.length === 8
      ? await prisma.voucher.findUnique({
          where: { code },
          include: { coupon: true, organization: { select: { organizationName: true } } },
        })
      : null;
    if (!v) return res.status(404).json({ status: "failed", message: "Voucher not found" });

    res.setHeader("Cache-Control", "no-store");
    // Deliberately no phone number or internal ids
    res.status(200).json({
      status: "success",
      data: {
        shopName: v.organization.organizationName,
        offer: offerText(v.coupon),
        description: v.coupon.description,
        minPurchaseAmount: v.coupon.minPurchaseAmount,
        code: pretty(v.code),
        qrValue: `storeroom:voucher:${v.code}`,
        expiresAt: effectiveExpiry(v, v.coupon),
        status: statusOf(v, v.coupon),
      },
    });
  } catch (err) {
    return fail(res, err);
  }
};

export default {
  issueVouchers,
  listVouchers,
  voidVoucher,
  resendVoucher,
  lookupByPhone,
  publicVoucher,
};