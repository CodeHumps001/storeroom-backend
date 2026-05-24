"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const updateOrganization = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    try {
        const { organizationName, location, contact } = req.body;
        const updated = await prisma_1.default.organization.update({
            where: { id: req.user.organizationId },
            data: { organizationName, location, contact },
        });
        res.status(200).json({ status: "success", data: updated });
    }
    catch (err) {
        res.status(500).json({ status: "failed", message: err.message });
    }
};
exports.default = { updateOrganization };
