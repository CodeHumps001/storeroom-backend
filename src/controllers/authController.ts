import { Response, Request } from "express";
import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import transporter from "../lib/mailer";

//register organization + user
const authRegister = async (req: Request, res: Response) => {
  try {
    // 1. Read input from req.body (org details + user details)
    const {
      organizationName,
      organizationType,
      location,
      contact,
      name,
      email,
      password,
      role,
    } = req.body;
    // 2. Check if user email already exists
    const user = await prisma.user.findUnique({ where: { email } });
    //    - if yes, send error
    if (user) {
      return res
        .status(409)
        .json({ status: "failed", message: "User already exist" });
    }
    // 3. Hash the password
    const hashPassword = await bcrypt.hash(password, 10);
    // 4. Create Organization + User together in one DB transaction
    const organizationProfile = await prisma.organization.create({
      data: {
        organizationName,
        organizationType,
        location,
        contact,
        users: {
          create: {
            name,
            email,
            password: hashPassword,
            role: "OWNER",
          },
        },
      },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    // 5. Generate JWT containing userId, organizationId, role
    const options: SignOptions = { expiresIn: "7d" };
    const token = jwt.sign(
      {
        userId: organizationProfile.users[0].id,
        organizationId: organizationProfile.id,
        role,
      } as object,
      process.env.JWT_SECRET as string,
      options,
    );
    // 6. Send response with organization + user + token
    res.status(201).json({
      status: "success",
      message:
        "Organization created successfull, go ahead and manage your store",
      data: organizationProfile,
      token,
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ status: "Something went wrong", message: err.message });
  }
};

//login user
const authLogin = async (req: Request, res: Response) => {
  try {
    // 1. Read email and password from req.body
    const { email, password } = req.body;
    // 2. Find user by email — if not found, return 401
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return res
        .status(401)
        .json({ status: "failed", message: "invalid email or password" });
    }
    // 3. Compare password with bcrypt — if wrong, return 401
    const comparePassword = await bcrypt.compare(password, user.password);
    if (!comparePassword) {
      return res
        .status(401)
        .json({ status: "failed", message: "invalid email or password" });
    }
    // 4. Generate JWT with userId, organizationId, role
    const options: SignOptions = { expiresIn: "7d" };
    const token = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
      } as object,
      process.env.JWT_SECRET as string,
      options,
    );
    // 5. Return user + token
    const { password: _, ...safeUser } = user;
    res.status(200).json({ status: "success", data: safeUser, token });
  } catch (err: any) {
    return res
      .status(500)
      .json({ status: "Something went wrong", message: err.message });
  }
};

//find me
const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: {
        organization: {
          select: {
            organizationName: true,
            organizationType: true,
            location: true,
            contact: true,
            plan: true,
            subscriptionStatus: true,
            subscriptionExpiry: true,
          },
        },
      },
    });

    if (me == null) {
      return res
        .status(404)
        .json({ status: "failed", message: "user not found" });
    }

    const { password: _, ...safeMe } = me;
    res.status(200).json({ status: "success", data: safeMe });
  } catch (err) {
    return res
      .status(500)
      .json({ status: "failed", message: "Something went wrong" });
  }
};

const forgotPassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "failed",
        message: "Email is required",
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return res.status(200).json({
        status: "success",
        message: "If that email exists, a reset link has been sent",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}reset-password?token=${rawToken}`;

    // Send email using Gmail transporter
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Reset your Storeroom password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f97316; }
            .logo { font-size: 24px; font-weight: bold; }
            .logo span:first-child { color: #000; }
            .logo span:last-child { color: #f97316; }
            .content { padding: 30px 0; }
            .button { display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">
                <span>Store</span><span>room</span>
              </div>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>Hi ${user.name || "there"},</p>
              <p>We received a request to reset your password for your Storeroom account.</p>
              <p>Click the button below to create a new password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
                ${resetUrl}
              </p>
              <p>This link expires in <strong>15 minutes</strong>.</p>
              <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>Storeroom · Smart Inventory Management for African Businesses</p>
              <p>© ${new Date().getFullYear()} Storeroom. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    res.status(200).json({
      status: "success",
      message: "If that email exists, a reset link has been sent",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

const resetPassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const hashToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ status: "failed", message: "invalid or expired token" });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Password changed successfully! You can now log in.",
    });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

export default {
  authLogin,
  authRegister,
  getMe,
  forgotPassword,
  resetPassword,
};
