import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sales = await prisma.sale.findMany({
      where: { businessId: user.businessId },
      include: {
        user: { select: { name: true, role: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ sales });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items, idempotencyKey } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Sale must include at least one item' },
        { status: 400 }
      );
    }

    // Brief §02: Repeated requests — submitting the same sale twice must not change stock twice
    const finalIdempotencyKey =
      idempotencyKey || `SALE-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const existingSale = await prisma.sale.findUnique({
      where: { idempotencyKey: finalIdempotencyKey },
      include: { items: true },
    });

    if (existingSale) {
      return NextResponse.json({
        success: true,
        sale: existingSale,
        note: 'Idempotent request: returning already processed sale record without repeating stock deduction',
      });
    }

    // Process atomically inside a transaction with concurrency protection
    const result = await prisma.$transaction(async (tx) => {
      let totalAmountPaise = 0;
      const verifiedItems: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPricePaise: number;
        lineTotalPaise: number;
        newBalance: number;
      }> = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.businessId !== user.businessId || product.isArchived) {
          throw new Error(`Product not found or unavailable: ${item.productId}`);
        }

        const qty = parseFloat(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Invalid sale quantity for product ${product.name}`);
        }

        // Brief §02: Fractional quantities are allowed only for units like kg or litre
        if (product.unit !== 'kg' && product.unit !== 'litre' && !Number.isInteger(qty)) {
          throw new Error(
            `Fractional quantity ${qty} not permitted for unit "${product.unit}". Whole integers required.`
          );
        }

        // Brief §02 & §06: "No negative stock: A sale larger than available stock is rejected."
        // "Two staff sell the last units at the same time -> Only one sale succeeds; the other sees that stock is insufficient."
        if (product.currentQty < qty) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${product.currentQty} ${product.unit}, Requested: ${qty} ${product.unit}. Sale rejected.`
          );
        }

        const newBalance = product.currentQty - qty;
        const lineTotal = Math.round(qty * product.sellingPricePaise);
        totalAmountPaise += lineTotal;

        verifiedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPricePaise: product.sellingPricePaise,
          lineTotalPaise: lineTotal,
          newBalance,
        });

        // Decrement stock immediately inside transaction
        await tx.product.update({
          where: { id: product.id },
          data: { currentQty: newBalance },
        });
      }

      // Create Sale record
      const sale = await tx.sale.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          idempotencyKey: finalIdempotencyKey,
          totalAmountPaise,
          items: {
            create: verifiedItems.map((vi) => ({
              productId: vi.productId,
              quantity: vi.quantity,
              unitPricePaise: vi.unitPricePaise,
              lineTotalPaise: vi.lineTotalPaise,
            })),
          },
        },
        include: { items: true },
      });

      // Create stock movement ledger entries for every sold item
      for (const vi of verifiedItems) {
        await tx.stockMovement.create({
          data: {
            businessId: user.businessId,
            productId: vi.productId,
            userId: user.id,
            type: 'SALE',
            quantity: -vi.quantity, // negative for stock outflow
            balanceAfter: vi.newBalance,
            reason: `Customer Sale #${sale.id.substring(0, 8)}`,
            saleId: sale.id,
          },
        });
      }

      return sale;
    });

    return NextResponse.json({
      success: true,
      sale: result,
      message: `Sale completed successfully. Stock updated automatically.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to record sale' }, { status: 400 });
  }
}

