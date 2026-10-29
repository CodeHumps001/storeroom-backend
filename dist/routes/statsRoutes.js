"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/statsRoutes.ts
const express_1 = require("express");
const statsController_1 = require("../controllers/statsController");
const router = (0, express_1.Router)();
router.get("/public", statsController_1.getPublicStats);
exports.default = router;
