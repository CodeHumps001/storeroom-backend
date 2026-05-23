import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { Response } from "express";
import bcrypt from "bcrypt";
import transporter from "../lib/mailer";

const inviteStaff = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }

  try {
    const { name, email } = req.body;
    const userExist = await prisma.user.findUnique({ where: { email } });
    if (userExist) {
      return res
        .status(409)
        .json({ status: "failed", message: "User already exist" });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashTempPass = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: "CASHIER",
        password: hashTempPass,
        organizationId: req.user.organizationId,
      },
      include: {
        organization: {
          select: { organizationName: true },
        },
      },
    });

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: "Welcome to Storeroom",
      html: `
    <h2>You have been invited to join ${newUser.organization.organizationName}</h2>
    <p>Your login credentials:</p>
    <p>Email: ${email}</p>
    <p>Temporary Password: ${tempPassword}</p>
    <p>Please login and change your password.</p>
  `,
    });

    res
      .status(201)
      .json({ status: "success", message: "Cashier added successfully" });
  } catch (err: any) {
    res.status(500).json({ status: "failed", message: err.message });
  }
};

const getStaff = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  try {
    const staff = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.status(200).json({ status: "success", data: staff });
  } catch (err: any) {
    res.status(500).json({ status: "failed", message: err.message });
  }
};

const deleteStaff = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  try {
    const { id } = req.params as { id: string };

    // Prevent deleting yourself
    if (id === req.user.userId) {
      return res.status(400).json({
        status: "failed",
        message: "You cannot remove yourself",
      });
    }

    await prisma.user.delete({
      where: { id, organizationId: req.user.organizationId },
    });

    res
      .status(200)
      .json({ status: "success", message: "Staff member removed" });
  } catch (err: any) {
    res.status(500).json({ status: "failed", message: err.message });
  }
};

export default { inviteStaff, getStaff, deleteStaff };
