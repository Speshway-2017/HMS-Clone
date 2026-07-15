import { Request, Response } from "express";
import { DoctorDashboardRepository } from "../repositories/doctorDashboardRepository";
import { Doctor } from "../models/Doctor";
import { Appointment } from "../models/Appointment";
import { Queue } from "../models/Queue";
import { Prescription } from "../models/Prescription";
import { LabOrder } from "../models/LabOrder";
import { Certificate } from "../models/Certificate";
import { Patient } from "../models/Patient";
import { RadiologyOrder } from "../models/RadiologyOrder";
import { DbNotification } from "../models/DbNotification";
import { Admission } from "../models/Admission";
import { AdmissionRequest } from "../models/AdmissionRequest";
import { AuditLog } from "../models/AuditLog";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import mongoose, { Types } from "mongoose";
import { emitToHospital } from "../config/socket";
import { createOrUpdatePrescriptionCore } from "./prescriptionController";


// Helper helper to resolve the logged-in doctor profile
async function getLoggedDoctor(req: Request) {
  const doctor = await Doctor.findOne({ email: req.user!.email, isActive: { $ne: false } });
  if (!doctor) {
    throw new AppError("Doctor profile not found for the logged-in user.", 404);
  }
  return doctor;
}

// 1. Dashboard Metrics (counts)
export const getMetrics = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const doctorId = doctor._id.toString();

  const [
    todayAppts,
    waitingQueue,
    inpatients,
    completed,
    prescriptions,
    labOrders,
    followups,
    surgeries,
    notifications,
    calendar,
  ] = await Promise.all([
    DoctorDashboardRepository.getTodayAppointments(hospitalId, doctorId),
    DoctorDashboardRepository.getWaitingPatients(hospitalId, doctorId),
    DoctorDashboardRepository.getCurrentInpatients(hospitalId, doctorId),
    DoctorDashboardRepository.getCompletedConsultations(hospitalId, doctorId),
    DoctorDashboardRepository.getPendingPrescriptions(hospitalId, doctorId),
    DoctorDashboardRepository.getPendingLabOrders(hospitalId, doctorId),
    DoctorDashboardRepository.getFollowupPatients(hospitalId, doctorId),
    DoctorDashboardRepository.getTodaySurgeries(hospitalId, doctorId),
    DoctorDashboardRepository.getNotifications(hospitalId, doctorId),
    DoctorDashboardRepository.getCalendarAppointments(hospitalId, doctorId),
  ]);

  res.json({
    status: "success",
    data: {
      todayAppointments: todayAppts.length,
      waitingPatients: waitingQueue.filter(q => q.status === "waiting").length,
      currentInpatients: inpatients.length,
      completedConsultations: completed.length,
      pendingPrescriptions: prescriptions.length,
      pendingLabOrders: labOrders.length,
      followupPatients: followups.length,
      todaySurgeries: surgeries.length,
      notifications: notifications.length,
      calendar: calendar.length,
    },
  });
});

// 2. Today's Appointments List
export const getTodayAppointments = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getTodayAppointments(hospitalId, doctor._id.toString());
  res.json({ status: "success", data });
});

// 3. Waiting Queue List & Actions
export const getQueue = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getWaitingPatients(hospitalId, doctor._id.toString());
  res.json({ status: "success", data });
});

export const callPatient = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const queueId = req.params.id;
  const doctor = await getLoggedDoctor(req);
  
  const queueItem = await Queue.findOneAndUpdate(
    { _id: queueId, hospital: hospitalId, doctor: doctor._id },
    { status: "called" },
    { new: true }
  ).populate("patient");

  if (!queueItem) {
    throw new AppError("Queue item not found or unauthorized.", 404);
  }

  if (queueItem.appointment) {
    await Appointment.findOneAndUpdate(
      { _id: queueItem.appointment, hospital: hospitalId, doctor: doctor._id },
      { status: "in_consultation" }
    );
  }

  res.json({ status: "success", data: queueItem });
});

export const skipPatient = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const queueId = req.params.id;
  const doctor = await getLoggedDoctor(req);

  const queueItem = await Queue.findOneAndUpdate(
    { _id: queueId, hospital: hospitalId, doctor: doctor._id },
    { status: "skipped" },
    { new: true }
  );

  if (!queueItem) {
    throw new AppError("Queue item not found or unauthorized.", 404);
  }

  res.json({ status: "success", data: queueItem });
});

