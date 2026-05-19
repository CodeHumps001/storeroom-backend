"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
//register organization + user
const authRegister = async (req, res) => {
    try {
        // 1. Read input from req.body (org details + user details)
        const { organizationName, organizationType, location, contact, name, email, password, role, } = req.body;
        // 2. Check if user email already exists
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        //    - if yes, send error
        if (user) {
            return res
                .status(409)
                .json({ status: "failed", message: "User already exist" });
        }
        // 3. Hash the password
        const hashPassword = await bcrypt_1.default.hash(password, 10);
        // 4. Create Organization + User together in one DB transaction
        const organizationProfile = await prisma_1.default.organization.create({
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
        const options = { expiresIn: "7d" };
        const token = jsonwebtoken_1.default.sign({
            userId: organizationProfile.users[0].id,
            organizationId: organizationProfile.id,
            role,
        }, process.env.JWT_SECRET, options);
        // 6. Send response with organization + user + token
        res.status(201).json({
            status: "success",
            message: "Organization created successfull, go ahead and manage your store",
            data: organizationProfile,
            token,
        });
    }
    catch (err) {
        return res
            .status(500)
            .json({ status: "Something went wrong", message: err.message });
    }
};
//login user
const authLogin = async (req, res) => {
    try {
        // 1. Read email and password from req.body
        const { email, password } = req.body;
        // 2. Find user by email — if not found, return 401
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res
                .status(401)
                .json({ status: "failed", message: "invalid email or password" });
        }
        // 3. Compare password with bcrypt — if wrong, return 401
        const comparePassword = await bcrypt_1.default.compare(password, user.password);
        if (!comparePassword) {
            return res
                .status(401)
                .json({ status: "failed", message: "invalid email or password" });
        }
        // 4. Generate JWT with userId, organizationId, role
        const options = { expiresIn: "7d" };
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            organizationId: user.organizationId,
            role: user.role,
        }, process.env.JWT_SECRET, options);
        // 5. Return user + token
        const { password: _, ...safeUser } = user;
        res.status(200).json({ status: "success", data: safeUser, token });
    }
    catch (err) {
        return res
            .status(500)
            .json({ status: "Something went wrong", message: err.message });
    }
};
//find me
const getMe = (req, res) => { };
exports.default = { authLogin, authRegister, getMe };
