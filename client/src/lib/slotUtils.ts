/**
 * slotUtils.ts — Shared time slot generation utility.
 *
 * SINGLE SOURCE OF TRUTH for slot list generation on the frontend.
 *
 * Both Patient Dashboard and Receptionist Appointments MUST use this utility.
 * Never duplicate or maintain separate slot generation logic.
 *
 * The frontend generates the *list* of possible slots from doctor schedule data,
 * then the backend (AppointmentSlotService) determines which of those are BOOKED.
 * The union produces the final display grid.
 */

/**
 * Generate all possible time slots for a given doctor on a given date.
 *
 * Priority order for schedule resolution:
 * 1. monthlyAvailability override for the exact date (if present).
 * 2. workingHours entry for the day of the week.
 * 3. Hard defaults: 09:00–17:00, 15-min slots, 13:00 break.
 *
 * For TODAY, past time slots are automatically filtered out.
 *
 * @param doctor   - Doctor object (from API), may be undefined.
 * @param dateStr  - ISO date string (YYYY-MM-DD).
 * @returns        - Array of HH:MM strings in chronological order.
 */
export function generateTimeSlots(doctor: any | undefined, dateStr: string): string[] {
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  let from = "09:00";
  let to = "17:00";
  let duration = 15;
  let breakTime = "13:00";

  if (doctor) {
    // 1. Monthly availability override (exact date match)
    const monthlyOverride = doctor.monthlyAvailability?.find(
      (ma: any) => ma.date === dateStr
    );
    if (monthlyOverride) {
      if (!monthlyOverride.active) {
        // Doctor explicitly marked as unavailable on this date
        return [];
      }
      from = monthlyOverride.from || from;
      to = monthlyOverride.to || to;
    } else {
      // 2. Weekly schedule
      const dateObj = new Date(dateStr);
      const dayName = DAYS[dateObj.getDay()];
      const daySchedule = doctor.workingHours?.find(
        (wh: any) => wh.day === dayName
      );

      if (daySchedule && !daySchedule.active) {
        // Doctor is off duty on this day
        return [];
      }
      if (daySchedule?.from && daySchedule.from !== "—") from = daySchedule.from;
      if (daySchedule?.to && daySchedule.to !== "—") to = daySchedule.to;
    }

    // 3. Slot settings (always from doctor object regardless of override source)
    if (doctor.consultationSettings?.slotDuration) {
      duration = doctor.consultationSettings.slotDuration;
    }
    if (doctor.consultationSettings?.breakTime) {
      breakTime = doctor.consultationSettings.breakTime;
    }
  }

  // Build raw slot list
  const slots = buildSlots(from, to, duration, breakTime);

  // Filter out past slots when date is today
  const todayStr = new Date().toISOString().split("T")[0];
  if (dateStr === todayStr) {
    const now = new Date();
    const nowH = now.getHours();
    const nowM = now.getMinutes();
    return slots.filter((slot) => {
      const [h, m] = slot.split(":").map(Number);
      return h > nowH || (h === nowH && m > nowM);
    });
  }

  return slots;
}

/**
 * Build an array of HH:MM time strings from `from` to `to` with
 * `duration`-minute increments, skipping a 60-minute break window.
 *
 * @internal
 */
function buildSlots(
  from: string,
  to: string,
  duration: number,
  breakTime?: string
): string[] {
  const slots: string[] = [];
  const [startH, startM] = from.split(":").map(Number);
  const [endH, endM] = to.split(":").map(Number);

  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  let breakStart = -1;
  let breakEnd = -1;
  if (breakTime) {
    const [bH, bM] = breakTime.split(":").map(Number);
    breakStart = bH * 60 + bM;
    breakEnd = breakStart + 60; // 1-hour break
  }

  while (current + duration <= end) {
    // Skip break window
    if (breakStart !== -1 && current >= breakStart && current < breakEnd) {
      current += duration;
      continue;
    }

    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    current += duration;
  }

  return slots;
}

/**
 * Normalize a time string to HH:MM (24-hour) for safe comparison.
 * Handles "9:00", "09:00", "9:00 AM", "09:00 PM", etc.
 */
export function normalizeSlotTime(time: string): string {
  if (!time) return "";
  const t = time.trim();

  // Already in HH:MM 24h
  const hmMatch = t.match(/^(\d{1,2}):(\d{2})$/);
  if (hmMatch) {
    return `${String(parseInt(hmMatch[1], 10)).padStart(2, "0")}:${hmMatch[2]}`;
  }

  // 12-hour with AM/PM
  const amPmMatch = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    let h = parseInt(amPmMatch[1], 10);
    const m = amPmMatch[2];
    const period = amPmMatch[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  }

  return t;
}

/**
 * Check if a given slot time string is in the booked slots array,
 * using normalised comparison to handle format differences.
 */
export function isSlotBooked(slot: string, bookedSlots: string[]): boolean {
  const normalized = normalizeSlotTime(slot);
  return bookedSlots.some((b) => normalizeSlotTime(b) === normalized);
}
