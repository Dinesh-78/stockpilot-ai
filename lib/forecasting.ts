export interface VelocityResult {
  avgDailySales: number;
  totalUnitsSold: number;
  daysWithSales: number;
  windowDays: number;
  isReliable: boolean; // false if < 7 days of sales data
}

export interface StockOutPrediction {
  daysOfCover: number;
  predictedStockOutDate: Date | null;
  formattedStockOutDate: string;
  isLowStock: boolean;
  alertReason: string | null;
  status: 'OUT' | 'CRITICAL' | 'LOW' | 'NORMAL' | 'NO_DATA';
}

export interface RestockRecommendation {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  unit: string;
  leadTimeDays: number;
  packSize: number;
  avgDailySales: number;
  daysOfCover: number;
  predictedStockOutDate: string;
  targetCoverageDays: number; // buffer days beyond lead time
  rawNeededUnits: number;
  recommendedUnits: number;
  packCount: number;
  explanation: string;
  isLowStock: boolean;
  urgency: 'OUT' | 'CRITICAL' | 'SOON' | 'ADEQUATE';
  costPricePaise: number;
  estimatedCostPaise: number;
}

/**
 * Calculate sales velocity using historical stock movements (type: 'SALE')
 * Supports weighting recent days more heavily.
 */
export function calculateSalesVelocity(
  saleMovements: Array<{ quantity: number; createdAt: Date | string }>,
  windowDays: number = 30
): VelocityResult {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 86400000);

  // Filter sales within the window
  const salesInWindow = saleMovements.filter((m) => {
    const d = new Date(m.createdAt);
    return d >= windowStart && d <= now;
  });

  if (salesInWindow.length === 0) {
    return {
      avgDailySales: 0,
      totalUnitsSold: 0,
      daysWithSales: 0,
      windowDays,
      isReliable: false,
    };
  }

  // Group by day string (YYYY-MM-DD)
  const salesByDay: Record<string, number> = {};
  for (const m of salesInWindow) {
    const dayKey = new Date(m.createdAt).toISOString().split('T')[0];
    salesByDay[dayKey] = (salesByDay[dayKey] || 0) + Math.abs(m.quantity);
  }

  const daysWithSales = Object.keys(salesByDay).length;
  const totalUnitsSold = Object.values(salesByDay).reduce((sum, q) => sum + q, 0);

  // If fewer than 7 days of sales data exist across history, label not reliable
  if (daysWithSales < 7) {
    const rawAvg = totalUnitsSold / Math.max(1, daysWithSales);
    return {
      avgDailySales: Math.round(rawAvg * 10) / 10,
      totalUnitsSold: Math.round(totalUnitsSold * 10) / 10,
      daysWithSales,
      windowDays,
      isReliable: false, // Brief §04: "Fewer than 7 days of sales -> label 'Not enough history'"
    };
  }

  // Weighted moving average (recent days have higher weight)
  const sortedDates = Object.keys(salesByDay).sort();
  let weightedSum = 0;
  let weightSum = 0;

  sortedDates.forEach((dateKey, index) => {
    const weight = index + 1; // 1 to N
    weightedSum += salesByDay[dateKey] * weight;
    weightSum += weight;
  });

  const weightedDaily = weightSum > 0 ? weightedSum / weightSum : totalUnitsSold / windowDays;
  const finalVelocity = Math.round(weightedDaily * 10) / 10;

  return {
    avgDailySales: Math.max(0.1, finalVelocity),
    totalUnitsSold: Math.round(totalUnitsSold * 10) / 10,
    daysWithSales,
    windowDays,
    isReliable: true,
  };
}

/**
 * Predict stock-out date from current stock and velocity
 */
export function predictStockOut(
  currentStock: number,
  velocity: VelocityResult,
  leadTimeDays: number,
  reorderLevel: number
): StockOutPrediction {
  if (currentStock <= 0) {
    return {
      daysOfCover: 0,
      predictedStockOutDate: new Date(),
      formattedStockOutDate: 'Out of Stock',
      isLowStock: true,
      alertReason: 'Stock is currently 0',
      status: 'OUT',
    };
  }

  if (!velocity.isReliable && velocity.daysWithSales === 0) {
    const isBelowReorder = currentStock <= reorderLevel;
    return {
      daysOfCover: 999,
      predictedStockOutDate: null,
      formattedStockOutDate: 'Not enough history',
      isLowStock: isBelowReorder,
      alertReason: isBelowReorder ? `Stock (${currentStock}) ≤ Reorder level (${reorderLevel})` : null,
      status: isBelowReorder ? 'LOW' : 'NO_DATA',
    };
  }

  const daysOfCover = Math.round((currentStock / velocity.avgDailySales) * 10) / 10;
  const stockOutDate = new Date();
  stockOutDate.setDate(stockOutDate.getDate() + Math.floor(daysOfCover));

  const formattedDate = stockOutDate.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Brief: Raised when stock <= reorder level, or when days of cover <= lead time
  const isBelowReorder = currentStock <= reorderLevel;
  const isWithinLeadTime = daysOfCover <= leadTimeDays;
  const isLowStock = isBelowReorder || isWithinLeadTime;

  let alertReason: string | null = null;
  let status: StockOutPrediction['status'] = 'NORMAL';

  if (daysOfCover <= leadTimeDays) {
    alertReason = `Runs out in ${daysOfCover} days (Lead time is ${leadTimeDays} days)`;
    status = 'CRITICAL';
  } else if (isBelowReorder) {
    alertReason = `Stock (${currentStock}) ≤ Reorder level (${reorderLevel})`;
    status = 'LOW';
  }

  return {
    daysOfCover,
    predictedStockOutDate: stockOutDate,
    formattedStockOutDate: `${formattedDate} (${daysOfCover} days left)`,
    isLowStock,
    alertReason,
    status,
  };
}

