"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const couponController_1 = __importDefault(require("../controllers/couponController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const restrict_1 = __importDefault(require("../middleware/restrict"));
const router = express_1.default.Router();
// Any logged-in user (cashiers need these at the till)
router.post("/preview", authMiddleware_1.authMIddleware, couponController_1.default.previewDiscount);
router.get("/policy", authMiddleware_1.authMIddleware, couponController_1.default.getPolicy);
// Owner only. "/policy" is declared before "/:id" so it isn't read as an id.
router.patch("/policy", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), couponController_1.default.updatePolicy);
router.get("/", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), couponController_1.default.listCoupons);
router.post("/", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), couponController_1.default.createCoupon);
router.patch("/:id", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), couponController_1.default.updateCoupon);
router.delete("/:id", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), couponController_1.default.deleteCoupon);
exports.default = router;
