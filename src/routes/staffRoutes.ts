import express from "express";
import inviteStaff from "../controllers/staffController";
import { authMIddleware } from "../middleware/authMiddleware";
import restrictTo from "../middleware/restrict";
import staffController from "../controllers/staffController";

const router = express.Router();

router.post(
  "/",
  authMIddleware,
  restrictTo("OWNER"),
  staffController.inviteStaff,
);
router.get("/", authMIddleware, staffController.getStaff);

export default router;
