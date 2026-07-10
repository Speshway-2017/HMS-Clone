/**
 * Helper to format numeric amounts to Indian Rupees (INR) with Indian number grouping.
 * Example: 15500 -> ₹15,500
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
