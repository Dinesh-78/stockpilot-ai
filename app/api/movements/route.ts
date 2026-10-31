import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || ''; // 'PURCHASE', 'SALE', 'ADJUSTMENT'
  const productId = searchParams.get('productId') || '';

  try {
    const movements = await prisma.stockMovement.findMany({
      where: {
        businessId: user.businessId,
        type: type ? type : undefined,
        productId: productId ? productId : undefined,
      },
      include: {
        product: { select: { name: true, sku: true, unit: true } },
        user: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: { businessId: user.businessId },
      include: {
        user: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ movements, auditLogs });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch stock movements' }, { status: 500 });
  }
}

