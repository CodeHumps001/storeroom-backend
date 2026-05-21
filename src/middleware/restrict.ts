import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { Role } from "@prisma/client";

const restrictTo = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }

    // check if req.user.role is in the roles array
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "failed",
        message: "You are not allowed to access this route",
      });
    }

    next();
  };
};

export default restrictTo;
