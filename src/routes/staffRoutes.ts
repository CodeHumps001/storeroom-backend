import express from "express";
import inviteStaff from "../controllers/staffController";
import { authMIddleware } from "../middleware/authMiddleware";
import restrictTo from "../middleware/restrict";

const router = express.Router();

router.post("/", authMIddleware, restrictTo("OWNER"), inviteStaff);

export default router;
