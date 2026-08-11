import { Appointment } from "../models/Appointment";
import { Admission } from "../models/Admission";
import { Queue } from "../models/Queue";
import { Prescription } from "../models/Prescription";
import { LabOrder } from "../models/LabOrder";
import { Certificate } from "../models/Certificate";
import { DbNotification } from "../models/DbNotification";
import { Types } from "mongoose";

export class DoctorDashboardRepository {
  // Utility to convert string or ObjectId doctor inputs to valid ObjectIds
  static normalizeDocIds(doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]): Types.ObjectId[] {
    const raw = Array.isArray(doctorId) ? doctorId : [doctorId];
    return raw.map(id => {
      if (id instanceof Types.ObjectId) return id;
      if (typeof id === "string" && Types.ObjectId.isValid(id)) {
        return new Types.ObjectId(id);
      }
      return id as any;
    });
  }

  // Utility to get start and end of today spanning Asia/Kolkata (IST) and UTC timezone boundaries
  static getTodayRange() {
    const now = new Date();
    const istDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const istStart = new Date(`${istDateStr}T00:00:00.000+05:30`);
    const istEnd = new Date(`${istDateStr}T23:59:59.999+05:30`);

    const utcStart = new Date(`${istDateStr}T00:00:00.000Z`);
    const utcEnd = new Date(`${istDateStr}T23:59:59.999Z`);

    const start = new Date(Math.min(istStart.getTime(), utcStart.getTime()));
    const end = new Date(Math.max(istEnd.getTime(), utcEnd.getTime()));

    return { start, end };
  }

  // 1. Today's Appointments
  static async getTodayAppointments(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const { start, end } = this.getTodayRange();
    const docIds = this.normalizeDocIds(doctorId);
    return await Appointment.find({
      hospital: hospitalId,
      doctor: { $in: docIds },
      date: { $gte: start, $lte: end },
      status: { $nin: ["cancelled", "no_show"] },
    })
      .populate("patient", "name uhid age gender phone medicalHistory createdAt")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ time: 1 });
  }

  static async getWaitingPatients(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const { start, end } = this.getTodayRange();
    const docIds = this.normalizeDocIds(doctorId);
    return await Queue.find({
      hospital: hospitalId,
      doctor: { $in: docIds },
      status: { $in: ["waiting", "called"] },
      createdAt: { $gte: start, $lte: end },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .populate("appointment")
      .sort({ createdAt: 1 });
  }

  // 3. Current Inpatients
  static async getCurrentInpatients(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = this.normalizeDocIds(doctorId);
    return await Admission.find({
      hospital: hospitalId,
      admittingDoctor: { $in: docIds },
      status: "admitted",
    })
      .populate("patient", "name uhid age gender phone")
      .populate("room")
      .populate("bed")
      .populate("admittingDoctor", "name")
      .sort({ admissionDate: -1 });
  }

  // 4. Completed Consultations Today
  static async getCompletedConsultations(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const { start, end } = this.getTodayRange();
    const docIds = this.normalizeDocIds(doctorId);
    return await Appointment.find({
      hospital: hospitalId,
      doctor: { $in: docIds },
      status: "completed",
      date: { $gte: start, $lte: end },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ updatedAt: -1 });
  }

  // 5. Pending Prescriptions
  static async getPendingPrescriptions(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = this.normalizeDocIds(doctorId);
    return await Prescription.find({
      hospital: hospitalId,
      doctor: { $in: docIds },
      status: { $in: ["pending", "Pending"] },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 });
  }

  // 6. Pending Lab Orders
  static async getPendingLabOrders(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = this.normalizeDocIds(doctorId);
    return await LabOrder.find({
      hospital: hospitalId,
      doctor: { $in: docIds },
      status: "pending",
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 });
  }

  // 7. Follow-up Patients (Upcoming appointments after today)
  static async getFollowupPatients(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const { end } = this.getTodayRange();
    const docIds = this.normalizeDocIds(doctorId);
    return await Appointment.find({
      hospital: hospitalId,
      doctor: { $in: docIds },
      date: { $gt: end },
      status: { $in: ["scheduled", "checked_in"] },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ date: 1, time: 1 });
  }

  // 8. Today's Surgeries
  static async getTodaySurgeries(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const { start, end } = this.getTodayRange();
    const docIds = this.normalizeDocIds(doctorId);
    return await Appointment.find({
      hospital: hospitalId,
      doctor: { $in: docIds },
      type: "Surgery",
      date: { $gte: start, $lte: end },
      status: { $nin: ["cancelled", "no_show"] },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ time: 1 });
  }

  // 9. Notifications for Doctor
  static async getNotifications(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = this.normalizeDocIds(doctorId);
    return await DbNotification.find({
      hospital: hospitalId,
      recipientDoctor: { $in: docIds },
    }).sort({ createdAt: -1 });
  }

  // 10. Calendar Schedule (Daily, Weekly, Monthly)
  static async getCalendarAppointments(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = this.normalizeDocIds(doctorId);
    return await Appointment.find({
      hospital: hospitalId,
      doctor: { $in: docIds },
      status: { $nin: ["cancelled", "no_show"] },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ date: 1, time: 1 });
  }

  // 11. Certificates List
  static async getCertificates(hospitalId: Types.ObjectId, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = this.normalizeDocIds(doctorId);
    return await Certificate.find({
      hospital: hospitalId,
      doctor: { $in: docIds },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 });
  }
}
