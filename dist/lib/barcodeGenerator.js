"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBarcode = generateBarcode;
exports.generateBarcodes = generateBarcodes;
const crypto_1 = require("crypto");
const prisma_1 = __importDefault(require("./prisma"));
/** EAN-13 check digit for the first 12 digits. */
const checkDigit = (first12) => {
    const sum = first12
        .split("")
        .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
    return (10 - (sum % 10)) % 10;
};
/**
 * Generates a unique EAN-13 for in-store use. Codes starting with "2" are the
 * range reserved for internal use, so they never clash with real manufacturer
 * barcodes, and standard USB/phone barcode scanners can read them.
 */
async function generateBarcode() {
    for (let attempt = 0; attempt < 10; attempt++) {
        let body = "2";
        for (let i = 0; i < 11; i++)
            body += (0, crypto_1.randomInt)(0, 10);
        const code = body + checkDigit(body);
        const taken = await prisma_1.default.product.findUnique({
            where: { barcode: code },
            select: { id: true },
        });
        if (!taken)
            return code;
    }
    throw new Error("Could not generate a unique barcode, please try again");
}
/** Generates many unique barcodes with ONE database lookup per round (fast for bulk imports). */
async function generateBarcodes(count) {
    const result = new Set();
    for (let round = 0; round < 10 && result.size < count; round++) {
        const candidates = new Set();
        while (result.size + candidates.size < count) {
            let body = "2";
            for (let i = 0; i < 11; i++)
                body += (0, crypto_1.randomInt)(0, 10);
            const code = body + checkDigit(body);
            if (!result.has(code))
                candidates.add(code);
        }
        const taken = await prisma_1.default.product.findMany({
            where: { barcode: { in: [...candidates] } },
            select: { barcode: true },
        });
        const takenSet = new Set(taken.map((t) => t.barcode));
        candidates.forEach((c) => {
            if (!takenSet.has(c))
                result.add(c);
        });
    }
    if (result.size < count) {
        throw new Error("Could not generate unique barcodes, please try again");
    }
    return [...result];
}