export const markNoShow = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const queueId = req.params.id;
  const doctor = await getLoggedDoctor(req);

  const queueItem = await Queue.findOneAndUpdate(
    { _id: queueId, hospital: hospitalId, doctor: doctor._id },
    { status: "skipped" },
    { new: true }
  );

  if (!queueItem) {
    throw new AppError("Queue item not found or unauthorized.", 404);
  }

  if (queueItem.appointment) {
    await Appointment.findOneAndUpdate(
      { _id: queueItem.appointment, hospital: hospitalId, doctor: doctor._id },
      { status: "no_show" }
    );
  }

  res.json({ status: "success", data: queueItem });
});

// 4. Current Inpatients List & Actions
export const getInpatients = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getCurrentInpatients(hospitalId, doctor._id.toString());
  res.json({ status: "success", data });
});

export const addInpatientNotes = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const { notes, diagnosis } = req.body;
  const doctor = await getLoggedDoctor(req);

  // Hardened validation: Verify patient has active admission under this doctor
  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    admittingDoctor: doctor._id,
    status: "admitted",
  });

  if (!activeAdmission) {
    throw new AppError("You do not have authorization to add inpatient notes for this patient.", 403);
  }

  const patient = await Patient.findOneAndUpdate(
    { _id: patientId, hospital: hospitalId },
    {
      $push: {
        medicalHistory: {
          $each: [
            {
              date: new Date(),
              visitType: "Inpatient Rounds Note",
              doctorName: req.user!.name,
              diagnosis: diagnosis || "Inpatient Round",
              notes: notes || "Stable.",
              status: "Completed",
            },
          ],
          $position: 0,
        },
      },
    },
    { new: true }
  );

  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }

  res.json({ status: "success", data: patient });
});

// 5. Completed Consultations List
export const getCompletedConsultations = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getCompletedConsultations(hospitalId, doctor._id.toString());
  res.json({ status: "success", data });
});

// 6. Pending Prescriptions & Actions
export const getPrescriptions = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getPendingPrescriptions(hospitalId, doctor._id.toString());
  res.json({ status: "success", data });
});

export const createPrescription = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const { patientId, diagnosis, medicines, notes, advice, followUpDate } = req.body;

  // Find active or recent appointment for context
  let finalApptId = req.body.appointmentId;
  if (!finalApptId) {
    const activeAppt = await Appointment.findOne({
      patient: patientId,
      doctor: doctor._id,
      hospital: hospitalId,
      status: "in_consultation"
    });
    if (activeAppt) {
      finalApptId = activeAppt._id.toString();
    } else {
      const lastAppt = await Appointment.findOne({
        patient: patientId,
        doctor: doctor._id,
        hospital: hospitalId
      }).sort({ createdAt: -1 });
      if (lastAppt) {
        finalApptId = lastAppt._id.toString();
      } else {
        throw new AppError("No active consultation appointment found for this patient.", 400);
      }
    }
  }

  // Format medications from old medicines format or new medications format
  const rawMeds = medicines || req.body.medications || [];
  const medications = rawMeds.map((m: any) => ({
    name: m.name,
    strength: m.strength || "",
    dosage: m.dosage || "",
    frequency: m.frequency || "",
    duration: m.duration || "",
    instructions: m.instructions || "",
  }));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const reqHostUrl = `${req.protocol}://${req.get("host")}`;
    const prescription = await createOrUpdatePrescriptionCore(
      session,
      hospitalId,
      doctor,
      finalApptId,
      {
        medications,
        labOrders: req.body.labOrders || [],
        radiologyOrders: req.body.radiologyOrders || [],
        diagnosis: diagnosis || "Consultation visit",
        clinicalNotes: notes || "",
        advice: advice || "",
        followUpDate
      },
      reqHostUrl
    );

    // Also push to patient's medical history
    const medsNotes = medications.map((m: any) => `${m.name} (${m.dosage}, ${m.frequency}, ${m.duration})`).join("; ");
    await Patient.findOneAndUpdate(
      { _id: patientId, hospital: hospitalId },
      {
        $push: {
          medicalHistory: {
            $each: [
              {
                date: new Date(),
                visitType: "Prescription Issued",
                doctorName: doctor.name,
                diagnosis: diagnosis || "Prescription",
                notes: medsNotes || "Prescription updated",
                status: "Completed",
              },
            ],
            $position: 0,
          },
        },
      },
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({ status: "success", data: prescription });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

export const completePrescription = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const prescriptionId = req.params.id;
  const doctor = await getLoggedDoctor(req);

  const prescription = await Prescription.findOneAndUpdate(
    { _id: prescriptionId, hospital: hospitalId, doctor: doctor._id },
    { status: "completed" },
    { new: true }
  );

  if (!prescription) {
    throw new AppError("Prescription not found or unauthorized.", 403);
  }

  res.json({ status: "success", data: prescription });
});

// 7. Pending Lab Orders & Actions
export const getLabOrders = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getPendingLabOrders(hospitalId, doctor._id.toString());
  res.json({ status: "success", data });
});

