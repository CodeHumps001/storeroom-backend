/**
 * One-off: gives every product that has no barcode (null OR "") a generated one.
 * Run from the backend folder:   npx tsx scripts/backfillBarcodes.ts
 * (or: npx ts-node scripts/backfillBarcodes.ts)
 */

import { generateBarcode } from "../src/lib/barcodeGenerator";
import prisma from "../src/lib/prisma";

async function main() {
  const products = await prisma.product.findMany({
    where: { OR: [{ barcode: null }, { barcode: "" }] },
    select: { id: true, name: true },
  });

  console.log(`Found ${products.length} product(s) without a barcode`);

  for (const p of products) {
    const barcode = await generateBarcode();
    await prisma.product.update({ where: { id: p.id }, data: { barcode } });
    console.log(`  ${p.name} -> ${barcode}`);
  }
  console.log("Done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());