"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = __importDefault(require("../controllers/productController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authMIddleware, productController_1.default.createProduct);
router.get("/", authMiddleware_1.authMIddleware, productController_1.default.getProducts);
router.get("/:id", authMiddleware_1.authMIddleware, productController_1.default.getProduct);
router.patch("/:id", authMiddleware_1.authMIddleware, productController_1.default.updateProduct);
router.delete("/:id", authMiddleware_1.authMIddleware, productController_1.default.deleteProduct);
exports.default = router;
