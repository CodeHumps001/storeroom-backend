"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const organizationController_1 = __importDefault(require("../controllers/organizationController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const restrict_1 = __importDefault(require("../middleware/restrict"));
const router = express_1.default.Router();
router.patch("/", authMiddleware_1.authMIddleware, (0, restrict_1.default)("OWNER"), organizationController_1.default.updateOrganization);
exports.default = router;
