/**
 * Helper to format numeric amounts to Indian Rupees (INR) with Indian number grouping.
 * Example: 15500 -> ₹15,500
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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
