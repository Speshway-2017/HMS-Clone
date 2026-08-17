import { Appointment } from "../models/Appointment";
import { Admission } from "../models/Admission";
import { Queue } from "../models/Queue";
import { Prescription } from "../models/Prescription";
import { LabOrder } from "../models/LabOrder";
import { Certificate } from "../models/Certificate";
import { DbNotification } from "../models/DbNotification";
import { Doctor } from "../models/Doctor";
import { Types } from "mongoose";
import { buildBranchQuery, combineBranchQuery } from "../utils/branchQueryHelper";

export class DoctorDashboardRepository {
  // Utility to convert doctor inputs (Doctor _id, User _id, email/name) to all matching ObjectIds
  static async normalizeDocIds(doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]): Promise<Types.ObjectId[]> {
    const raw = Array.isArray(doctorId) ? doctorId : [doctorId];
    const idsSet = new Set<string>();

    for (const id of raw) {
      if (!id) continue;
      const strId = id.toString();
      idsSet.add(strId);

      if (Types.ObjectId.isValid(strId)) {
        const objId = new Types.ObjectId(strId);
        // Find Doctor record by _id
        const docRecord = await Doctor.findById(objId);
        if (docRecord) {
          if (docRecord.user) idsSet.add(docRecord.user.toString());
          if (docRecord.email) {
            const sameEmailDocs = await Doctor.find({ email: new RegExp(`^${docRecord.email.trim()}$`, "i") }, "_id user");
            sameEmailDocs.forEach(d => {
              idsSet.add(d._id.toString());
              if (d.user) idsSet.add(d.user.toString());
            });
          }
          if (docRecord.name) {
            const cleanName = docRecord.name.replace(/^Dr\.\s*/i, "").trim();
            const sameNameDocs = await Doctor.find({ name: new RegExp(cleanName, "i") }, "_id user");
            sameNameDocs.forEach(d => {
              idsSet.add(d._id.toString());
              if (d.user) idsSet.add(d.user.toString());
            });
          }
        } else {
          // Find Doctor record by user ID
          const docByUser = await Doctor.find({ user: objId }, "_id user email name");
          docByUser.forEach(d => {
            idsSet.add(d._id.toString());
            if (d.user) idsSet.add(d.user.toString());
          });
        }
      }
    }

    return Array.from(idsSet).map(idStr => new Types.ObjectId(idStr));
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
  static async getTodayAppointments(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const { start, end } = this.getTodayRange();
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      doctor: { $in: docIds },
      $or: [
        { date: { $gte: start, $lte: end } },
        { status: { $in: ["scheduled", "checked_in", "waiting", "called", "in_consultation"] } }
      ],
      status: { $nin: ["cancelled", "no_show"] },
    });
    return await Appointment.find(query)
      .populate("patient", "name uhid age gender phone medicalHistory createdAt")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ time: 1 });
  }

  // 2. Waiting Patients Queue
  static async getWaitingPatients(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      doctor: { $in: docIds },
      status: { $in: ["waiting", "called"] },
    });
    return await Queue.find(query)
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .populate("appointment")
      .sort({ createdAt: 1 });
  }

  // 3. Current Inpatients
  static async getCurrentInpatients(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      $or: [
        { admittingDoctor: { $in: docIds } },
        { attendingDoctor: { $in: docIds } },
        { doctor: { $in: docIds } }
      ],
      status: { $in: ["admitted", "Admitted", "active", "Active"] },
    });
    return await Admission.find(query)
      .populate("patient", "name uhid age gender phone")
      .populate("room")
      .populate("bed")
      .populate("ward")
      .populate("admittingDoctor", "name")
      .sort({ admissionDate: -1 });
  }

  // 4. Completed Consultations Today
  static async getCompletedConsultations(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const { start, end } = this.getTodayRange();
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      doctor: { $in: docIds },
      status: "completed",
      date: { $gte: start, $lte: end },
    });
    return await Appointment.find(query)
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ updatedAt: -1 });
  }

  // 5. Pending Prescriptions
  static async getPendingPrescriptions(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      doctor: { $in: docIds },
      status: { $in: ["pending", "Pending"] },
    });
    return await Prescription.find(query)
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 });
  }

  // 6. Pending Lab Orders
  static async getPendingLabOrders(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      doctor: { $in: docIds },
      status: "pending",
    });
    return await LabOrder.find(query)
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 });
  }

  // 7. Follow-up Patients (Upcoming appointments after today)
  static async getFollowupPatients(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const { end } = this.getTodayRange();
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      doctor: { $in: docIds },
      date: { $gt: end },
      status: { $in: ["scheduled", "checked_in"] },
    });
    return await Appointment.find(query)
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ date: 1, time: 1 });
  }

  // 8. Today's Surgeries
  static async getTodaySurgeries(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const { start, end } = this.getTodayRange();
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      doctor: { $in: docIds },
      type: "Surgery",
      date: { $gte: start, $lte: end },
      status: { $nin: ["cancelled", "no_show"] },
    });
    return await Appointment.find(query)
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ time: 1 });
  }

  // 9. Notifications for Doctor
  static async getNotifications(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      recipientDoctor: { $in: docIds },
    });
    return await DbNotification.find(query).sort({ createdAt: -1 });
  }

  // 10. Calendar Schedule (Daily, Weekly, Monthly)
  static async getCalendarAppointments(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      doctor: { $in: docIds },
      status: { $nin: ["cancelled", "no_show"] },
    });
    return await Appointment.find(query)
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ date: 1, time: 1 });
  }

  // 11. Certificates List
  static async getCertificates(filterOrId: any, doctorId: string | Types.ObjectId | (string | Types.ObjectId)[]) {
    const docIds = await this.normalizeDocIds(doctorId);
    const query = combineBranchQuery(filterOrId, {
      doctor: { $in: docIds },
    });
    return await Certificate.find(query)
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 });
  }
}
