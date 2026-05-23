import express from "express";
import reportController from "../controllers/reportController";
import { authMIddleware } from "../middleware/authMiddleware";
import restrictTo from "../middleware/restrict";
import gatingFeature from "../middleware/requirePro";
const router = express.Router();

router.get(
  "/summary",
  authMIddleware,
  gatingFeature,
  restrictTo("OWNER"),
  reportController.getSaleSummary,
);
router.get(
  "/top-products",
  authMIddleware,
  gatingFeature,
  restrictTo("OWNER"),
  reportController.getTopProduct,
);
router.get(
  "/stock-value",
  authMIddleware,
  gatingFeature,
  restrictTo("OWNER"),
  reportController.getStockValue,
);
router.get(
  "/low-stock",
  authMIddleware,
  gatingFeature,
  restrictTo("OWNER"),
  reportController.getLowStock,
);

export default router;
