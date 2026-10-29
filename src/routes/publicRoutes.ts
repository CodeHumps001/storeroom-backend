import express from "express";
import voucherController from "../controllers/voucherController";

const router = express.Router();

// No login: customers open their voucher link on their own phone
router.get("/vouchers/:code", voucherController.publicVoucher);

export default router;