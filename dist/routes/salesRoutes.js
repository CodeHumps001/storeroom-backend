"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const salesController_1 = __importDefault(require("../controllers/salesController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authMIddleware, salesController_1.default.createSale);
router.get("/", authMiddleware_1.authMIddleware, salesController_1.default.getSales);
router.post("/test-sms", authMiddleware_1.authMIddleware, salesController_1.default.testSMS);
router.get("/:id/receipt", authMiddleware_1.authMIddleware, salesController_1.default.generateReceipt);
router.get("/:id", authMiddleware_1.authMIddleware, salesController_1.default.getSale);
exports.default = router;
