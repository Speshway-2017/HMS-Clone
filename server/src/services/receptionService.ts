import { Types } from "mongoose";
import { ReceptionRepository } from "../repositories/receptionRepository";
import { AppError } from "../utils/AppError";
import { Doctor } from "../models/Doctor";
import { Room } from "../models/Room";
import { Bed } from "../models/Bed";
import { Department } from "../models/Department";
import { Patient } from "../models/Patient";
import { Invoice } from "../models/Invoice";
import { Admission } from "../models/Admission";
import { Payment } from "../models/Payment";
import { Queue } from "../models/Queue";
import { Appointment } from "../models/Appointment";
import { OPVisit } from "../models/OPVisit";
import { Hospital } from "../models/Hospital";
import { emitToHospital } from "../config/socket";


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
      bedsAvailable
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
      Bed.find({ hospital: hospitalId })
    ]);

    const pendingPaymentsCount = invoices.filter((inv: any) => inv.status === "pending").length;
    const completedPaymentsCount = invoices.filter((inv: any) => inv.status === "paid").length;
    const totalCollectionsToday = collectionsToday.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const doctorsAvailable = doctorsCount.filter((d: any) => d.status === "on_duty").length;
    const doctorsBusy = doctorsCount.filter((d: any) => d.status === "off_duty").length; // busy/off duty

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

    const newPatient = await ReceptionRepository.createPatient({
      ...patientData,
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

  static async listPatients(hospitalId: Types.ObjectId, page: number, limit: number, search?: string) {
    return await ReceptionRepository.listPatients(hospitalId, page, limit, search);
  }

  // ── Appointment Booking ──
  static async bookAppointment(hospitalId: Types.ObjectId, appointmentData: any, userId: Types.ObjectId) {
    const { patientId, doctorId, departmentId, date, time, type, notes } = appointmentData;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    // 1. Date validation (minimum selectable date is today)
    if (bookingDate < today) {
      throw new AppError("Cannot book appointments for past dates.", 400);
    }

    // 2. Time validation (past slots are disabled if date is today)
    const todayStr = today.toISOString().split("T")[0];
    const bookingDateStr = bookingDate.toISOString().split("T")[0];
    if (bookingDateStr === todayStr) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      const [slotHourStr, slotMinStr] = time.split(":");
      const slotHour = parseInt(slotHourStr, 10);
      const slotMin = parseInt(slotMinStr, 10);

      if (slotHour < currentHour || (slotHour === currentHour && slotMin <= currentMin)) {
        throw new AppError("Cannot book past time slots for today.", 400);
      }
    }

    // 3. Duplicate appointment prevention (Patient, Doctor, Date, Time Slot)
    const existingAppointment = await Appointment.findOne({
      hospital: hospitalId,
      patient: patientId,
      doctor: doctorId,
      date: bookingDate,
      time,
      status: { $in: ["scheduled", "checked_in", "in_consultation", "completed"] }
    });
    if (existingAppointment) {
      throw new AppError("Appointment already exists for this patient.", 409);
    }

    // Verify doctor availability (ensure no overlapping appointment in slot)
    const doctor = await Doctor.findOne({ _id: doctorId, hospital: hospitalId });
    if (!doctor) {
      throw new AppError("Doctor not found.", 404);
    }
    if (doctor.status === "on_leave") {
      throw new AppError("Doctor is currently on leave.", 400);
    }

    const overlap = await ReceptionRepository.checkDoctorSlotOverlap(hospitalId, doctorId, bookingDate, time);
    if (overlap) {
      throw new AppError("Doctor is already booked for this slot.", 400);
    }

    // Generate unique auto-incremented appointment number formatted as APT2026000001
    const year = bookingDate.getFullYear();
    const aptPrefix = `APT${year}`;
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

    const newAppointment = await ReceptionRepository.createAppointment({
      hospital: hospitalId,
      referenceId,
      patient: patientId,
      doctor: doctorId,
      department: departmentId,
      date: bookingDate,
      time,
      type: type || "Consultation",
      status: "scheduled",
      notes: notes || ""
    });

    // Automatically create a consultation billing Invoice
    const registrationFee = type === "Emergency" ? 200 : 100;
    const consultationFee = type === "Emergency" ? 500 : 300;
    const gst = 0; // GST exempt for hospital OPD consultations
    const discount = 0;

    const items = [
      { description: "Registration Fee", category: "registration", quantity: 1, amount: registrationFee },
      { description: `${type || "General"} Doctor Consultation`, category: "consultation", quantity: 1, amount: consultationFee }
    ];

    const subtotal = registrationFee + consultationFee;
    const total = subtotal + gst - discount;

    const newInvoice = await ReceptionRepository.createInvoice({
      hospital: hospitalId,
      patient: patientId,
      appointment: newAppointment._id,
      items,
      taxRate: 0,
      serviceFee: 0,
      discount: 0,
      insuranceCoveragePercent: 0,
      status: "pending",
      issuedAt: new Date(),
      dueDate: new Date(),
      totals: {
        subtotal,
        taxAmount: gst,
        serviceFee: 0,
        discount,
        insuranceCovered: 0,
        total,
        patientBalance: total
      }
    });

    await ReceptionRepository.createAuditLog({
      hospital: hospitalId,
      user: userId,
      action: "APPOINTMENT_BOOK",
      details: `Booked appointment ${referenceId} for patient ID ${patientId}. Created Invoice ID ${newInvoice._id}`
    });

    return {
      appointment: newAppointment,
      invoice: newInvoice,
      billing: {
        registrationFee,
        consultationFee,
        gst: 0,
        discount: 0,
        total
      }
    };
  }

  // ── Billing Payments ──
  static async processPayment(hospitalId: Types.ObjectId, paymentData: any, userId: Types.ObjectId) {
    const { invoiceId, amount, paymentMethod, mixedDetails } = paymentData;

    const invoice = await ReceptionRepository.findInvoiceById(hospitalId, invoiceId);
    if (!invoice) {
      throw new AppError("Invoice not found.", 404);
    }
    if (invoice.status === "paid") {
      throw new AppError("Invoice is already paid.", 400);
    }

    const transactionId = `TXN-${generateDigits(10)}`;

    const newPayment = await ReceptionRepository.createPayment({
      hospital: hospitalId,
      invoice: invoiceId,
      patient: invoice.patient._id,
      amount,
      paymentMethod,
      mixedDetails: paymentMethod === "Mixed" ? mixedDetails : { upiAmount: 0, cashAmount: 0, cardAmount: 0 },
      transactionId,
      paidAt: new Date()
    });

    // Update invoice status
    const updatedInvoice = await ReceptionRepository.updateInvoiceStatus(hospitalId, invoiceId, "paid");

    // After successful payment, confirm appointment and generate Token + Queue Number + Receipt
    // Fetch latest scheduled appointment linked to this invoice's patient
    const appointment = await Appointment.findOne({
      hospital: hospitalId,
      patient: invoice.patient._id,
      status: "scheduled"
    }).sort({ createdAt: -1 }).populate("doctor department");

    let tokenNumber = "N/A";
    let queueNumber = "N/A";
    let queueRecord = null;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    if (appointment) {
      // Confirm appointment status to checked_in
      appointment.status = "checked_in";
      await appointment.save();

      // Generate Token Number: T + 3-digit zero-padded serial (global for hospital today)
      const todayTokenCount = await Queue.countDocuments({
        hospital: hospitalId,
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      });
      tokenNumber = `T${String(todayTokenCount + 1).padStart(3, "0")}`;

      // Generate Queue Number: Q + 3-digit zero-padded position for this doctor today
      const doctorQueueCount = await Queue.countDocuments({
        hospital: hospitalId,
        doctor: (appointment.doctor as any)._id,
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      });
      queueNumber = `Q${String(doctorQueueCount + 1).padStart(3, "0")}`;

      // Create queue record
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
    }

    // Generate Receipt Number: RCP + year + 5-digit serial
    const rcpYear = new Date().getFullYear();
    const rcpPrefix = `RCP${rcpYear}`;
    const latestPaymentWithRcp = await Payment.findOne({
      hospital: hospitalId,
      transactionId: new RegExp(`^${rcpPrefix}`)
    }).sort({ createdAt: -1 });
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
    const billingBreakdown = {
      registrationFee: registrationItem?.amount ?? 0,
      consultationFee: consultationItem?.amount ?? 0,
      gst: 0,
      discount: 0,
      total: (invoice as any).totals?.total ?? amount
    };

    return {
      success: true,
      appointmentNumber: appointment?.referenceId ?? "N/A",
      tokenNumber,
      queueNumber,
      receiptNumber,
      queuePosition: queueRecord ? parseInt(queueNumber.replace("Q", ""), 10) : 0,
      paymentStatus: "paid",
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
    return await ReceptionRepository.getNotificationsByRole(hospitalId, "receptionist")
      .then(notifs => notifs.filter(n => n.type === "admission_request" && !n.isRead));
  }

  static async admitPatient(hospitalId: Types.ObjectId, admissionData: any, userId: Types.ObjectId) {
    const {
      notificationId,
      patientId,
      opVisitId,
      admissionDate,
      admissionTime,
      ward,
      roomId,
      bedId,
      attenderName,
      attenderPhone,
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
      verbalApproval
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

    // 1. Validate bed availability
    const bed = await Bed.findOne({ _id: bedId, hospital: hospitalId });
    if (!bed) {
      throw new AppError("Selected bed not found.", 404);
    }
    if (bed.isOccupied) {
      throw new AppError("Selected bed is already occupied.", 400);
    }

    // 2. Validate room & ward match
    const room = await Room.findOne({ _id: roomId, hospital: hospitalId });
    if (!room) {
      throw new AppError("Selected room not found.", 404);
    }

    // 3. Verify no existing active admission for this patient
    const activeAdm = await Admission.findOne({ hospital: hospitalId, patient: patientId, status: "admitted" });
    if (activeAdm) {
      throw new AppError("Patient is already admitted.", 400);
    }

    // 4. Verify patient exists
    const patient = await Patient.findOne({ _id: patientId, hospital: hospitalId });
    if (!patient) {
      throw new AppError("Patient record not found.", 404);
    }

    // 5. Generate Admission Number: IPYYYY000000 format (e.g. IP2026000125)
    const currentYear = new Date().getFullYear();
    const prefix = `IP${currentYear}`;
    const latestAdmission = await Admission.findOne({
      hospital: hospitalId,
      admissionNumber: new RegExp(`^${prefix}`)
    }).sort({ createdAt: -1 });

    let nextSerial = 1;
    if (latestAdmission) {
      const serialPart = latestAdmission.admissionNumber.replace(prefix, "");
      const lastSerial = parseInt(serialPart, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }
    const admissionNumber = `${prefix}${String(nextSerial).padStart(6, "0")}`;

    // Rollback context objects
    let createdAdmission: any = null;
    let createdInvoice: any = null;
    let createdPayment: any = null;
    let bedMarkedOccupied = false;
    let patientMarkedAdmitted = false;

    try {
      // 6. Allocate Bed / Mark as Occupied
      bed.isOccupied = true;
      await bed.save();
      bedMarkedOccupied = true;

      // 7. Create admission record
      createdAdmission = await Admission.create({
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
        insuranceProvider,
        insurancePolicyNumber,
        advanceAmount: Number(advanceAmount) || 0,
        admissionNotes: admissionNotes || "",
        status: "admitted",

        admittingDoctor: admittingDoctor || null,
        priority,
        admissionMode,
        approvalType: admissionMode === "Receptionist Initiated" ? "Doctor Verbal Order" : "Doctor Request System",
        admissionReason: admissionReason || ""
      });

      // 8. If advance amount is provided, generate invoice and payment receipt
      if (Number(advanceAmount) > 0) {
        // Create auto-incremented receipt format RCPYYYY00000
        const rcpPrefix = `RCP${currentYear}`;
        const latestPaymentWithRcp = await Payment.findOne({
          hospital: hospitalId,
          transactionId: new RegExp(`^${rcpPrefix}`)
        }).sort({ createdAt: -1 });
        let nextRcpSerial = 1;
        if (latestPaymentWithRcp) {
          const serialPart = latestPaymentWithRcp.transactionId?.replace(rcpPrefix, "") || "0";
          const lastRcp = parseInt(serialPart, 10);
          if (!isNaN(lastRcp)) nextRcpSerial = lastRcp + 1;
        }
        const receiptNumber = `${rcpPrefix}${String(nextRcpSerial).padStart(5, "0")}`;

        createdInvoice = await Invoice.create({
          hospital: hospitalId,
          patient: patientId,
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
        });

        createdPayment = await Payment.create({
          hospital: hospitalId,
          invoice: createdInvoice._id,
          patient: patientId,
          amount: Number(advanceAmount),
          paymentMethod,
          transactionId: receiptNumber,
          paidAt: new Date()
        });
      }

      // 9. Update patient status to admitted
      patient.status = "admitted";
      await patient.save();
      patientMarkedAdmitted = true;

      // 10. Mark the notification as read if provided
      if (notificationId) {
        await ReceptionRepository.markNotificationRead(hospitalId, notificationId);
      }

      // 11. Create audit log
      const docRecord = admittingDoctor ? await Doctor.findById(admittingDoctor) : null;
      const approvalType = admissionMode === "Receptionist Initiated" ? "Doctor Verbal Order" : "Doctor Request System";
      await ReceptionRepository.createAuditLog({
        hospital: hospitalId,
        user: userId,
        action: "IP_ADMIT",
        details: `Created By: Receptionist | Admission Mode: ${admissionMode} | Approval Type: ${approvalType} | Admitting Doctor: ${docRecord ? docRecord.name : "N/A"} | Timestamp: ${new Date().toISOString()} | Remarks: ${admissionNotes || ""}`
      });

    } catch (error) {
      // ── ROLLBACK MECHANISM IF FAILURE OCCURS ──
      console.error("Admission failed, rolling back changes...", error);

      if (bedMarkedOccupied) {
        await Bed.updateOne({ _id: bedId }, { isOccupied: false, status: "Available" });
      }
      if (createdAdmission) {
        await Admission.deleteOne({ _id: createdAdmission._id });
      }
      if (createdInvoice) {
        await Invoice.deleteOne({ _id: createdInvoice._id });
      }
      if (createdPayment) {
        await Payment.deleteOne({ _id: createdPayment._id });
      }
      if (patientMarkedAdmitted) {
        await Patient.updateOne({ _id: patientId }, { status: "outpatient" });
      }

      throw error;
    }

    // 12. Fetch hospital details for slip
    const hospital = await Hospital.findById(hospitalId);
    const hospitalName = hospital ? hospital.name : "HMS General Hospital";

    // 12b. Retrieve patient's last OP visit for slip auto-fills
    const lastOpVisit = await OPVisit.findOne({ hospital: hospitalId, patient: patientId })
      .sort({ createdAt: -1 })
      .populate("doctor department");

    // 13. Construct Wrist Band and Admission Slip Details
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
      ? (await Doctor.findById(admittingDoctor))?.name
      : (lastOpVisit?.doctor as any)?.name || "N/A";

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
      attenderName,
      attenderPhone,
      insuranceProvider: insuranceProvider || "N/A",
      advancePaid: Number(advanceAmount) || 0,
      receiptNumber: createdPayment ? createdPayment.transactionId : "N/A",
      admissionNotes: admissionNotes || "",
      
      // Auto-fills from previous OP Consultation
      lastOpVisitDate: lastOpVisit ? new Date(lastOpVisit.createdAt).toLocaleDateString("en-IN") : "N/A",
      lastConsultingDoctor: (lastOpVisit?.doctor as any)?.name || "N/A",
      lastConsultingDepartment: (lastOpVisit?.department as any)?.name || "N/A",
      diagnosis: lastOpVisit?.clinicalNotes || "N/A",
      admittingDoctorName: slipDoctor
    };

    // 14. Real-time updates via Socket.IO
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
  }

  static async transferPatient(hospitalId: Types.ObjectId, transferData: any, userId: Types.ObjectId) {
    const { admissionId, newRoomId, newBedId, notes } = transferData;

    const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId });
    if (!admission || admission.status !== "admitted") {
      throw new AppError("Active admission record not found.", 404);
    }

    const newBed = await Bed.findOne({ _id: newBedId, hospital: hospitalId });
    if (!newBed || newBed.isOccupied) {
      throw new AppError("Selected bed is not available.", 400);
    }

    // Release old bed
    await ReceptionRepository.updateBedOccupancy(hospitalId, admission.bed.toString(), false);

    // Occupy new bed
    await ReceptionRepository.updateBedOccupancy(hospitalId, newBedId, true);

    // Update admission record
    admission.room = newRoomId;
    admission.bed = newBedId;
    admission.admissionNotes += `\n[Room Transfer on ${new Date().toLocaleString()}]: Transferred to new Room. Notes: ${notes || ""}`;
    await admission.save();

    await ReceptionRepository.createAuditLog({
      hospital: hospitalId,
      user: userId,
      action: "IP_TRANSFER",
      details: `Transferred patient in admission ${admissionId} to Bed ${newBedId}`
    });

    return admission;
  }

  static async requestDischarge(hospitalId: Types.ObjectId, admissionId: string, notes: string, userId: Types.ObjectId) {
    const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId }).populate("patient");
    if (!admission || admission.status !== "admitted") {
      throw new AppError("Active admission record not found.", 404);
    }

    // Release bed
    await ReceptionRepository.updateBedOccupancy(hospitalId, admission.bed.toString(), false);

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
}
