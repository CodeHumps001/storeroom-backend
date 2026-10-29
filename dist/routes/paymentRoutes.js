"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = __importDefault(require("../controllers/paymentController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post("/initialize", authMiddleware_1.authMIddleware, paymentController_1.default.initializePayment);
router.post("/webhook", paymentController_1.default.handleWebhook);
exports.default = router;
