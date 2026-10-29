import express from "express";
import productController from "../controllers/productController";
import { authMIddleware } from "../middleware/authMiddleware";
import restrictTo from "../middleware/restrict";
import { upload } from "../lib/cloudinary";
import bulkController from "../controllers/productBulkController";
import importController from "../controllers/productImportController";

const router = express.Router();

router.post(
  "/",
  authMIddleware,
  restrictTo("OWNER"),
  upload.single("image"),
  productController.createProduct,
);
router.get("/", authMIddleware, productController.getProducts);

router.patch("/bulk", authMIddleware, restrictTo("OWNER"), bulkController.bulkUpdateProducts);
   router.post("/bulk-import", authMIddleware, restrictTo("OWNER"), importController.bulkImportProducts);
router.get("/:id", authMIddleware, productController.getProduct);
router.patch(
  "/:id",
  authMIddleware,
  restrictTo("OWNER"),
  upload.single("image"),
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
