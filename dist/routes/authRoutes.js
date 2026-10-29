"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = __importDefault(require("../controllers/authController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post("/register", authController_1.default.authRegister);
router.post("/login", authController_1.default.authLogin);
router.get("/me", authMiddleware_1.authMIddleware, authController_1.default.getMe);
router.post("/forgot-password", authController_1.default.forgotPassword);
router.post("/reset-password", authController_1.default.resetPassword);
exports.default = router;
