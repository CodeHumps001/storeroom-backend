import express from "express";
import authController from "../controllers/authController";

const router = express.Router();

router.post("/register", authController.authRegister);
router.post("/login", authController.authLogin);
router.get("/me", authController.getMe);

export default router;
