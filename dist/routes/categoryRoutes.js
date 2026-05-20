"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const categoryController_1 = __importDefault(require("../controllers/categoryController"));
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authMIddleware, categoryController_1.default.createCategory);
router.get("/", authMiddleware_1.authMIddleware, categoryController_1.default.getCategories);
router.delete("/:id", authMiddleware_1.authMIddleware, categoryController_1.default.deleteCategory);
exports.default = router;
