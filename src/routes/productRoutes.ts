import express from "express";
import productController from "../controllers/productController";
import { authMIddleware } from "../middleware/authMiddleware";
import restrictTo from "../middleware/restrict";
const router = express.Router();

router.post(
  "/",
  authMIddleware,
  restrictTo("OWNER"),
  productController.createProduct,
);
router.get("/", authMIddleware, productController.getProducts);
router.get("/:id", authMIddleware, productController.getProduct);
router.patch(
  "/:id",
  authMIddleware,
  restrictTo("OWNER"),
  productController.updateProduct,
);
router.delete(
  "/:id",
  authMIddleware,
  restrictTo("OWNER"),
  productController.deleteProduct,
);
router.get(
  "/barcode/:barcode",
  authMIddleware,
  productController.getProductByBarcode,
);

export default router;
