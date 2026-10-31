import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { rupeesToPaise } from '@/lib/money';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        supplier: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { name: true, role: true } } },
        },
      },
    });

    // Brief §06: "Anita changes a product ID in the URL to view Ramesh's product -> The server denies access; no data from another business is exposed."
    if (!product || product.businessId !== user.businessId) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Brief §01 & §02: Staff cannot change prices or delete products
  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Forbidden: Staff cannot modify product prices or settings' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.category !== undefined) updateData.category = body.category.trim();
    if (body.costPrice !== undefined) updateData.costPricePaise = rupeesToPaise(body.costPrice);
    if (body.sellingPrice !== undefined) updateData.sellingPricePaise = rupeesToPaise(body.sellingPrice);
    if (body.reorderLevel !== undefined) updateData.reorderLevel = parseFloat(body.reorderLevel);
    if (body.leadTimeDays !== undefined) updateData.leadTimeDays = parseInt(body.leadTimeDays, 10);
    if (body.packSize !== undefined) updateData.packSize = parseInt(body.packSize, 10);
    if (body.supplierId !== undefined) updateData.supplierId = body.supplierId || null;

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        entityType: 'product',
        entityId: id,
        action: 'UPDATE',
        details: JSON.stringify({ before: product, after: updateData }),
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Brief: Staff cannot delete products
  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Forbidden: Staff cannot delete products' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Brief §02: "Deleting products: A product with stock history is archived, not deleted; its past sales and movements stay intact."
    const archived = await prisma.product.update({
      where: { id },
      data: { isArchived: true },
    });

    await prisma.auditLog.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        entityType: 'product',
        entityId: id,
        action: 'ARCHIVE',
        details: JSON.stringify({ name: product.name, sku: product.sku }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Product ${product.name} archived successfully. Past movements preserved.`,
      product: archived,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to archive product' }, { status: 500 });
  }
}

