import prisma from "./prisma";
import { Response } from "express";

export async function checkProductLimit(organizationId: string, res: Response) {
  // Get organization with plan info
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, trialEnd: true },
  });

  if (!org) {
    return res
      .status(404)
      .json({ status: "failed", message: "Organization not found" });
  }

  // Check if trial is still active
  const now = new Date();
  const trialEnd = org.trialEnd as Date | null;
  const isTrialActive = trialEnd ? trialEnd > now : false;

  // FREE plan with no active trial = limited
  const isFreeRestricted = org.plan === "FREE" && !isTrialActive;

  if (isFreeRestricted) {
    // Count current products
    const productCount = await prisma.product.count({
      where: { organizationId },
    });

    if (productCount >= 50) {
      return res.status(403).json({
        status: "failed",
        message:
          "Free plan limited to 50 products. Upgrade to PRO for unlimited products.",
        currentCount: productCount,
        limit: 50,
      });
    }
  }

  return null; // No error, proceed
}