export const createLabOrder = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const { patientId, tests, priority } = req.body;

  const labOrder = await LabOrder.create({
    hospital: hospitalId,
    patient: patientId,
    doctor: doctor._id,
    tests,
    priority: priority || "Routine",
    sampleStatus: "Pending",
    status: "pending",
  });

  // Also add to Patient medical history as lab requested
  await Patient.findOneAndUpdate(
    { _id: patientId, hospital: hospitalId },
    {
      $push: {
        medicalHistory: {
          $each: [
            {
              date: new Date(),
              visitType: "Lab Investigation Ordered",
              doctorName: doctor.name,
              diagnosis: "Investigation",
              notes: `Tests ordered: ${tests.join(", ")}`,
              status: "Completed",
            },
          ],
          $position: 0,
        },
      },
    }
  );

  res.status(201).json({ status: "success", data: labOrder });
});

// 8. Follow-up Patients
export const getFollowups = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getFollowupPatients(hospitalId, doctor._id.toString());
  res.json({ status: "success", data });
});

// 9. Today's Surgeries
export const getSurgeries = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getTodaySurgeries(hospitalId, doctor._id.toString());
  res.json({ status: "success", data });
});

// 10. Notifications
export const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getNotifications(hospitalId, doctor._id.toString());

  // Log delivery of notifications
  if (req.user && data.length > 0) {
    const now = new Date();
    await Promise.all(
      data.map((notif) =>
        AuditLog.create({
          hospital: hospitalId,
          user: req.user!._id,
          action: "doctor_notification_delivered",
          details: `Notification "${notif.title}" delivered to Dr. ${doctor.name}.`,
          ipAddress: getClientIp(req),
          resource: "notification",
          resourceId: notif._id,
          oldValues: null,
          newValues: {
            recipientDoctorId: doctor._id.toString(),
            deliveredTime: now,
            status: notif.isRead ? "read" : "unread",
          },
        })
      )
    );
  }

  res.json({ status: "success", data });
});

export const markNotificationRead = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const notificationId = req.params.id;

  const notif = await DbNotification.findOneAndUpdate(
    {
      _id: notificationId,
      hospital: hospitalId,
      recipientDoctor: doctor._id,
    },
    { isRead: true },
    { new: true }
  );

  if (!notif) {
    throw new AppError("Notification not found or unauthorized.", 404);
  }

  // Log notification read action
  if (req.user) {
    await AuditLog.create({
      hospital: hospitalId,
      user: req.user._id,
      action: "doctor_notification_read",
      details: `Notification "${notif.title}" marked as read by Dr. ${doctor.name}.`,
      ipAddress: getClientIp(req),
      resource: "notification",
      resourceId: notif._id,
      oldValues: { isRead: false },
      newValues: {
        recipientDoctorId: doctor._id.toString(),
        readTime: new Date(),
        status: "read",
      },
    });
  }

  res.json({ status: "success", data: { notification: notif } });
});

// 11. Calendar Schedule
export const getCalendar = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getCalendarAppointments(hospitalId, doctor._id.toString());
  res.json({ status: "success", data });
});

// 12. Certificates & Actions
export const getCertificates = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const data = await DoctorDashboardRepository.getCertificates(hospitalId, doctor._id.toString());
  res.json({ status: "success", data });
});

export const createCertificate = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const { patientId, diagnosis, duration, notes } = req.body;

  const certificate = await Certificate.create({
    hospital: hospitalId,
    patient: patientId,
    doctor: doctor._id,
    diagnosis,
    duration,
    notes: notes || "",
  });

  // Also push to medical history
  await Patient.findOneAndUpdate(
    { _id: patientId, hospital: hospitalId },
    {
      $push: {
        medicalHistory: {
          $each: [
            {
              date: new Date(),
              visitType: "Medical Certificate Issued",
              doctorName: doctor.name,
              diagnosis,
              notes: `Duration: ${duration}. Notes: ${notes || "None"}`,
              status: "Completed",
            },
          ],
          $position: 0,
        },
      },
    }
  );

  res.status(201).json({ status: "success", data: certificate });
});

// 13. Clinical Workflow & Consultation Workspace Actions
export const startConsultation = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const appointmentId = req.params.id;
  const doctor = await getLoggedDoctor(req);

  const appointment = await Appointment.findOneAndUpdate(
    { _id: appointmentId, hospital: hospitalId, doctor: doctor._id },
    { status: "in_consultation" },
    { new: true }
  );

  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }

  // Update the queue status to 'called' if token exists
  await Queue.findOneAndUpdate(
    { appointment: appointmentId, hospital: hospitalId, doctor: doctor._id },
    { status: "called" }
  );

  res.json({ status: "success", data: appointment });
});

