import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Brief: "Manual adjustments: Owner only"
  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Forbidden: Only the business owner can perform manual stock adjustments' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const { adjustmentQuantity, reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'A valid reason is required for manual adjustment (e.g., damaged, expired, counting error)' },
        { status: 400 }
      );
    }

    const delta = parseFloat(adjustmentQuantity);
    if (isNaN(delta) || delta === 0) {
      return NextResponse.json(
        { error: 'Adjustment quantity must be a non-zero number' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
      });

      if (!product || product.businessId !== user.businessId) {
        throw new Error('Product not found');
      }

      const newQty = product.currentQty + delta;
      // Brief §02: "No negative stock: A sale larger than available stock is rejected." Same for adjustments!
      if (newQty < 0) {
        throw new Error(
          `Adjustment of ${delta} would result in negative stock (Current: ${product.currentQty}). Operation rejected.`
        );
      }

      // Brief: Fractional quantities allowed only for kg or litre
      if (product.unit !== 'kg' && product.unit !== 'litre' && !Number.isInteger(newQty)) {
        throw new Error(
          `Fractional quantities are only allowed for kg or litre units. Product unit is ${product.unit}.`
        );
      }

      const updated = await tx.product.update({
        where: { id },
        data: { currentQty: newQty },
      });

      const movement = await tx.stockMovement.create({
        data: {
          businessId: user.businessId,
          productId: id,
          userId: user.id,
          type: 'ADJUSTMENT',
          quantity: delta,
          balanceAfter: newQty,
          reason: `Manual Adjustment: ${reason.trim()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          entityType: 'adjustment',
          entityId: id,
          action: 'ADJUST',
          details: JSON.stringify({
            productName: product.name,
            delta,
            previousQty: product.currentQty,
            newQty,
            reason,
          }),
        },
      });

      return { product: updated, movement };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to adjust stock' }, { status: 400 });
  }
}

