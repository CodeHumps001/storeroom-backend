import { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: "OWNER" | "CASHIER";
  };
}

export const authMIddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    //1: read token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ status: "failed", message: "token not found" });
    }
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      organizationId: string;
      role: "OWNER" | "CASHIER";
    };

    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ status: "failed", message: "Invalid or expired token" });
  }
};