export const getWorkspace = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const appointmentId = req.params.id;
  const doctor = await getLoggedDoctor(req);

  const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId, doctor: doctor._id })
    .populate("patient")
    .populate("doctor")
    .populate("department");

  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }

  const patientId = appointment.patient._id;
  const doctorId = appointment.doctor._id;

  const [queueItem, prescriptions, labOrders, radiologyOrders, admissions, admissionRequests] = await Promise.all([
    Queue.findOne({ appointment: appointmentId, hospital: hospitalId, doctor: doctorId }),
    Prescription.find({ patient: patientId, doctor: doctorId, hospital: hospitalId }),
    LabOrder.find({ patient: patientId, doctor: doctorId, hospital: hospitalId }),
    RadiologyOrder.find({ patient: patientId, doctor: doctorId, hospital: hospitalId }),
    Admission.find({ patient: patientId, hospital: hospitalId }),
    AdmissionRequest.find({ patient: patientId, hospital: hospitalId }).sort({ createdAt: -1 }),
  ]);

  res.json({
    status: "success",
    data: {
      appointment,
      queueItem,
      prescriptions,
      labOrders,
      radiologyOrders,
      admissions,
      admissionRequests,
    },
  });
});

export const saveVitals = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const appointmentId = req.params.id;
  const { vitals, chiefComplaint } = req.body;
  const doctor = await getLoggedDoctor(req);

  const appointment = await Appointment.findOneAndUpdate(
    { _id: appointmentId, hospital: hospitalId, doctor: doctor._id },
    { vitals, chiefComplaint },
    { new: true }
  );

  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }

  res.json({ status: "success", data: appointment });
});

export const saveClinicalNotes = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const appointmentId = req.params.id;
  const { diagnosis, symptoms, clinicalNotes, treatmentPlan, advice } = req.body;
  const doctor = await getLoggedDoctor(req);

  const appointment = await Appointment.findOneAndUpdate(
    { _id: appointmentId, hospital: hospitalId, doctor: doctor._id },
    { diagnosis, symptoms, clinicalNotes, treatmentPlan, advice },
    { new: true }
  );

  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }

  res.json({ status: "success", data: appointment });
});

export const recommendAdmission = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const appointmentId = req.params.id;
  const {
    priority = "Routine",
    preferredWard = "General",
    preferredBedType = "General",
    expectedStay = "",
    primaryDiagnosis,
    clinicalNotes = "",
    admissionReason = "",
    specialInstructions = ""
  } = req.body;

  if (!primaryDiagnosis || !primaryDiagnosis.trim()) {
    throw new AppError("Diagnosis is mandatory for admission recommendation.", 400);
  }

  const doctor = await getLoggedDoctor(req);

  const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId, doctor: doctor._id })
    .populate("patient")
    .populate("doctor")
    .populate("department");

  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }

  // 1. Verify consultation is completed or in consultation
  if (appointment.status !== "completed" && appointment.status !== "in_consultation") {
    throw new AppError("Patient consultation must be active or completed to recommend admission.", 400);
  }

  const patient = appointment.patient as any;
  const docProfile = appointment.doctor as any;
  const department = appointment.department as any;

  // 2. Patient should not already have an ACTIVE IP Admission.
  const activeAdm = await Admission.findOne({
    hospital: hospitalId,
    patient: patient._id,
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

  if (activeAdm) {
    throw new AppError(`This patient already has an active inpatient admission (IP No: ${activeAdm.admissionNumber}). Request blocked.`, 400);
  }

  // 3. Do not allow duplicate pending Admission Requests
  const existingRequest = await AdmissionRequest.findOne({
    hospital: hospitalId,
    patient: patient._id,
    status: "Admission Requested"
  });

  if (existingRequest) {
    throw new AppError(`A pending admission request (Request No: ${existingRequest.requestNumber}) already exists for this patient.`, 400);
  }

  // 4. Generate Unique Admission Request Number: ARYYYY000001
  const currentYear = new Date().getFullYear();
  const prefix = `AR${currentYear}`;
  
  const latestReq = await AdmissionRequest.findOne({
    hospital: hospitalId,
    requestNumber: new RegExp(`^${prefix}`)
  }).sort({ createdAt: -1 });

  let nextSerial = 1;
  if (latestReq) {
    const serialPart = latestReq.requestNumber.replace(prefix, "");
    const lastSerial = parseInt(serialPart, 10);
    if (!isNaN(lastSerial)) {
      nextSerial = lastSerial + 1;
    }
  }
  const requestNumber = `${prefix}${String(nextSerial).padStart(6, "0")}`;

  // 5. Create AdmissionRequest
  const admissionReq = await AdmissionRequest.create({
    hospital: hospitalId,
    requestNumber,
    patient: patient._id,
    doctor: doctor._id,
    department: department._id,
    priority,
    preferredWard,
    preferredBedType,
    expectedStay,
    primaryDiagnosis,
    clinicalNotes,
    admissionReason: admissionReason || primaryDiagnosis,
    specialInstructions,
    status: "Admission Requested"
  });

  // 6. Create Notification for receptionist (to support existing notification flows in IPManagement page)
  await DbNotification.create({
    hospital: hospitalId,
    title: "New Admission Request",
    message: `Dr. ${docProfile.name} requested IP admission for ${patient.name} (${patient.uhid}) due to: ${primaryDiagnosis}`,
    type: "admission_request",
    recipientRole: "receptionist",
    severity: priority === "Emergency" ? "critical" : "warning",
    link: `/receptionist/ip/new`,
    data: {
      patientId: patient._id.toString(),
      opVisitId: appointmentId,
      diagnosis: primaryDiagnosis,
      suggestedWard: preferredWard || "General Ward",
      notes: clinicalNotes || "",
      requestId: admissionReq._id.toString(),
      requestNumber
    }
  });

  // 7. Emit real-time Socket.IO notification to receptionist
  emitToHospital(hospitalId.toString(), "new_admission_request", {
    requestNumber,
    patientName: patient.name,
    uhid: patient.uhid,
    doctorName: docProfile.name,
    departmentName: department?.name || "N/A",
    priority,
    requestedTime: new Date(),
    requestId: admissionReq._id
  });

  res.status(201).json({ status: "success", data: admissionReq });
});

