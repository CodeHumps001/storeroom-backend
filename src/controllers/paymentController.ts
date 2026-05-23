import axios from "axios";
import crypto from "crypto";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";

const initializePayment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }

  try {
    const { amount } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true },
    });

    if (!user) {
      return res
        .status(404)
        .json({ status: "failed", message: "User not found" });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      { email: user.email, amount: amount * 100 },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    res.status(200).json({
      status: "success",
      data: {
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

const handleWebhook = async (req: Request, res: Response) => {
  try {
    ("Webhook hit");

    // Get raw body for signature verification
    const rawBody =
      req.body instanceof Buffer
        ? req.body.toString("utf8")
        : JSON.stringify(req.body);

    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY as string)
      .update(rawBody)
      .digest("hex");

    const paystackSignature = req.headers["x-paystack-signature"];

    if (hash !== paystackSignature) {
      return res
        .status(401)
        .json({ status: "failed", message: "Invalid signature" });
    }

    const event =
      req.body instanceof Buffer
        ? JSON.parse(req.body.toString("utf8"))
        : req.body;

    if (event.event === "charge.success") {
      const customerEmail = event.data.customer.email;

      const user = await prisma.user.findUnique({
        where: { email: customerEmail },
      });

      if (!user) {
        return res.status(200).json({ status: "success" });
      }

      await prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          plan: "PRO",
          subscriptionStatus: "ACTIVE",
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    res.status(200).json({ status: "success" });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

export default { initializePayment, handleWebhook };
