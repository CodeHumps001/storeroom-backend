import express from "express";
import { authMIddleware } from "../middleware/authMiddleware";
import categoryController from "../controllers/categoryController";
const router = express.Router();

router.post("/", authMIddleware, categoryController.createCategory);
router.get("/", authMIddleware, categoryController.getCategories);
router.delete("/:id", authMIddleware, categoryController.deleteCategory);

export default router;
