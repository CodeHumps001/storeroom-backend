import { Response, Request } from "express";
import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

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

export default { authLogin, authRegister, getMe };
