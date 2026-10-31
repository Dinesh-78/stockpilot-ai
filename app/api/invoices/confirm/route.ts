import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const invoices = await prisma.invoice.findMany({
      where: { businessId: user.businessId },
      include: {
        supplier: true,
        lines: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invoices });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch invoice history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Forbidden: Only business owners can confirm invoices and update stock' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      supplierName,
      supplierId,
      invoiceNumber,
      invoiceDate,
      lineItems,
      totalAmountPaise,
      fileHash,
      rawOcrText,
    } = body;

    if (!invoiceNumber || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Invoice number and line items are required' },
        { status: 400 }
      );
    }

    // Brief §06: "Confirming it again must not double the stock"
    const alreadyConfirmed = await prisma.invoice.findFirst({
      where: {
        businessId: user.businessId,
        invoiceNumber,
        status: 'CONFIRMED',
      },
    });

    if (alreadyConfirmed) {
      return NextResponse.json(
        {
          error: `Invoice #${invoiceNumber} has already been confirmed and applied to stock. Cannot confirm twice.`,
        },
        { status: 409 }
      );
    }

    // Process all stock updates and records in ONE atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find or create supplier
      let targetSupplierId = supplierId;
      if (!targetSupplierId && supplierName) {
        let sup = await tx.supplier.findFirst({
          where: { businessId: user.businessId, name: supplierName },
        });
        if (!sup) {
          sup = await tx.supplier.create({
            data: {
              businessId: user.businessId,
              name: supplierName,
              defaultLeadTimeDays: 4,
            },
          });
        }
        targetSupplierId = sup.id;
      }

      // Create Invoice record
      const invoice = await tx.invoice.create({
        data: {
          businessId: user.businessId,
          supplierId: targetSupplierId,
          invoiceNumber,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          fileHash,
          totalAmountPaise: totalAmountPaise || 0,
          status: 'CONFIRMED',
          rawOcrText,
          confirmedAt: new Date(),
        },
      });

      // Process each line item
      for (const line of lineItems) {
        const qty = parseFloat(line.quantity);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Invalid quantity ${line.quantity} for item "${line.rawProductName}"`);
        }

        let targetProductId = line.matchedProductId;

        // If marked as new product or no matching product ID exists, create product
        if (!targetProductId) {
          const generatedSku =
            'SKU-' + line.rawProductName.substring(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
          const newProduct = await tx.product.create({
            data: {
              businessId: user.businessId,
              sku: generatedSku,
              name: line.rawProductName,
              unit: 'pcs',
              costPricePaise: line.unitPricePaise,
              sellingPricePaise: Math.round(line.unitPricePaise * 1.25), // 25% markup default
              currentQty: 0,
              reorderLevel: 10,
              leadTimeDays: 4,
              packSize: 1,
              supplierId: targetSupplierId,
            },
          });
          targetProductId = newProduct.id;
        }

        const product = await tx.product.findUnique({
          where: { id: targetProductId },
        });

        if (!product || product.businessId !== user.businessId) {
          throw new Error(`Product match error for item ${line.rawProductName}`);
        }

        const updatedQty = product.currentQty + qty;

        // Increment stock
        await tx.product.update({
          where: { id: targetProductId },
          data: {
            currentQty: updatedQty,
            costPricePaise: line.unitPricePaise || product.costPricePaise,
          },
        });

        // Create line item record
        await tx.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            productId: targetProductId,
            rawProductName: line.rawProductName,
            quantity: qty,
            unitPricePaise: line.unitPricePaise,
            lineTotalPaise: line.lineTotalPaise,
            confidence: line.confidence || 0.95,
            isNewProduct: line.isNewProduct || false,
          },
        });

        // Create Purchase stock movement record
        await tx.stockMovement.create({
          data: {
            businessId: user.businessId,
            productId: targetProductId,
            userId: user.id,
            type: 'PURCHASE',
            quantity: qty,
            balanceAfter: updatedQty,
            reason: `Purchase Invoice #${invoiceNumber}`,
            invoiceId: invoice.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          entityType: 'invoice',
          entityId: invoice.id,
          action: 'OCR_CONFIRM',
          details: JSON.stringify({
            invoiceNumber,
            supplierName,
            linesCount: lineItems.length,
            totalAmountPaise,
          }),
        },
      });

      return invoice;
    });

    return NextResponse.json({
      success: true,
      message: `Invoice #${invoiceNumber} confirmed. Products stock increased atomically by confirmed quantities.`,
      invoice: result,
    });
  } catch (error: any) {
    console.error('Invoice confirm error:', error);
    return NextResponse.json({ error: error.message || 'Failed to confirm invoice' }, { status: 400 });
  }
}

