import express from "express";
import productController from "../controllers/productController";
import { authMIddleware } from "../middleware/authMiddleware";
const router = express.Router();

router.post("/", authMIddleware, productController.createProduct);
router.get("/", authMIddleware, productController.getProducts);
router.get("/:id", authMIddleware, productController.getProduct);
router.patch("/:id", authMIddleware, productController.updateProduct);
router.delete("/:id", authMIddleware, productController.deleteProduct);

export default router;
