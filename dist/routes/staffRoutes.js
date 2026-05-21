"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const staffController_1 = __importDefault(require("../controllers/staffController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const restrict_1 = __importDefault(require("../middleware/restrict"));
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), staffController_1.default);
exports.default = router;
