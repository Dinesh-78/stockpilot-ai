import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  calculateSalesVelocity,
  predictStockOut,
  calculateRestock,
} from '@/lib/forecasting';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch all products for the business
    const products = await prisma.product.findMany({
      where: { businessId: user.businessId, isArchived: false },
      include: { supplier: true },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch sales movements for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const salesMovements = await prisma.stockMovement.findMany({
      where: {
        businessId: user.businessId,
        type: 'SALE',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        productId: true,
        quantity: true,
        createdAt: true,
      },
    });

    // Group movements by product
    const movementsByProduct: Record<string, typeof salesMovements> = {};
    for (const m of salesMovements) {
      if (!movementsByProduct[m.productId]) {
        movementsByProduct[m.productId] = [];
      }
      movementsByProduct[m.productId].push(m);
    }

    // 3. Calculate alerts, predictions, and recommendations for each product
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockAlerts: any[] = [];
    const restockRecommendations: any[] = [];

    for (const p of products) {
      const pMovements = movementsByProduct[p.id] || [];
      const velocity = calculateSalesVelocity(pMovements, 30);
      const prediction = predictStockOut(p.currentQty, velocity, p.leadTimeDays, p.reorderLevel);
      const recommendation = calculateRestock(p, velocity, 4);

      if (p.currentQty <= 0) {
        outOfStockCount++;
      } else if (prediction.isLowStock) {
        lowStockCount++;
      }

      if (prediction.isLowStock || p.currentQty <= 0) {
        lowStockAlerts.push({
          product: p,
          velocity,
          prediction,
          recommendation,
        });
      }

      if (recommendation.recommendedUnits > 0) {
        restockRecommendations.push(recommendation);
      }
    }

    // Sort alerts by urgency (out of stock first, then lowest days of cover)
    lowStockAlerts.sort((a, b) => a.prediction.daysOfCover - b.prediction.daysOfCover);

    // 4. Calculate today's sales
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySales = await prisma.sale.findMany({
      where: {
        businessId: user.businessId,
        createdAt: { gte: startOfToday },
      },
      select: { totalAmountPaise: true },
    });

    const todaySalesAmountPaise = todaySales.reduce((sum, s) => sum + s.totalAmountPaise, 0);

    // 5. Build 7-day sales chart data
    const chartData: Array<{ date: string; displayDate: string; totalSalesPaise: number; ordersCount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

      chartData.push({
        date: dateStr,
        displayDate,
        totalSalesPaise: 0,
        ordersCount: 0,
      });
    }

    const pastWeekSales = await prisma.sale.findMany({
      where: {
        businessId: user.businessId,
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
      select: { createdAt: true, totalAmountPaise: true },
    });

    for (const sale of pastWeekSales) {
      const saleDateStr = new Date(sale.createdAt).toISOString().split('T')[0];
      const entry = chartData.find((c) => c.date === saleDateStr);
      if (entry) {
        entry.totalSalesPaise += sale.totalAmountPaise;
        entry.ordersCount += 1;
      }
    }

    return NextResponse.json({
      summary: {
        totalProducts: products.length,
        lowStockCount,
        outOfStockCount,
        todaySalesCount: todaySales.length,
        todaySalesAmountPaise,
      },
      lowStockAlerts: lowStockAlerts.slice(0, 10),
      restockRecommendations: restockRecommendations.sort((a, b) => a.daysOfCover - b.daysOfCover),
      salesTrend: chartData,
      role: user.role,
      businessName: user.businessName,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
}

