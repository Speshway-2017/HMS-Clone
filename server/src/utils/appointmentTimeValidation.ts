import { AppError } from "./AppError";

/**
 * Combines appointment date and time slot string into a single Date object.
 * e.g. date: 2026-08-04, time: "10:30" => 2026-08-04 10:30:00
 */
export function getScheduledAppointmentDateTime(dateVal: Date | string, timeStr?: string): Date {
  const scheduledDate = new Date(dateVal);
  if (timeStr && typeof timeStr === "string") {
    const parts = timeStr.trim().split(":");
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        scheduledDate.setHours(hours, minutes, 0, 0);
        return scheduledDate;
      }
    }
  }
  return scheduledDate;
}

/**
 * Checks if an appointment can be cancelled or rescheduled.
 * Must be at least 1 hour (60 minutes) prior to scheduled appointment time.
 * Throws AppError 400 if validation fails.
 */
export function validateAppointmentTimeRestriction(appointment: {
  date: Date | string;
  time?: string;
  status?: string;
}): void {
  if (!appointment) return;

  if (appointment.status === "completed" || appointment.status === "in_consultation") {
    throw new AppError("Cannot process request. Consultation has already started or is completed.", 400);
  }
  if (appointment.status === "cancelled") {
    throw new AppError("This appointment is already cancelled.", 400);
  }

  const scheduledDateTime = getScheduledAppointmentDateTime(appointment.date, appointment.time);
  const now = new Date();

  // Time difference in milliseconds
  const diffMs = scheduledDateTime.getTime() - now.getTime();
  // Difference in whole minutes
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // If remaining time is less than 60 minutes (1 hour) or appointment time has already passed
  if (diffMinutes < 60) {
    throw new AppError(
      "Appointments can only be cancelled or rescheduled up to 1 hour before the scheduled appointment time.",
      400
    );
  }
}
