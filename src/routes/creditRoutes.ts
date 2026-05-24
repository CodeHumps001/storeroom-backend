import express from "express";
import creditController from "../controllers/creditController";
import { authMIddleware } from "../middleware/authMiddleware";
import restrictTo from "../middleware/restrict";

const router = express.Router();

router.post(
  "/",
  authMIddleware,
  restrictTo("OWNER"),
  creditController.createCredit,
);
router.get("/", authMIddleware, creditController.getCredits);
router.patch(
  "/:id/payment",
  authMIddleware,
  restrictTo("OWNER"),
  creditController.recordPayment,
);
router.delete(
  "/:id",
  authMIddleware,
  restrictTo("OWNER"),
  creditController.deleteCredit,
);

export default router;
