import express from "express";
import scanController from "../controllers/scanController";
import { authMIddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/stream", authMIddleware, scanController.stream);
router.post("/push", authMIddleware, scanController.push);

export default router;