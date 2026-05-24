"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const creditController_1 = __importDefault(require("../controllers/creditController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const restrict_1 = __importDefault(require("../middleware/restrict"));
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), creditController_1.default.createCredit);
router.get("/", authMiddleware_1.authMIddleware, creditController_1.default.getCredits);
router.patch("/:id/payment", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), creditController_1.default.recordPayment);
router.delete("/:id", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), creditController_1.default.deleteCredit);
exports.default = router;
