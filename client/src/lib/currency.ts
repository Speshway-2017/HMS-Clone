/**
 * Helper to format numeric amounts to Indian Rupees (INR) with Indian number grouping.
 * Examples:
 *   1000     -> ₹1,000.00
 *   100000   -> ₹1,00,000.00
 *   10000000 -> ₹1,00,00,000.00
 */
export function formatINR(amount: number | null | undefined): string {
  const num = typeof amount === "number" ? amount : Number(amount);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundCurrency(safe));
}

/**
 * Helper to format whole counts using Indian numbering format without currency symbol.
 * Examples:
 *   89     -> "89"
 *   1000   -> "1,000"
 *   100000 -> "1,00,000"
 */
export function formatCount(count: number | null | undefined): string {
  const num = typeof count === "number" ? count : Number(count);
  const safe = Number.isFinite(num) ? Math.round(num) : 0;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(safe);
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toPaise(value: number): number {
  return Math.round(roundCurrency(value) * 100);
}

export function fromPaise(paise: number): number {
  return roundCurrency(paise / 100);
}
