import { Types } from "mongoose";
import { DbNotification } from "../models/DbNotification";
import { Doctor } from "../models/Doctor";
import { emitToDoctor, emitToHospital } from "../config/socket";

export interface DoctorNotificationPayload {
  hospital: Types.ObjectId | string;
  title: string;
  message: string;
  type: "admission_request" | "appointment" | "inventory" | "invoice" | "general";
  severity?: "info" | "warning" | "critical";
  recipientDoctor: Types.ObjectId | string;
  link?: string;
  data?: any;
}

/**
 * Creates a notification in the database targeted to a specific doctor
 * and emits real-time events to that doctor's room and hospital rooms.
 */
export async function createDoctorNotification(payload: DoctorNotificationPayload) {
  const notif = await DbNotification.create({
    hospital: payload.hospital,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    severity: payload.severity || "info",
    recipientRole: "doctor",
    recipientDoctor: payload.recipientDoctor,
    link: payload.link || "",
    data: payload.data || null,
  });

  const docIdStr = payload.recipientDoctor.toString();
  emitToDoctor(docIdStr, "notification:new", notif);
  emitToHospital(payload.hospital.toString(), "notification_created", notif);

  // If Doctor record links to a User record and is distinct, emit to User ID as well
  try {
    const docDoc = await Doctor.findById(payload.recipientDoctor);
    if (docDoc?.user && docDoc.user.toString() !== docIdStr) {
      emitToDoctor(docDoc.user.toString(), "notification:new", notif);
    }
  } catch {
    // Ignore look-up error if docDoc missing
  }

  return notif;
}
