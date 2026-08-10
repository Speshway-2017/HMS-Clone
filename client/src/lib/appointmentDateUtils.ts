/**
 * Shared date comparison and formatting utility for OP Management queues.
 * Uses YYYY-MM-DD string comparisons to avoid timezone shifting anomalies.
 */

export function getYYYYMMDD(dateInput: string | Date): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTodayDate(dateInput: string | Date): boolean {
  if (!dateInput) return false;
  const todayStr = getYYYYMMDD(new Date());
  const apptStr = getYYYYMMDD(dateInput);
  return apptStr === todayStr;
}

export function isFutureDate(dateInput: string | Date): boolean {
  if (!dateInput) return false;
  const todayStr = getYYYYMMDD(new Date());
  const apptStr = getYYYYMMDD(dateInput);
  return apptStr > todayStr;
}

export function isPastDate(dateInput: string | Date): boolean {
  if (!dateInput) return false;
  const todayStr = getYYYYMMDD(new Date());
  const apptStr = getYYYYMMDD(dateInput);
  return apptStr < todayStr;
}

export function formatDisplayDate(dateInput: string | Date): string {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";

  if (isTodayDate(dateInput)) {
    return `Today, ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
