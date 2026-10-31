import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { rupeesToPaise } from '@/lib/money';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || ''; // 'in_stock', 'low_stock', 'out_of_stock'

  try {
    const products = await prisma.product.findMany({
      where: {
        businessId: user.businessId,
        isArchived: false,
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { sku: { contains: search } },
                ],
              }
            : {},
          category ? { category } : {},
        ],
      },
      include: {
        supplier: true,
      },
      orderBy: { name: 'asc' },
    });

    // Filter by stock status if requested
    const filtered = products.filter((p) => {
      if (status === 'out_of_stock') return p.currentQty <= 0;
      if (status === 'low_stock') return p.currentQty > 0 && p.currentQty <= p.reorderLevel;
      if (status === 'in_stock') return p.currentQty > p.reorderLevel;
      return true;
    });

    return NextResponse.json({ products: filtered });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Brief: Staff cannot add or delete products
  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Forbidden: Only business owners can add new products' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      sku,
      name,
      category,
      unit,
      costPrice,
      sellingPrice,
      initialQty,
      reorderLevel,
      leadTimeDays,
      packSize,
      supplierId,
    } = body;

    if (!sku || !name) {
      return NextResponse.json(
        { error: 'SKU and product name are required' },
        { status: 400 }
      );
    }

    // Check SKU uniqueness in this business
    const existing = await prisma.product.findFirst({
      where: {
        businessId: user.businessId,
        sku: sku.trim().toUpperCase(),
        isArchived: false,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A product with SKU "${sku}" already exists in your store` },
        { status: 409 }
      );
    }

    const costPricePaise = rupeesToPaise(costPrice || 0);
    const sellingPricePaise = rupeesToPaise(sellingPrice || 0);
    const qty = parseFloat(initialQty || 0);

    // Brief: fractional quantities allowed only for kg or litre
    if (unit !== 'kg' && unit !== 'litre' && !Number.isInteger(qty)) {
      return NextResponse.json(
        { error: `Fractional quantities are only allowed for kg and litre units` },
        { status: 400 }
      );
    }

    // Create product and initial stock movement atomically
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          businessId: user.businessId,
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          category: category || 'General',
          unit: unit || 'pcs',
          costPricePaise,
          sellingPricePaise,
          currentQty: qty,
          reorderLevel: parseFloat(reorderLevel || 10),
          leadTimeDays: parseInt(leadTimeDays || 4, 10),
          packSize: parseInt(packSize || 1, 10),
          supplierId: supplierId || null,
        },
      });

      if (qty > 0) {
        await tx.stockMovement.create({
          data: {
            businessId: user.businessId,
            productId: created.id,
            userId: user.id,
            type: 'PURCHASE',
            quantity: qty,
            balanceAfter: qty,
            reason: 'Initial stock on product creation',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          entityType: 'product',
          entityId: created.id,
          action: 'CREATE',
          details: JSON.stringify({ name: created.name, sku: created.sku, initialQty: qty }),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}

