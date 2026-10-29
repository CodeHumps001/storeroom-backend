import express from "express";
import couponController from "../controllers/couponController";
import { authMIddleware } from "../middleware/authMiddleware";
import restrictTo from "../middleware/restrict";

const router = express.Router();

// Any logged-in user (cashiers need these at the till)
router.post("/preview", authMIddleware, couponController.previewDiscount);
router.get("/policy", authMIddleware, couponController.getPolicy);

// Owner only. "/policy" is declared before "/:id" so it isn't read as an id.
router.patch("/policy", authMIddleware, restrictTo("OWNER"), couponController.updatePolicy);
router.get("/", authMIddleware, restrictTo("OWNER"), couponController.listCoupons);
router.post("/", authMIddleware, restrictTo("OWNER"), couponController.createCoupon);
router.patch("/:id", authMIddleware, restrictTo("OWNER"), couponController.updateCoupon);
router.delete("/:id", authMIddleware, restrictTo("OWNER"), couponController.deleteCoupon);

export default router;