import express from "express";

import sendContactMessage from "../controllers/contactController";

const router = express.Router();

// In your routes file (e.g., contactRoutes.ts)
router.post("/", sendContactMessage);

export default router;
