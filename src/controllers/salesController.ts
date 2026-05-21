import { Response } from "express";
import prisma from "../lib/prisma";

import PDFDocument from "pdfkit";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const createSale = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }

  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const { items } = req.body;

    // Step 1: Validate stock for every item
    let totalAmount = 0;
    const productSnapshots: {
      productId: string;
      quantity: number;
      priceAtSale: number;
    }[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId, organizationId },
      });

      if (!product) {
        return res.status(404).json({
          status: "failed",
          message: `Product ${item.productId} not found`,
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          status: "failed",
          message: `Not enough stock for ${product.name}. Available: ${product.quantity}`,
        });
      }

      totalAmount += product.sellingPrice * item.quantity;
      productSnapshots.push({
        productId: product.id,
        quantity: item.quantity,
        priceAtSale: product.sellingPrice,
      });
    }

    // Step 2: Create Sale + SaleItems + decrement stock in one transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create the sale
      const newSale = await tx.sale.create({
        data: {
          totalAmount,
          organizationId,
          userId,
          items: {
            create: productSnapshots.map((snapshot) => ({
              productId: snapshot.productId,
              quantity: snapshot.quantity,
              priceAtSale: snapshot.priceAtSale,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Decrement stock for each product
      for (const snapshot of productSnapshots) {
        await tx.product.update({
          where: { id: snapshot.productId },
          data: { quantity: { decrement: snapshot.quantity } },
        });
      }

      return newSale;
    });

    res.status(201).json({
      status: "success",
      message: "Sale recorded successfully",
      data: sale,
    });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

const getSales = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  try {
    const sales = await prisma.sale.findMany({
      where: { organizationId: req.user.organizationId },
      include: { items: true },
    });

    res.status(200).json({ status: "success", data: sales });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

const getSale = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  try {
    const { id } = req.params as { id: string };
    const sale = await prisma.sale.findUnique({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!sale) {
      return res
        .status(404)
        .json({ status: "failed", message: "Sale not found" });
    }

    res.status(200).json({ status: "success", data: sale });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

//PDF RECEIPT

const generateReceipt = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }

    const { id } = req.params as { id: string };

    // 1. Fetch the sale with items, product names, and organization (UNTOUCHED)
    const sale = await prisma.sale.findFirst({
      where: { id, organizationId: req.user.organizationId },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
        organization: {
          select: { organizationName: true, location: true, contact: true },
        },
      },
    });

    if (!sale) {
      return res
        .status(404)
        .json({ status: "failed", message: "Sale not found" });
    }

    // 2. Create the PDF document
    const doc = new PDFDocument({ margin: 50 });

    // 3. Set response headers so the browser knows it's a PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=receipt-${id}.pdf`);

    // 4. Pipe the PDF into the response
    doc.pipe(res);

    // 5. Write content (MODERN DESIGN ENGINE)
    const strokeColor = "#E4E4E7"; // Clean Zinc-200 border color
    const primaryTextColor = "#18181B"; // Zinc-900 typography
    const secondaryTextColor = "#71717A"; // Zinc-500 muted text

    // Header Meta Block (Left-Aligned Branding / Right-Aligned Invoice Header)
    doc.fillColor(primaryTextColor);
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(sale.organization.organizationName, 50, 50);

    doc.fillColor(secondaryTextColor);
    doc.fontSize(9).font("Helvetica");
    doc.text(sale.organization.location);
    doc.text(sale.organization.contact);

    // Right Aligned Context (Calculated relative to standard page geometry)
    doc.fillColor(primaryTextColor);
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("RECEIPT", 400, 50, { align: "right", width: 160 });
    doc.fillColor(secondaryTextColor);
    doc.fontSize(9).font("Helvetica");
    doc.text(`ID: #${id.slice(-8).toUpperCase()}`, 400, 72, {
      align: "right",
      width: 160,
    });
    doc.text(
      `Date: ${new Date(sale.createdAt).toLocaleDateString()}`,
      400,
      85,
      { align: "right", width: 160 },
    );

    // Clean Spacer Rule
    doc.moveDown(2);
    doc
      .moveTo(50, doc.y)
      .lineTo(560, doc.y)
      .strokeColor(strokeColor)
      .lineWidth(1)
      .stroke();
    doc.moveDown(1.5);

    // Dynamic Tracking Reference Coordinates for Table Headers
    const currentY = doc.y;
    doc.fillColor(secondaryTextColor);
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("ITEM DESCRIPTION", 50, currentY, { width: 240 });
    doc.text("QTY", 300, currentY, { width: 50, align: "center" });
    doc.text("PRICE", 360, currentY, { width: 90, align: "right" });
    doc.text("SUBTOTAL", 460, currentY, { width: 100, align: "right" });

    // Header Border Divider
    doc.moveDown(0.8);
    doc
      .moveTo(50, doc.y)
      .lineTo(560, doc.y)
      .strokeColor(strokeColor)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.8);

    // Items Render Loop
    doc.fillColor(primaryTextColor);
    for (const item of sale.items) {
      const subtotal = item.quantity * item.priceAtSale;
      const itemY = doc.y;

      // Handle extra long product names gracefully with text wrapping bounds
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(item.product.name, 50, itemY, { width: 240 });
      doc.font("Helvetica").fontSize(10);
      doc.text(String(item.quantity), 300, itemY, {
        width: 50,
        align: "center",
      });
      doc.text(`GHS ${item.priceAtSale.toFixed(2)}`, 360, itemY, {
        width: 90,
        align: "right",
      });
      doc
        .font("Helvetica-Bold")
        .text(`GHS ${subtotal.toFixed(2)}`, 460, itemY, {
          width: 100,
          align: "right",
        });

      doc.moveDown(1.2);
    }

    // Secondary Total Segment Boundary Line
    doc
      .moveTo(350, doc.y)
      .lineTo(560, doc.y)
      .strokeColor(strokeColor)
      .lineWidth(1)
      .stroke();
    doc.moveDown(1);

    // Formatted Total Box Element
    const totalY = doc.y;
    doc.fillColor(secondaryTextColor).font("Helvetica-Bold").fontSize(10);
    doc.text("TOTAL DUE", 350, totalY, { width: 100, align: "left" });
    doc
      .fillColor(primaryTextColor)
      .fontSize(16)
      .text(`GHS ${sale.totalAmount.toFixed(2)}`, 450, totalY - 5, {
        width: 110,
        align: "right",
      });

    // Bottom Decorative Footer placement
    doc.moveDown(4);
    doc
      .moveTo(50, doc.y)
      .lineTo(560, doc.y)
      .strokeColor(strokeColor)
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(1.5);
    doc
      .fillColor(secondaryTextColor)
      .fontSize(9)
      .font("Helvetica")
      .text("Thank you for your patronage!", { align: "center" });

    // 6. End the document — this finalizes the stream (UNTOUCHED)
    doc.end();
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

export default { createSale, getSale, getSales, generateReceipt };
