import { Queue } from "../models/Queue";
import { Types } from "mongoose";

export function getDoctorDynamicStatus(doctor: any, busyDoctorIds: Set<string>): "on_duty" | "off_duty" | "on_leave" {
  if (doctor.status === "on_leave") return "on_leave";
  
  if (busyDoctorIds.has(doctor._id.toString())) {
    return "off_duty"; // Busy in consultation
  }

  if (!doctor.workingHours || doctor.workingHours.length === 0) {
    // Default fallback
    return doctor.status === "on_duty" ? "on_duty" : "off_duty";
  }

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = days[new Date().getDay()];
  const schedule = doctor.workingHours.find((wh: any) => wh.day === todayName);

  if (schedule && schedule.active) {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    const [fromH, fromM] = (schedule.from || "09:00").split(":").map(Number);
    const [toH, toM] = (schedule.to || "17:00").split(":").map(Number);

    const fromMin = fromH * 60 + fromM;
    const toMin = toH * 60 + toM;

    if (currentMin >= fromMin && currentMin < toMin) {
      return "on_duty"; // Available
    }
  }

  return "off_duty";
}

export async function getBusyDoctorIds(hospitalId: Types.ObjectId): Promise<Set<string>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const busyQueues = await Queue.find({
    hospital: hospitalId,
    status: "called",
    createdAt: { $gte: today, $lt: tomorrow }
  }).select("doctor");

  return new Set(busyQueues.map(q => q.doctor.toString()));
}
