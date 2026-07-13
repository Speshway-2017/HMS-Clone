import { Patient } from "../models/Patient";
import { Appointment } from "../models/Appointment";
import { OPVisit } from "../models/OPVisit";
import { Admission } from "../models/Admission";
import { Room } from "../models/Room";
import { Bed } from "../models/Bed";
import { Invoice } from "../models/Invoice";
import { Payment } from "../models/Payment";
import { Queue } from "../models/Queue";
import { AuditLog } from "../models/AuditLog";
import { DbNotification } from "../models/DbNotification";
import { Types } from "mongoose";

export class ReceptionRepository {
  // ── Patient Operations ──
  static async createPatient(data: any) {
    return await Patient.create(data);
  }

  static async findPatientById(hospitalId: Types.ObjectId, id: string) {
    return await Patient.findOne({ _id: id, hospital: hospitalId }).populate("assignedDoctor", "name");
  }

  static async searchPatients(hospitalId: Types.ObjectId, queryStr: string) {
    const filter: any = { hospital: hospitalId };
    if (queryStr) {
      const regex = new RegExp(queryStr, "i");
      filter.$or = [
        { name: regex },
        { phone: regex },
        { uhid: regex },
        { patientCode: regex }
      ];
    }
    return await Patient.find(filter).sort({ name: 1 }).limit(50);
  }

