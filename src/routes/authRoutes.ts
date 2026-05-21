import express from "express";
import authController from "../controllers/authController";
import { authMIddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", authController.authRegister);
router.post("/login", authController.authLogin);
router.get("/me", authMIddleware, authController.getMe);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
