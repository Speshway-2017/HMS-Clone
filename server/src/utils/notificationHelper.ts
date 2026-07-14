import { Types } from "mongoose";
import { DbNotification } from "../models/DbNotification";
import { emitToDoctor } from "../config/socket";

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
 * and emits a real-time event strictly to that doctor's socket.io room.
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

  // Emit strictly to the authenticated doctor's room
  emitToDoctor(payload.recipientDoctor.toString(), "notification:new", notif);

  return notif;
}
