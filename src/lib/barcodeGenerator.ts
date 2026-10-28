import { randomInt } from "crypto";
import prisma from "./prisma";

/** EAN-13 check digit for the first 12 digits. */
const checkDigit = (first12: string) => {
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
export async function generateBarcode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let body = "2";
    for (let i = 0; i < 11; i++) body += randomInt(0, 10);
    const code = body + checkDigit(body);

    const taken = await prisma.product.findUnique({
      where: { barcode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error("Could not generate a unique barcode, please try again");
}