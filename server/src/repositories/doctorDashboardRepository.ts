import { Appointment } from "../models/Appointment";
import { Admission } from "../models/Admission";
import { Queue } from "../models/Queue";
import { Prescription } from "../models/Prescription";
import { LabOrder } from "../models/LabOrder";
import { Certificate } from "../models/Certificate";
import { DbNotification } from "../models/DbNotification";
import { Types } from "mongoose";

export class DoctorDashboardRepository {
  // Utility to get start and end of today
  static getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // 1. Today's Appointments
  static async getTodayAppointments(hospitalId: Types.ObjectId, doctorId: string) {
    const { start, end } = this.getTodayRange();
    return await Appointment.find({
      hospital: hospitalId,
      doctor: doctorId,
      date: { $gte: start, $lte: end },
      status: { $ne: "pending_payment" },
    })
      .populate("patient", "name uhid age gender phone medicalHistory createdAt")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ time: 1 });
  }

  static async getWaitingPatients(hospitalId: Types.ObjectId, doctorId: string) {
    const { start, end } = this.getTodayRange();
    return await Queue.find({
      hospital: hospitalId,
      doctor: doctorId,
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
  static async getCurrentInpatients(hospitalId: Types.ObjectId, doctorId: string) {
    return await Admission.find({
      hospital: hospitalId,
      admittingDoctor: doctorId,
      status: "admitted",
    })
      .populate("patient", "name uhid age gender phone")
      .populate("room")
      .populate("bed")
      .populate("admittingDoctor", "name")
      .sort({ admissionDate: -1 });
  }

  // 4. Completed Consultations Today
  static async getCompletedConsultations(hospitalId: Types.ObjectId, doctorId: string) {
    const { start, end } = this.getTodayRange();
    return await Appointment.find({
      hospital: hospitalId,
      doctor: doctorId,
      status: "completed",
      date: { $gte: start, $lte: end },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ updatedAt: -1 });
  }

  // 5. Pending Prescriptions
  static async getPendingPrescriptions(hospitalId: Types.ObjectId, doctorId: string) {
    return await Prescription.find({
      hospital: hospitalId,
      doctor: doctorId,
      status: "pending",
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 });
  }

  // 6. Pending Lab Orders
  static async getPendingLabOrders(hospitalId: Types.ObjectId, doctorId: string) {
    return await LabOrder.find({
      hospital: hospitalId,
      doctor: doctorId,
      status: "pending",
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 });
  }

  // 7. Follow-up Patients (Upcoming appointments after today)
  static async getFollowupPatients(hospitalId: Types.ObjectId, doctorId: string) {
    const { end } = this.getTodayRange();
    return await Appointment.find({
      hospital: hospitalId,
      doctor: doctorId,
      date: { $gt: end },
      status: { $in: ["scheduled", "checked_in"] },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ date: 1, time: 1 });
  }

  // 8. Today's Surgeries
  static async getTodaySurgeries(hospitalId: Types.ObjectId, doctorId: string) {
    const { start, end } = this.getTodayRange();
    return await Appointment.find({
      hospital: hospitalId,
      doctor: doctorId,
      type: "Surgery",
      date: { $gte: start, $lte: end },
      status: { $ne: "pending_payment" },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ time: 1 });
  }

  // 9. Notifications for Doctor
  static async getNotifications(hospitalId: Types.ObjectId, doctorId: string) {
    return await DbNotification.find({
      hospital: hospitalId,
      recipientDoctor: doctorId,
    }).sort({ createdAt: -1 });
  }

  // 10. Calendar Schedule (Daily, Weekly, Monthly)
  static async getCalendarAppointments(hospitalId: Types.ObjectId, doctorId: string) {
    return await Appointment.find({
      hospital: hospitalId,
      doctor: doctorId,
      status: { $ne: "pending_payment" },
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ date: 1, time: 1 });
  }

  // 11. Certificates List
  static async getCertificates(hospitalId: Types.ObjectId, doctorId: string) {
    return await Certificate.find({
      hospital: hospitalId,
      doctor: doctorId,
    })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 });
  }
}
