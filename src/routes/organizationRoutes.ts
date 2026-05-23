import express from "express";
import organizationController from "../controllers/organizationController";
import { authMIddleware } from "../middleware/authMiddleware";
import restrictTo from "../middleware/restrict";

const router = express.Router();

router.patch(
  "/",
  authMIddleware,
  restrictTo("OWNER"),
  organizationController.updateOrganization,
);

export default router;
