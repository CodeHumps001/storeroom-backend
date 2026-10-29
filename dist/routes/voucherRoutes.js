"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const voucherController_1 = __importDefault(require("../controllers/voucherController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const restrict_1 = __importDefault(require("../middleware/restrict"));
const router = express_1.default.Router();
// Cashiers need this at the till
router.get("/lookup", authMiddleware_1.authMIddleware, voucherController_1.default.lookupByPhone);
// Owner only
router.get("/", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), voucherController_1.default.listVouchers);
router.post("/issue", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), voucherController_1.default.issueVouchers);
router.post("/:id/resend", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), voucherController_1.default.resendVoucher);
router.delete("/:id", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), voucherController_1.default.voidVoucher);
exports.default = router;
