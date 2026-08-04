import mongoose, { Types } from "mongoose";
import { ReceptionRepository } from "../repositories/receptionRepository";
import { AppError } from "../utils/AppError";
import { getDoctorDynamicStatus, getBusyDoctorIds } from "../utils/doctorStatus";
import { Doctor } from "../models/Doctor";
import { Room } from "../models/Room";
import { Bed } from "../models/Bed";
import { Department } from "../models/Department";
import { Patient } from "../models/Patient";
import { Invoice } from "../models/Invoice";
import { Admission } from "../models/Admission";
import { AdmissionRequest } from "../models/AdmissionRequest";
import { Payment } from "../models/Payment";
import { Queue } from "../models/Queue";
import { Appointment } from "../models/Appointment";
import { OPVisit } from "../models/OPVisit";
import { Hospital } from "../models/Hospital";
import { DbNotification } from "../models/DbNotification";
import { Ward } from "../models/Ward";
import { Staff } from "../models/Staff";
import { emitToHospital, emitToDoctor } from "../config/socket";
import { createDoctorNotification } from "../utils/notificationHelper";
import { IPBill } from "../models/IPBill";
import { IPBillPayment } from "../models/IPBillPayment";
import { RoomTariff } from "../models/RoomTariff";
import { User } from "../models/User";
import { validateAppointmentTimeRestriction } from "../utils/appointmentTimeValidation";


function generateDigits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

export class ReceptionService {
  // ── Dashboard Statistics ──
  static async getStats(hospitalId: Types.ObjectId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      registrationsToday,
      opVisitsToday,
      ipAdmissionsCount,
      invoices,
      collectionsToday,
      appointmentsToday,
      waitingQueue,
      emergencyQueue,
      doctorsCount,
      activeRooms,
      bedsAvailable,
      ipCollectionsToday,
      pendingIpBillsCount,
      completedIpBillsCount
    ] = await Promise.all([
      // Today's Registrations
      Patient.countDocuments({ hospital: hospitalId, createdAt: { $gte: today, $lt: tomorrow } }),
      // Today's OP Visits
      ReceptionRepository.getOPHistory(hospitalId, 1, 1).then(r => r?.total ?? 0),
      // Current IP Admissions (all currently admitted inpatients)
      Admission.countDocuments({ hospital: hospitalId, status: "admitted" }),
      // Invoices for pending/paid status check
      Invoice.find({ hospital: hospitalId }),
      // Today's collections from payment
      Payment.find({ hospital: hospitalId, paidAt: { $gte: today, $lt: tomorrow } }),
      // Today's Appointments
      ReceptionRepository.listAppointments(hospitalId, today).then(r => r.length),
      // Waiting Queue
      Queue.countDocuments({ hospital: hospitalId, status: "waiting", createdAt: { $gte: today, $lt: tomorrow } }),
      // Emergency Queue
      Queue.countDocuments({ hospital: hospitalId, type: "emergency", status: "waiting", createdAt: { $gte: today, $lt: tomorrow } }),
      // Doctors Status
      Doctor.find({ hospital: hospitalId }),
      // Active rooms
      Room.find({ hospital: hospitalId, status: { $in: ["active", "Active"] } }),
      // Bed counts
      Bed.find({ hospital: hospitalId }),
      // Today's IP collections from IPBillPayment
      IPBillPayment.find({ hospital: hospitalId, paidAt: { $gte: today, $lt: tomorrow } }),
      // Pending IP bills
      IPBill.countDocuments({ hospital: hospitalId, status: "Generated", outstanding: { $gt: 0 } }),
      // Completed IP bills
      IPBill.countDocuments({ hospital: hospitalId, status: "Paid" })
    ]);

