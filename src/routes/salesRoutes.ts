import express from "express";
import salesController from "../controllers/salesController";
import { authMIddleware } from "../middleware/authMiddleware";
const router = express.Router();

router.post("/", authMIddleware, salesController.createSale);
router.get("/", authMIddleware, salesController.getSales);
router.get("/:id/receipt", authMIddleware, salesController.generateReceipt);
router.get("/:id", authMIddleware, salesController.getSale);

export default router;
