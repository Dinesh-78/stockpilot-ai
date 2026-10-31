import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { rupeesToPaise } from '@/lib/money';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Forbidden: Only owners can import bulk sales history' },
      { status: 403 }
    );
  }

  try {
    const { csvText } = await request.json();
    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: 'CSV data is required' }, { status: 400 });
    }

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV must contain a header row and at least one data row' },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: { businessId: user.businessId },
    });

    const productMap = new Map<string, typeof products[0]>();
    products.forEach((p) => {
      productMap.set(p.sku.toUpperCase(), p);
      productMap.set(p.name.toLowerCase(), p);
    });

    let importedCount = 0;
    const errors: string[] = [];

    // Format expected: Date (YYYY-MM-DD), SKU or Name, Quantity, Price(Optional)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map((c: string) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 3) {
        errors.push(`Row ${i + 1}: Insufficient columns`);
        continue;
      }

      const [dateStr, identifier, qtyStr, priceStr] = cols;
      const saleDate = new Date(dateStr);
      if (isNaN(saleDate.getTime())) {
        errors.push(`Row ${i + 1}: Invalid date "${dateStr}"`);
        continue;
      }

      const product = productMap.get(identifier.toUpperCase()) || productMap.get(identifier.toLowerCase());
      if (!product) {
        errors.push(`Row ${i + 1}: Product "${identifier}" not found in catalog`);
        continue;
      }

      const qty = parseFloat(qtyStr);
      if (isNaN(qty) || qty <= 0) {
        errors.push(`Row ${i + 1}: Invalid quantity "${qtyStr}"`);
        continue;
      }

      const pricePaise = priceStr ? rupeesToPaise(priceStr) : product.sellingPricePaise;
      const lineTotal = Math.round(qty * pricePaise);

      await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            businessId: user.businessId,
            userId: user.id,
            idempotencyKey: `CSV-IMP-${i}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            totalAmountPaise: lineTotal,
            createdAt: saleDate,
            items: {
              create: [
                {
                  productId: product.id,
                  quantity: qty,
                  unitPricePaise: pricePaise,
                  lineTotalPaise: lineTotal,
                },
              ],
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            businessId: user.businessId,
            productId: product.id,
            userId: user.id,
            type: 'SALE',
            quantity: -qty,
            balanceAfter: product.currentQty,
            reason: `CSV Bulk Import: Row ${i + 1}`,
            saleId: sale.id,
            createdAt: saleDate,
          },
        });
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 5),
      message: `Successfully imported ${importedCount} past sales records to power forecasting!`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to import CSV' }, { status: 500 });
  }
}