export const createRadiologyOrder = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const { patientId, type, notes, priority } = req.body;

  const order = await RadiologyOrder.create({
    hospital: hospitalId,
    patient: patientId,
    doctor: doctor._id,
    type,
    notes: notes || "",
    priority: priority || "Routine",
    status: "pending",
  });

  // Also push to medical history
  await Patient.findOneAndUpdate(
    { _id: patientId, hospital: hospitalId },
    {
      $push: {
        medicalHistory: {
          $each: [
            {
              date: new Date(),
              visitType: "Radiology Ordered",
              doctorName: doctor.name,
              diagnosis: `${type} Request`,
              notes: `Priority: ${priority || "Routine"}. Notes: ${notes || "None"}`,
              status: "Pending",
            },
          ],
          $position: 0,
        },
      },
    }
  );

  res.status(201).json({ status: "success", data: order });
});

export const completeConsultation = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const appointmentId = req.params.id;
  const doctor = await getLoggedDoctor(req);

  const { medications, labOrders, radiologyOrders, diagnosis, chiefComplaint, clinicalNotes, advice, followUpDate } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId, doctor: doctor._id })
      .populate("patient")
      .populate("doctor")
      .populate("department")
      .session(session);

    if (!appointment) {
      throw new AppError("Appointment not found.", 404);
    }

    // Update appointment status to completed
    appointment.status = "completed";
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (chiefComplaint) appointment.chiefComplaint = chiefComplaint;
    if (clinicalNotes) appointment.clinicalNotes = clinicalNotes;
    if (advice) appointment.advice = advice;
    if (followUpDate) appointment.followUpDate = followUpDate;
    await appointment.save({ session });

    // Update queue item status to completed if exists
    await Queue.findOneAndUpdate(
      { appointment: appointmentId, hospital: hospitalId, doctor: doctor._id },
      { status: "completed" },
      { session }
    );

    // Save prescription automatically using transaction
    const reqHostUrl = `${req.protocol}://${req.get("host")}`;
    const prescription = await createOrUpdatePrescriptionCore(
      session,
      hospitalId,
      doctor,
      appointmentId,
      { medications, labOrders, radiologyOrders, diagnosis, chiefComplaint, clinicalNotes, advice, followUpDate },
      reqHostUrl
    );

    // Push to patient's medicalHistory array
    const departmentName = (appointment.department as any)?.name || "General OPD";
    const diagnosisVal = diagnosis || appointment.diagnosis || "Consultation";
    const notesVal = `Chief Complaint: ${chiefComplaint || appointment.chiefComplaint || "None"}. Vitals: BP: ${appointment.vitals?.bloodPressure || "—"}, Temp: ${appointment.vitals?.temperature || "—"}. Notes: ${clinicalNotes || appointment.clinicalNotes || "None"}. Plan: ${appointment.treatmentPlan || "None"}.`;

    await Patient.findOneAndUpdate(
      { _id: appointment.patient._id, hospital: hospitalId },
      {
        $push: {
          medicalHistory: {
            $each: [
              {
                date: new Date(),
                visitType: "OPD Consultation",
                doctorName: (appointment.doctor as any).name,
                department: departmentName,
                diagnosis: diagnosisVal,
                notes: notesVal,
                status: "Completed",
              },
            ],
            $position: 0,
          },
        },
      },
      { session }
    );

    await session.commitTransaction();
    res.json({ status: "success", data: appointment, prescription });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

