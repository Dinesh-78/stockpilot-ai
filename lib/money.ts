/**
 * Format paise (integer) to Indian Rupee (₹) formatted string
 * Example: 14000 -> "₹140.00"
 */
export function formatPaiseToRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Convert rupee decimal input (e.g. 140.50) to integer paise (14050)
 */
export function rupeesToPaise(rupees: number | string): number {
  const numeric = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 100);
}

/**
 * Format quantity with its unit (e.g., "9 pcs", "14.5 kg")
 */
export function formatQuantityWithUnit(qty: number, unit: string): string {
  const formattedQty = Number.isInteger(qty) ? qty.toString() : qty.toFixed(1);
  return `${formattedQty} ${unit}`;
}

