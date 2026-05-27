import { Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "./authMiddleware";

const gatingFeature = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }
    const organizationId = req.user.organizationId;
    const result = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!result) {
      return res.status(404).json({ status: "failed", message: "Not found" });
    }

    // Check if user is on active trial
    const now = new Date();
    const isOnTrial = result.trialEnd ? result.trialEnd > now : false;

    // Allow access if: PRO plan OR on active trial
    const hasAccess = result.plan === "PRO" || isOnTrial;

    if (!hasAccess) {
      return res.status(403).json({
        status: "failed",
        message: "Please upgrade to continue using this feature",
      });
    }

    // Check subscription expiry only for PRO users (not trial)
    if (
      result.plan === "PRO" &&
      result.subscriptionExpiry &&
      result.subscriptionExpiry < now
    ) {
      return res.status(403).json({
        status: "failed",
        message: "Subscription expired. Please renew.",
      });
    }

    next();
  } catch (err: any) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
};

export default gatingFeature;