export const getRadiologyOrders = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const orders = await RadiologyOrder.find({ hospital: hospitalId, doctor: doctor._id })
    .populate("patient")
    .populate("doctor")
    .sort({ createdAt: -1 });

  res.json({ status: "success", data: orders });
});

// ─────────────────────────────────────────────────────────────────────────────
// Laboratory — DOCTOR-SCOPED ONLY
//
// Security guarantee: a doctor can ONLY see lab orders they created.
// The doctor ID comes exclusively from the authenticated JWT — never from the
// request body or query string.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /doctors/dashboard/my-lab-orders
 *
 * Returns ALL lab orders (pending + completed + rejected) created by the
 * authenticated doctor. Filtered at the MongoDB level. Optional ?status= and
 * ?search= query params are supported.
 *
 * An audit log entry is written on every access.
 */
export const getMyLabOrders = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const doctorObjId = doctor._id;

  const { status, search } = req.query as Record<string, string | undefined>;

  // Build doctor-owned filter — doctor id is taken from JWT, never from client
  const filter: Record<string, unknown> = {
    hospital: hospitalId,
    doctor: doctorObjId,
  };

  if (status && ["pending", "completed", "rejected"].includes(status)) {
    filter.status = status;
  }

  const orders = await LabOrder.find(filter)
    .populate("patient", "name uhid age gender phone allergies bloodGroup")
    .populate("doctor", "name specialization")
    .sort({ createdAt: -1 });

  // Apply search filter in memory only (tests is an array of strings — hard to $regex in index)
  const result = search
    ? orders.filter((o) => {
        const patientName = (o.patient as { name?: string })?.name ?? "";
        return (
          patientName.toLowerCase().includes(search.toLowerCase()) ||
          o.tests.some((t) => t.toLowerCase().includes(search.toLowerCase()))
        );
      })
    : orders;

  // Audit log: track who accessed the lab orders list
  if (req.user) {
    await AuditLog.create({
      hospital: hospitalId,
      user: req.user._id,
      action: "doctor_lab_orders_accessed",
      details: `Dr. ${doctor.name} accessed their lab orders list (${result.length} orders).`,
      ipAddress: getClientIp(req),
      resource: "lab_order",
      resourceId: null,
      oldValues: null,
      newValues: { doctorId: doctorObjId.toString(), count: result.length, statusFilter: status ?? "all" },
    });
  }

  res.json({
    status: "success",
    data: {
      orders: result,
      counts: {
        total: result.length,
        pending: result.filter((o) => o.status === "pending").length,
        completed: result.filter((o) => o.status === "completed").length,
        rejected: result.filter((o) => o.status === "rejected").length,
      },
    },
  });
});

/**
 * GET /doctors/dashboard/my-lab-orders/:labOrderId
 *
 * Returns a single lab order — ONLY if it was created by the authenticated
 * doctor. Returns 403 with audit log on unauthorized access.
 */
export const getMyLabOrderById = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const doctorObjId = doctor._id;
  const labOrderId = new Types.ObjectId(req.params.labOrderId);

  // Ownership-checked query — both doctor AND hospital must match
  const order = await LabOrder.findOne({
    _id: labOrderId,
    hospital: hospitalId,
    doctor: doctorObjId,
  })
    .populate("patient", "name uhid age gender phone allergies bloodGroup")
    .populate("doctor", "name specialization");

  if (!order) {
    // Could be: doesn't exist OR belongs to another doctor — treat both as 403
    if (req.user) {
      await AuditLog.create({
        hospital: hospitalId,
        user: req.user._id,
        action: "unauthorized_lab_order_access_attempt",
        details: `Dr. ${doctor.name} attempted to access lab order ${labOrderId} without ownership. Access denied.`,
        ipAddress: getClientIp(req),
        resource: "lab_order",
        resourceId: labOrderId,
        oldValues: null,
        newValues: null,
      });
    }
    throw new AppError("You do not have access to this laboratory order.", 403);
  }

  // Audit log — authorised access to individual lab report
  if (req.user) {
    const patient = order.patient as { _id?: Types.ObjectId; name?: string };
    await AuditLog.create({
      hospital: hospitalId,
      user: req.user._id,
      action: "doctor_lab_order_report_viewed",
      details: `Dr. ${doctor.name} viewed lab order ${labOrderId} for patient ${patient?.name ?? "Unknown"}.`,
      ipAddress: getClientIp(req),
      resource: "lab_order",
      resourceId: labOrderId,
      oldValues: null,
      newValues: {
        doctorId: doctorObjId.toString(),
        patientId: patient?._id?.toString() ?? null,
        labOrderStatus: order.status,
      },
    });
  }

  res.json({ status: "success", data: { order } });
});

