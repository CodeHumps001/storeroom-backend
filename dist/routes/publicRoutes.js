"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const voucherController_1 = __importDefault(require("../controllers/voucherController"));
const router = express_1.default.Router();
// No login: customers open their voucher link on their own phone
router.get("/vouchers/:code", voucherController_1.default.publicVoucher);
exports.default = router;
