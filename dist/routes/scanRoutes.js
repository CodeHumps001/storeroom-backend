"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scanController_1 = __importDefault(require("../controllers/scanController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get("/stream", authMiddleware_1.authMIddleware, scanController_1.default.stream);
router.post("/push", authMiddleware_1.authMIddleware, scanController_1.default.push);
exports.default = router;
