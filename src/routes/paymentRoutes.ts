import express from "express";
import paymentController from "../controllers/paymentController";
import { authMIddleware } from "../middleware/authMiddleware";
const router = express.Router();

router.post("/initialize", authMIddleware, paymentController.initializePayment);
router.post("/webhook", paymentController.handleWebhook);

export default router;
