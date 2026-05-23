import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const updateOrganization = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  try {
    const { organizationName, location, contact } = req.body;
    const updated = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: { organizationName, location, contact },
    });
    res.status(200).json({ status: "success", data: updated });
  } catch (err: any) {
    res.status(500).json({ status: "failed", message: err.message });
  }
};

export default { updateOrganization };