/**
 * Calculate recommended restock quantity with visible human explanation
 * Formula from brief:
 * Enough to cover lead time plus a target number of days, minus current stock, rounded up to pack size.
 */
export function calculateRestock(
  product: {
    id: string;
    name: string;
    sku: string;
    currentQty: number;
    unit: string;
    leadTimeDays: number;
    packSize: number;
    reorderLevel: number;
    costPricePaise: number;
  },
  velocity: VelocityResult,
  targetCoverageDays: number = 4
): RestockRecommendation {
  const prediction = predictStockOut(
    product.currentQty,
    velocity,
    product.leadTimeDays,
    product.reorderLevel
  );

  const packSize = Math.max(1, product.packSize || 1);
  const leadTime = Math.max(1, product.leadTimeDays || 4);

  // If not enough data
  if (!velocity.isReliable) {
    const rawOrder = Math.max(0, product.reorderLevel * 2 - product.currentQty);
    const packCount = Math.ceil(rawOrder / packSize);
    const recommendedUnits = packCount * packSize;

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      currentStock: product.currentQty,
      unit: product.unit,
      leadTimeDays: leadTime,
      packSize,
      avgDailySales: velocity.avgDailySales,
      daysOfCover: prediction.daysOfCover,
      predictedStockOutDate: prediction.formattedStockOutDate,
      targetCoverageDays,
      rawNeededUnits: rawOrder,
      recommendedUnits,
      packCount,
      explanation: `Not enough sales history (fewer than 7 days of sales recorded). Default order based on reorder level.`,
      isLowStock: prediction.isLowStock,
      urgency: product.currentQty <= 0 ? 'OUT' : prediction.isLowStock ? 'CRITICAL' : 'ADEQUATE',
      costPricePaise: product.costPricePaise,
      estimatedCostPaise: recommendedUnits * product.costPricePaise,
    };
  }

  // Brief Formula:
  // (avgDailySales * (leadTime + targetCoverageDays)) - currentStock
  const totalDaysToCover = leadTime + targetCoverageDays;
  const demandToCover = velocity.avgDailySales * totalDaysToCover;
  const rawNeeded = Math.max(0, demandToCover - product.currentQty);

  // Round up to pack size (never negative)
  const packCount = Math.ceil(rawNeeded / packSize);
  const recommendedUnits = packCount * packSize;

  // Build the exact human-readable explanation requested in the brief
  // E.g.: "Sells 6/day, 9 left, 4-day lead time -> order 48 (2 cartons of 24)"
  const packDescription =
    packSize > 1
      ? ` (${packCount} carton${packCount > 1 ? 's' : ''} of ${packSize})`
      : '';

  const explanation = `Sells ${velocity.avgDailySales}/day, ${product.currentQty} left, ${leadTime}-day lead time → order ${recommendedUnits}${packDescription}`;

  let urgency: RestockRecommendation['urgency'] = 'ADEQUATE';
  if (product.currentQty <= 0) {
    urgency = 'OUT';
  } else if (prediction.daysOfCover <= leadTime) {
    urgency = 'CRITICAL';
  } else if (prediction.isLowStock) {
    urgency = 'SOON';
  }

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    currentStock: product.currentQty,
    unit: product.unit,
    leadTimeDays: leadTime,
    packSize,
    avgDailySales: velocity.avgDailySales,
    daysOfCover: prediction.daysOfCover,
    predictedStockOutDate: prediction.formattedStockOutDate,
    targetCoverageDays,
    rawNeededUnits: Math.round(rawNeeded * 10) / 10,
    recommendedUnits,
    packCount,
    explanation,
    isLowStock: prediction.isLowStock,
    urgency,
    costPricePaise: product.costPricePaise,
    estimatedCostPaise: recommendedUnits * product.costPricePaise,
  };
}