  static async listPatients(hospitalId: Types.ObjectId, page: number, limit: number, search?: string) {
    const filter: any = { hospital: hospitalId };
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { name: regex },
        { phone: regex },
        { uhid: regex },
        { patientCode: regex }
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Patient.countDocuments(filter)
    ]);
    return { data, total };
  }

  // ── Appointment Operations ──
  static async checkDoctorSlotOverlap(hospitalId: Types.ObjectId, doctorId: string, date: Date, time: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Appointment.findOne({
      hospital: hospitalId,
      doctor: doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      time: time,
      status: { $in: ["scheduled", "checked_in", "in_consultation"] }
    });
  }

  static async createAppointment(data: any) {
    return await Appointment.create(data);
  }

  static async findAppointmentById(hospitalId: Types.ObjectId, id: string) {
    return await Appointment.findOne({ _id: id, hospital: hospitalId })
      .populate("patient", "name uhid phone gender age")
      .populate("doctor", "name specialization")
      .populate("department", "name");
  }

  static async listAppointments(hospitalId: Types.ObjectId, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Appointment.find({
      hospital: hospitalId,
      date: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("patient", "name uhid phone")
      .populate("doctor", "name specialization")
      .populate("department", "name")
      .sort({ time: 1 });
  }

  // ── OP Visit Operations ──
  static async createOPVisit(data: any) {
    return await OPVisit.create(data);
  }

  static async findOPVisitById(hospitalId: Types.ObjectId, id: string) {
    return await OPVisit.findOne({ _id: id, hospital: hospitalId })
      .populate("patient", "name uhid phone age gender bloodGroup address emergencyContact insurance allergies medicalHistory photoUrl")
      .populate("doctor", "name specialization")
      .populate("department", "name");
  }

  static async getOPHistory(hospitalId: Types.ObjectId, page: number, limit: number, search?: string) {
    const filter: any = { hospital: hospitalId };
    if (search) {
      const regex = new RegExp(search, "i");
      // Search on populated patient fields would require aggregation, but we can search patient IDs
      const patients = await Patient.find({ hospital: hospitalId, name: regex }).select("_id");
      filter.patient = { $in: patients.map(p => p._id) };
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      OPVisit.find(filter)
        .populate("patient", "name uhid phone")
        .populate("doctor", "name")
        .populate("department", "name")
        .sort({ visitDate: -1 })
        .skip(skip)
        .limit(limit),
      OPVisit.countDocuments(filter)
    ]);
    return { data, total };
  }

  // ── Room & Bed Operations ──
  static async listRooms(hospitalId: Types.ObjectId) {
    return await Room.find({ hospital: hospitalId, status: { $in: ["active", "Active"] } }).sort({ wardName: 1, roomNumber: 1 });
  }

  static async listBedsByRoom(hospitalId: Types.ObjectId, roomId: string) {
    return await Bed.find({ hospital: hospitalId, room: roomId }).sort({ bedNumber: 1 });
  }

  static async findBedById(hospitalId: Types.ObjectId, id: string) {
    return await Bed.findOne({ _id: id, hospital: hospitalId }).populate("room");
  }

  static async getRoomsAvailability(hospitalId: Types.ObjectId) {
    const rooms = await Room.find({ hospital: hospitalId, status: { $in: ["active", "Active"] } }).lean();
    const beds = await Bed.find({ hospital: hospitalId }).lean();

    return rooms.map(room => {
      const roomBeds = beds.filter(b => b.room.toString() === room._id.toString());
      const totalBeds = roomBeds.length;
      const occupiedBeds = roomBeds.filter(b => b.isOccupied).length;
      const availableBeds = totalBeds - occupiedBeds;
      return {
        ...room,
        totalBeds,
        occupiedBeds,
        availableBeds,
        beds: roomBeds
      };
    });
  }

  static async updateBedOccupancy(hospitalId: Types.ObjectId, bedId: string, isOccupied: boolean) {
    const status = isOccupied ? "Occupied" : "Available";
    return await Bed.findOneAndUpdate({ _id: bedId, hospital: hospitalId }, { isOccupied, status }, { new: true });
  }

  // ── Inpatient (Admission) Operations ──
  static async createAdmission(data: any) {
    return await Admission.create(data);
  }

  static async findAdmissionById(hospitalId: Types.ObjectId, id: string) {
    return await Admission.findOne({ _id: id, hospital: hospitalId })
      .populate("patient", "name uhid phone age gender bloodGroup address emergencyContact insurance photoUrl")
      .populate("room")
      .populate("bed")
      .populate("admittingDoctor", "name specialization");
  }

  static async findActiveAdmissionByPatient(hospitalId: Types.ObjectId, patientId: string) {
    return await Admission.findOne({ hospital: hospitalId, patient: patientId, status: "admitted" });
  }

  static async listAdmissions(hospitalId: Types.ObjectId, status: "admitted" | "discharged") {
    return await Admission.find({ hospital: hospitalId, status })
      .populate("patient", "name uhid phone age gender bloodGroup")
      .populate("room")
      .populate("bed")
      .populate("admittingDoctor", "name specialization")
      .sort({ admissionDate: -1 });
  }

  static async updateAdmissionStatus(hospitalId: Types.ObjectId, id: string, status: "admitted" | "discharged", updateData: any) {
    return await Admission.findOneAndUpdate({ _id: id, hospital: hospitalId }, { status, ...updateData }, { new: true });
  }

  // ── Billing & Payment Operations ──
  static async createInvoice(data: any) {
    return await Invoice.create(data);
  }

  static async findInvoiceById(hospitalId: Types.ObjectId, id: string) {
    return await Invoice.findOne({ _id: id, hospital: hospitalId }).populate("patient", "name uhid phone age gender");
  }

  static async updateInvoiceStatus(hospitalId: Types.ObjectId, id: string, status: string) {
    return await Invoice.findOneAndUpdate({ _id: id, hospital: hospitalId }, { status }, { new: true });
  }

  static async createPayment(data: any) {
    return await Payment.create(data);
  }

  static async getPaymentHistory(hospitalId: Types.ObjectId) {
    return await Payment.find({ hospital: hospitalId })
      .populate("patient", "name uhid phone")
      .populate({
        path: "invoice",
        select: "items status"
      })
      .sort({ paidAt: -1 });
  }

  static async getPendingInvoices(hospitalId: Types.ObjectId) {
    return await Invoice.find({ hospital: hospitalId, status: "pending" })
      .populate("patient", "name uhid phone")
      .sort({ createdAt: -1 });
  }

  // ── Queue (Token) Operations ──
  static async getQueueByDate(hospitalId: Types.ObjectId, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Queue.find({
      hospital: hospitalId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("patient", "name uhid phone age gender")
      .populate("doctor", "name specialization")
      .populate("department", "name")
      .sort({ createdAt: 1 });
  }

  static async getDoctorQueueByDate(hospitalId: Types.ObjectId, doctorId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Queue.find({
      hospital: hospitalId,
      doctor: doctorId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("patient", "name uhid phone age gender")
      .sort({ createdAt: 1 });
  }

  static async createQueueToken(data: any) {
    return await Queue.create(data);
  }

  static async updateQueueTokenStatus(hospitalId: Types.ObjectId, id: string, status: "waiting" | "called" | "completed" | "skipped") {
    return await Queue.findOneAndUpdate({ _id: id, hospital: hospitalId }, { status }, { new: true });
  }

  static async getNextWaitingToken(hospitalId: Types.ObjectId, doctorId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Queue.findOne({
      hospital: hospitalId,
      doctor: doctorId,
      status: "waiting",
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: 1 });
  }

  // ── DbNotification Operations ──
  static async createNotification(data: any) {
    return await DbNotification.create(data);
  }

  static async getNotificationsByRole(hospitalId: Types.ObjectId, role: string) {
    return await DbNotification.find({ hospital: hospitalId, recipientRole: role })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  static async markNotificationRead(hospitalId: Types.ObjectId, id: string) {
    return await DbNotification.findOneAndUpdate({ _id: id, hospital: hospitalId }, { isRead: true }, { new: true });
  }

  // ── Logging Operations ──
  static async createAuditLog(data: any) {
    return await AuditLog.create(data);
  }

  static async getAuditLogs(hospitalId: Types.ObjectId) {
    return await AuditLog.find({ hospital: hospitalId })
      .populate("user", "name role")
      .sort({ createdAt: -1 })
      .limit(100);
  }
}
