import express from "express";
import { authMIddleware } from "../middleware/authMiddleware";
import categoryController from "../controllers/categoryController";
import restrictTo from "../middleware/restrict";
const router = express.Router();

router.post(
  "/",
  authMIddleware,
  restrictTo("OWNER"),
  categoryController.createCategory,
);
router.get("/", authMIddleware, categoryController.getCategories);
router.delete(
  "/:id",
  authMIddleware,
  restrictTo("OWNER"),
  categoryController.deleteCategory,
);

export default router;