// ─────────────────────────────────────────────────────────────────────────────
// Patient Records — DOCTOR-SCOPED ONLY
//
// Security guarantee: a doctor can ONLY see patients who are linked to them
// via an appointment, admission, lab order, or radiology order.
// The doctor ID comes exclusively from the authenticated JWT — never from the
// request body/query.
// ─────────────────────────────────────────────────────────────────────────────

/** Helper — extract IP address (proxy-aware) */
function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.socket.remoteAddress ?? "";
}

/**
 * GET /doctors/dashboard/my-patients
 *
 * Returns ONLY patients that are genuinely assigned to the logged-in doctor
 * via at least one of:
 *  - an Appointment (any status)
 *  - an Admission (admittingDoctor)
 *  - a LabOrder
 *  - a RadiologyOrder
 *
 * Filtering happens entirely in MongoDB. No client-supplied doctorId is accepted.
 */
export const getMyPatients = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const doctorObjId = doctor._id;

  const { search } = req.query as Record<string, string | undefined>;

  // Step 1: collect all patient ObjectIds linked to this doctor across all
  // relevant collections — entirely at the database level.
  const [apptPatients, admissionPatients, labPatients, radioPatients, assignedPatients] = await Promise.all([
    Appointment.distinct("patient", { hospital: hospitalId, doctor: doctorObjId }),
    Admission.distinct("patient", { hospital: hospitalId, admittingDoctor: doctorObjId }),
    LabOrder.distinct("patient", { hospital: hospitalId, doctor: doctorObjId }),
    RadiologyOrder.distinct("patient", { hospital: hospitalId, doctor: doctorObjId }),
    Patient.distinct("_id", { hospital: hospitalId, assignedDoctor: doctorObjId }),
  ]);

  // Merge and deduplicate using string keys, then convert back to ObjectIds
  const patientIdSet = new Set<string>([
    ...apptPatients.map((id: any) => id.toString()),
    ...admissionPatients.map((id: any) => id.toString()),
    ...labPatients.map((id: any) => id.toString()),
    ...radioPatients.map((id: any) => id.toString()),
    ...assignedPatients.map((id: any) => id.toString()),
  ]);

  const patientIds = Array.from(patientIdSet).map((id) => new Types.ObjectId(id));

  // Step 2: fetch the actual patient documents — scoped to hospital + owned ids
  const filter: Record<string, unknown> = {
    hospital: hospitalId,
    _id: { $in: patientIds },
  };

  if (search) {
    filter.$or = [
      { name: new RegExp(search, "i") },
      { phone: new RegExp(search, "i") },
    ];
  }

  const patients = await Patient.find(filter)
    .populate("assignedDoctor", "name")
    .sort({ createdAt: -1 });

  // Step 3: Audit log — record access
  if (req.user) {
    await AuditLog.create({
      hospital: hospitalId,
      user: req.user._id,
      action: "doctor_patient_list_accessed",
      details: `Dr. ${doctor.name} accessed their patient records list (${patients.length} patients).`,
      ipAddress: getClientIp(req),
      resource: "patient",
      resourceId: null,
      oldValues: null,
      newValues: { doctorId: doctorObjId.toString(), count: patients.length },
    });
  }

  res.json({
    status: "success",
    data: {
      patients,
      counts: {
        total: patients.length,
        admitted: patients.filter((p) => p.status === "admitted").length,
        opd: patients.filter((p) => p.status === "opd").length,
        discharged: patients.filter((p) => p.status === "discharged").length,
      },
    },
  });
});

/**
 * GET /doctors/dashboard/my-patients/:patientId
 *
 * Returns a single patient — ONLY if the logged-in doctor has ownership
 * (i.e., at least one appointment, admission, lab order, or radiology order).
 * Returns 403 if the doctor has no link to this patient.
 */
