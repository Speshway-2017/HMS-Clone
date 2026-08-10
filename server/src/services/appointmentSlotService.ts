import { Types } from "mongoose";
import { Appointment } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";

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
export function normalizeSlotTime(time: string): string {
  if (!time) return "";
  const t = time.trim();

  const hmMatch = t.match(/^(\d{1,2}):(\d{2})$/);
  if (hmMatch) {
    return `${String(parseInt(hmMatch[1], 10)).padStart(2, "0")}:${hmMatch[2]}`;
  }

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

export function formatSlot12Hour(timeStr: string): string {
  if (!timeStr) return "";
  const norm = normalizeSlotTime(timeStr);
  const [hStr, mStr] = norm.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${mStr} ${period}`;
}

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
    hospitalId?: Types.ObjectId | string | Record<string, any>
  ): Promise<Types.ObjectId | null> {
    const hospitalFilter = hospitalId
      ? typeof hospitalId === "object" && !("_id" in hospitalId) && (hospitalId as any).hospital
        ? hospitalId
        : { hospital: hospitalId }
      : {};

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
   * @param patientId  - Optional; patient ID to block slots where patient already has an active appointment.
   * @returns          - Array of booked time strings, e.g. ["09:00", "10:30"]
   */
  static async getBookedSlots(
    doctorId: string | Types.ObjectId,
    date: string | Date,
    hospitalId?: Types.ObjectId | string | Record<string, any>,
    patientId?: string | Types.ObjectId
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
      if (typeof hospitalId === "object" && !("_id" in hospitalId) && (hospitalId as any).hospital) {
        Object.assign(filter, hospitalId);
      } else {
        filter.hospital = hospitalId;
      }
    }

    const appointments = await Appointment.find(filter).select("time");
    const bookedTimes = new Set(
      appointments.map((appt) => appt.time?.trim()).filter(Boolean) as string[]
    );

    // If patientId is provided, also block time slots where this patient already has an active appointment with ANY doctor
    if (patientId) {
      let patientIds: any[] = [patientId];
      const patientDoc = await Patient.findById(patientId);
      if (patientDoc?.user) {
        const relatedDocs = await Patient.find({ user: patientDoc.user }).select("_id");
        if (relatedDocs.length > 0) {
          patientIds = relatedDocs.map((p) => p._id);
        }
      }

      const patientAppts = await Appointment.find({
        patient: { $in: patientIds },
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ["cancelled", "no_show", "completed", "missed"] },
      }).select("time");

      patientAppts.forEach((appt) => {
        if (appt.time) {
          bookedTimes.add(appt.time.trim());
        }
      });
    }

    return Array.from(bookedTimes);
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
    hospitalId?: Types.ObjectId | string | Record<string, any>,
    excludeAppointmentId?: string
  ) {
    const parsedDate = new Date(date);
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const trimmed = time ? time.trim() : "";
    const timeVariations = Array.from(
      new Set([trimmed, normalizeSlotTime(trimmed), formatSlot12Hour(trimmed)].filter(Boolean))
    );

    const filter: Record<string, any> = {
      doctor: doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      time: { $in: timeVariations },
      status: { $nin: AppointmentSlotService.RELEASED_STATUSES },
    };

    if (hospitalId) {
      if (typeof hospitalId === "object" && !("_id" in hospitalId) && (hospitalId as any).hospital) {
        Object.assign(filter, hospitalId);
      } else {
        filter.hospital = hospitalId;
      }
    }

    if (excludeAppointmentId) {
      filter._id = { $ne: excludeAppointmentId };
    }

    return await Appointment.findOne(filter);
  }

  /**
   * Check if a patient already has an active appointment at the exact same date and time slot (with ANY doctor).
   *
   * @returns The conflicting Appointment document, or null if patient has no conflict.
   */
  static async checkPatientSlotConflict(
    patientId: string | Types.ObjectId,
    date: string | Date,
    time: string,
    hospitalId?: Types.ObjectId | string | Record<string, any>,
    excludeAppointmentId?: string
  ) {
    const parsedDate = new Date(date);
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const trimmed = time ? time.trim() : "";
    const timeVariations = Array.from(
      new Set([trimmed, normalizeSlotTime(trimmed), formatSlot12Hour(trimmed)].filter(Boolean))
    );

    let allPatientIds: any[] = [patientId];
    const currentPatientDoc = await Patient.findById(patientId);
    if (currentPatientDoc?.user) {
      const relatedDocs = await Patient.find({ user: currentPatientDoc.user }).select("_id");
      if (relatedDocs.length > 0) {
        allPatientIds = relatedDocs.map((p) => p._id);
      }
    }

    const filter: Record<string, any> = {
      patient: { $in: allPatientIds },
      date: { $gte: startOfDay, $lte: endOfDay },
      time: { $in: timeVariations },
      status: { $nin: ["cancelled", "no_show", "completed", "missed"] },
    };

    if (excludeAppointmentId) {
      filter._id = { $ne: excludeAppointmentId };
    }

    return await Appointment.findOne(filter).populate("doctor", "name");
  }
}
