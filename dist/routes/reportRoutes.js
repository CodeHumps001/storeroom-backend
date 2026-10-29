"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reportController_1 = __importDefault(require("../controllers/reportController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const restrict_1 = __importDefault(require("../middleware/restrict"));
const requirePro_1 = __importDefault(require("../middleware/requirePro"));
const router = express_1.default.Router();
router.get("/summary", authMiddleware_1.authMIddleware, requirePro_1.default, (0, restrict_1.default)("OWNER"), reportController_1.default.getSaleSummary);
router.get("/top-products", authMiddleware_1.authMIddleware, requirePro_1.default, (0, restrict_1.default)("OWNER"), reportController_1.default.getTopProduct);
router.get("/stock-value", authMiddleware_1.authMIddleware, requirePro_1.default, (0, restrict_1.default)("OWNER"), reportController_1.default.getStockValue);
router.get("/low-stock", authMiddleware_1.authMIddleware, requirePro_1.default, (0, restrict_1.default)("OWNER"), reportController_1.default.getLowStock);
exports.default = router;
