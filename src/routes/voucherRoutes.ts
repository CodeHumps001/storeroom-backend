import express from "express";
import voucherController from "../controllers/voucherController";
import { authMIddleware } from "../middleware/authMiddleware";
import restrictTo from "../middleware/restrict";

const router = express.Router();

// Cashiers need this at the till
router.get("/lookup", authMIddleware, voucherController.lookupByPhone);

// Owner only
router.get("/", authMIddleware, restrictTo("OWNER"), voucherController.listVouchers);
router.post("/issue", authMIddleware, restrictTo("OWNER"), voucherController.issueVouchers);
router.post("/:id/resend", authMIddleware, restrictTo("OWNER"), voucherController.resendVoucher);
router.delete("/:id", authMIddleware, restrictTo("OWNER"), voucherController.voidVoucher);

export default router;