export const getMyPatientById = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const doctorObjId = doctor._id;
  const patientId = new Types.ObjectId(req.params.patientId);

  // Verify ownership: at least one document must link this doctor to this patient
  const [apptCount, admissionCount, labCount, radioCount, patientAssignedCount] = await Promise.all([
    Appointment.countDocuments({ hospital: hospitalId, doctor: doctorObjId, patient: patientId }),
    Admission.countDocuments({ hospital: hospitalId, admittingDoctor: doctorObjId, patient: patientId }),
    LabOrder.countDocuments({ hospital: hospitalId, doctor: doctorObjId, patient: patientId }),
    RadiologyOrder.countDocuments({ hospital: hospitalId, doctor: doctorObjId, patient: patientId }),
    Patient.countDocuments({ hospital: hospitalId, _id: patientId, assignedDoctor: doctorObjId }),
  ]);

  const isOwned = apptCount + admissionCount + labCount + radioCount + patientAssignedCount > 0;

  if (!isOwned) {
    // Write security audit log for unauthorized access attempt
    if (req.user) {
      await AuditLog.create({
        hospital: hospitalId,
        user: req.user._id,
        action: "unauthorized_patient_access_attempt",
        details: `Dr. ${doctor.name} attempted to access patient ${patientId} without ownership. Access denied.`,
        ipAddress: getClientIp(req),
        resource: "patient",
        resourceId: patientId,
        oldValues: null,
        newValues: null,
      });
    }
    throw new AppError("You do not have access to this patient's records.", 403);
  }

  const patient = await Patient.findOne({ _id: patientId, hospital: hospitalId })
    .populate("assignedDoctor", "name");

  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }

  // Audit log — authorised access
  if (req.user) {
    await AuditLog.create({
      hospital: hospitalId,
      user: req.user._id,
      action: "doctor_patient_record_accessed",
      details: `Dr. ${doctor.name} accessed patient record for ${patient.name}.`,
      ipAddress: getClientIp(req),
      resource: "patient",
      resourceId: patientId,
      oldValues: null,
      newValues: { patientName: patient.name, doctorId: doctorObjId.toString() },
    });
  }

  // Fetch this doctor's clinical data for this patient
  const [appointments, prescriptions, labOrders, radiologyOrders, admissions] = await Promise.all([
    Appointment.find({ hospital: hospitalId, doctor: doctorObjId, patient: patientId })
      .sort({ date: -1 })
      .limit(20),
    Prescription.find({ hospital: hospitalId, doctor: doctorObjId, patient: patientId })
      .sort({ createdAt: -1 })
      .limit(20),
    LabOrder.find({ hospital: hospitalId, doctor: doctorObjId, patient: patientId })
      .sort({ createdAt: -1 })
      .limit(20),
    RadiologyOrder.find({ hospital: hospitalId, doctor: doctorObjId, patient: patientId })
      .sort({ createdAt: -1 })
      .limit(20),
    Admission.find({ hospital: hospitalId, admittingDoctor: doctorObjId, patient: patientId })
      .sort({ admissionDate: -1 })
      .limit(10),
  ]);

  res.json({
    status: "success",
    data: {
      patient,
      // Only this doctor's clinical data — never another doctor's records
      appointments,
      prescriptions,
      labOrders,
      radiologyOrders,
      admissions,
    },
  });
});

/**
 * POST /doctor/admissions/:admissionId/finalize-discharge
 * Doctor fills in the discharge summary and marks the admission as "discharge_requested".
 * The receptionist then sees it in their "Discharge Requests" tab and confirms it.
 */
export const finalizeDischarge = catchAsync(async (req: Request, res: Response) => {
  const { admissionId } = req.params;
  const { diagnosisAtDischarge, dischargeMedications, followUp, specialInstructions } = req.body;

  if (!diagnosisAtDischarge) {
    throw new AppError("Diagnosis at discharge is required.", 400);
  }

  const doctor = await getLoggedDoctor(req);
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;

  const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId });
  if (!admission) {
    throw new AppError("Admission record not found.", 404);
  }
  if ((admission.status as string) === "discharge_requested" || admission.status === "discharged" || (admission.status as string) === "Discharged") {
    throw new AppError("Discharge has already been requested or completed for this admission.", 400);
  }

  // Update admission with discharge summary and change status
  admission.status = "discharge_requested" as any;
  (admission as any).diagnosisAtDischarge = diagnosisAtDischarge;
  (admission as any).dischargeMedications = dischargeMedications || "";
  (admission as any).followUp = followUp || "";
  (admission as any).specialInstructions = specialInstructions || "";
  (admission as any).dischargeRequestedAt = new Date();
  (admission as any).dischargeRequestedBy = doctor._id;
  await admission.save();

  // Notify the receptionist about the discharge request
  await DbNotification.create({
    hospital: hospitalId,
    targetRole: "receptionist",
    type: "discharge_request",
    title: "Discharge Request",
    message: `Dr. ${doctor.name} has requested discharge for a patient. Please review and confirm.`,
    isRead: false,
    data: { admissionId: admission._id, doctorId: doctor._id }
  });

  // Emit real-time socket event
  emitToHospital(hospitalId.toString(), "discharge_requested", {
    admissionId: admission._id,
    doctorName: doctor.name,
  });

  res.json({
    status: "success",
    message: "Discharge request submitted successfully. The receptionist will confirm shortly.",
    data: { admission },
  });
});