    const pendingPaymentsCount = invoices.filter((inv: any) => inv.status === "pending" || inv.status === "partially_paid").length + pendingIpBillsCount;
    const completedPaymentsCount = invoices.filter((inv: any) => inv.status === "paid").length + completedIpBillsCount;
    const totalCollectionsToday = 
      collectionsToday.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) +
      ipCollectionsToday.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const busyDoctorIds = await getBusyDoctorIds(hospitalId);
    const resolvedDoctors = doctorsCount.map((d: any) => {
      return { ...d.toObject(), status: getDoctorDynamicStatus(d, busyDoctorIds) };
    });
    const doctorsAvailable = resolvedDoctors.filter((d: any) => d.status === "on_duty").length;
    const doctorsBusy = resolvedDoctors.filter((d: any) => d.status === "off_duty").length; // busy/off duty

    // Beds availability
    const bedsTotal = bedsAvailable.length;
    const bedsOccupiedCount = bedsAvailable.filter((b: any) => b.isOccupied).length;
    const bedsAvailableCount = bedsTotal - bedsOccupiedCount;

    // Rooms availability: count active rooms that contain at least one bed and at least one bed is vacant
    const roomBedsMap: Record<string, any[]> = {};
    for (const bed of bedsAvailable) {
      const rId = bed.room.toString();
      if (!roomBedsMap[rId]) roomBedsMap[rId] = [];
      roomBedsMap[rId].push(bed);
    }

    let roomsAvailableCount = 0;
    for (const room of activeRooms) {
      const roomBeds = roomBedsMap[room._id.toString()] || [];
      if (roomBeds.length > 0 && roomBeds.some(b => !b.isOccupied)) {
        roomsAvailableCount++;
      }
    }

    return {
      todayRegistrations: registrationsToday,
      todayOP: opVisitsToday,
      todayIP: ipAdmissionsCount,
      pendingPayments: pendingPaymentsCount,
      completedPayments: completedPaymentsCount,
      todayCollections: totalCollectionsToday,
      todayAppointments: appointmentsToday,
      waitingQueue: waitingQueue,
      emergencyQueue: emergencyQueue,
      doctorsAvailable,
      doctorsBusy,
      roomsAvailable: roomsAvailableCount,
      bedsAvailable: bedsAvailableCount
    };
  }

  // ── Patient Registration ──
  static async registerPatient(hospitalId: Types.ObjectId, patientData: any, userId: Types.ObjectId) {
    const uhid = `UHID-${generateDigits(10)}`;
    const patientCode = `PAT-${generateDigits(6)}`;
    const qrCode = `HMS|${uhid}|${patientData.name}|${patientData.phone}`;

    let linkedUserId = patientData.user;
    if (!linkedUserId) {
      const email = (patientData.email || "").trim();
      const phone = (patientData.phone || "").replace(/\D/g, "").slice(-10);
      const name = (patientData.name || "").trim();

      const userConds: any[] = [];
      if (email) userConds.push({ email: { $regex: `^${email.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
      if (phone && phone.length >= 7) userConds.push({ phone: { $regex: `${phone}$` } });
      if (name) userConds.push({ name: { $regex: `^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });

      if (userConds.length > 0) {
        const existingUser = await User.findOne({ role: "patient", $or: userConds });
        if (existingUser) {
          linkedUserId = existingUser._id;
        }
      }
    }

    const newPatient = await ReceptionRepository.createPatient({
      ...patientData,
      ...(linkedUserId ? { user: linkedUserId } : {}),
      hospital: hospitalId,
      uhid,
      patientCode,
      qrCode,
      status: "opd"
    });

    await ReceptionRepository.createAuditLog({
      hospital: hospitalId,
      user: userId,
      action: "PATIENT_REGISTER",
      details: `Registered patient ${newPatient.name} with UHID ${uhid}`
    });

    return newPatient;
  }

  // ── Patient Search ──
  static async searchPatients(hospitalId: Types.ObjectId, query: string) {
    return await ReceptionRepository.searchPatients(hospitalId, query);
  }

  static async getPatientDetail(hospitalId: Types.ObjectId, patientId: string) {
    const patient = await Patient.findOne({ _id: patientId, hospital: hospitalId }).populate("assignedDoctor", "name");
    if (!patient) {
      throw new AppError("Patient not found", 404);
    }
    
    // Find all patient document IDs associated with this patient (by patientId or linked user account)
    let allPatientIds: any[] = [patientId];
    if (patient.user) {
      const relatedDocs = await Patient.find({ hospital: hospitalId, user: patient.user }).select("_id");
      if (relatedDocs.length > 0) {
        allPatientIds = relatedDocs.map(p => p._id);
      }
    }

    const recentAppointmentsList = await Appointment.find({
      hospital: hospitalId,
      patient: { $in: allPatientIds },
      status: { $nin: ["cancelled", "no_show"] }
    }).sort({ date: -1, createdAt: -1 }).limit(20).populate("doctor department");

    const lastAppointment = recentAppointmentsList.length > 0 ? recentAppointmentsList[0] : null;

    const activeAdmission = await Admission.findOne({
      hospital: hospitalId,
      patient: { $in: allPatientIds },
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

    return {
      patient,
      hasExistingAppointments: recentAppointmentsList.length > 0,
      recentAppointments: recentAppointmentsList.map(a => ({
        _id: a._id,
        date: a.date,
        doctorName: (a.doctor as any)?.name || "N/A",
        doctorId: (a.doctor as any)?._id ? String((a.doctor as any)._id) : (a.doctor ? String(a.doctor) : ""),
        departmentName: (a.department as any)?.name || "N/A",
        status: a.status,
        visitType: a.type || "Consultation",
        notes: a.notes || a.chiefComplaint || ""
      })),
      activeAdmission: activeAdmission ? {
        _id: activeAdmission._id,
        admissionNumber: activeAdmission.admissionNumber,
        status: activeAdmission.status,
        admissionDate: activeAdmission.admissionDate
      } : null,
      currentConsultation: lastAppointment ? {
        appointmentId: lastAppointment._id,
        referenceId: lastAppointment.referenceId,
        doctor: (lastAppointment.doctor as any)?.name || "N/A",
        department: (lastAppointment.department as any)?.name || "N/A",
        diagnosis: lastAppointment.diagnosis || lastAppointment.chiefComplaint || "N/A",
        notes: lastAppointment.notes || ""
      } : null
    };
  }

  static async listPatients(hospitalId: Types.ObjectId, page: number, limit: number, search?: string) {
    return await ReceptionRepository.listPatients(hospitalId, page, limit, search);
  }

  // ── Appointment Booking ──

  /**
   * Pre-booking duplicate check.
   * Returns { isDuplicate, existingAppointment } without throwing — controller decides HTTP response.
   * Active statuses = everything except cancelled / no_show / completed.
   */
  static async checkDuplicateAppointment(
    hospitalId: Types.ObjectId,
    patientId: string,
    doctorId: string,
    date: string
  ) {
    const bookingDate = new Date(date);
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [doctor, existing] = await Promise.all([
      Doctor.findOne({ _id: doctorId, hospital: hospitalId, isActive: { $ne: false } }, "name"),
      Appointment.findOne({
        hospital: hospitalId,
        patient: patientId,
        doctor: doctorId,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ["cancelled", "no_show", "completed"] },
      }).populate("doctor", "name"),
    ]);

    if (!existing) {
      return { isDuplicate: false };
    }

    const apptDate = new Date(existing.date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const doctorName = doctor?.name || "the selected doctor";

    return {
      isDuplicate: true,
      message: `This patient already has an appointment with Dr. ${doctorName} on ${apptDate}. Please complete, cancel or reschedule the existing appointment before creating another appointment.`,
      existingAppointment: {
        _id: existing._id,
        referenceId: existing.referenceId,
        date: existing.date,
        time: existing.time,
        status: existing.status,
      },
    };
  }

  static async bookAppointment(hospitalId: Types.ObjectId, appointmentData: any, userId: Types.ObjectId) {
    // Map old type values to new ones for backward compatibility
    const mapOldType = (oldType: string | undefined) => {
      if (!oldType) return "Appointment";
      switch(oldType) {
        case "Consultation":
        case "Regular Consult":
        case "Scheduled Appointment":
        case "Follow-up":
        case "Follow-up Appointment":
          return "Appointment";
        case "Walk-in":
        case "Walk-in Visit":
          return "Walk-in";
        case "Emergency":
        case "Emergency Visit":
          return "Emergency";
        default:
          // If it's already a new type, use it; else default
          if (["Appointment", "Walk-in", "Emergency"].includes(oldType)) {
            return oldType;
          }
          return "Appointment";
      }
    };

    let { patientId, doctorId, departmentId, date, time, type, notes, followUp, parentAppointmentId, followUpReason } = appointmentData;
    type = mapOldType(type);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    const dupStartOfDay = new Date(bookingDate);
    dupStartOfDay.setHours(0, 0, 0, 0);
    const dupEndOfDay = new Date(bookingDate);
    dupEndOfDay.setHours(23, 59, 59, 999);

    // 1. Date validation (minimum selectable date is today)
    if (bookingDate < today) {
      throw new AppError("Cannot book appointments for past dates.", 400);
    }

    // 2. Time validation (past slots are disabled if date is today)
    const todayStr = today.toISOString().split("T")[0];
    const bookingDateStr = bookingDate.toISOString().split("T")[0];
    if (bookingDateStr === todayStr) {
      const now = new Date();
      const [slotHourStr, slotMinStr] = time.split(":");
      const slotHour = parseInt(slotHourStr, 10);
      const slotMin = parseInt(slotMinStr, 10);
      if (slotHour < now.getHours() || (slotHour === now.getHours() && slotMin <= now.getMinutes())) {
        throw new AppError("Cannot book past time slots for today.", 400);
      }
    }

    // 3. Doctor active & leave check
    const doctor = await Doctor.findOne({ _id: doctorId, hospital: hospitalId, isActive: { $ne: false } });
    if (!doctor) {
      throw new AppError("Doctor not found or is currently inactive.", 404);
    }
    if (doctor.status === "on_leave") {
      throw new AppError("Doctor is currently on leave.", 400);
    }

    // 4. Duplicate appointment validation (check existing PAID appointments):
    //    Patient + Doctor + Date (regardless of time slot) → BLOCKED
    //    Exception: followUp === true with a valid parentAppointmentId
    if (!followUp) {
      const existingAppointment = await Appointment.findOne({
        hospital: hospitalId,
        patient: patientId,
        doctor: doctorId,
        date: { $gte: dupStartOfDay, $lte: dupEndOfDay },
        status: { $nin: ["cancelled", "no_show", "completed"] },
      }).populate("doctor", "name");

      if (existingAppointment) {
        const apptDate = new Date(existingAppointment.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        throw new AppError(
          `This patient already has an appointment with Dr. ${doctor.name} on ${apptDate}. Please complete, cancel or reschedule the existing appointment before creating another appointment.`,
          409
        );
      }
    } else {
      // Follow-up: validate that parentAppointmentId exists and belongs to this patient+doctor+hospital
      if (!parentAppointmentId) {
        throw new AppError("Parent appointment ID is required for follow-up bookings.", 400);
      }
      const parentAppt = await Appointment.findOne({
        _id: parentAppointmentId,
        hospital: hospitalId,
        patient: patientId,
        doctor: doctorId,
        status: { $in: ["completed"] },
      });
      if (!parentAppt) {
        throw new AppError("Valid completed parent appointment not found for this follow-up booking.", 404);
      }
    }
    // 5. Doctor slot occupancy check (other patients in same time slot)
    const overlap = await ReceptionRepository.checkDoctorSlotOverlap(hospitalId, doctorId, bookingDate, time);
    if (overlap) {
      throw new AppError("Doctor is already booked for this time slot. Please choose a different slot.", 400);
    }

    // 6. Generate unique auto-incremented appointment reference ID: APT-YYYYMMDD-XXXXXX (we'll reserve this for later)
    const bookingDateNoHyphens = bookingDate.toISOString().split("T")[0].replace(/-/g, "");
    const aptPrefix = `APT-${bookingDateNoHyphens}-`;
    const latestAppt = await Appointment.findOne({
      hospital: hospitalId,
      referenceId: new RegExp(`^${aptPrefix}`)
    }).sort({ createdAt: -1 });

    let nextSerial = 1;
    if (latestAppt) {
      const serialPart = latestAppt.referenceId.replace(aptPrefix, "");
      const lastSerial = parseInt(serialPart, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }
    const referenceId = `${aptPrefix}${String(nextSerial).padStart(6, "0")}`;

    // 7. Calculate consultation/registration fees first to check if appointment is free
    // Find all patient document IDs associated with this patient (by patientId or linked user account)
    const currentPatientDoc = await Patient.findById(patientId);
    let allPatientIds: any[] = [patientId];
    if (currentPatientDoc?.user) {
      const relatedDocs = await Patient.find({ hospital: hospitalId, user: currentPatientDoc.user }).select("_id");
      if (relatedDocs.length > 0) {
        allPatientIds = relatedDocs.map(p => p._id);
      }
    }

    const hasOtherAppointments = await Appointment.exists({
      hospital: hospitalId,
      patient: { $in: allPatientIds },
      status: { $nin: ["cancelled", "no_show"] }
    });

    const registrationFee = hasOtherAppointments ? 0 : (type === "Emergency" ? 200 : 100);
    let consultationFee = type === "Emergency" ? 500 : 300;
    if (type !== "Emergency" && doctor.consultationFee) {
      const cleanedFee = String(doctor.consultationFee).replace(/[₹, \s]/g, "");
      const parsedFee = parseFloat(cleanedFee);
      if (!isNaN(parsedFee)) {
        consultationFee = parsedFee;
      }
    }

    // Check if patient has any prior COMPLETED or IN_CONSULTATION appointment with this doctor within opExpiryLimit
    const hospitalRecord = await Hospital.findById(hospitalId);
    const opExpiryLimit = doctor.opExpiryLimit ?? hospitalRecord?.opExpiryLimit ?? 10;
    const expiryDate = new Date(bookingDate);
    expiryDate.setDate(expiryDate.getDate() - opExpiryLimit);
    expiryDate.setHours(0, 0, 0, 0);

    const bookingDateEnd = new Date(bookingDate);
    bookingDateEnd.setHours(23, 59, 59, 999);

    const pastApptWithinLimit = await Appointment.findOne({
      hospital: hospitalId,
      patient: { $in: allPatientIds },
      doctor: doctorId,
      status: { $in: ["completed", "in_consultation", "checked_in"] },
      date: { $gte: expiryDate, $lte: bookingDateEnd }
    });

    const isWithinExpiry = !!pastApptWithinLimit;
    if (isWithinExpiry) {
      consultationFee = 0;
    }

    const gst = 0;
    const discount = 0;

    const items = [
      { 
        description: hasOtherAppointments 
          ? "Registration Fee (Existing Patient - Free)" 
          : "Registration Fee", 
        category: "registration", 
        quantity: 1, 
        amount: registrationFee 
      },
      { 
        description: isWithinExpiry 
          ? `${type} (Free Follow-up)` 
          : `${type}`, 
        category: "consultation", 
        quantity: 1, 
        amount: consultationFee 
      }
    ];

    const subtotal = registrationFee + consultationFee;
    const total = subtotal + gst - discount;
    const isFree = total === 0;

    // Create provisional invoice
    const newInvoice = await ReceptionRepository.createInvoice({
      hospital: hospitalId,
      referenceId,
      patient: patientId,
      appointment: null, // We'll link this after payment
      billingType: "OP",
      items,
      taxRate: 0,
      serviceFee: 0,
      discount: 0,
      insuranceCoveragePercent: 0,
      status: isFree ? "paid" : "pending",
      issuedAt: new Date(),
      dueDate: new Date(),
      totals: {
        subtotal,
        taxAmount: gst,
        serviceFee: 0,
        discount,
        insuranceCovered: 0,
        total,
        patientBalance: isFree ? 0 : total
      },
      // Store provisional appointment data in the invoice for later use
      provisionalData: {
        doctorId,
        departmentId,
        date: bookingDate,
        time,
        type,
        notes,
        followUp,
        parentAppointmentId,
        followUpReason
      }
    });

    await ReceptionRepository.createAuditLog({
      hospital: hospitalId,
      user: userId,
      action: "PROVISIONAL_INVOICE_CREATED",
      details: `Created provisional invoice ${newInvoice._id} for patient ID ${patientId} with Dr. ${doctor.name}. Reference ID: ${referenceId}`
    });

    const isToday = bookingDateStr === todayStr;
    const appointmentStatus = isFree ? (isToday ? "checked_in" : "scheduled") : "pending_payment";

    const appointmentPayload: Record<string, unknown> = {
      hospital: hospitalId,
      referenceId,
      patient: patientId,
      doctor: doctorId,
      department: departmentId,
      date: bookingDate,
      time,
      type: type || "Consultation",
      status: appointmentStatus,
      notes: notes || "",
    };

    if (followUp) {
      appointmentPayload.followUp = true;
      appointmentPayload.parentAppointmentId = parentAppointmentId;
      appointmentPayload.followUpDate = bookingDate;
      appointmentPayload.followUpReason = followUpReason || "";
    }

    const newAppointment = await ReceptionRepository.createAppointment(appointmentPayload);
    
    // Update invoice to link appointment
    newInvoice.appointment = newAppointment._id;
    await newInvoice.save();

    const patientRecord = await Patient.findById(patientId);
    const patientName = patientRecord ? patientRecord.name : "Patient";

    let tokenNumber = "N/A";
    let queueNumber = "N/A";
    let queueRecord = null;

    if (isFree && isToday) {
      // Auto check-in and queue token generation for free consultations on today's date
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const todayTokenCount = await Queue.countDocuments({
        hospital: hospitalId,
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      });
      tokenNumber = `T${String(todayTokenCount + 1).padStart(3, "0")}`;

      const doctorQueueCount = await Queue.countDocuments({
        hospital: hospitalId,
        doctor: doctorId,
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      });
      queueNumber = `Q${String(doctorQueueCount + 1).padStart(3, "0")}`;

      queueRecord = await ReceptionRepository.createQueueToken({
        hospital: hospitalId,
        tokenNumber,
        type: type === "Emergency" ? "emergency" : "regular",
        status: "waiting",
        patient: patientId,
        doctor: doctorId,
        department: departmentId || doctor.department,
        appointment: newAppointment._id,
        date: newAppointment.date
      });

      // Notify doctor of checked in OP patient
      try {
        await createDoctorNotification({
          hospital: hospitalId,
          title: "OP Patient Checked In",
          message: `OP patient ${patientName} has checked in. You have been assigned this patient (Token: ${tokenNumber}, Queue: ${queueNumber}).`,
          type: "appointment",
          severity: "info",
          recipientDoctor: doctorId,
          link: `/doctor/op-management`,
          data: {
            appointmentId: newAppointment._id.toString(),
            tokenNumber,
            queueNumber,
          }
        });
      } catch (err) {
        console.error("Failed to notify doctor of checked-in OP patient:", err);
      }
    }

    await ReceptionRepository.createAuditLog({
      hospital: hospitalId,
      user: userId,
      action: isFree ? "APPOINTMENT_BOOKED_FREE" : "APPOINTMENT_BOOKED_PROVISIONAL",
      details: `Booked ${followUp ? "follow-up " : ""}appointment ${referenceId} for patient ID ${patientId} with Dr. ${doctor.name}.`
    });

    let checkInResult = null;
    if (isFree && (type === "Walk-in" || type === "Emergency")) {
      try {
        checkInResult = await this.checkInAppointment(hospitalId, newAppointment._id.toString(), userId);
      } catch (err) {
        console.error("Immediate check-in failed for walk-in/emergency:", err);
      }
    }

    // Emit socket events so Patient Dashboard and Reception update in real time
    try {
      emitToHospital(hospitalId.toString(), "appointment_updated", { appointment: newAppointment });
      emitToHospital(hospitalId.toString(), "dashboard_update", {});
    } catch (err) {
      console.error("Failed to emit socket events for appointment booking:", err);
    }

    return {
      appointment: newAppointment,
      invoice: newInvoice,
      billing: {
        registrationFee,
        consultationFee,
        gst,
        discount,
        total
      },
      token: checkInResult ? { tokenNumber: checkInResult.tokenNumber } : null
    };
  }

  static async processPayment(hospitalId: Types.ObjectId, paymentData: any, userId: Types.ObjectId) {
    const { invoiceId, amount, paymentMethod, mixedDetails } = paymentData;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const invoice = await ReceptionRepository.findInvoiceById(hospitalId, invoiceId);
      if (!invoice) {
        throw new AppError("Invoice not found.", 404);
      }
      if (invoice.status === "paid") {
        throw new AppError("Invoice is already paid.", 400);
      }

      const { roundCurrency, toPaise } = await import("../utils/currency");

      // Calculate current outstanding before this payment
      const existingPayments = await Payment.find({ invoice: invoiceId, hospital: hospitalId }).session(session);

      // Aggregate using paise to prevent float accumulation across multiple partial payments
      const currentPaidPaise = existingPayments.reduce((sum, p) => sum + toPaise(p.amount), 0);
      const invoiceTotalPaise = toPaise(invoice.totals.total);
      const currentOutstandingPaise = Math.max(0, invoiceTotalPaise - currentPaidPaise);

      const enteredPaise = toPaise(amount);

      // Validate using integer paise — eliminates ALL floating-point edge cases.
      // e.g. ₹201.60 entered == 20160 paise; ₹201.59999999998 stored == 20160 paise → equal → valid.
      if (enteredPaise > currentOutstandingPaise) {
        const enteredDisplay = (enteredPaise / 100).toFixed(2);
        const remainingDisplay = (currentOutstandingPaise / 100).toFixed(2);
        throw new AppError(
          `Entered Amount:\n₹${enteredDisplay}\n\nRemaining Balance:\n₹${remainingDisplay}\n\nPlease enter an amount less than or equal to the remaining balance.`,
          400
        );
      }

      const roundedAmount = roundCurrency(amount);
      const transactionId = `TXN-${generateDigits(10)}`;

      const newPayment = await ReceptionRepository.createPayment({
        hospital: hospitalId,
        invoice: invoiceId,
        patient: invoice.patient._id,
        amount: roundedAmount,
        paymentMethod,
        mixedDetails: paymentMethod === "Mixed" ? {
          upiAmount: roundCurrency(mixedDetails?.upiAmount || 0),
          cashAmount: roundCurrency(mixedDetails?.cashAmount || 0),
          cardAmount: roundCurrency(mixedDetails?.cardAmount || 0)
        } : { upiAmount: 0, cashAmount: 0, cardAmount: 0 },
        transactionId,
        paidAt: new Date()
      });

      // Fetch all payments for this invoice (including new one) and sum in paise
      const allPayments = await Payment.find({ invoice: invoiceId, hospital: hospitalId }).session(session);
      const totalPaidPaise = allPayments.reduce((sum, p) => sum + toPaise(p.amount), 0);

      const remainingBalancePaise = Math.max(0, invoiceTotalPaise - totalPaidPaise);
      const remainingBalance = remainingBalancePaise / 100;
      const newStatus = remainingBalancePaise === 0 ? "paid" : "partially_paid";

      invoice.status = newStatus;
      if (invoice.totals) {
        // Store with exactly 2 decimal places to prevent future DB residuals
        invoice.totals.patientBalance = roundCurrency(remainingBalance);
      }
      let updatedInvoice = invoice;

      let appointment: any = null;
      let tokenNumber = "N/A";
      let queueNumber = "N/A";
      let queueRecord: any = null;
      const isFirstPayment = existingPayments.length === 0; // Check if this is the first payment

      // If invoice has provisional data AND it's the FIRST payment (partial or full), create appointment now
      if (isFirstPayment && invoice.billingType === "OP" && (invoice as any).provisionalData?.doctorId) {
        const provisionalData = (invoice as any).provisionalData;
        const bookingDate = new Date(provisionalData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Re-check doctor availability
        const doctor = await Doctor.findOne({ 
          _id: provisionalData.doctorId, hospital: hospitalId, isActive: { $ne: false } 
        }).session(session);
        if (!doctor) {
          throw new AppError("Doctor not found or inactive.", 404);
        }

        // Re-check slot overlap
        const overlap = await ReceptionRepository.checkDoctorSlotOverlap(
          hospitalId, 
          provisionalData.doctorId.toString(), 
          bookingDate, 
          provisionalData.time
        );
        if (overlap) {
          // Slot is now taken: commit the invoice payment, return with slot unavailable
          await session.commitTransaction();
          session.endSession();
          
          // Emit billing update
          emitToHospital(hospitalId.toString(), "billing_updated", { invoice: updatedInvoice });

          // Compute billing breakdown from invoice items
          const registrationItem = (invoice as any).items?.find((i: any) => i.category === "registration");
          const consultationItem = (invoice as any).items?.find((i: any) => i.category === "consultation");
          const billingBreakdown = {
            registrationFee: registrationItem?.amount ?? 0,
            consultationFee: consultationItem?.amount ?? 0,
            gst: 0,
            discount: 0,
            total: invoiceTotalPaise / 100
          };

          return {
            success: true,
            message: "Selected slot is no longer available. Please choose another slot.",
            appointmentNumber: "N/A",
            tokenNumber: "N/A",
            queueNumber: "N/A",
            receiptNumber: "N/A",
            queuePosition: 0,
            paymentStatus: newStatus,
            billing: billingBreakdown,
            token: { tokenNumber: "N/A", queueNumber: "N/A" },
            payment: newPayment,
            invoice: updatedInvoice,
            appointment: null,
            queueRecord: null,
            slotUnavailable: true
          };
        }

        const isToday = new Date(provisionalData.date).toDateString() === today.toDateString();
        const appointmentStatus = isToday ? "checked_in" : "scheduled";

        if (invoice.appointment) {
          const apptDoc = await Appointment.findById(invoice.appointment).session(session);
          if (apptDoc) {
            apptDoc.status = appointmentStatus;
            await apptDoc.save({ session });
            appointment = apptDoc;
          }
        }

        if (!appointment) {
          // Check duplicate appointment
          const startOfDay = new Date(bookingDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(bookingDate);
          endOfDay.setHours(23, 59, 59, 999);

          const existingAppointment = await Appointment.findOne({
            hospital: hospitalId,
            patient: invoice.patient._id,
            doctor: provisionalData.doctorId,
            date: { $gte: startOfDay, $lte: endOfDay },
            status: { $nin: ["cancelled", "no_show", "completed"] }
          }).session(session);

          if (existingAppointment) {
            existingAppointment.status = appointmentStatus;
            await existingAppointment.save({ session });
            appointment = existingAppointment;
          } else {
            // Generate reference ID
            const bookingDateNoHyphens = new Date(provisionalData.date).toISOString().split("T")[0].replace(/-/g, "");
            const aptPrefix = `APT-${bookingDateNoHyphens}-`;
            const latestAppt = await Appointment.findOne({
              hospital: hospitalId,
              referenceId: new RegExp(`^${aptPrefix}`)
            }).sort({ createdAt: -1 }).session(session);

            let nextSerial = 1;
            if (latestAppt) {
              const serialPart = latestAppt.referenceId.replace(aptPrefix, "");
              const lastSerial = parseInt(serialPart, 10);
              if (!isNaN(lastSerial)) {
                nextSerial = lastSerial + 1;
              }
            }
            const referenceId = `${aptPrefix}${String(nextSerial).padStart(6, "0")}`;

            // Create appointment payload
            const appointmentPayload: Record<string, any> = {
              hospital: hospitalId,
              referenceId,
              patient: invoice.patient._id,
              doctor: provisionalData.doctorId,
              department: provisionalData.departmentId,
              date: new Date(provisionalData.date),
              time: provisionalData.time,
              type: provisionalData.type,
              status: appointmentStatus,
              notes: provisionalData.notes
            };
            if (provisionalData.followUp) {
              appointmentPayload.followUp = true;
              appointmentPayload.parentAppointmentId = provisionalData.parentAppointmentId;
              appointmentPayload.followUpDate = new Date(provisionalData.date);
              appointmentPayload.followUpReason = provisionalData.followUpReason;
            }

            appointment = await ReceptionRepository.createAppointment(appointmentPayload);
          }

          // Update invoice with appointment ID
          invoice.appointment = appointment._id;
        }

        // If it's today, generate token
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        if (isToday) {
          const todayTokenCount = await Queue.countDocuments({
            hospital: hospitalId,
            createdAt: { $gte: startOfToday, $lte: endOfToday }
          }).session(session);
          tokenNumber = `T${String(todayTokenCount + 1).padStart(3, "0")}`;

          const doctorQueueCount = await Queue.countDocuments({
            hospital: hospitalId,
            doctor: provisionalData.doctorId,
            createdAt: { $gte: startOfToday, $lte: endOfToday }
          }).session(session);
          queueNumber = `Q${String(doctorQueueCount + 1).padStart(3, "0")}`;

          queueRecord = await ReceptionRepository.createQueueToken({
            hospital: hospitalId,
            tokenNumber,
            type: provisionalData.type === "Emergency" ? "emergency" : "regular",
            status: "waiting",
            patient: invoice.patient._id,
            doctor: provisionalData.doctorId,
            department: provisionalData.departmentId,
            appointment: appointment._id,
            date: new Date(provisionalData.date)
          });
        }
      } else if (invoice.appointment) {
        // Existing appointment (for free visits or already created appointments)
        appointment = await Appointment.findOne({
          _id: invoice.appointment,
          hospital: hospitalId
        }).populate("doctor department").session(session);

        if (appointment) {
          const apptDate = new Date(appointment.date);
          const apptDateStr = apptDate.toISOString().split("T")[0];
          const todayStr = new Date().toISOString().split("T")[0];
          const isToday = apptDateStr === todayStr;
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);

          if (isToday) {
            const existingQueue = await Queue.findOne({
              hospital: hospitalId,
              appointment: appointment._id
            }).session(session);
            if (!existingQueue) {
              appointment.status = "checked_in";
              await appointment.save({ session });

              const todayTokenCount = await Queue.countDocuments({
                hospital: hospitalId,
                createdAt: { $gte: startOfToday, $lte: endOfToday }
              }).session(session);
              tokenNumber = `T${String(todayTokenCount + 1).padStart(3, "0")}`;

              const doctorQueueCount = await Queue.countDocuments({
                hospital: hospitalId,
                doctor: (appointment.doctor as any)._id,
                createdAt: { $gte: startOfToday, $lte: endOfToday }
              }).session(session);
              queueNumber = `Q${String(doctorQueueCount + 1).padStart(3, "0")}`;

              queueRecord = await ReceptionRepository.createQueueToken({
                hospital: hospitalId,
                tokenNumber,
                type: appointment.type === "Emergency" ? "emergency" : "regular",
                status: "waiting",
                patient: invoice.patient._id,
                doctor: (appointment.doctor as any)._id,
                department: (appointment.department as any)?._id || (appointment.doctor as any).department,
                appointment: appointment._id,
                date: appointment.date
              });
            } else {
              const doctorQueueIndex = await Queue.countDocuments({
                hospital: hospitalId,
                doctor: (appointment.doctor as any)._id,
                createdAt: { $lt: (existingQueue as any).createdAt }
              }).session(session);
              queueNumber = `Q${String(doctorQueueIndex + 1).padStart(3, "0")}`;
              tokenNumber = existingQueue.tokenNumber;
              queueRecord = existingQueue;
            }
          } else {
            appointment.status = "scheduled";
            await appointment.save({ session });
          }
        }
      }

      // Generate Receipt Number: RCP + year + 5-digit serial
      const rcpYear = new Date().getFullYear();
      const rcpPrefix = `RCP${rcpYear}`;
      const latestPaymentWithRcp = await Payment.findOne({
        hospital: hospitalId,
        transactionId: new RegExp(`^${rcpPrefix}`)
      }).sort({ createdAt: -1 }).session(session);
      let nextRcpSerial = 1;
      if (latestPaymentWithRcp) {
        const serialPart = latestPaymentWithRcp.transactionId?.replace(rcpPrefix, "") || "0";
        const lastRcp = parseInt(serialPart, 10);
        if (!isNaN(lastRcp)) nextRcpSerial = lastRcp + 1;
      }
      const receiptNumber = `${rcpPrefix}${String(nextRcpSerial).padStart(5, "0")}`;

      await ReceptionRepository.createAuditLog({
        hospital: hospitalId,
        user: userId,
        action: "BILLING_PAY",
        details: `Payment ₹${amount} for invoice ${invoiceId} via ${paymentMethod}. Token: ${tokenNumber}, Queue: ${queueNumber}, Receipt: ${receiptNumber}`
      });

      // Compute billing breakdown from invoice items
      const registrationItem = (invoice as any).items?.find((i: any) => i.category === "registration");
      const consultationItem = (invoice as any).items?.find((i: any) => i.category === "consultation");
      const invoiceTotalRupees = invoiceTotalPaise / 100;
      const billingBreakdown = {
        registrationFee: registrationItem?.amount ?? 0,
        consultationFee: consultationItem?.amount ?? 0,
        gst: 0,
        discount: 0,
        total: invoiceTotalRupees
      };

      updatedInvoice = await invoice.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Emit socket events to update dashboards
      try {
        emitToHospital(hospitalId.toString(), "appointment_updated", { appointment });
        emitToHospital(hospitalId.toString(), "queue_updated", { queueRecord });
        emitToHospital(hospitalId.toString(), "billing_updated", { invoice: updatedInvoice });
      } catch (err) {
        console.error("Failed to emit socket events:", err);
      }

      return {
        success: true,
        appointmentNumber: appointment?.referenceId ?? "N/A",
        tokenNumber,
        queueNumber,
        receiptNumber,
        queuePosition: queueRecord ? parseInt(queueNumber.replace("Q", ""), 10) : 0,
        paymentStatus: newStatus,
        billing: billingBreakdown,
        token: { tokenNumber, queueNumber },
        payment: newPayment,
        invoice: updatedInvoice,
        appointment: appointment ? {
          _id: appointment._id,
          referenceId: appointment.referenceId,
          date: appointment.date,
          time: appointment.time,
          doctor: appointment.doctor,
          department: appointment.department,
          patient: invoice.patient
        } : null,
        queueRecord
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // ── Simulated Doctor Consultation workflows ──
  static async simulateDoctorCall(hospitalId: Types.ObjectId, queueId: string, userId: Types.ObjectId) {
    const queueItem = await Queue.findOneAndUpdate(
      { _id: queueId, hospital: hospitalId },
      { status: "called" },
      { new: true }
    ).populate("patient doctor");

    if (!queueItem) {
      throw new AppError("Queue token not found.", 404);
    }

    // Set appointment status to in_consultation
    if (queueItem.appointment) {
      await Appointment.findOneAndUpdate(
        { _id: queueItem.appointment, hospital: hospitalId },
        { status: "in_consultation" }
      );
    }

    // Also update Doctor status to consultation
    await Doctor.findOneAndUpdate({ _id: queueItem.doctor._id, hospital: hospitalId }, { status: "off_duty" }); // Simulating busy in consultation

    await ReceptionRepository.createAuditLog({
      hospital: hospitalId,
      user: userId,
      action: "SIMULATE_DOCTOR_CALL",
      details: `Simulated Dr. Calling Patient Token ${queueItem.tokenNumber}`
    });

    return queueItem;
  }

  static async simulateDoctorComplete(hospitalId: Types.ObjectId, data: any, userId: Types.ObjectId) {
    const { queueId, outcome, notes, ward, roomType } = data; // outcome: 'op' or 'ip'

    const queueItem = await Queue.findOneAndUpdate(
      { _id: queueId, hospital: hospitalId },
      { status: "completed" },
      { new: true }
    ).populate("patient doctor department");

    if (!queueItem) {
      throw new AppError("Queue token not found.", 404);
    }

    const patient = await Patient.findById(queueItem.patient._id);
    if (!patient) {
      throw new AppError("Patient not found.", 404);
    }

    // Complete appointment status
    if (queueItem.appointment) {
      await Appointment.findOneAndUpdate(
        { _id: queueItem.appointment, hospital: hospitalId },
        { status: "completed" }
      );
    }

    // Free up doctor status
    await Doctor.findOneAndUpdate({ _id: queueItem.doctor._id, hospital: hospitalId }, { status: "on_duty" });

    // Store visit in OP History
    const opVisit = await ReceptionRepository.createOPVisit({
      hospital: hospitalId,
      patient: patient._id,
      doctor: queueItem.doctor._id,
      department: queueItem.department._id,
      appointmentNumber: queueItem.appointment ? (await Appointment.findById(queueItem.appointment))?.referenceId : "WALK-IN",
      tokenNumber: queueItem.tokenNumber,
      reasonForVisit: "Simulated Consult",
      clinicalNotes: notes || "Consultation complete.",
      status: outcome === "ip" ? "referred_ip" : "completed",
      billingStatus: "paid"
    });

    // Add medical history entry to Patient
    await Patient.findOneAndUpdate(
      { _id: patient._id, hospital: hospitalId },
      {
        $push: {
          medicalHistory: {
            $each: [
              {
                date: new Date(),
                visitType: "Outpatient Consultation",
                doctorName: (queueItem.doctor as any).name,
                department: (queueItem.department as any).name,
                diagnosis: outcome === "ip" ? `Referral for Inpatient (IP) Admission: ${notes}` : `Outpatient care completed. Notes: ${notes}`,
                notes: notes || "",
                status: "Completed"
              }
            ],
            $position: 0
          }
        }
      }
    );

    if (outcome === "ip") {
      // Create an Admission Request notification for receptionists
      await ReceptionRepository.createNotification({
        hospital: hospitalId,
        title: "Inpatient Admission Request",
        message: `Dr. ${(queueItem.doctor as any).name} requested IP admission for ${patient.name} (${patient.uhid}) due to: ${notes}`,
        type: "admission_request",
        link: `/receptionist/ip/new`,
        severity: "critical",
        recipientRole: "receptionist",
        data: {
          patientId: patient._id,
          opVisitId: opVisit._id,
          diagnosis: notes,
          suggestedWard: ward || "General",
          suggestedRoomType: roomType || "General"
        }
      });
    }

    await ReceptionRepository.createAuditLog({
      hospital: hospitalId,
      user: userId,
      action: "SIMULATE_DOCTOR_COMPLETE",
      details: `Simulated consult completion for Token ${queueItem.tokenNumber}. Outcome: ${outcome}`
    });

    return { opVisit, outcome };
  }

  // ── Inpatient (IP) Admissions ──
  static async getAdmissionRequests(hospitalId: Types.ObjectId) {
    return await AdmissionRequest.find({ hospital: hospitalId, status: "Admission Requested" })
      .populate("patient")
      .populate("doctor")
      .populate("department")
      .sort({ createdAt: -1 });
  }

  static async rejectAdmissionRequest(hospitalId: Types.ObjectId, requestId: string, userId: Types.ObjectId) {
    const admissionReq = await AdmissionRequest.findOne({ _id: requestId, hospital: hospitalId });
    if (!admissionReq) {
      throw new AppError("Admission request not found.", 404);
    }
    
    admissionReq.status = "Rejected";
    await admissionReq.save();

    // Mark corresponding notification as read if any
    await DbNotification.updateMany(
      { hospital: hospitalId, "data.requestId": requestId },
      { isRead: true }
    );

    // Emit real-time Socket.IO notification to doctor and dashboards
    emitToHospital(hospitalId.toString(), "admission_request_update", {
      requestId: admissionReq._id,
      requestNumber: admissionReq.requestNumber,
      status: "Rejected",
      timestamp: new Date()
    });

    // Notify doctor
    if (admissionReq.requestedBy) {
      await createDoctorNotification({
        hospital: hospitalId,
        title: "Admission Request Rejected",
        message: `Your IP admission request ${admissionReq.requestNumber} was rejected by receptionist.`,
        type: "admission_request",
        severity: "critical",
        recipientDoctor: admissionReq.requestedBy.toString(),
        link: `/doctor/inpatients`,
        data: {
          requestId: admissionReq._id.toString(),
          requestNumber: admissionReq.requestNumber,
          status: "Rejected",
        }
      });
      emitToDoctor(admissionReq.requestedBy.toString(), "admission_request_update", {
        requestId: admissionReq._id,
        requestNumber: admissionReq.requestNumber,
        status: "Rejected",
        timestamp: new Date()
      });
    }

    await ReceptionRepository.createAuditLog({
      hospital: hospitalId,
      user: userId,
      action: "IP_ADMIT_REJECT",
      details: `Rejected Admission Request ${admissionReq.requestNumber} for Patient ID: ${admissionReq.patient}`
    });

    return admissionReq;
  }

  static async admitPatient(hospitalId: Types.ObjectId, admissionData: any, userId: Types.ObjectId) {
    const {
      notificationId,
      requestId,
      patientId,
      opVisitId,
      admissionDate,
      admissionTime,
      ward,
      roomId,
      bedId,
      attenderName = "",
      attenderPhone = "",
      assignedNurse,
      insuranceProvider,
      insurancePolicyNumber,
      advanceAmount,
      admissionNotes,
      paymentMethod = "Cash",

      // Receptionist Initiated Admissions
      admissionMode = "Doctor Requested",
      admittingDoctor,
      priority = "Routine",
      admissionReason,
      verbalApproval,

      // Manual Admission specifics
      departmentId,
      admissionType = "Direct Admission",
      expectedStay = "",
      primaryDiagnosis = ""
    } = admissionData;

    // ── RECEPTIONIST INITIATED ADMISSION VALIDATIONS ──
    if (admissionMode === "Receptionist Initiated") {
      if (!admittingDoctor) {
        throw new AppError("Admitting doctor selection is mandatory for receptionist initiated admission.", 400);
      }
      if (!admissionReason || !admissionReason.trim()) {
        throw new AppError("Admission reason is required.", 400);
      }
      if (!verbalApproval) {
        throw new AppError("Doctor verbal order checkbox must be verified.", 400);
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Validate bed availability & status
      const bed = await Bed.findOne({ _id: bedId, hospital: hospitalId }).session(session);
      if (!bed) {
        throw new AppError("Selected bed not found.", 404);
      }
      if (bed.status !== "Available" || bed.isOccupied) {
        throw new AppError("Selected bed is already occupied or not available.", 400);
      }

      // 2. Validate room status & ward match
      const room = await Room.findOne({ _id: roomId, hospital: hospitalId }).session(session);
      if (!room) {
        throw new AppError("Selected room not found.", 404);
      }
      if (room.status !== "Active") {
        throw new AppError("Selected room is currently inactive.", 400);
      }
      if (room.wardName !== ward) {
        throw new AppError("Selected room does not belong to the selected ward.", 400);
      }

      // 2b. Validate ward status
      const wardRecord = await Ward.findOne({ _id: room.ward, hospital: hospitalId }).session(session);
      if (!wardRecord) {
        throw new AppError("Associated ward not found.", 404);
      }
      if (wardRecord.status !== "Active") {
        throw new AppError("Selected ward is currently inactive.", 400);
      }

      // 3. Verify doctor belongs to selected department
      if (admittingDoctor) {
        const doc = await Doctor.findOne({ _id: admittingDoctor, hospital: hospitalId }).session(session);
        if (!doc) {
          throw new AppError("Selected admitting doctor not found.", 404);
        }
        if (departmentId && doc.department && doc.department.toString() !== departmentId.toString()) {
          throw new AppError("Selected doctor does not belong to the selected department.", 400);
        }
      }

      // 4. Verify no existing active admission for this patient
      const activeAdm = await Admission.findOne({
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
      }).session(session);
      if (activeAdm) {
        throw new AppError(`This patient already has an active inpatient admission (IP No: ${activeAdm.admissionNumber}). Please discharge the patient before creating a new admission.`, 409);
      }

      // 4b. OP to IP Validation
      if (admissionMode === "Doctor Requested") {
        if (notificationId) {
          const notif = await DbNotification.findOne({ _id: notificationId, hospital: hospitalId }).session(session);
          if (!notif || notif.type !== "admission_request") {
            throw new AppError("Invalid or missing Doctor Admission Request notification.", 400);
          }
        }
        if (opVisitId) {
          const opVisit = await OPVisit.findOne({ _id: opVisitId, hospital: hospitalId }).session(session);
          if (!opVisit) {
            throw new AppError("OP Visit record not found.", 404);
          }
          if (opVisit.status !== "referred_ip") {
            throw new AppError("OP consultation did not recommend admission or is not completed.", 400);
          }
        }
      }

      // 5. Verify patient exists
      const patient = await Patient.findOne({ _id: patientId, hospital: hospitalId }).session(session);
      if (!patient) {
        throw new AppError("Patient record not found.", 404);
      }

      // 6. Generate Admission Number: IPYYYY000000 format (e.g. IP2026000125)
      const currentYear = new Date().getFullYear();
      const prefix = `IP${currentYear}`;
      const latestAdmission = await Admission.findOne({
        hospital: hospitalId,
        admissionNumber: new RegExp(`^${prefix}`)
      }).sort({ createdAt: -1 }).session(session);

      let nextSerial = 1;
      if (latestAdmission) {
        const serialPart = latestAdmission.admissionNumber.replace(prefix, "");
        const lastSerial = parseInt(serialPart, 10);
        if (!isNaN(lastSerial)) {
          nextSerial = lastSerial + 1;
        }
      }
      const admissionNumber = `${prefix}${String(nextSerial).padStart(6, "0")}`;

      // Allocate Bed / Mark as Occupied
      bed.isOccupied = true;
      await bed.save({ session });

      // Fetch daily tariff and nursing rate for this room/ward
      const tariffConfig = await RoomTariff.findOne({
        hospital: hospitalId,
        ward: ward,
        roomType: room.acType || "Non AC"
      }).session(session);

      const getWardDefaultRate = (wType: string): number => {
        switch (wType) {
          case "ICU": return 8000;
          case "NICU": return 7000;
          case "Private Ward": return 4000;
          case "Semi-Private Ward": return 2000;
          case "General Ward": return 1000;
          case "Emergency Ward": return 3000;
          default: return 1500;
        }
      };

      const dailyTariff = tariffConfig ? tariffConfig.tariff : getWardDefaultRate(ward);
      const nursingTariff = tariffConfig ? tariffConfig.nursingTariff : 300;

      // Create admission record
      const [createdAdmission] = await Admission.create([{
        hospital: hospitalId,
        patient: patientId,
        opVisit: opVisitId || null,
        admissionNumber,
        admissionDate: new Date(admissionDate),
        admissionTime: admissionTime || "",
        ward,
        room: roomId,
        bed: bedId,
        attenderName,
        attenderPhone,
        assignedNurse: assignedNurse || null,
        insuranceProvider,
        insurancePolicyNumber,
        advanceAmount: Number(advanceAmount) || 0,
        admissionNotes: admissionNotes || "",
        status: "admitted",

        admittingDoctor: admittingDoctor || null,
        priority,
        admissionMode,
        approvalType: admissionMode === "Receptionist Initiated" ? "Doctor Verbal Order" : "Doctor Request System",
        admissionReason: admissionReason || "",
        
        department: departmentId || null,
        admissionType,
        expectedStay,
        primaryDiagnosis,
        accommodationHistory: [
          {
            ward,
            roomType: room.acType || "Non AC",
            room: roomId,
            bed: bedId,
            dailyTariff,
            nursingTariff,
            startDate: new Date(admissionDate),
            endDate: null,
            occupiedDays: 0
          }
        ]
      }], { session });

      let createdInvoice: any = null;
      let createdPayment: any = null;

      // If advance amount is provided, generate invoice and payment receipt
      if (Number(advanceAmount) > 0) {
        const rcpPrefix = `RCP${currentYear}`;
        const latestPaymentWithRcp = await Payment.findOne({
          hospital: hospitalId,
          transactionId: new RegExp(`^${rcpPrefix}`)
        }).sort({ createdAt: -1 }).session(session);
        let nextRcpSerial = 1;
        if (latestPaymentWithRcp) {
          const serialPart = latestPaymentWithRcp.transactionId?.replace(rcpPrefix, "") || "0";
          const lastRcp = parseInt(serialPart, 10);
          if (!isNaN(lastRcp)) nextRcpSerial = lastRcp + 1;
        }
        const receiptNumber = `${rcpPrefix}${String(nextRcpSerial).padStart(5, "0")}`;

        const [invoice] = await Invoice.create([{
          hospital: hospitalId,
          patient: patientId,
          billingType: "IP",
          status: "paid",
          issuedAt: new Date(),
          dueDate: new Date(),
          items: [
            {
              description: "IP Admission Advance Deposit",
              category: "admission_advance",
              quantity: 1,
              amount: Number(advanceAmount)
            }
          ],
          totals: {
            subtotal: Number(advanceAmount),
            taxAmount: 0,
            serviceFee: 0,
            discount: 0,
            insuranceCovered: 0,
            total: Number(advanceAmount),
            patientBalance: 0
          }
        }], { session });
        createdInvoice = invoice;

        const [payment] = await Payment.create([{
          hospital: hospitalId,
          invoice: createdInvoice._id,
          patient: patientId,
          amount: Number(advanceAmount),
          paymentMethod,
          transactionId: receiptNumber,
          paidAt: new Date()
        }], { session });
        createdPayment = payment;
      }

      // Update patient status to admitted
      patient.status = "admitted";
      await patient.save({ session });

      // Update Admission Request status if applicable
      let resolvedReqId = requestId;
      if (!resolvedReqId && notificationId) {
        const notif = await DbNotification.findOne({ _id: notificationId, hospital: hospitalId }).session(session);
        if (notif && notif.data?.requestId) {
          resolvedReqId = notif.data.requestId;
        }
      }

      if (resolvedReqId) {
        const admissionReq = await AdmissionRequest.findOne({ _id: resolvedReqId, hospital: hospitalId }).session(session);
        if (admissionReq) {
          admissionReq.status = "Approved";
          await admissionReq.save({ session });

          // Mark corresponding notifications as read
          await DbNotification.updateMany(
            { hospital: hospitalId, "data.requestId": resolvedReqId },
            { isRead: true }
          ).session(session);

          // Emit Socket update
          emitToHospital(hospitalId.toString(), "admission_request_update", {
            requestId: resolvedReqId,
            status: "Approved",
            timestamp: new Date()
          });

          // Notify doctor
          if (admissionReq.requestedBy) {
            await createDoctorNotification({
              hospital: hospitalId,
              title: "Admission Request Approved",
              message: `Your IP admission request ${admissionReq.requestNumber} for ${patient.name} has been approved. Bed allocated in ${ward}.`,
              type: "admission_request",
              severity: "info",
              recipientDoctor: admissionReq.requestedBy.toString(),
              link: `/doctor/inpatients`,
              data: {
                requestId: resolvedReqId,
                patientId: patientId.toString(),
                admissionNumber,
              }
            });
            emitToDoctor(admissionReq.requestedBy.toString(), "admission_request_update", {
              requestId: resolvedReqId,
              status: "Approved",
              timestamp: new Date()
            });
          }
        }
      }

      // Update OP Visit status to ConvertedToIP if applicable
      let resolvedOpVisitId = opVisitId;
      if (!resolvedOpVisitId && resolvedReqId) {
        const admissionReq = await AdmissionRequest.findOne({ _id: resolvedReqId, hospital: hospitalId }).session(session);
        if (admissionReq && admissionReq.consultation) {
          resolvedOpVisitId = admissionReq.consultation as any;
        }
      }
      if (resolvedOpVisitId) {
        const opV = await OPVisit.findOne({ _id: resolvedOpVisitId, hospital: hospitalId }).session(session);
        if (opV) {
          opV.status = "ConvertedToIP";
          await opV.save({ session });
        }
      }

      // Mark the notification as read if provided
      if (notificationId) {
        await ReceptionRepository.markNotificationRead(hospitalId, notificationId);
      }

      // Create audit log
      const docRecord = admittingDoctor ? await Doctor.findById(admittingDoctor).session(session) : null;
      const approvalTypeStr = admissionMode === "Receptionist Initiated" ? "Doctor Verbal Order" : "Doctor Request System";
      await ReceptionRepository.createAuditLog({
        hospital: hospitalId,
        user: userId,
        action: "IP_ADMIT",
        details: `Created By: Receptionist | Admission Mode: ${admissionMode} | Approval Type: ${approvalTypeStr} | Admitting Doctor: ${docRecord ? docRecord.name : "N/A"} | Timestamp: ${new Date().toISOString()} | Remarks: ${admissionNotes || ""}`
      });

      await session.commitTransaction();
      session.endSession();

      // Notify doctor of receptionist-initiated IP admission
      if (admissionMode === "Receptionist Initiated" && admittingDoctor) {
        try {
          await createDoctorNotification({
            hospital: hospitalId,
            title: "New Inpatient Assigned",
            message: `You have been assigned as the admitting doctor for inpatient ${patient.name} (IP No: ${admissionNumber}, Ward: ${ward}).`,
            type: "admission_request",
            severity: "info",
            recipientDoctor: admittingDoctor.toString(),
            link: `/doctor/ip-management`,
            data: {
              admissionId: createdAdmission._id.toString(),
              admissionNumber,
              patientId: patientId.toString(),
            }
          });
        } catch (err) {
          console.error("Failed to notify doctor of receptionist-initiated IP admission:", err);
        }
      }

      // Retrieve patient's last OP visit for slip auto-fills
      const lastOpVisit = await OPVisit.findOne({ hospital: hospitalId, patient: patientId })
        .sort({ createdAt: -1 })
        .populate("doctor department");

      const hospital = await Hospital.findById(hospitalId);
      const hospitalName = hospital ? hospital.name : "HMS General Hospital";

      // Construct Wrist Band and Admission Slip Details
      const wristBand = {
        patientName: patient.name,
        uhid: patient.uhid,
        age: patient.age,
        gender: patient.gender,
        admissionNumber,
        ward,
        roomNumber: room.roomNumber,
        bedNumber: bed.bedNumber,
        allergies: patient.allergies || "No Known Allergies",
        barcode: admissionNumber
      };

      const slipDoctor = admittingDoctor 
        ? docRecord?.name
        : (lastOpVisit?.doctor as any)?.name || "N/A";

      let nurseName = "N/A";
      if (assignedNurse) {
        const nurseRecord = await Staff.findById(assignedNurse).session(session);
        if (nurseRecord) {
          nurseName = nurseRecord.name;
        }
      }

      const admissionSlip = {
        hospitalName,
        admissionNumber,
        admissionDate: new Date(admissionDate).toLocaleDateString("en-IN"),
        admissionTime: admissionTime || "--:--",
        patientName: patient.name,
        uhid: patient.uhid,
        age: patient.age,
        gender: patient.gender,
        ward,
        roomNumber: room.roomNumber,
        bedNumber: bed.bedNumber,
        assignedNurseName: nurseName,
        attenderName: attenderName || "N/A",
        attenderPhone: attenderPhone || "N/A",
        insuranceProvider: insuranceProvider || "N/A",
        advancePaid: Number(advanceAmount) || 0,
        paymentMethod: paymentMethod || "Cash",
        receiptNumber: createdPayment ? createdPayment.transactionId : "N/A",
        admissionNotes: admissionNotes || "",
        
        // Auto-fills from previous OP Consultation
        lastOpVisitDate: lastOpVisit ? new Date(lastOpVisit.createdAt).toLocaleDateString("en-IN") : "N/A",
        lastConsultingDoctor: (lastOpVisit?.doctor as any)?.name || "N/A",
        lastConsultingDepartment: (lastOpVisit?.department as any)?.name || "N/A",
        diagnosis: lastOpVisit?.clinicalNotes || "N/A",
        admittingDoctorName: slipDoctor
      };

      // Real-time updates via Socket.IO
      emitToHospital(hospitalId.toString(), "dashboard_update", {
        type: "IP_ADMISSION",
        admissionNumber,
        patientName: patient.name,
        uhid: patient.uhid,
        ward,
        roomNumber: room.roomNumber,
        bedNumber: bed.bedNumber,
        timestamp: new Date()
      });

      return {
        success: true,
        admission: createdAdmission,
        invoice: createdInvoice,
        payment: createdPayment,
        wristBand,
        admissionSlip
      };

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  static async transferPatient(hospitalId: Types.ObjectId, transferData: any, userId: Types.ObjectId) {
    const { admissionId, newRoomId, newBedId, notes } = transferData;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId }).session(session);
      if (!admission || admission.status !== "admitted") {
        throw new AppError("Active admission record not found.", 404);
      }

      const newBed = await Bed.findOne({ _id: newBedId, hospital: hospitalId }).session(session);
      if (!newBed || newBed.isOccupied || newBed.status !== "Available") {
        throw new AppError("Selected bed is not available.", 400);
      }

      const newRoom = await Room.findOne({ _id: newRoomId, hospital: hospitalId }).session(session);
      if (!newRoom || newRoom.status !== "Active") {
        throw new AppError("Selected room is not active or not found.", 404);
      }

      // Verify cascading references
      if (newBed.room.toString() !== newRoomId) {
        throw new AppError("Selected Bed does not belong to the selected Room.", 400);
      }

      // Fetch tariff configuration for new room
      const tariffConfig = await RoomTariff.findOne({
        hospital: hospitalId,
        ward: newRoom.wardName,
        roomType: newRoom.acType || "Non AC"
      }).session(session);

      const getWardDefaultRate = (wType: string): number => {
        switch (wType) {
          case "ICU": return 8000;
          case "NICU": return 7000;
          case "Private Ward": return 4000;
          case "Semi-Private Ward": return 2000;
          case "General Ward": return 1000;
          case "Emergency Ward": return 3000;
          default: return 1500;
        }
      };

      const dailyTariff = tariffConfig ? tariffConfig.tariff : getWardDefaultRate(newRoom.wardName);
      const nursingTariff = tariffConfig ? tariffConfig.nursingTariff : 300;

      // Close current active accommodation history entry
      const activeEntry = admission.accommodationHistory.find((h: any) => h.endDate === null);
      let oldTariff = 0;
      if (activeEntry) {
        const start = new Date(activeEntry.startDate);
        const end = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        activeEntry.occupiedDays = diffDays || 1;
        activeEntry.endDate = new Date();
        oldTariff = activeEntry.dailyTariff;
      }

      // Open new accommodation history entry
      admission.accommodationHistory.push({
        ward: newRoom.wardName,
        roomType: newRoom.acType || "Non AC",
        room: newRoomId,
        bed: newBedId,
        dailyTariff,
        nursingTariff,
        startDate: new Date(),
        endDate: null,
        occupiedDays: 0
      });

      // Release old bed
      await ReceptionRepository.updateBedOccupancy(hospitalId, admission.bed.toString(), false);

      // Occupy new bed
      await ReceptionRepository.updateBedOccupancy(hospitalId, newBedId, true);

      // Update admission record
      admission.room = newRoomId;
      admission.bed = newBedId;
      admission.ward = newRoom.wardName;
      admission.admissionNotes += `\n[Room Transfer on ${new Date().toLocaleString()}]: Transferred to Room ${newRoom.roomNumber}, Bed ${newBed.bedNumber}. Notes: ${notes || ""}`;
      
      await admission.save({ session });

      await ReceptionRepository.createAuditLog({
        hospital: hospitalId,
        user: userId,
        action: "IP_TRANSFER",
        details: `Transferred patient in admission ${admission.admissionNumber} from Bed ${admission.bed} to Bed ${newBed.bedNumber}. Tariff changed from ₹${oldTariff}/day to ₹${dailyTariff}/day.`
      });

      await session.commitTransaction();
      session.endSession();

      // Emit Socket update events
      emitToHospital(hospitalId.toString(), "ip_billing_update", {
        type: "IP_TRANSFER",
        admissionId: admission._id,
        timestamp: new Date()
      });
      emitToHospital(hospitalId.toString(), "dashboard_update", {
        type: "IP_TRANSFER",
        timestamp: new Date()
      });

      return admission;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  static async requestDischarge(hospitalId: Types.ObjectId, admissionId: string, notes: string, userId: Types.ObjectId) {
    const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId }).populate("patient");
    if (!admission || admission.status !== "admitted") {
      throw new AppError("Active admission record not found.", 404);
    }

    // Check for pending laboratory or pharmacy invoices
    const unpaidInvoices = await Invoice.find({
      patient: admission.patient._id,
      hospital: hospitalId,
      billingType: { $in: ["LAB", "RADIOLOGY", "PHARMACY"] },
      status: { $ne: "paid" }
    });

    const totalPending = unpaidInvoices.reduce((sum, inv) => sum + (inv.totals?.patientBalance ?? inv.totals?.total ?? 0), 0);
    if (totalPending > 0) {
      throw new AppError(`Cannot confirm discharge. Patient has pending laboratory or pharmacy dues of ₹${totalPending.toFixed(2)}. Please ask them to clear these dues at the respective counters first.`, 400);
    }

    // Check for outstanding inpatient bill
    const ipBill = await mongoose.model("IPBill").findOne({
      admission: admissionId,
      hospital: hospitalId,
      status: { $ne: "Cancelled" }
    });

    if (ipBill) {
      let ipOutstanding = ipBill.outstanding;
      if (ipBill.status === "Draft") {
        const { getIPBillItemsSummary } = await import("../controllers/ipBillController");
        const items = await getIPBillItemsSummary(ipBill, admission, hospitalId);
        const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
        const tax = subtotal * (ipBill.taxRate / 100);
        const totalDiscount = ipBill.discountType === "percentage"
          ? subtotal * ((ipBill.hospitalDiscount + ipBill.doctorDiscount + ipBill.managementDiscount) / 100)
          : (ipBill.hospitalDiscount + ipBill.doctorDiscount + ipBill.managementDiscount);
        const grandTotal = subtotal + tax - totalDiscount;
        ipOutstanding = Math.max(0, grandTotal - ipBill.insuranceCovered - ipBill.advancePaid);
      }

      if (ipOutstanding > 1) {
        throw new AppError(`Cannot confirm discharge. Patient has outstanding inpatient bill balance of ₹${ipOutstanding.toFixed(2)}. Please clear these dues in the billing section first.`, 400);
      }
    }

    // Release bed
    await ReceptionRepository.updateBedOccupancy(hospitalId, admission.bed.toString(), false);

    // Close active accommodation history entry
    const activeEntry = admission.accommodationHistory.find((h: any) => h.endDate === null);
    if (activeEntry) {
      const start = new Date(activeEntry.startDate);
      const end = new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      activeEntry.occupiedDays = diffDays || 1;
      activeEntry.endDate = new Date();
    }

    // Change admission status to discharged
    admission.status = "discharged";
    admission.dischargeDate = new Date();
    admission.dischargeNotes = notes || "Discharged complete.";
    await admission.save();

    // Change patient status to discharged
    await Patient.findOneAndUpdate({ _id: admission.patient._id, hospital: hospitalId }, { status: "discharged" });

    await ReceptionRepository.createAuditLog({
      hospital: hospitalId,
      user: userId,
      action: "IP_DISCHARGE",
      details: `Discharged patient ${(admission.patient as any).name} from admission ${admissionId}`
    });

    return admission;
  }

  static async cancelAppointment(hospitalId: Types.ObjectId, appointmentId: string, data: any, userId: Types.ObjectId) {
    const { reason, remarks, refundRequired } = data;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId }).session(session);
      if (!appointment) {
        throw new AppError("Appointment not found.", 404);
      }

      // Enforce strict 1-hour cancellation restriction
      validateAppointmentTimeRestriction(appointment);

      // Check queue state if any
      const queueItem = await Queue.findOne({ appointment: appointmentId, hospital: hospitalId }).session(session);
      if (queueItem && ["called", "completed"].includes(queueItem.status)) {
        throw new AppError("Cannot cancel appointment. Consultation has already started or is completed.", 400);
      }

      // Update appointment status to Cancelled and store details
      appointment.status = "cancelled";
      appointment.cancellationReason = reason;
      appointment.cancellationRemarks = remarks || "";
      appointment.refundRequired = refundRequired === "Yes" || refundRequired === true;
      await appointment.save({ session });

      // Update token status in Queue to Cancelled (skipped/cancelled)
      await Queue.findOneAndUpdate(
        { appointment: appointmentId, hospital: hospitalId },
        { status: "skipped" },
        { session }
      );

      // Verify if payment completed by finding invoice
      const invoice = await Invoice.findOne({ hospital: hospitalId, appointment: appointmentId }).session(session);
      if (invoice && invoice.status === "paid") {
        await DbNotification.create([{
          hospital: hospitalId,
          title: "Appointment Refund Request Pending",
          message: `Refund of ${invoice.totals.total} requested for cancelled appointment ${appointment.referenceId}. Reason: ${reason}`,
          type: "invoice",
          recipientRole: "accountant",
          severity: "warning",
          data: {
            appointmentId,
            invoiceId: invoice._id.toString(),
            amount: invoice.totals.total,
            reason,
          }
        }], { session });
      }

      // Create notification for receptionist
      await DbNotification.create([{
        hospital: hospitalId,
        title: "Appointment Cancelled",
        message: `Appointment ${appointment.referenceId} has been cancelled by receptionist.`,
        type: "appointment",
        recipientRole: "receptionist",
        severity: "info",
      }], { session });

      // Notify doctor
      if (appointment.doctor) {
        await createDoctorNotification({
          hospital: hospitalId,
          title: "Appointment Cancelled",
          message: `Appointment ${appointment.referenceId} has been cancelled by receptionist.`,
          type: "appointment",
          severity: "warning",
          recipientDoctor: appointment.doctor.toString(),
          link: `/doctor/op-management`,
          data: {
            appointmentId,
            referenceId: appointment.referenceId,
          }
        });
      }

      // Write audit log
      await ReceptionRepository.createAuditLog({
        hospital: hospitalId,
        user: userId,
        action: "APPOINTMENT_CANCELLED",
        details: `Cancelled appointment ${appointment.referenceId}. Reason: ${reason}. Refund required: ${refundRequired}`
      });

      await session.commitTransaction();

      // Emit socket.io event for real-time dashboard updates
      emitToHospital(hospitalId.toString(), "dashboard_update", {
        type: "APPOINTMENT_CANCELLED",
        appointmentId,
        timestamp: new Date()
      });

      return appointment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async rescheduleAppointment(hospitalId: Types.ObjectId, appointmentId: string, data: any, userId: Types.ObjectId) {
    const { newDate, newTime, doctorId, departmentId, reason, remarks } = data;

    // ── 1. Date / time guards ──────────────────────────────────────────────────
    const parsedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      throw new AppError("New appointment date cannot be before today.", 400);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (newDate === todayStr) {
      const now = new Date();
      const [slotHour, slotMin] = newTime.split(":").map(Number);
      if (slotHour < now.getHours() || (slotHour === now.getHours() && slotMin <= now.getMinutes())) {
        throw new AppError("New appointment time cannot be in the past.", 400);
      }
    }

    // ── 2. Doctor active & leave check ────────────────────────────────────────
    const doctor = await Doctor.findOne({ _id: doctorId, hospital: hospitalId, isActive: { $ne: false } });
    if (!doctor) {
      throw new AppError("The selected doctor is inactive, retired, or does not exist.", 404);
    }
    if (doctor.status === "on_leave") {
      throw new AppError("The doctor is currently on leave and cannot accept appointments.", 400);
    }

    // ── 3. Slot occupancy check (doctor already booked for this slot) ──────────
    const slotOverlap = await ReceptionRepository.checkDoctorSlotOverlap(hospitalId, doctorId, parsedDate, newTime);
    if (slotOverlap && slotOverlap._id.toString() !== appointmentId) {
      throw new AppError("The doctor is already booked for this date and time slot. Please choose a different slot.", 400);
    }

    // ── 4. Open transaction ────────────────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId })
        .populate("patient")
        .populate("department")
        .session(session);

      if (!appointment) {
        throw new AppError("Appointment not found.", 404);
      }

      // Enforce strict 1-hour cancellation & rescheduling restriction
      validateAppointmentTimeRestriction(appointment);

      // ── 6. ONE-RESCHEDULE LIMIT ────────────────────────────────────────────
      const currentRescheduleCount = (appointment as any).rescheduleCount ?? appointment.rescheduleHistory?.length ?? 0;
      if (currentRescheduleCount >= 1) {
        throw new AppError(
          "This appointment has already been rescheduled once. Further rescheduling requires administrator approval.",
          400
        );
      }

      // ── 7. Full duplicate booking validation ──────────────────────────────
      //  Block any ACTIVE appointment for same Patient + Doctor + Date + Time
      const startOfDay = new Date(parsedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const duplicateAppt = await Appointment.findOne({
        hospital: hospitalId,
        patient: (appointment.patient as any)._id,
        doctor: doctorId,
        date: { $gte: startOfDay, $lte: endOfDay },
        time: newTime,
        status: { $nin: ["cancelled", "no_show"] },
      }).session(session);

      if (duplicateAppt && duplicateAppt._id.toString() !== appointmentId) {
        throw new AppError(
          "Duplicate appointment detected. This patient already has an appointment for the selected doctor, date and time.",
          400
        );
      }

      // ── 8. Queue: mark old token skipped, generate new ────────────────────
      const oldQueueRecord = await Queue.findOne({ appointment: appointmentId, hospital: hospitalId }).session(session);

      let newTokenNumber = "N/A";

      if (oldQueueRecord) {
        oldQueueRecord.status = "skipped";
        await oldQueueRecord.save({ session });

        // Generate new token for the new appointment date
        const tokenCount = await Queue.countDocuments({
          hospital: hospitalId,
          date: { $gte: startOfDay, $lte: endOfDay },
        }).session(session);
        newTokenNumber = `T${String(tokenCount + 1).padStart(3, "0")}`;

        await Queue.create(
          [
            {
              hospital: hospitalId,
              tokenNumber: newTokenNumber,
              type: oldQueueRecord.type || "regular",
              status: "waiting",
              patient: (appointment.patient as any)._id,
              doctor: doctorId,
              department: departmentId,
              date: parsedDate,
              appointment: appointmentId,
            },
          ],
          { session }
        );
      }

      // ── 9. Update billing description if invoice exists ────────────────────
      const invoice = await Invoice.findOne({ hospital: hospitalId, appointment: appointmentId }).session(session);
      if (invoice) {
        invoice.items = invoice.items.map((item) => {
          if (item.category === "consultation") {
            return {
              description: `${appointment.type || "General"} Doctor Consultation - Dr. ${doctor.name}`,
              category: "consultation",
              quantity: 1,
              amount: item.amount,
            };
          }
          return item;
        }) as any;
        await invoice.save({ session });
      }

      // ── 10. Capture old values before mutating ────────────────────────────
      const oldDate = appointment.date;
      const oldTime = appointment.time;
      const oldToken = oldQueueRecord ? oldQueueRecord.tokenNumber : "N/A";

      // ── 11. Push to reschedule history ────────────────────────────────────
      appointment.rescheduleHistory.push({
        oldDate,
        oldTime,
        newDate: parsedDate,
        newTime,
        oldToken,
        newToken: newTokenNumber,
        rescheduledBy: userId,
        reason,
        timestamp: new Date(),
      });

      // ── 12. Update appointment record ──────────────────────────────────────
      appointment.date = parsedDate;
      appointment.time = newTime;
      appointment.doctor = doctorId as any;
      appointment.department = departmentId as any;
      appointment.notes = remarks || appointment.notes;

      // New tracking fields
      (appointment as any).isRescheduled = true;
      (appointment as any).rescheduleCount = currentRescheduleCount + 1;
      (appointment as any).previousAppointmentDate = oldDate;
      (appointment as any).previousAppointmentTime = oldTime;
      (appointment as any).newAppointmentDate = parsedDate;
      (appointment as any).newAppointmentTime = newTime;

      await appointment.save({ session });

      // ── 13. Notifications ─────────────────────────────────────────────────
      const departmentName = (appointment.department as any)?.name || "N/A";
      await DbNotification.create(
        [
          {
            hospital: hospitalId,
            title: "Appointment Rescheduled",
            message: `Appointment ${appointment.referenceId} rescheduled. New Date: ${parsedDate.toLocaleDateString()}, Time: ${newTime}, Token: ${newTokenNumber}, Doctor: Dr. ${doctor.name}.`,
            type: "appointment",
            recipientRole: "receptionist",
            severity: "info",
            data: {
              appointmentId,
              newDate,
              newTime,
              newToken: newTokenNumber,
              doctorName: doctor.name,
              departmentName,
            },
          },
        ],
        { session }
      );

      // Notify doctor
      if (doctorId) {
        await createDoctorNotification({
          hospital: hospitalId,
          title: "Appointment Rescheduled",
          message: `Appointment ${appointment.referenceId} has been rescheduled to ${parsedDate.toLocaleDateString("en-IN")} at ${newTime}.`,
          type: "appointment",
          severity: "info",
          recipientDoctor: doctorId.toString(),
          link: `/doctor/op-management`,
          data: {
            appointmentId,
            newDate,
            newTime,
            newToken: newTokenNumber,
          }
        });
      }

      // ── 14. Audit log ─────────────────────────────────────────────────────
      await ReceptionRepository.createAuditLog({
        hospital: hospitalId,
        user: userId,
        action: "APPOINTMENT_RESCHEDULE",
        details: `Rescheduled appointment ${appointment.referenceId} | Old: ${new Date(oldDate).toLocaleDateString()} ${oldTime} (Token: ${oldToken}) → New: ${parsedDate.toLocaleDateString()} ${newTime} (Token: ${newTokenNumber}) | Reason: ${reason} | RescheduleCount: ${currentRescheduleCount + 1}`,
      });

      await session.commitTransaction();

      // ── 15. Real-time socket update ────────────────────────────────────────
      emitToHospital(hospitalId.toString(), "dashboard_update", {
        type: "APPOINTMENT_RESCHEDULED",
        appointmentId,
        newDate,
        newTime,
        newToken: newTokenNumber,
        timestamp: new Date(),
      });

      return appointment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async checkInAppointment(hospitalId: Types.ObjectId, appointmentId: string, userId: Types.ObjectId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        hospital: hospitalId
      }).session(session).populate("doctor department patient");

      if (!appointment) {
        throw new AppError("Appointment not found.", 404);
      }

      if (["checked_in", "waiting", "in_consultation"].includes(appointment.status)) {
        throw new AppError("This patient is already checked in.", 400);
      }
      if (appointment.status === "cancelled") {
        throw new AppError("Cannot check in a cancelled appointment.", 400);
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const activeQueueItem = await Queue.findOne({
        hospital: hospitalId,
        patient: appointment.patient._id,
        status: { $in: ["waiting", "called"] },
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      }).session(session);

      if (activeQueueItem) {
        throw new AppError("Patient already has an active queue entry today.", 400);
      }

      const existingToken = await Queue.findOne({
        hospital: hospitalId,
        appointment: appointment._id
      }).session(session);

      if (existingToken) {
        throw new AppError("Token has already been generated for this appointment.", 400);
      }

      const doctor = appointment.doctor as any;
      let deptCode = "GEN";
      if (appointment.department) {
        const dept = appointment.department as any;
        if (dept.code) {
          deptCode = dept.code.substring(0, 3).toUpperCase();
        } else if (dept.name) {
          deptCode = dept.name.substring(0, 3).toUpperCase();
        }
      } else if (doctor.department) {
        const dept = await Department.findById(doctor.department).session(session);
        if (dept && dept.code) {
          deptCode = dept.code.substring(0, 3).toUpperCase();
        } else if (dept) {
          deptCode = dept.name.substring(0, 3).toUpperCase();
        }
      }

      const doctorsInDept = await Doctor.find({
        hospital: hospitalId,
        department: doctor.department
      }).session(session).sort({ createdAt: 1, _id: 1 });

      const docIndex = doctorsInDept.findIndex(d => d._id.toString() === doctor._id.toString());
      const docNum = docIndex >= 0 ? docIndex + 1 : 1;
      const docNumStr = String(docNum).padStart(2, "0");
      const doctorCode = `${deptCode}${docNumStr}`;

      const count = await Queue.countDocuments({
        hospital: hospitalId,
        doctor: doctor._id,
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      }).session(session);

      const nextNum = count + 1;
      const tokenNumber = `${doctorCode}-${String(nextNum).padStart(3, "0")}`;

      const [queueRecord] = await Queue.create([{
        hospital: hospitalId,
        tokenNumber,
        type: appointment.type === "Emergency" ? "emergency" : "regular",
        status: "waiting",
        patient: appointment.patient._id,
        doctor: doctor._id,
        department: appointment.department?._id || doctor.department,
        appointment: appointment._id,
        date: new Date()
      }], { session });

      appointment.status = "checked_in";
      await appointment.save({ session });

      const [slotHourStr, slotMinStr] = appointment.time.split(":");
      const slotHour = parseInt(slotHourStr, 10);
      const slotMin = parseInt(slotMinStr, 10);
      const slotTime = new Date(appointment.date);
      slotTime.setHours(slotHour, slotMin, 0, 0);

      const diffMinutes = (slotTime.getTime() - Date.now()) / (60 * 1000);
      const isLate = diffMinutes < -15;

      const title = isLate ? "Late arrival" : "Patient has arrived";
      const message = isLate
        ? `Patient ${(appointment.patient as any).name} checked in late for Dr. ${doctor.name} (Slot: ${appointment.time}).`
        : `Patient ${(appointment.patient as any).name} has arrived and checked in for Dr. ${doctor.name} (Token: ${tokenNumber}).`;

      await DbNotification.create([{
        hospital: hospitalId,
        title,
        message,
        type: "appointment",
        severity: isLate ? "warning" : "info",
        recipientRole: "receptionist",
        data: { appointmentId: appointment._id.toString(), tokenNumber }
      }], { session });

      await DbNotification.create([{
        hospital: hospitalId,
        title: "Patient Checked In",
        message: `Patient ${(appointment.patient as any).name} is checked in and waiting in your queue (Token: ${tokenNumber}).`,
        type: "appointment",
        severity: "info",
        recipientRole: "doctor",
        recipientDoctor: doctor._id,
        link: `/doctor/op-management`,
        data: { appointmentId: appointment._id.toString(), tokenNumber }
      }], { session });

      await ReceptionRepository.createAuditLog({
        hospital: hospitalId,
        user: userId,
        action: "CHECK_IN",
        details: `Checked in patient ${(appointment.patient as any).name} for Dr. ${doctor.name}. Token: ${tokenNumber}.`
      });

      await session.commitTransaction();
      session.endSession();

      emitToHospital(hospitalId.toString(), "dashboard_update", {
        type: "CHECK_IN",
        appointmentId: appointment._id.toString(),
        tokenNumber,
        timestamp: new Date()
      });

      return {
        success: true,
        tokenNumber,
        appointment
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  static async generateScheduledAlerts(hospitalId: Types.ObjectId) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      hospital: hospitalId,
      status: "scheduled",
      date: { $gte: startOfToday, $lte: endOfToday }
    }).populate("patient doctor");

    const now = new Date();

    for (const appt of appointments) {
      if (!appt.time) continue;
      const [hours, minutes] = appt.time.split(":").map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);

      const diffMins = (slotTime.getTime() - now.getTime()) / (60 * 1000);

      if (diffMins <= 15 && diffMins > 0) {
        const exists = await DbNotification.exists({
          hospital: hospitalId,
          title: "Upcoming Appointment in 15 Minutes",
          "data.appointmentId": appt._id.toString()
        });
        if (!exists) {
          await DbNotification.create({
            hospital: hospitalId,
            title: "Upcoming Appointment in 15 Minutes",
            message: `Upcoming appointment for ${(appt.patient as any)?.name} with Dr. ${(appt.doctor as any)?.name} at ${appt.time} Slot.`,
            type: "appointment",
            severity: "info",
            recipientRole: "receptionist",
            data: { appointmentId: appt._id.toString() }
          });
        }
      }

      if (diffMins < -15) {
        const exists = await DbNotification.exists({
          hospital: hospitalId,
          title: "Appointment missed",
          "data.appointmentId": appt._id.toString()
        });
        if (!exists) {
          await DbNotification.create({
            hospital: hospitalId,
            title: "Appointment missed",
            message: `${(appt.patient as any)?.name} missed the appointment with Dr. ${(appt.doctor as any)?.name} at ${appt.time} Slot.`,
            type: "appointment",
            severity: "critical",
            recipientRole: "receptionist",
            data: { appointmentId: appt._id.toString() }
          });

          appt.status = "no_show";
          await appt.save();
        }
      }
    }
  }
}
