"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getHealth = (req, res) => {
    res.status(200).json({ status: "ok", message: "Storeroom is healthy" });
};
exports.default = getHealth;
