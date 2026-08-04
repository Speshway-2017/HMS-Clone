import { Types } from "mongoose";
import { Appointment } from "../models/Appointment";
import { Doctor } from "../models/Doctor";

/**
 * AppointmentSlotService — Single source of truth for slot availability.
 *
 * SLOT AVAILABILITY RULES (as specified):
 *   BOOKED  → an appointment exists with same Doctor + Date + Time
 *             AND status NOT IN ["cancelled", "no_show"]
 *   AVAILABLE → everything else
 *
 * Both Patient and Receptionist booking flows MUST call this service.
 * Never maintain separate slot availability logic.
 */
export class AppointmentSlotService {
  /**
   * The canonical status exclusion list used everywhere slot availability is checked.
   * A slot is AVAILABLE only when NO appointment exists with the same
   * doctor + date + time that has a status outside this list.
   */
  static readonly RELEASED_STATUSES = ["cancelled", "no_show"] as const;

  /**
   * Resolve a doctor identifier (ObjectId string or name string) to a Doctor ObjectId.
   * Optionally scoped to a hospitalId.
   */
  static async resolveDoctorId(
    doctorId: string,
    hospitalId?: Types.ObjectId | string
  ): Promise<Types.ObjectId | null> {
    const hospitalFilter = hospitalId ? { hospital: hospitalId } : {};

    if (Types.ObjectId.isValid(doctorId)) {
      const doc = await Doctor.findOne({
        $or: [{ _id: doctorId }, { user: doctorId }],
        ...hospitalFilter,
        isActive: { $ne: false },
      }).select("_id");
      return doc ? doc._id : null;
    }

    // Fallback: name lookup
    const doc = await Doctor.findOne({
      name: new RegExp(doctorId.replace(/^dr\.\s*/i, ""), "i"),
      ...hospitalFilter,
    }).select("_id");
    return doc ? doc._id : null;
  }

  /**
   * Get all booked time slots for a doctor on a specific date.
   *
   * @param doctorId   - Doctor._id (ObjectId) or any resolvable string.
   * @param date       - ISO date string (YYYY-MM-DD) or Date object.
   * @param hospitalId - Optional; scopes the query to a specific hospital.
   * @returns          - Array of booked time strings, e.g. ["09:00", "10:30"]
   */
  static async getBookedSlots(
    doctorId: string | Types.ObjectId,
    date: string | Date,
    hospitalId?: Types.ObjectId | string
  ): Promise<string[]> {
    const parsedDate = new Date(date);
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Resolve doctorId to ObjectId if it's a string
    let resolvedDoctorId: Types.ObjectId | string = doctorId;
    if (typeof doctorId === "string") {
      const resolved = await AppointmentSlotService.resolveDoctorId(
        doctorId,
        hospitalId
      );
      if (resolved) {
        resolvedDoctorId = resolved;
      }
    }

    const filter: Record<string, any> = {
      doctor: resolvedDoctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: AppointmentSlotService.RELEASED_STATUSES },
    };

    if (hospitalId) {
      filter.hospital = hospitalId;
    }

    const appointments = await Appointment.find(filter).select("time");
    return appointments
      .map((appt) => appt.time?.trim())
      .filter(Boolean) as string[];
  }

  /**
   * Check if a specific doctor+date+time slot is already booked.
   * Uses the same canonical status filter as getBookedSlots.
   *
   * @returns The conflicting Appointment document, or null if slot is free.
   */
  static async checkSlotConflict(
    doctorId: string | Types.ObjectId,
    date: string | Date,
    time: string,
    hospitalId?: Types.ObjectId | string,
    excludeAppointmentId?: string
  ) {
    const parsedDate = new Date(date);
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filter: Record<string, any> = {
      doctor: doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      time: time.trim(),
      status: { $nin: AppointmentSlotService.RELEASED_STATUSES },
    };

    if (hospitalId) {
      filter.hospital = hospitalId;
    }

    if (excludeAppointmentId) {
      filter._id = { $ne: excludeAppointmentId };
    }

    return await Appointment.findOne(filter);
  }
}
