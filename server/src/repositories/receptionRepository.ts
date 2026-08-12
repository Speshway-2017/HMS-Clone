import { Patient } from "../models/Patient";
import { Appointment } from "../models/Appointment";
import { OPVisit } from "../models/OPVisit";
import { Admission } from "../models/Admission";
import { Room } from "../models/Room";
import { Bed } from "../models/Bed";
import { Ward } from "../models/Ward";
import { Invoice } from "../models/Invoice";
import { Payment } from "../models/Payment";
import { Queue } from "../models/Queue";
import { AuditLog } from "../models/AuditLog";
import { DbNotification } from "../models/DbNotification";
import { Types } from "mongoose";
import { AppointmentSlotService } from "../services/appointmentSlotService";
import { buildBranchQuery } from "../utils/branchQueryHelper";

function toFilter(filterOrId: any): any {
  return buildBranchQuery(filterOrId);
}

export class ReceptionRepository {
  // ── Patient Operations ──
  static async createPatient(data: any) {
    return await Patient.create(data);
  }

  static async findPatientById(hospitalId: any, id: string) {
    return await Patient.findOne({ _id: id, ...toFilter(hospitalId) }).populate("assignedDoctor", "name");
  }

  static async searchPatients(hospitalId: any, queryStr: string) {
    const baseFilter = toFilter(hospitalId);
    let patientIds: any[] = [];
    if (queryStr && queryStr.trim()) {
      const regex = new RegExp(queryStr.trim(), "i");

      // Find any appointments matching referenceId
      const matchedAppts = await Appointment.find({
        ...baseFilter,
        referenceId: regex
      }).select("patient");
      if (matchedAppts.length > 0) {
        patientIds = patientIds.concat(matchedAppts.map(a => a.patient));
      }

      // Find any queue tokens matching tokenNumber
      const matchedTokens = await Queue.find({
        ...baseFilter,
        tokenNumber: regex
      }).select("patient");
      if (matchedTokens.length > 0) {
        patientIds = patientIds.concat(matchedTokens.map(q => q.patient));
      }

      const matchConditions: any[] = [
        { name: regex },
        { phone: regex },
        { uhid: regex },
        { patientCode: regex }
      ];
      if (patientIds.length > 0) {
        matchConditions.push({ _id: { $in: patientIds } });
      }

      return await Patient.find({
        ...baseFilter,
        $or: matchConditions
      }).sort({ name: 1 }).limit(50);
    }

    return await Patient.find(baseFilter).sort({ name: 1 }).limit(50);
  }

  static async listPatients(hospitalId: any, page: number, limit: number, search?: string) {
    const baseFilter = toFilter(hospitalId);
    const filter: any = { ...baseFilter };
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
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
  // ── Canonical status filter ──
  // A slot is BOOKED (unavailable) when ANY appointment for that doctor+date+time
  // has a status that is NOT "cancelled" or "no_show".
  // This MUST match AppointmentSlotService.RELEASED_STATUSES so the display and
  // the booking guard are always consistent.
  static readonly SLOT_RELEASED_STATUSES = ["cancelled", "no_show"] as const;

  static async checkDoctorSlotOverlap(hospitalId: any, doctorId: string, date: Date, time: string) {
    return await AppointmentSlotService.checkSlotConflict(doctorId, date, time, toFilter(hospitalId));
  }

  static async createAppointment(data: any) {
    return await Appointment.create(data);
  }

  static async findAppointmentById(hospitalId: any, id: string) {
    return await Appointment.findOne({ _id: id, ...toFilter(hospitalId) })
      .populate("patient", "name uhid age gender phone email")
      .populate("doctor", "name specialization")
      .populate("department", "name");
  }

  static async listAppointments(hospitalId: any, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Appointment.find({
      ...toFilter(hospitalId),
      date: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("patient", "name uhid age gender phone email")
      .populate("doctor", "name specialization")
      .populate("department", "name")
      .sort({ time: 1 });
  }

  // ── OP Visit Operations ──
  static async createOPVisit(data: any) {
    return await OPVisit.create(data);
  }

  static async findOPVisitById(hospitalId: any, id: string) {
    return await OPVisit.findOne({ _id: id, ...toFilter(hospitalId) })
      .populate("patient", "name uhid phone age gender bloodGroup address emergencyContact insurance allergies medicalHistory photoUrl")
      .populate("doctor", "name specialization")
      .populate("department", "name");
  }

  static async getOPHistory(hospitalId: any, page: number, limit: number, search?: string) {
    const targetHospital = typeof hospitalId === "object" ? (hospitalId.hospital || hospitalId) : hospitalId;
    const filter: any = { ...toFilter(hospitalId) };
    if (search) {
      const regex = new RegExp(search, "i");
      // Search on populated patient fields would require aggregation, but we can search patient IDs
      const patients = await Patient.find({ hospital: targetHospital, name: regex }).select("_id");
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
  static async listRooms(hospitalId: any) {
    return await Room.find({ ...toFilter(hospitalId), status: { $in: ["active", "Active"] } }).sort({ wardName: 1, roomNumber: 1 });
  }

  static async listBedsByRoom(hospitalId: any, roomId: string) {
    return await Bed.find({ ...toFilter(hospitalId), room: roomId }).sort({ bedNumber: 1 });
  }

  static async findBedById(hospitalId: any, id: string) {
    return await Bed.findOne({ _id: id, ...toFilter(hospitalId) }).populate("room");
  }

  static async getRoomsAvailability(hospitalId: any) {
    let filter = toFilter(hospitalId);
    let hId = filter.hospital || filter._id || hospitalId;

    let rooms = await Room.find({ ...filter, status: { $ne: "Inactive" } }).populate("ward").lean();

    if (!rooms || rooms.length === 0) {
      await ReceptionRepository.seedDefaultWardsAndRooms(hId);
      rooms = await Room.find({ ...filter, status: { $ne: "Inactive" } }).populate("ward").lean();
    }

    const beds = await Bed.find(filter).lean();
    const bedsByRoom: Record<string, any[]> = {};
    beds.forEach((b: any) => {
      const rId = String(b.room);
      if (!bedsByRoom[rId]) bedsByRoom[rId] = [];
      bedsByRoom[rId].push(b);
    });

    return rooms.map((r: any) => {
      const roomBeds = bedsByRoom[String(r._id)] || [];
      const occupiedCount = roomBeds.filter((b: any) => b.isOccupied || b.status === "Occupied").length;
      const totalCount = roomBeds.length || r.capacity || 1;
      const availableCount = Math.max(0, totalCount - occupiedCount);

      return {
        ...r,
        _id: r._id,
        roomNumber: r.roomNumber,
        roomName: r.roomName || `Room ${r.roomNumber}`,
        roomType: r.roomType || "General",
        acType: r.acType || "Non AC",
        wardName: (r.ward as any)?.name || r.wardName || "General Ward",
        wardId: (r.ward as any)?._id || r.ward,
        floor: r.floor || 1,
        capacity: r.capacity || totalCount,
        totalBeds: totalCount,
        occupiedBeds: occupiedCount,
        availableBeds: availableCount,
        tariff: r.tariff || { roomChargePerDay: 500, admissionDeposit: 1000 },
        beds: roomBeds.map((b: any) => ({
          _id: b._id,
          bedNumber: b.bedNumber,
          bedCode: b.bedCode || b.bedNumber,
          bedType: b.bedType || "Standard",
          isOccupied: !!(b.isOccupied || b.status === "Occupied"),
          status: b.status || (b.isOccupied ? "Occupied" : "Available"),
          patient: b.patient || null,
          admission: b.admission || null
        }))
      };
    });
  }

  static async updateBedOccupancy(hospitalId: any, bedId: string, isOccupied: boolean, patientId: any = null, admissionId: any = null) {
    const status = isOccupied ? "Occupied" : "Available";
    const updateData: any = {
      isOccupied,
      status,
      patient: isOccupied ? patientId : null,
      admission: isOccupied ? admissionId : null
    };
    return await Bed.findOneAndUpdate({ _id: bedId, ...toFilter(hospitalId) }, updateData, { new: true });
  }

  static async getQueueByDate(hospitalId: any, targetDate: Date) {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const queueTokens = await Queue.find({
      ...toFilter(hospitalId),
      $or: [
        { date: { $gte: startOfDay, $lte: endOfDay } },
        { createdAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    })
      .populate("patient", "name uhid phone age gender")
      .populate("doctor", "name specialization department")
      .populate("department", "name")
      .populate("appointment")
      .sort({ createdAt: 1 });

    if (queueTokens.length > 0) {
      const apptIds = queueTokens.map((q: any) => q.appointment?._id || q.appointment).filter(Boolean);
      const appts = await Appointment.find({
        ...toFilter(hospitalId),
        $or: [
          { _id: { $in: apptIds } },
          { date: { $gte: startOfDay, $lte: endOfDay } }
        ]
      });
      const apptStatusMap = new Map<string, string>();
      const patientApptStatusMap = new Map<string, string>();
      appts.forEach((a: any) => {
        apptStatusMap.set(a._id.toString(), a.status);
        if (a.patient) {
          patientApptStatusMap.set(a.patient.toString(), a.status);
        }
      });

      return queueTokens.map((q: any) => {
        const plain = q.toObject ? q.toObject() : q;
        const apptId = q.appointment?._id ? q.appointment._id.toString() : (q.appointment ? q.appointment.toString() : null);
        const patId = q.patient?._id ? q.patient._id.toString() : (q.patient ? q.patient.toString() : null);
        const statusFromAppt = (apptId && apptStatusMap.get(apptId)) || (patId && patientApptStatusMap.get(patId));

        if (statusFromAppt === "completed") {
          plain.status = "completed";
        } else if (statusFromAppt === "in_consultation") {
          plain.status = "called";
        } else if (statusFromAppt === "cancelled" || statusFromAppt === "no_show") {
          plain.status = "skipped";
        }
        return plain;
      });
    }

    const todayAppts = await Appointment.find({
      ...toFilter(hospitalId),
      date: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("patient", "name uhid phone age gender")
      .populate("doctor", "name specialization department")
      .populate("department", "name")
      .sort({ time: 1 });

    return todayAppts.map((appt: any, idx: number) => ({
      _id: appt._id,
      tokenNumber: appt.tokenNumber || appt.appointmentNumber || appt.referenceId || `T-${String(idx + 1).padStart(3, "0")}`,
      type: appt.type === "Emergency" ? "emergency" : appt.type === "Walk-in" ? "priority" : "regular",
      status: appt.status === "completed" ? "completed" : appt.status === "in_consultation" ? "called" : appt.status === "cancelled" ? "skipped" : "waiting",
      patient: appt.patient,
      doctor: appt.doctor,
      department: appt.department,
      createdAt: appt.createdAt || appt.date
    }));
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
      .populate("admittingDoctor", "name specialization")
      .populate("assignedNurse", "name role");
  }

  static async findActiveAdmissionByPatient(hospitalId: Types.ObjectId, patientId: string) {
    return await Admission.findOne({
      hospital: hospitalId,
      patient: patientId,
      status: {
        $in: [
          "admitted",
          "Admitted",
          "Bed Allocated",
          "Under Observation",
          "Waiting for Bed",
          "In Ward",
          "ICU",
          "Operation Scheduled",
          "Under Treatment",
          "Transferred"
        ]
      }
    });
  }


  static async listAdmissions(hospitalId: Types.ObjectId, status: "admitted" | "discharged" | "discharge_requested") {
    let statusFilter: any;
    if (status === "admitted") {
      statusFilter = {
        $in: [
          "admitted",
          "Admitted",
          "Bed Allocated",
          "Under Observation",
          "Waiting for Bed",
          "In Ward",
          "ICU",
          "Operation Scheduled",
          "Under Treatment",
          "Transferred"
        ]
      };
    } else if (status === "discharge_requested") {
      statusFilter = { $in: ["discharge_requested"] };
    } else {
      statusFilter = {
        $in: [
          "discharged",
          "Discharged",
          "Cancelled",
          "Expired",
          "Against Medical Advice (AMA)",
          "Transferred Out (Final)"
        ]
      };
    }

    return await Admission.find({ ...toFilter(hospitalId), status: statusFilter })
      .populate("patient", "name uhid phone age gender bloodGroup")
      .populate("room")
      .populate("bed")
      .populate("admittingDoctor", "name specialization")
      .populate("dischargeRequestedBy", "name specialization")
      .populate("assignedNurse", "name role")
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

  // ── Wards, Rooms & Beds Availability ──
  static async seedDefaultWardsAndRooms(hospitalId: Types.ObjectId) {
    let generalWard = await Ward.findOne({ hospital: hospitalId, name: "General Ward" });
    if (!generalWard) {
      generalWard = await Ward.create({
        hospital: hospitalId,
        name: "General Ward",
        code: "GW",
        wardType: "General Ward",
        floorNumber: 1,
        status: "Active"
      });
    }

    let semiPrivateWard = await Ward.findOne({ hospital: hospitalId, name: "Semi-Private Ward" });
    if (!semiPrivateWard) {
      semiPrivateWard = await Ward.create({
        hospital: hospitalId,
        name: "Semi-Private Ward",
        code: "SPW",
        wardType: "Semi-Private Ward",
        floorNumber: 2,
        status: "Active"
      });
    }

    let privateWard = await Ward.findOne({ hospital: hospitalId, name: "Private Ward" });
    if (!privateWard) {
      privateWard = await Ward.create({
        hospital: hospitalId,
        name: "Private Ward",
        code: "PW",
        wardType: "Private Ward",
        floorNumber: 3,
        status: "Active"
      });
    }

    let icuWard = await Ward.findOne({ hospital: hospitalId, name: "ICU" });
    if (!icuWard) {
      icuWard = await Ward.create({
        hospital: hospitalId,
        name: "ICU",
        code: "ICU",
        wardType: "ICU",
        floorNumber: 2,
        status: "Active"
      });
    }

    const createRoomWithBeds = async (
      roomNum: string,
      wardDoc: any,
      roomType: string,
      acType: string,
      floor: number,
      capacity: number,
      roomCharge: number
    ) => {
      let room = await Room.findOne({ hospital: hospitalId, roomNumber: roomNum });
      if (!room) {
        room = await Room.create({
          hospital: hospitalId,
          roomNumber: roomNum,
          roomName: `Room ${roomNum}`,
          ward: wardDoc._id,
          wardName: wardDoc.name,
          floor,
          roomType,
          acType,
          capacity,
          tariff: {
            roomChargePerDay: roomCharge,
            admissionDeposit: roomCharge * 2,
            effectiveFrom: new Date(),
            status: "Active"
          },
          status: "Active"
        });

        for (let i = 0; i < capacity; i++) {
          const letter = String.fromCharCode(65 + i);
          const bedNum = `${roomNum}-${letter}`;
          const bedCode = `BED-${roomNum}-${letter}`;

          await Bed.create({
            hospital: hospitalId,
            ward: wardDoc._id,
            room: room._id,
            bedNumber: bedNum,
            bedCode,
            bedType: roomType === "ICU" ? "ICU Bed" : "Standard",
            status: "Available",
            isOccupied: false
          });
        }
      }
    };

    await createRoomWithBeds("101", generalWard, "General", "Non AC", 1, 4, 500);
    await createRoomWithBeds("102", generalWard, "General", "AC", 1, 4, 800);
    await createRoomWithBeds("201", semiPrivateWard, "Semi Private", "Non AC", 2, 2, 1200);
    await createRoomWithBeds("202", semiPrivateWard, "Semi Private", "AC", 2, 2, 1800);
    await createRoomWithBeds("301", privateWard, "Private", "AC", 3, 1, 3000);
    await createRoomWithBeds("302", privateWard, "Private", "AC", 3, 1, 3500);
    await createRoomWithBeds("ICU-1", icuWard, "ICU", "AC", 2, 2, 5000);
  }

  // ── Queue (Token) Operations ──
  static async getQueueTokensByDate(hospitalId: Types.ObjectId, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      ...toFilter(hospitalId),
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["completed", "cancelled", "no_show"] }
    })
      .populate("patient", "name uhid phone age gender")
      .populate("doctor", "name specialization")
      .populate("department", "name")
      .sort({ time: 1 });

    const enrichedAppointments = await Promise.all(
      appointments.map(async (appt) => {
        const queueObj = await Queue.findOne({
          ...toFilter(hospitalId),
          appointment: appt._id
        });

        if (queueObj) {
          return {
            ...appt.toObject(),
            tokenNumber: queueObj.tokenNumber,
            status: queueObj.status
          };
        }
        return appt.toObject();
      })
    );

    return enrichedAppointments;
  }

  static async getDoctorQueueByDate(hospitalId: Types.ObjectId, doctorId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Queue.find({
      ...toFilter(hospitalId),
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
      ...toFilter(hospitalId),
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
    return await DbNotification.find({ ...toFilter(hospitalId), recipientRole: role })
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
    return await AuditLog.find(toFilter(hospitalId))
      .populate("user", "name role")
      .sort({ createdAt: -1 })
      .limit(100);
  }
}
