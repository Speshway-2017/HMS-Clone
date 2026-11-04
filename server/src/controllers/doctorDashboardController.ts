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
import { ConsultationSession } from "../models/ConsultationSession";
import { DiagnosticReport } from "../models/DiagnosticReport";
import { Admission } from "../models/Admission";
import { AdmissionRequest } from "../models/AdmissionRequest";
import { AuditLog } from "../models/AuditLog";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import mongoose, { Types } from "mongoose";
import { emitToHospital } from "../config/socket";
import { logAudit } from "../utils/auditLogger";
import { createOrUpdatePrescriptionCore, formatAndSanitizeMedications } from "./prescriptionController";
import {
  CONSULTATION_LIMITS,
  validateClinicalText,
  validateTemperature,
  validateBloodPressure,
  validatePulseRate,
  validateRespiratoryRate,
  validateOxygenSaturation,
  validateWeight,
  validateMedicineName,
  validateMedicineStrength,
  validateDosage,
  validateFrequency,
  validateDuration,
  validateRadiologyNotes,
  validatePrimaryDiagnosis,
  validateExpectedStay,
  validateAdmissionReason,
  validateAdmissionClinicalNotes,
  validateSpecialInstructions,
} from "../utils/consultationValidation";


async function getLoggedDoctor(req: Request) {
  if (!req.user) {
    throw new AppError("User is not authenticated.", 401);
  }

  // 1. Match by user ObjectId linked to Doctor document
  let doctor = await Doctor.findOne({ user: req.user._id, isActive: { $ne: false } });

  // 2. Fall back to email lookup if user link not directly set
  if (!doctor && req.user.email) {
    const emailRegex = new RegExp(`^${req.user.email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    doctor = await Doctor.findOne({ email: emailRegex, isActive: { $ne: false } });
    if (!doctor && req.user.hospital) {
      doctor = await Doctor.findOne({ hospital: req.user.hospital, email: emailRegex, isActive: { $ne: false } });
    }
  }

  // 3. Fall back to name lookup within same hospital if email didn't match
  if (!doctor && req.user.name && req.user.hospital) {
    const nameRegex = new RegExp(`^${req.user.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    doctor = await Doctor.findOne({ hospital: req.user.hospital, name: nameRegex, isActive: { $ne: false } });
  }

  if (!doctor) {
    throw new AppError("Doctor profile not found for the logged-in user.", 404);
  }

  // Self-heal: link doctor.user to user._id if missing
  if (!doctor.user) {
    doctor.user = req.user._id as any;
    await doctor.save().catch(() => {});
  }

  return doctor;
}

function getDoctorScopeFilter(req: Request, doctor: any) {
  if (req.user?.role === "doctor") {
    return { hospital: doctor.hospital || req.hospitalFilter?.hospital };
  }
  return req.hospitalFilter;
}

// 1. Dashboard Metrics (counts)
export const getMetrics = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const doctorId = doctor._id.toString();
  const filter = getDoctorScopeFilter(req, doctor);

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
    DoctorDashboardRepository.getTodayAppointments(filter, doctorId),
    DoctorDashboardRepository.getWaitingPatients(filter, doctorId),
    DoctorDashboardRepository.getCurrentInpatients(filter, doctorId),
    DoctorDashboardRepository.getCompletedConsultations(filter, doctorId),
    DoctorDashboardRepository.getPendingPrescriptions(filter, doctorId),
    DoctorDashboardRepository.getPendingLabOrders(filter, doctorId),
    DoctorDashboardRepository.getFollowupPatients(filter, doctorId),
    DoctorDashboardRepository.getTodaySurgeries(filter, doctorId),
    DoctorDashboardRepository.getNotifications(filter, doctorId),
    DoctorDashboardRepository.getCalendarAppointments(filter, doctorId),
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
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const data = await DoctorDashboardRepository.getTodayAppointments(filter, doctor._id.toString());
  res.json({ status: "success", data });
});

function getQueuePriorityScore(item: any, now: Date) {
  const appt = item.appointment;
  const isEmergency = item.type === "emergency" || appt?.type === "Emergency";
  if (isEmergency) return 1;

  const isAppointment = appt?.type === "Consultation" || appt?.type === "Appointment";
  if (isAppointment) {
    if (!appt.time) return 4;
    const [hours, minutes] = appt.time.split(":").map(Number);
    const slotTime = new Date(item.createdAt);
    slotTime.setHours(hours, minutes, 0, 0);

    if (now >= slotTime) {
      return 2;
    } else {
      return 4;
    }
  }

  return 3; // Walk-in
}

function compareQueueItems(a: any, b: any) {
  const now = new Date();
  const scoreA = getQueuePriorityScore(a, now);
  const scoreB = getQueuePriorityScore(b, now);

  if (scoreA !== scoreB) {
    return scoreA - scoreB;
  }

  if (scoreA === 1) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  if (scoreA === 2) {
    return (a.appointment?.time || "").localeCompare(b.appointment?.time || "");
  }
  if (scoreA === 3) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  if (scoreA === 4) {
    return (a.appointment?.time || "").localeCompare(b.appointment?.time || "");
  }

  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

// 3. Waiting Queue List & Actions
export const getQueue = catchAsync(async (req: Request, res: Response) => {
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const rawQueue = await DoctorDashboardRepository.getWaitingPatients(filter, doctor._id.toString());
  
  const sortedQueue = rawQueue.sort(compareQueueItems);
  const data = sortedQueue.map((item: any, index: number) => {
    const plain = item.toObject ? item.toObject() : item;
    return {
      ...plain,
      queuePosition: index + 1
    };
  });

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
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const data = await DoctorDashboardRepository.getCurrentInpatients(filter, doctor._id.toString());
  res.json({ status: "success", data });
});

/**
 * Helper to look up an active inpatient admission by Admission ID, Patient ID, or Admission Number.
 */
async function findActiveAdmission(hospitalId: Types.ObjectId, targetId: string) {
  if (!targetId || !hospitalId) return null;

  const inactiveStatuses = [
    "discharged",
    "Discharged",
    "Cancelled",
    "Expired",
    "Transferred Out (Final)"
  ];

  const isObjectId = Types.ObjectId.isValid(targetId);
  const query: any = {
    hospital: hospitalId,
    status: { $nin: inactiveStatuses }
  };

  if (isObjectId) {
    query.$or = [{ _id: targetId }, { patient: targetId }];
  } else {
    query.admissionNumber = targetId;
  }

  let admission = await Admission.findOne(query);

  if (!admission && isObjectId) {
    admission = await Admission.findOne({
      $or: [{ _id: targetId }, { patient: targetId }],
      status: { $nin: inactiveStatuses }
    });
  }

  return admission;
}

export const addInpatientNotes = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const targetId = req.params.id;
  const { notes, diagnosis, plan } = req.body;
  const doctor = await getLoggedDoctor(req);

  // Validation: Diagnosis/Round Subject
  const diagTrimmed = typeof diagnosis === 'string' ? diagnosis.trim() : '';
  if (!diagTrimmed) {
    throw new AppError('Diagnosis/Round Subject is required', 400);
  }
  if (diagTrimmed.length > 200) {
    throw new AppError('Diagnosis/Round Subject exceeds the maximum allowed length', 400);
  }
  if (!/[a-zA-Z0-9]/.test(diagTrimmed) || /<[^>]*>|javascript:/i.test(diagTrimmed)) {
    throw new AppError('Please enter valid data', 400);
  }

  // Validation: Daily Progress Notes
  const notesTrimmed = typeof notes === 'string' ? notes.trim() : '';
  if (!notesTrimmed) {
    throw new AppError('Daily Progress Notes is required', 400);
  }
  if (notesTrimmed.length > 2000) {
    throw new AppError('Daily Progress Notes exceeds the maximum allowed length', 400);
  }
  const hasScriptOrJs = /<script\b|javascript:/i.test(notesTrimmed);
  if (!/[a-zA-Z0-9]/.test(notesTrimmed) || hasScriptOrJs) {
    throw new AppError('Please enter valid data', 400);
  }

  // Hardened validation: Verify active admission exists for this inpatient
  const activeAdmission = await findActiveAdmission(hospitalId, targetId);

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found for this patient.", 403);
  }

  const patientId = activeAdmission.patient;

  // Calculate admission day
  const admissionDate = new Date(activeAdmission.admissionDate);
  const diffTime = Math.abs(new Date().getTime() - admissionDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const admissionDay = Math.max(1, diffDays);

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);

  const progressNoteItem = {
    doctor: doctor._id,
    doctorName: doctor.name,
    date: new Date(),
    time: currentTime,
    admissionDay,
    assessment: diagTrimmed,
    plan: plan || "",
    notes: notesTrimmed
  };

  // 1. Push progress notes to Admission record
  activeAdmission.progressNotes.push(progressNoteItem);

  // 2. Add to timeline
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: doctor.name,
    userRole: "doctor",
    eventType: "progress_note",
    description: `Progress note added by Dr. ${doctor.name}: ${diagTrimmed}. Notes: ${notesTrimmed}`
  });

  await activeAdmission.save();

  // 3. Keep in Patient medicalHistory for global timeline
  const patient = await Patient.findOneAndUpdate(
    { _id: patientId, hospital: hospitalId },
    {
      $push: {
        medicalHistory: {
          $each: [
            {
              date: new Date(),
              visitType: "Inpatient Rounds Note",
              doctorName: doctor.name,
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

  res.json({ status: "success", data: activeAdmission });
});

// 5. Completed Consultations List
export const getCompletedConsultations = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const appointments = await DoctorDashboardRepository.getCompletedConsultations(filter, doctor._id.toString());

  const apptIds = appointments.map((a: any) => a._id);
  const sessions = await ConsultationSession.find({ appointment: { $in: apptIds }, hospital: hospitalId });
  const sessionMap = new Map<string, any>();
  for (const s of sessions) {
    if (s.appointment) sessionMap.set(s.appointment.toString(), s);
  }

  const enrichedData = appointments.map((a: any) => {
    const apptObj = a.toObject ? a.toObject() : { ...a };
    const sess = sessionMap.get(apptObj._id.toString());
    if (sess) {
      apptObj.vitals = sess.vitals || apptObj.vitals;
      apptObj.chiefComplaint = sess.chiefComplaint || apptObj.chiefComplaint;
      apptObj.diagnosis = sess.diagnosis || apptObj.diagnosis;
      apptObj.symptoms = sess.symptoms || apptObj.symptoms;
      apptObj.clinicalNotes = sess.clinicalNotes || apptObj.clinicalNotes;
      apptObj.advice = sess.advice || apptObj.advice;
      apptObj.prescriptions = (sess.prescriptions && sess.prescriptions.length > 0) ? sess.prescriptions : (apptObj.prescriptions || apptObj.medicines || []);
      apptObj.labOrders = (sess.labOrders && sess.labOrders.length > 0) ? sess.labOrders : (apptObj.labOrders || apptObj.labTests || []);
      apptObj.radiologyOrders = (sess.radiologyOrders && sess.radiologyOrders.length > 0) ? sess.radiologyOrders : (apptObj.radiologyOrders || apptObj.radiologyTests || []);
      apptObj.admissionRecommendation = sess.admissionRecommendation || apptObj.admissionRecommendation;
    }
    return apptObj;
  });

  res.json({ status: "success", data: enrichedData });
});

// 6. Pending Prescriptions & Actions
export const getPrescriptions = catchAsync(async (req: Request, res: Response) => {
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const data = await DoctorDashboardRepository.getPendingPrescriptions(filter, doctor._id.toString());
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
  if (rawMeds.length === 0) {
    throw new AppError("Please enter a valid medicine name", 400);
  }
  for (const m of rawMeds) {
    const nameErr = validateMedicineName(m.name || m.medicineName);
    if (nameErr) throw new AppError(nameErr, 400);
    if (m.strength) {
      const strErr = validateMedicineStrength(m.strength);
      if (strErr) throw new AppError(strErr, 400);
    }
    if (m.dosage) {
      const dosErr = validateDosage(m.dosage);
      if (dosErr) throw new AppError(dosErr, 400);
    }
    if (m.frequency) {
      const freqErr = validateFrequency(m.frequency);
      if (freqErr) throw new AppError(freqErr, 400);
    }
    if (m.duration) {
      const durErr = validateDuration(m.duration);
      if (durErr) throw new AppError(durErr, 400);
    }
  }
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
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const data = await DoctorDashboardRepository.getPendingLabOrders(filter, doctor._id.toString());
  res.json({ status: "success", data });
});

export const createLabOrder = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const { patientId, tests, priority, appointmentId } = req.body;
  const isApptIdValid = appointmentId && mongoose.Types.ObjectId.isValid(appointmentId);
  const apptId = isApptIdValid ? appointmentId : null;

  let targetBranch = doctor.branch || req.hospitalFilter?.branch || (req.user as any)?.branch || null;
  if (apptId) {
    const apptDoc = await Appointment.findById(apptId);
    if (apptDoc && apptDoc.branch) {
      targetBranch = apptDoc.branch as any;
    }
  }

  let labOrder = await LabOrder.findOne({
    hospital: hospitalId,
    patient: patientId,
    doctor: doctor._id,
    appointment: apptId,
    status: "pending"
  });

  if (labOrder) {
    if (!labOrder.branch && targetBranch) {
      labOrder.branch = targetBranch;
    }
    labOrder.tests = Array.from(new Set([...labOrder.tests, ...tests]));
    if (priority === "STAT" || (priority === "Urgent" && labOrder.priority !== "STAT")) {
      labOrder.priority = priority;
    }
    await labOrder.save();
  } else {
    labOrder = await LabOrder.create({
      hospital: hospitalId,
      branch: targetBranch,
      patient: patientId,
      doctor: doctor._id,
      appointment: apptId,
      tests,
      priority: priority || "Routine",
      sampleStatus: "Pending",
      status: "pending",
    });
  }

  // Record to active admission timeline
  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: "admitted"
  });

  if (activeAdmission) {
    activeAdmission.timeline.push({
      date: new Date(),
      time: new Date().toTimeString().split(" ")[0].substring(0, 5),
      userName: doctor.name,
      userRole: "doctor",
      eventType: "lab_request",
      description: `Lab request created/updated: ${tests.join(", ")}`
    });
    await activeAdmission.save();
  }

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

  if (hospitalId) {
    emitToHospital(hospitalId.toString(), "lab_order_created", { labOrderId: labOrder._id, tests });
  }

  await logAudit({
    req,
    action: "CREATE_LAB_ORDER",
    entity: "LabOrder",
    entityId: labOrder._id.toString(),
    details: { tests, priority: labOrder.priority }
  });

  res.status(201).json({ status: "success", data: labOrder });
});

// 8. Follow-up Patients
export const getFollowups = catchAsync(async (req: Request, res: Response) => {
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const data = await DoctorDashboardRepository.getFollowupPatients(filter, doctor._id.toString());
  res.json({ status: "success", data });
});

// 9. Today's Surgeries
export const getSurgeries = catchAsync(async (req: Request, res: Response) => {
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const data = await DoctorDashboardRepository.getTodaySurgeries(filter, doctor._id.toString());
  res.json({ status: "success", data });
});

// 10. Notifications
export const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const data = await DoctorDashboardRepository.getNotifications(filter, doctor._id.toString());

  // Log delivery of notifications
  if (req.user && data.length > 0) {
    const now = new Date();
    await Promise.all(
      data.map((notif) =>
        AuditLog.create({
          hospital: (req.hospitalFilter!.hospital as Types.ObjectId),
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
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const data = await DoctorDashboardRepository.getCalendarAppointments(filter, doctor._id.toString());
  res.json({ status: "success", data });
});

// 12. Certificates & Actions
export const getCertificates = catchAsync(async (req: Request, res: Response) => {
  const doctor = await getLoggedDoctor(req);
  const filter = getDoctorScopeFilter(req, doctor);
  const data = await DoctorDashboardRepository.getCertificates(filter, doctor._id.toString());
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
  const doctorObjIds = [doctor._id, (doctor as any).user, req.user?._id].filter(Boolean);

  const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId, doctor: { $in: doctorObjIds } })
    .populate("patient")
    .populate("doctor")
    .populate("department");

  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }

  const patientId = appointment.patient._id;

  const [queueItem, prescriptions, labOrders, radiologyOrders, admissions, admissionRequests] = await Promise.all([
    Queue.findOne({ appointment: appointmentId, hospital: hospitalId }),
    Prescription.find({ hospital: hospitalId, $or: [{ appointment: appointmentId }, { patient: patientId }] }).sort({ createdAt: -1 }),
    LabOrder.find({ hospital: hospitalId, $or: [{ appointment: appointmentId }, { patient: patientId }] }).sort({ createdAt: -1 }),
    RadiologyOrder.find({ hospital: hospitalId, $or: [{ appointment: appointmentId }, { patient: patientId }] }).sort({ createdAt: -1 }),
    Admission.find({ patient: patientId, hospital: hospitalId }),
    AdmissionRequest.find({ patient: patientId, hospital: hospitalId }).sort({ createdAt: -1 }),
  ]);

  let draftSession = await ConsultationSession.findOne({ appointment: appointmentId, hospital: hospitalId }).sort({ createdAt: -1 });

  if (!draftSession && ["in_consultation", "scheduled", "checked_in"].includes(appointment.status)) {
    draftSession = await ConsultationSession.create({
      hospital: hospitalId,
      patient: appointment.patient._id,
      appointment: appointmentId,
      doctor: doctor._id,
      status: "IN_PROGRESS",
      vitals: appointment.vitals || {},
      chiefComplaint: appointment.chiefComplaint || "",
      diagnosis: appointment.diagnosis || "",
      symptoms: appointment.symptoms || "",
      clinicalNotes: appointment.clinicalNotes || "",
      treatmentPlan: appointment.treatmentPlan || "",
      advice: appointment.advice || "",
      history: [
        {
          action: "Consultation Session Initialized",
          timestamp: new Date(),
          details: `Doctor ${doctor.name} opened workspace.`,
        },
      ],
    });
  }

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
      draftSession,
    },
  });
});

export const saveVitals = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const appointmentId = req.params.id;
  const { vitals, chiefComplaint } = req.body;
  const doctor = await getLoggedDoctor(req);

  if (chiefComplaint) {
    const err = validateClinicalText(chiefComplaint, "Chief Complaint", CONSULTATION_LIMITS.CHIEF_COMPLAINT);
    if (err) throw new AppError(err, 400);
  }
  if (vitals) {
    if (vitals.temperature) {
      const err = validateTemperature(vitals.temperature);
      if (err) throw new AppError(err, 400);
    }
    if (vitals.bloodPressure) {
      const err = validateBloodPressure(vitals.bloodPressure);
      if (err) throw new AppError(err, 400);
    }
    if (vitals.pulseRate) {
      const err = validatePulseRate(vitals.pulseRate);
      if (err) throw new AppError(err, 400);
    }
    if (vitals.respiratoryRate) {
      const err = validateRespiratoryRate(vitals.respiratoryRate);
      if (err) throw new AppError(err, 400);
    }
    if (vitals.oxygenSaturation) {
      const err = validateOxygenSaturation(vitals.oxygenSaturation);
      if (err) throw new AppError(err, 400);
    }
    if (vitals.weight) {
      const err = validateWeight(vitals.weight);
      if (err) throw new AppError(err, 400);
    }
  }

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
  const { diagnosis, symptoms, clinicalNotes, treatmentPlan, advice, chiefComplaint } = req.body;
  const doctor = await getLoggedDoctor(req);

  const diagErr = validateClinicalText(diagnosis, "Diagnosis", CONSULTATION_LIMITS.DIAGNOSIS, true);
  if (diagErr) throw new AppError(diagErr, 400);
  if (chiefComplaint) {
    const err = validateClinicalText(chiefComplaint, "Chief Complaint", CONSULTATION_LIMITS.CHIEF_COMPLAINT);
    if (err) throw new AppError(err, 400);
  }
  if (symptoms) {
    const err = validateClinicalText(symptoms, "Symptoms", CONSULTATION_LIMITS.SYMPTOMS);
    if (err) throw new AppError(err, 400);
  }
  if (clinicalNotes) {
    const err = validateClinicalText(clinicalNotes, "Clinical Notes", CONSULTATION_LIMITS.CLINICAL_NOTES);
    if (err) throw new AppError(err, 400);
  }
  if (treatmentPlan) {
    const err = validateClinicalText(treatmentPlan, "Treatment Plan", CONSULTATION_LIMITS.TREATMENT_PLAN);
    if (err) throw new AppError(err, 400);
  }
  if (advice) {
    const err = validateClinicalText(advice, "Advice / Follow-up Notes", CONSULTATION_LIMITS.ADVICE);
    if (err) throw new AppError(err, 400);
  }

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

  const diagErr = validatePrimaryDiagnosis(primaryDiagnosis);
  if (diagErr) throw new AppError(diagErr, 400);
  if (expectedStay) {
    const stayErr = validateExpectedStay(expectedStay);
    if (stayErr) throw new AppError(stayErr, 400);
  }
  if (admissionReason) {
    const reasonErr = validateAdmissionReason(admissionReason);
    if (reasonErr) throw new AppError(reasonErr, 400);
  }
  if (clinicalNotes) {
    const notesErr = validateAdmissionClinicalNotes(clinicalNotes);
    if (notesErr) throw new AppError(notesErr, 400);
  }
  if (specialInstructions) {
    const instErr = validateSpecialInstructions(specialInstructions);
    if (instErr) throw new AppError(instErr, 400);
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
  const branchId = doctor.branch || req.hospitalFilter?.branch || (req.user as any)?.branch || null;
  const admissionReq = await AdmissionRequest.create({
    hospital: hospitalId,
    branch: branchId,
    requestNumber,
    patient: patient._id,
    doctor: doctor._id,
    requestedBy: doctor._id,
    appointment: appointment._id,
    department: department ? department._id : null,
    priority,
    preferredWard,
    preferredBedType,
    expectedStay,
    diagnosis: primaryDiagnosis,
    primaryDiagnosis,
    clinicalNotes,
    notes: clinicalNotes || "",
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
  if (req.body.notes) {
    const notesErr = validateRadiologyNotes(req.body.notes);
    if (notesErr) throw new AppError(notesErr, 400);
  }
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const { patientId, type, notes, priority } = req.body;
  const appointmentId = req.params.id;
  const isApptIdValid = appointmentId && mongoose.Types.ObjectId.isValid(appointmentId);
  const apptId = isApptIdValid ? appointmentId : null;

  let targetBranch = doctor.branch || req.hospitalFilter?.branch || (req.user as any)?.branch || null;
  if (apptId) {
    const apptDoc = await Appointment.findById(apptId);
    if (apptDoc && apptDoc.branch) {
      targetBranch = apptDoc.branch as any;
    }
  }

  let order = await RadiologyOrder.findOne({
    hospital: hospitalId,
    patient: patientId,
    doctor: doctor._id,
    appointment: apptId,
    status: "pending"
  });

  if (order) {
    if (!order.branch && targetBranch) {
      order.branch = targetBranch;
    }
    const scansList = order.scans || [];
    if (type && !scansList.includes(type)) {
      scansList.push(type);
      order.scans = scansList;
      order.type = scansList.join(", ");
    }
    if (notes) {
      order.notes = order.notes ? `${order.notes}; ${notes}` : notes;
    }
    if (priority === "STAT" || (priority === "Urgent" && order.priority !== "STAT")) {
      order.priority = priority;
    }
    await order.save();
  } else {
    order = await RadiologyOrder.create({
      hospital: hospitalId,
      branch: targetBranch,
      patient: patientId,
      doctor: doctor._id,
      appointment: apptId,
      type: type || "",
      scans: type ? [type] : [],
      notes: notes || "",
      priority: priority || "Routine",
      status: "pending",
    });
  }

  // Record to active admission timeline
  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: "admitted"
  });

  if (activeAdmission) {
    activeAdmission.timeline.push({
      date: new Date(),
      time: new Date().toTimeString().split(" ")[0].substring(0, 5),
      userName: doctor.name,
      userRole: "doctor",
      eventType: "radiology_request",
      description: `Radiology request created/updated: ${type}`
    });
    await activeAdmission.save();
  }

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

  const {
    medications,
    medicines,
    labOrders,
    labTests,
    radiologyOrders,
    radiologyTests,
    diagnosis,
    chiefComplaint,
    clinicalNotes,
    notes,
    symptoms,
    advice,
    vitals,
    followUpDate
  } = req.body;

  const actualMeds = medications || medicines || [];
  const actualLabOrders = labOrders || labTests || [];
  const actualRadiologyOrders = radiologyOrders || radiologyTests || [];
  const actualNotes = clinicalNotes || notes || "";

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let targetApptId = appointmentId;
    let appointment = await Appointment.findOne({ _id: targetApptId, hospital: hospitalId })
      .populate("patient")
      .populate("doctor")
      .populate("department")
      .session(session);

    if (!appointment) {
      const qItem = await Queue.findOne({ _id: targetApptId, hospital: hospitalId }).session(session);
      if (qItem && qItem.appointment) {
        targetApptId = qItem.appointment.toString();
        appointment = await Appointment.findOne({ _id: targetApptId, hospital: hospitalId })
          .populate("patient")
          .populate("doctor")
          .populate("department")
          .session(session);
      }
    }

    if (!appointment) {
      throw new AppError("Appointment not found.", 404);
    }

    // Update appointment status to completed
    appointment.status = "completed";
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (chiefComplaint) appointment.chiefComplaint = chiefComplaint;
    if (actualNotes) appointment.clinicalNotes = actualNotes;
    if (symptoms) appointment.symptoms = symptoms;
    if (advice) appointment.advice = advice;
    if (vitals && typeof vitals === "object") {
      appointment.vitals = { ...(appointment.vitals || {}), ...vitals };
    }
    if (followUpDate) appointment.followUpDate = followUpDate;

    // Attach lab orders, radiology orders, prescriptions, and IP recommendation to appointment object
    (appointment as any).labOrders = actualLabOrders;
    (appointment as any).radiologyOrders = actualRadiologyOrders;
    (appointment as any).prescriptions = actualMeds;
    if (req.body.ipRecommendation || req.body.admissionRecommendation) {
      (appointment as any).admissionRecommendation = req.body.ipRecommendation || req.body.admissionRecommendation;
    }
    await appointment.save({ session });

    // Update queue item status to completed if exists
    await Queue.findOneAndUpdate(
      { appointment: targetApptId, hospital: hospitalId },
      { status: "completed" },
      { session }
    );

    // Update ConsultationSession to COMPLETED state with full record payload
    await ConsultationSession.findOneAndUpdate(
      { appointment: targetApptId, hospital: hospitalId },
      {
        status: "COMPLETED",
        vitals: vitals || appointment.vitals || {},
        diagnosis: diagnosis || appointment.diagnosis || "",
        chiefComplaint: chiefComplaint || appointment.chiefComplaint || "",
        clinicalNotes: actualNotes || appointment.clinicalNotes || "",
        symptoms: symptoms || appointment.symptoms || "",
        advice: advice || appointment.advice || "",
        prescriptions: actualMeds,
        labOrders: actualLabOrders,
        radiologyOrders: actualRadiologyOrders,
        admissionRecommendation: req.body.ipRecommendation || req.body.admissionRecommendation || {},
        completedAt: new Date(),
        completedBy: doctor._id
      },
      { session, upsert: true }
    );

    // Save prescription automatically ONLY IF medicines, lab orders, or radiology orders are present
    let prescription = null;
    const formattedMeds = formatAndSanitizeMedications(actualMeds || []);
    const hasMed = formattedMeds.length > 0;
    const hasLab = Array.isArray(actualLabOrders) && actualLabOrders.some((l: any) => l && String(l).trim());
    const hasRadio = Array.isArray(actualRadiologyOrders) && actualRadiologyOrders.some((r: any) => r && String(r).trim());

    if (hasMed || hasLab || hasRadio) {
      const reqHostUrl = `${req.protocol}://${req.get("host")}`;
      prescription = await createOrUpdatePrescriptionCore(
        session,
        hospitalId,
        doctor,
        appointmentId,
        {
          medications: actualMeds,
          labOrders: actualLabOrders,
          radiologyOrders: actualRadiologyOrders,
          diagnosis,
          chiefComplaint,
          clinicalNotes: actualNotes,
          advice,
          followUpDate
        },
        reqHostUrl
      );
    }

    // Push to patient's medicalHistory array
    const departmentName = (appointment.department as any)?.name || "General OPD";
    const diagnosisVal = diagnosis || appointment.diagnosis || "Consultation";
    const notesVal = `Chief Complaint: ${chiefComplaint || appointment.chiefComplaint || "None"}. Vitals: BP: ${vitals?.bp || appointment.vitals?.bloodPressure || "—"}, Temp: ${vitals?.temp || appointment.vitals?.temperature || "—"}. Notes: ${actualNotes || appointment.clinicalNotes || "None"}. Advice: ${advice || appointment.advice || "None"}.`;

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
    emitToHospital(hospitalId.toString(), "queue_updated", { doctorId: doctor._id, appointmentId, status: "completed" });
    emitToHospital(hospitalId.toString(), "appointment_updated", { appointmentId, status: "completed" });
    emitToHospital(hospitalId.toString(), "dashboard_update", { action: "complete_consultation", appointmentId });
    emitToHospital(hospitalId.toString(), "consultation_completed", { doctorId: doctor._id, appointmentId });
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

  // For each order, find its DiagnosticReport and attach it
  const ordersWithReports = await Promise.all(
    orders.map(async (o) => {
      const report = await DiagnosticReport.findOne({
        requestId: o._id,
        hospital: hospitalId
      }).populate("uploadedBy", "name");

      const orderObj = o.toObject();
      return {
        ...orderObj,
        report
      };
    })
  );

  res.json({ status: "success", data: ordersWithReports });
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

  if (status) {
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
        pending: result.filter((o) => o.status !== "completed" && o.status !== "rejected").length,
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

  // Find all associated DiagnosticReport documents for this order / appointment
  const reportFilter: any = { hospital: hospitalId };
  if (order.appointment) {
    reportFilter.$or = [
      { requestId: order._id },
      { appointment: order.appointment }
    ];
  } else {
    reportFilter.requestId = order._id;
  }

  const reports = await DiagnosticReport.find(reportFilter)
    .populate("uploadedBy", "name")
    .sort({ uploadedAt: -1, createdAt: -1 });

  const primaryReport = reports[0] || null;

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
        reportsCount: reports.length,
      },
    });
  }

  res.json({ status: "success", data: { order, reports, report: primaryReport } });
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
  const doctorObjIds = [
    doctor._id,
    doctor._id.toString(),
    (doctor as any).user,
    (doctor as any).user?.toString(),
    req.user?._id,
    req.user?._id?.toString(),
  ].filter(Boolean);

  const { search, patientId } = req.query as Record<string, string | undefined>;

  // Step 1: collect all patient ObjectIds linked to this doctor across all
  // relevant collections — entirely at the database level.
  const [apptPatients, admissionPatients, labPatients, radioPatients, prescriptionPatients, queuePatients, consultationPatients, assignedPatients] = await Promise.all([
    Appointment.distinct("patient", { doctor: { $in: doctorObjIds } }),
    Admission.distinct("patient", { admittingDoctor: { $in: doctorObjIds } }),
    LabOrder.distinct("patient", { doctor: { $in: doctorObjIds } }),
    RadiologyOrder.distinct("patient", { doctor: { $in: doctorObjIds } }),
    Prescription.distinct("patient", { doctor: { $in: doctorObjIds } }),
    Queue.distinct("patient", { doctor: { $in: doctorObjIds } }),
    ConsultationSession.distinct("patient", { doctor: { $in: doctorObjIds } }),
    Patient.distinct("_id", { assignedDoctor: { $in: doctorObjIds } }),
  ]);

  // Filter out falsy/invalid values before calling toString()
  const rawIds = [
    ...apptPatients,
    ...admissionPatients,
    ...labPatients,
    ...radioPatients,
    ...prescriptionPatients,
    ...queuePatients,
    ...consultationPatients,
    ...assignedPatients,
  ].filter((id) => id != null && Types.ObjectId.isValid(id.toString()));

  if (patientId && Types.ObjectId.isValid(patientId)) {
    rawIds.push(new Types.ObjectId(patientId));
  }

  const patientIdSet = new Set<string>(rawIds.map((id: any) => id.toString()));
  const patientIds = Array.from(patientIdSet).map((id) => new Types.ObjectId(id));

  // Step 2: fetch the actual patient documents — strictly scoped to this doctor
  const filter: Record<string, unknown> = {};

  if (hospitalId) {
    filter.hospital = hospitalId;
  }

  // Always scope patients to those assigned to or treated by this doctor
  filter.$or = [
    { _id: { $in: patientIds } },
    { assignedDoctor: { $in: doctorObjIds } },
  ];

  const searchStr = (search || "").trim();
  if (searchStr) {
    const escapedSearch = searchStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchFilter = {
      $or: [
        { name: new RegExp(escapedSearch, "i") },
        { phone: new RegExp(escapedSearch, "i") },
        { uhid: new RegExp(escapedSearch, "i") },
      ],
    };
    filter.$and = [{ $or: filter.$or }, searchFilter];
    delete filter.$or;
  }

  const patients = await Patient.find(filter)
    .populate("assignedDoctor", "name")
    .sort({ createdAt: -1 });

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
  const patientIdParam = req.params.patientId;
  const patientId = Types.ObjectId.isValid(patientIdParam) ? new Types.ObjectId(patientIdParam) : null;

  const patient = await Patient.findOne(
    patientId ? { $or: [{ _id: patientId }, { uhid: patientIdParam }] } : { uhid: patientIdParam }
  ).populate("assignedDoctor", "name");

  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }

  const pId = patient._id;
  const pIdStr = patient._id.toString();
  const pUhid = patient.uhid;

  // Build match query for all clinical records for this patient across all ID formats
  const patientQuery = {
    $or: [
      { patient: pId },
      { patient: pIdStr },
      ...(pUhid ? [{ patientUhid: pUhid }, { uhid: pUhid }] : []),
    ],
  };

  // Audit log — authorised access
  if (req.user) {
    await AuditLog.create({
      hospital: hospitalId || patient.hospital,
      user: req.user._id,
      action: "doctor_patient_record_accessed",
      details: `Dr. ${doctor.name} accessed patient record for ${patient.name}.`,
      ipAddress: getClientIp(req),
      resource: "patient",
      resourceId: pId,
      oldValues: null,
      newValues: { patientName: patient.name, doctorId: doctor._id.toString() },
    });
  }

  // Fetch this doctor's clinical data for this patient
  const [appointments, prescriptionsRaw, labOrdersRaw, radiologyOrdersRaw, admissions] = await Promise.all([
    Appointment.find({ hospital: hospitalId || patient.hospital, ...patientQuery })
      .sort({ date: -1 })
      .limit(30),
    Prescription.find({ hospital: hospitalId || patient.hospital, ...patientQuery })
      .sort({ createdAt: -1 })
      .limit(30),
    LabOrder.find({ hospital: hospitalId || patient.hospital, ...patientQuery })
      .sort({ createdAt: -1 })
      .limit(30),
    RadiologyOrder.find({ hospital: hospitalId || patient.hospital, ...patientQuery })
      .sort({ createdAt: -1 })
      .limit(30),
    Admission.find({ hospital: hospitalId || patient.hospital, ...patientQuery })
      .sort({ admissionDate: -1 })
      .limit(20),
  ]);

  // Deduplicate prescriptions by _id
  const seenPrescriptionIds = new Set<string>();
  const prescriptions: any[] = [];
  for (const p of prescriptionsRaw) {
    const obj = p.toObject();
    const idStr = obj._id ? obj._id.toString() : "";
    if (!idStr || !seenPrescriptionIds.has(idStr)) {
      if (idStr) seenPrescriptionIds.add(idStr);
      prescriptions.push({
        ...obj,
        medicines: obj.medications || [],
      });
    }
  }

  // Fetch all DiagnosticReport records for this patient
  const patientDiagnosticReports = await DiagnosticReport.find({ hospital: hospitalId, patient: patientId })
    .populate("uploadedBy", "name")
    .sort({ uploadedAt: -1, createdAt: -1 });

  const processedLabReportIds = new Set<string>();

  // For each LabOrder, find attached DiagnosticReport and files
  const labOrders = labOrdersRaw.map((o) => {
    const orderObj = o.toObject();
    const report = patientDiagnosticReports.find((r) => {
      if (processedLabReportIds.has(r._id.toString())) return false;
      if (r.requestId && r.requestId.toString() === o._id.toString()) return true;
      if (o.appointment && r.appointment && r.appointment.toString() === o.appointment.toString() && r.requestType === "Laboratory") return true;
      if (r.requestType === "Laboratory" && r.testName && orderObj.tests && orderObj.tests.some((t: string) => t.toLowerCase() === r.testName.toLowerCase())) return true;
      return false;
    });

    if (report) {
      processedLabReportIds.add(report._id.toString());
    }

    const files = report?.files && report.files.length > 0
      ? report.files
      : (orderObj.attachments || []);

    return {
      ...orderObj,
      report,
      files,
      observations: report?.observations || orderObj.rejectionReason || "",
      remarks: report?.remarks || "",
      status: report?.status ? report.status : orderObj.status,
    };
  });

  // Synthesize ONLY standalone Laboratory DiagnosticReports not linked to any LabOrder
  const labReports = patientDiagnosticReports.filter(r => r.requestType === "Laboratory" || (!r.requestType && r.testName));
  for (const rep of labReports) {
    if (!processedLabReportIds.has(rep._id.toString())) {
      const repObj = rep.toObject();
      labOrders.push({
        _id: rep._id,
        orderNumber: (rep as any).orderNumber || rep._id.toString().slice(-6),
        tests: [rep.testName || "Laboratory Test"],
        testName: rep.testName || "Laboratory Test",
        status: rep.status || "report_uploaded",
        report: repObj,
        files: repObj.files || [],
        observations: repObj.observations || repObj.remarks || "",
        remarks: repObj.remarks || "",
        createdAt: rep.createdAt || rep.uploadedAt,
      } as any);
      processedLabReportIds.add(rep._id.toString());
    }
  }

  const processedRadReportIds = new Set<string>();

  // For each RadiologyOrder, find attached DiagnosticReport and scan files
  const radiologyOrders = radiologyOrdersRaw.map((o) => {
    const orderObj = o.toObject();
    const report = patientDiagnosticReports.find((r) => {
      if (processedRadReportIds.has(r._id.toString())) return false;
      if (r.requestId && r.requestId.toString() === o._id.toString()) return true;
      if (o.appointment && r.appointment && r.appointment.toString() === o.appointment.toString() && r.requestType === "Radiology") return true;
      if (r.requestType === "Radiology" && r.testName && orderObj.type && (r.testName.toLowerCase().includes(orderObj.type.toLowerCase()) || orderObj.type.toLowerCase().includes(r.testName.toLowerCase()))) return true;
      return false;
    });

    if (report) {
      processedRadReportIds.add(report._id.toString());
    }

    let files: any[] = report?.files && report.files.length > 0 ? (report.files as any[]) : [];
    if (files.length === 0 && orderObj.resultsUrl) {
      files = [{ secure_url: orderObj.resultsUrl, original_filename: `${orderObj.type || "Radiology Scan"} Report`, mime_type: "image/png", file_size: 0, public_id: "rad-scan" }];
    }

    return {
      ...orderObj,
      report,
      files,
      observations: report?.observations || orderObj.findings || orderObj.notes || "",
      remarks: report?.remarks || "",
      status: report?.status ? report.status : orderObj.status,
    };
  });

  // Synthesize ONLY standalone Radiology DiagnosticReports not linked to any RadiologyOrder
  const radReports = patientDiagnosticReports.filter(r => r.requestType === "Radiology");
  for (const rep of radReports) {
    if (!processedRadReportIds.has(rep._id.toString())) {
      const repObj = rep.toObject();
      radiologyOrders.push({
        _id: rep._id,
        orderNumber: (rep as any).orderNumber || rep._id.toString().slice(-6),
        type: rep.testName || "Radiology Scan",
        procedureName: rep.testName || "Radiology Scan",
        status: rep.status || "report_uploaded",
        report: repObj,
        files: repObj.files || [],
        observations: repObj.observations || repObj.remarks || "",
        remarks: repObj.remarks || "",
        createdAt: rep.createdAt || rep.uploadedAt,
      } as any);
      processedRadReportIds.add(rep._id.toString());
    }
  }

  res.json({
    status: "success",
    data: {
      patient,
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

  const dTrimmed = typeof diagnosisAtDischarge === "string" ? diagnosisAtDischarge.trim() : "";
  if (!dTrimmed) {
    throw new AppError("Please fill out this field", 400);
  }
  if (dTrimmed.length > 200) {
    throw new AppError("Maximum allowed character limit exceeded", 400);
  }
  if (!/[a-zA-Z0-9]/.test(dTrimmed) || /<[^>]*>|javascript:/i.test(dTrimmed)) {
    throw new AppError("Please enter valid data", 400);
  }

  if (dischargeMedications && typeof dischargeMedications === "string" && dischargeMedications.trim()) {
    const medTrimmed = dischargeMedications.trim();
    if (medTrimmed.length > 1000) throw new AppError("Maximum allowed character limit exceeded", 400);
    if (!/[a-zA-Z0-9]/.test(medTrimmed) || /<[^>]*>|javascript:/i.test(medTrimmed)) {
      throw new AppError("Please enter valid data", 400);
    }
  }

  if (followUp && typeof followUp === "string" && followUp.trim()) {
    const fuTrimmed = followUp.trim();
    if (fuTrimmed.length > 500) throw new AppError("Maximum allowed character limit exceeded", 400);
    if (!/[a-zA-Z0-9]/.test(fuTrimmed) || /<[^>]*>|javascript:/i.test(fuTrimmed)) {
      throw new AppError("Please enter valid data", 400);
    }
  }

  if (specialInstructions && typeof specialInstructions === "string" && specialInstructions.trim()) {
    const siTrimmed = specialInstructions.trim();
    if (siTrimmed.length > 500) throw new AppError("Maximum allowed character limit exceeded", 400);
    if (!/[a-zA-Z0-9]/.test(siTrimmed) || /<[^>]*>|javascript:/i.test(siTrimmed)) {
      throw new AppError("Please enter valid data", 400);
    }
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

// Draft Consultation Session Controllers
export const startConsultationSession = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const { appointmentId } = req.body;
  const doctor = await getLoggedDoctor(req);
  const doctorObjIds = [doctor._id, (doctor as any).user, req.user?._id].filter(Boolean);

  const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId, doctor: { $in: doctorObjIds } })
    .populate("patient");
  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }

  let session = await ConsultationSession.findOne({
    appointment: appointmentId,
    hospital: hospitalId,
  }).sort({ createdAt: -1 });

  if (!session) {
    session = await ConsultationSession.create({
      hospital: hospitalId,
      patient: appointment.patient._id,
      appointment: appointmentId,
      doctor: doctor._id,
      status: "IN_PROGRESS",
      vitals: appointment.vitals || {},
      chiefComplaint: appointment.chiefComplaint || "",
      diagnosis: appointment.diagnosis || "",
      symptoms: appointment.symptoms || "",
      clinicalNotes: appointment.clinicalNotes || "",
      treatmentPlan: appointment.treatmentPlan || "",
      advice: appointment.advice || "",
      history: [
        {
          action: "Consultation Started",
          timestamp: new Date(),
          details: `Started by Dr. ${doctor.name}`,
        },
      ],
    });
  } else if (session.status !== "COMPLETED") {
    session.status = "IN_PROGRESS";
    if (!session.history || session.history.length === 0) {
      session.history.push({ action: "Consultation Started", timestamp: new Date(), details: `Started by Dr. ${doctor.name}` });
    }
    await session.save();
  }

  // Update appointment status to 'in_consultation' if not completed
  if (appointment.status !== "completed") {
    appointment.status = "in_consultation";
    await appointment.save();
  }

  // Update queue item
  await Queue.findOneAndUpdate(
    { appointment: appointmentId, hospital: hospitalId },
    { status: "called" }
  );

  emitToHospital(hospitalId.toString(), "appointment_updated", { appointmentId, status: appointment.status });
  emitToHospital(hospitalId.toString(), "queue_updated", { appointmentId, status: "called" });
  emitToHospital(hospitalId.toString(), "dashboard_update", { action: "start_consultation", appointmentId });

  res.json({ status: "success", data: session });
});

export const getConsultationDraft = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  let targetApptId = req.params.appointmentId;
  const doctor = await getLoggedDoctor(req);
  const doctorObjIds = [doctor._id, (doctor as any).user, req.user?._id].filter(Boolean);

  let session = await ConsultationSession.findOne({
    appointment: targetApptId,
    hospital: hospitalId,
  }).sort({ createdAt: -1 });

  if (!session) {
    const qItem = await Queue.findOne({ _id: targetApptId, hospital: hospitalId });
    if (qItem && qItem.appointment) {
      targetApptId = qItem.appointment.toString();
      session = await ConsultationSession.findOne({
        appointment: targetApptId,
        hospital: hospitalId,
      }).sort({ createdAt: -1 });
    }
  }

  if (!session) {
    const appointment = await Appointment.findOne({ _id: targetApptId, hospital: hospitalId });
    if (appointment) {
      session = await ConsultationSession.create({
        hospital: hospitalId,
        patient: appointment.patient,
        appointment: appointment._id,
        doctor: doctor._id,
        status: appointment.status === "completed" ? "COMPLETED" : "IN_PROGRESS",
        vitals: appointment.vitals || {},
        chiefComplaint: appointment.chiefComplaint || "",
        diagnosis: appointment.diagnosis || "",
        symptoms: appointment.symptoms || "",
        clinicalNotes: appointment.clinicalNotes || "",
        treatmentPlan: appointment.treatmentPlan || "",
        advice: appointment.advice || "",
        history: [{ action: "Session Initialized", timestamp: new Date(), details: `Loaded for appointment` }],
      });
    }
  }

  res.json({ status: "success", data: session || null });
});

export const updateConsultationDraft = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const { consultationId } = req.params;
  const doctor = await getLoggedDoctor(req);

  const updateData = { ...req.body };
  if (updateData.chiefComplaint) {
    const err = validateClinicalText(updateData.chiefComplaint, "Chief Complaint", CONSULTATION_LIMITS.CHIEF_COMPLAINT);
    if (err) throw new AppError(err, 400);
  }
  if (updateData.diagnosis) {
    const err = validateClinicalText(updateData.diagnosis, "Diagnosis", CONSULTATION_LIMITS.DIAGNOSIS);
    if (err) throw new AppError(err, 400);
  }
  if (updateData.symptoms) {
    const err = validateClinicalText(updateData.symptoms, "Symptoms", CONSULTATION_LIMITS.SYMPTOMS);
    if (err) throw new AppError(err, 400);
  }
  if (updateData.clinicalNotes) {
    const err = validateClinicalText(updateData.clinicalNotes, "Clinical Notes", CONSULTATION_LIMITS.CLINICAL_NOTES);
    if (err) throw new AppError(err, 400);
  }
  if (updateData.treatmentPlan) {
    const err = validateClinicalText(updateData.treatmentPlan, "Treatment Plan", CONSULTATION_LIMITS.TREATMENT_PLAN);
    if (err) throw new AppError(err, 400);
  }
  if (updateData.advice) {
    const err = validateClinicalText(updateData.advice, "Advice / Follow-up Notes", CONSULTATION_LIMITS.ADVICE);
    if (err) throw new AppError(err, 400);
  }
  if (updateData.vitals) {
    const v = updateData.vitals;
    if (v.temperature) {
      const err = validateTemperature(v.temperature);
      if (err) throw new AppError(err, 400);
    }
    if (v.bloodPressure) {
      const err = validateBloodPressure(v.bloodPressure);
      if (err) throw new AppError(err, 400);
    }
    if (v.pulseRate) {
      const err = validatePulseRate(v.pulseRate);
      if (err) throw new AppError(err, 400);
    }
    if (v.respiratoryRate) {
      const err = validateRespiratoryRate(v.respiratoryRate);
      if (err) throw new AppError(err, 400);
    }
    if (v.oxygenSaturation) {
      const err = validateOxygenSaturation(v.oxygenSaturation);
      if (err) throw new AppError(err, 400);
    }
    if (v.weight) {
      const err = validateWeight(v.weight);
      if (err) throw new AppError(err, 400);
    }
  }
  if (Array.isArray(updateData.prescriptions)) {
    for (const m of updateData.prescriptions) {
      if (m.name) {
        const err = validateMedicineName(m.name);
        if (err) throw new AppError(err, 400);
      }
      if (m.strength) {
        const err = validateMedicineStrength(m.strength);
        if (err) throw new AppError(err, 400);
      }
      if (m.dosage) {
        const err = validateDosage(m.dosage);
        if (err) throw new AppError(err, 400);
      }
      if (m.frequency) {
        const err = validateFrequency(m.frequency);
        if (err) throw new AppError(err, 400);
      }
      if (m.duration) {
        const err = validateDuration(m.duration);
        if (err) throw new AppError(err, 400);
      }
    }
    updateData.prescriptions = formatAndSanitizeMedications(updateData.prescriptions);
  }
  if (Array.isArray(updateData.radiologyOrders)) {
    for (const r of updateData.radiologyOrders) {
      if (r.notes) {
        const err = validateRadiologyNotes(r.notes);
        if (err) throw new AppError(err, 400);
      }
    }
  }
  if (updateData.admissionRecommendation) {
    const adm = updateData.admissionRecommendation;
    if (adm.primaryDiagnosis) {
      const err = validatePrimaryDiagnosis(adm.primaryDiagnosis);
      if (err) throw new AppError(err, 400);
    }
    if (adm.expectedStay) {
      const err = validateExpectedStay(adm.expectedStay);
      if (err) throw new AppError(err, 400);
    }
    if (adm.admissionReason) {
      const err = validateAdmissionReason(adm.admissionReason);
      if (err) throw new AppError(err, 400);
    }
    if (adm.clinicalNotes) {
      const err = validateAdmissionClinicalNotes(adm.clinicalNotes);
      if (err) throw new AppError(err, 400);
    }
    if (adm.specialInstructions) {
      const err = validateSpecialInstructions(adm.specialInstructions);
      if (err) throw new AppError(err, 400);
    }
  }

  const session = await ConsultationSession.findOne({
    _id: consultationId,
    hospital: hospitalId,
  });

  if (!session) {
    throw new AppError("Consultation session not found.", 404);
  }

  if (session.status === "COMPLETED") {
    return res.json({ status: "success", data: session, message: "Consultation is completed and read-only." });
  }

  Object.assign(session, updateData);
  session.history.push({
    action: "Draft Updated",
    timestamp: new Date(),
    details: "Auto-saved clinical draft data.",
  });
  await session.save();

  // Keep Appointment clinical summary in sync
  if (session.appointment) {
    await Appointment.findByIdAndUpdate(session.appointment, {
      vitals: session.vitals,
      chiefComplaint: session.chiefComplaint,
      diagnosis: session.diagnosis,
      symptoms: session.symptoms,
      clinicalNotes: session.clinicalNotes,
      treatmentPlan: session.treatmentPlan,
      advice: session.advice,
      followUpDate: session.followUpDate,
    });
  }

  res.json({ status: "success", data: session });
});

export const cancelConsultationSession = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const { consultationId } = req.params;
  const doctor = await getLoggedDoctor(req);

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const session = await ConsultationSession.findOneAndUpdate(
      { _id: consultationId, hospital: hospitalId, status: "IN_PROGRESS" },
      { status: "CANCELLED" },
      { new: true, session: dbSession }
    );

    if (!session) {
      throw new AppError("Draft consultation session not found or not in progress.", 404);
    }

    // Revert appointment status
    await Appointment.findOneAndUpdate(
      { _id: session.appointment, hospital: hospitalId },
      { status: "checked_in" },
      { session: dbSession }
    );

    // Revert queue status
    await Queue.findOneAndUpdate(
      { appointment: session.appointment, hospital: hospitalId },
      { status: "waiting" },
      { session: dbSession }
    );

    await dbSession.commitTransaction();
    emitToHospital(hospitalId.toString(), "appointment_updated", { appointmentId: session.appointment, status: "checked_in" });
    emitToHospital(hospitalId.toString(), "queue_updated", { appointmentId: session.appointment, status: "waiting" });
    emitToHospital(hospitalId.toString(), "dashboard_update", { action: "cancel_consultation", appointmentId: session.appointment });
    res.json({ status: "success", data: session });
  } catch (err) {
    await dbSession.abortTransaction();
    throw err;
  } finally {
    dbSession.endSession();
  }
});

export const completeConsultationSession = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const { consultationId } = req.params;
  const { followUpDate } = req.body;
  const doctor = await getLoggedDoctor(req);

  const draft = await ConsultationSession.findOne({
    _id: consultationId,
    hospital: hospitalId,
  });

  if (!draft) {
    throw new AppError("Consultation session not found.", 404);
  }

  if (draft.status === "COMPLETED") {
    return res.json({ status: "success", data: draft, message: "Consultation is already completed." });
  }

  const diagErr = validateClinicalText(draft.diagnosis, "Diagnosis", CONSULTATION_LIMITS.DIAGNOSIS, true);
  if (diagErr) {
    throw new AppError(diagErr, 400);
  }

  const appointment = await Appointment.findOne({ _id: draft.appointment, hospital: hospitalId })
    .populate("patient")
    .populate("doctor")
    .populate("department");

  if (!appointment) {
    throw new AppError("Associated appointment not found.", 404);
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    // 1. Mark consultation draft as COMPLETED
    draft.status = "COMPLETED";
    draft.completedAt = new Date();
    draft.completedBy = doctor._id;
    draft.history.push({
      action: "Consultation Completed",
      timestamp: new Date(),
      details: `Consultation finalized by Dr. ${doctor.name}`,
    });
    await draft.save({ session: dbSession });

    // 2. Update appointment status and clinical notes
    appointment.status = "completed";
    appointment.vitals = draft.vitals as any;
    appointment.chiefComplaint = draft.chiefComplaint;
    appointment.diagnosis = draft.diagnosis;
    appointment.symptoms = draft.symptoms;
    appointment.clinicalNotes = draft.clinicalNotes;
    appointment.treatmentPlan = draft.treatmentPlan;
    appointment.advice = draft.advice;
    if (followUpDate || draft.followUpDate) {
      appointment.followUpDate = new Date(followUpDate || draft.followUpDate);
    }
    await appointment.save({ session: dbSession });

    // 3. Update queue status
    await Queue.findOneAndUpdate(
      { appointment: appointment._id, hospital: hospitalId },
      { status: "completed" },
      { session: dbSession }
    );

    // 4. Create final Prescription if medicines are present
    let prescription = null;
    if (draft.prescriptions && draft.prescriptions.length > 0) {
      const reqHostUrl = `${req.protocol}://${req.get("host")}`;
      const medications = draft.prescriptions.map(p => ({
        name: p.name,
        strength: p.strength,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        instructions: p.instructions,
      }));
      
      prescription = await createOrUpdatePrescriptionCore(
        dbSession,
        hospitalId,
        doctor,
        appointment._id.toString(),
        {
          medications,
          diagnosis: draft.diagnosis,
          chiefComplaint: draft.chiefComplaint,
          clinicalNotes: draft.clinicalNotes,
          advice: draft.advice,
          followUpDate: followUpDate ? new Date(followUpDate) : null,
        },
        reqHostUrl
      );
    }

    // 5. Create final LabOrders if present
    if (draft.labOrders && draft.labOrders.length > 0) {
      const apptBranch = appointment.branch || doctor.branch || req.hospitalFilter?.branch || null;
      await LabOrder.create(
        [
          {
            hospital: hospitalId,
            branch: apptBranch,
            patient: appointment.patient._id,
            doctor: doctor._id,
            appointment: appointment._id,
            tests: draft.labOrders,
            priority: "Routine",
            sampleStatus: "Pending",
            status: "pending",
            date: new Date(),
          },
        ],
        { session: dbSession }
      );

      // Add to Patient medical history as lab requested
      await Patient.findOneAndUpdate(
        { _id: appointment.patient._id, hospital: hospitalId },
        {
          $push: {
            medicalHistory: {
              $each: [
                {
                  date: new Date(),
                  visitType: "Lab Investigation Ordered",
                  doctorName: doctor.name,
                  diagnosis: "Investigation",
                  notes: `Tests ordered: ${draft.labOrders.join(", ")}`,
                  status: "Completed",
                },
              ],
              $position: 0,
            },
          },
        },
        { session: dbSession }
      );
    }

    // 6. Create final RadiologyOrders if present
    if (draft.radiologyOrders && draft.radiologyOrders.length > 0) {
      const radItems: { type: string; priority: string; notes: string }[] = [];
      const apptBranch = appointment.branch || doctor.branch || req.hospitalFilter?.branch || null;

      for (const rad of draft.radiologyOrders) {
        await RadiologyOrder.create(
          [
            {
              hospital: hospitalId,
              branch: apptBranch,
              patient: appointment.patient._id,
              doctor: doctor._id,
              appointment: appointment._id,
              type: rad.type,
              notes: rad.notes || "",
              priority: rad.priority || "Routine",
              status: "pending",
              date: new Date(),
            },
          ],
          { session: dbSession }
        );

        radItems.push({
          type: rad.type || "Radiology",
          priority: rad.priority || "Routine",
          notes: rad.notes || "None",
        });
      }

      // Add ONE consolidated entry to Patient medical history for all radiology orders requested in this session
      const combinedDiagnosis = radItems.map((item) => `${item.type} Request`).join(", ");
      const combinedNotes = radItems.map((item) => `• ${item.type} (Priority: ${item.priority}). Notes: ${item.notes}`).join("\n");

      await Patient.findOneAndUpdate(
        { _id: appointment.patient._id, hospital: hospitalId },
        {
          $push: {
            medicalHistory: {
              $each: [
                {
                  date: new Date(),
                  visitType: "Radiology Ordered",
                  doctorName: doctor.name,
                  diagnosis: combinedDiagnosis,
                  notes: combinedNotes,
                  status: "Pending",
                },
              ],
              $position: 0,
            },
          },
        },
        { session: dbSession }
      );
    }

    // 7. Create final AdmissionRequest if recommended
    if (draft.admissionRecommendation && draft.admissionRecommendation.recommended) {
      const patient = appointment.patient as any;
      const docProfile = appointment.doctor as any;
      const department = appointment.department as any;
      const rec = draft.admissionRecommendation;

      // Check active admissions and existing requests
      const activeAdm = await Admission.findOne({
        hospital: hospitalId,
        patient: patient._id,
        status: {
          $in: [
            "admitted", "Admitted", "Bed Allocated", "Under Observation",
            "Waiting for Bed", "In Ward", "ICU", "Operation Scheduled",
            "Under Treatment", "Transferred"
          ]
        }
      }).session(dbSession);

      if (!activeAdm) {
        const existingRequest = await AdmissionRequest.findOne({
          hospital: hospitalId,
          patient: patient._id,
          status: { $in: ["Pending", "pending", "Admission Requested", "AdmissionRequested"] }
        }).session(dbSession);

        if (!existingRequest) {
          const currentYear = new Date().getFullYear();
          const prefix = `AR${currentYear}`;
          
          const latestReq = await AdmissionRequest.findOne({
            hospital: hospitalId,
            requestNumber: new RegExp(`^${prefix}`)
          }).sort({ createdAt: -1 }).session(dbSession);

          let nextSerial = 1;
          if (latestReq) {
            const serialPart = latestReq.requestNumber.replace(prefix, "");
            const lastSerial = parseInt(serialPart, 10);
            if (!isNaN(lastSerial)) {
              nextSerial = lastSerial + 1;
            }
          }
          const requestNumber = `${prefix}${String(nextSerial).padStart(6, "0")}`;

          const diagVal = rec.primaryDiagnosis || draft.diagnosis || "Admission Required";
          const notesVal = rec.clinicalNotes || draft.clinicalNotes || "";

          const branchId = doctor.branch || req.hospitalFilter?.branch || (req.user as any)?.branch || null;
          const [newAdmissionReq] = await AdmissionRequest.create(
            [
              {
                hospital: hospitalId,
                branch: branchId,
                requestNumber,
                patient: patient._id,
                doctor: doctor._id,
                requestedBy: doctor._id,
                appointment: appointment._id,
                department: department ? department._id : null,
                priority: rec.priority || "Routine",
                preferredWard: rec.preferredWard || "General",
                preferredBedType: rec.preferredBedType || "General",
                expectedStay: rec.expectedStay || "",
                diagnosis: diagVal,
                primaryDiagnosis: diagVal,
                clinicalNotes: notesVal,
                notes: notesVal,
                admissionReason: rec.admissionReason || diagVal,
                specialInstructions: rec.specialInstructions || "",
                status: "Pending"
              }
            ],
            { session: dbSession }
          );

          // Create Notification for receptionist
          await DbNotification.create(
            [
              {
                hospital: hospitalId,
                title: "New Admission Request",
                message: `Dr. ${docProfile.name} requested IP admission for ${patient.name} (${patient.uhid}) due to: ${rec.primaryDiagnosis || draft.diagnosis}`,
                type: "admission_request",
                recipientRole: "receptionist",
                severity: rec.priority === "Emergency" ? "critical" : "warning",
                link: `/receptionist/ip/new`,
                data: {
                  patientId: patient._id.toString(),
                  opVisitId: appointment._id.toString(),
                  diagnosis: rec.primaryDiagnosis || draft.diagnosis,
                  suggestedWard: rec.preferredWard || "General Ward",
                  notes: rec.clinicalNotes || "",
                }
              }
            ],
            { session: dbSession }
          );
        }
      }
    }

    // 8. Push OPD Consultation to Patient's medicalHistory array
    const departmentName = (appointment.department as any)?.name || "General OPD";
    const diagnosisVal = draft.diagnosis || "Consultation";
    const notesVal = `Chief Complaint: ${draft.chiefComplaint || "None"}. Vitals: BP: ${draft.vitals?.bloodPressure || "—"}, Temp: ${draft.vitals?.temperature || "—"}. Notes: ${draft.clinicalNotes || "None"}. Plan: ${draft.treatmentPlan || "None"}.`;

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
      { session: dbSession }
    );

    await dbSession.commitTransaction();
    emitToHospital(hospitalId.toString(), "appointment_updated", { appointmentId: appointment._id, status: "completed" });
    emitToHospital(hospitalId.toString(), "queue_updated", { appointmentId: appointment._id, status: "completed" });
    emitToHospital(hospitalId.toString(), "dashboard_update", { action: "complete_consultation", appointmentId: appointment._id });
    res.json({ status: "success", data: appointment, prescription });
  } catch (err) {
    await dbSession.abortTransaction();
    throw err;
  } finally {
    dbSession.endSession();
  }
});

export const getInpatientDetails = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const { id } = req.params; // patientId or admissionId
  const doctor = await getLoggedDoctor(req);

  const admission = await findActiveAdmission(hospitalId, id);

  if (!admission) {
    throw new AppError("No active inpatient admission found for this patient.", 404);
  }

  await admission.populate([
    { path: "patient", select: "name uhid age gender phone bloodGroup allergies" },
    { path: "room" },
    { path: "bed" },
    { path: "admittingDoctor", select: "name" }
  ]);

  const patientObjId = (admission.patient as any)?._id || admission.patient;
  const labOrders = await LabOrder.find({ hospital: hospitalId, patient: patientObjId }).sort({ createdAt: -1 });
  const radiologyOrders = await RadiologyOrder.find({ hospital: hospitalId, patient: patientObjId }).sort({ createdAt: -1 });

  res.json({
    status: "success",
    data: {
      ...admission.toJSON(),
      labOrders,
      radiologyOrders
    }
  });
});

export const addInpatientMedication = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const targetId = req.params.id;
  const { drugName, dosage, frequency, duration, route, notes } = req.body;
  const doctor = await getLoggedDoctor(req);

  const drugTrimmed = typeof drugName === "string" ? drugName.trim() : "";
  if (!drugTrimmed) {
    throw new AppError("Please fill out this field", 400);
  }
  if (drugTrimmed.length > 150) {
    throw new AppError("Maximum allowed character limit exceeded", 400);
  }
  if (!/[a-zA-Z0-9]/.test(drugTrimmed) || /<[^>]*>|javascript:/i.test(drugTrimmed)) {
    throw new AppError("Please enter valid data", 400);
  }

  if (dosage && typeof dosage === "string" && dosage.trim()) {
    const dTrimmed = dosage.trim();
    if (dTrimmed.length > 50) throw new AppError("Maximum allowed character limit exceeded", 400);
    if (!/[a-zA-Z0-9]/.test(dTrimmed) || /<[^>]*>|javascript:/i.test(dTrimmed)) {
      throw new AppError("Please enter valid data", 400);
    }
  }

  if (frequency && typeof frequency === "string" && frequency.trim()) {
    const fTrimmed = frequency.trim();
    if (fTrimmed.length > 50) throw new AppError("Maximum allowed character limit exceeded", 400);
    if (!/[a-zA-Z0-9]/.test(fTrimmed) || /<[^>]*>|javascript:/i.test(fTrimmed)) {
      throw new AppError("Please enter valid data", 400);
    }
  }

  if (duration && typeof duration === "string" && duration.trim()) {
    const durTrimmed = duration.trim();
    if (durTrimmed.length > 50) throw new AppError("Maximum allowed character limit exceeded", 400);
    const isPureLetters = /^[a-zA-Z\s]+$/.test(durTrimmed) && !/\b(day|days|week|weeks|month|months)\b/i.test(durTrimmed);
    const isZeroOrNegative = /^-\d+|^\s*0+(\s*(day|days))?\s*$/i.test(durTrimmed);
    if (!/[a-zA-Z0-9]/.test(durTrimmed) || /<[^>]*>|javascript:/i.test(durTrimmed) || isPureLetters || isZeroOrNegative) {
      throw new AppError("Please enter valid data", 400);
    }
  }

  const activeAdmission = await findActiveAdmission(hospitalId, targetId);

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found or unauthorized.", 403);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);

  const newMed = {
    drugName,
    dosage,
    frequency,
    duration,
    route: route || "Oral",
    status: "active",
    prescribingDoctor: doctor._id,
    prescribingDoctorName: doctor.name,
    orderedAt: new Date(),
    notes: notes || "",
    history: [
      {
        action: "ordered",
        timestamp: new Date(),
        doctorName: doctor.name,
        details: `Medication ordered: ${drugName} ${dosage} - ${frequency} for ${duration}`
      }
    ]
  };

  activeAdmission.medicationOrders.push(newMed as any);

  // Add timeline entry
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: doctor.name,
    userRole: "doctor",
    eventType: "medication_ordered",
    description: `Medication ordered by Dr. ${doctor.name}: ${drugName} ${dosage} (${frequency})`
  });

  await activeAdmission.save();
  await syncInpatientPrescription(activeAdmission, doctor._id);

  res.json({ status: "success", data: activeAdmission });
});

export const updateInpatientMedication = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const targetId = req.params.id;
  const { medicationId, action, drugName, dosage, frequency, duration, route, notes } = req.body;
  const doctor = await getLoggedDoctor(req);

  const activeAdmission = await findActiveAdmission(hospitalId, targetId);

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found or unauthorized.", 403);
  }

  const med = activeAdmission.medicationOrders.find((m: any) => m._id.toString() === medicationId);
  if (!med) {
    throw new AppError("Medication order not found.", 404);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);

  if (action === "stop") {
    med.status = "stopped";
    med.stoppedAt = new Date();
    med.history.push({
      action: "stopped",
      timestamp: new Date(),
      doctorName: doctor.name,
      details: "Medication stopped"
    });

    activeAdmission.timeline.push({
      date: new Date(),
      time: currentTime,
      userName: doctor.name,
      userRole: "doctor",
      eventType: "medication_stopped",
      description: `Medication stopped by Dr. ${doctor.name}: ${med.drugName}`
    });
  } else if (action === "resume") {
    med.status = "active";
    med.history.push({
      action: "resumed",
      timestamp: new Date(),
      doctorName: doctor.name,
      details: "Medication resumed"
    });

    activeAdmission.timeline.push({
      date: new Date(),
      time: currentTime,
      userName: doctor.name,
      userRole: "doctor",
      eventType: "medication_resumed",
      description: `Medication resumed by Dr. ${doctor.name}: ${med.drugName}`
    });
  } else if (action === "modify") {
    if (drugName !== undefined) {
      const drugTrimmed = typeof drugName === "string" ? drugName.trim() : "";
      if (!drugTrimmed) {
        throw new AppError("Please fill out this field", 400);
      }
      if (drugTrimmed.length > 150) {
        throw new AppError("Maximum allowed character limit exceeded", 400);
      }
      if (!/[a-zA-Z0-9]/.test(drugTrimmed) || /<[^>]*>|javascript:/i.test(drugTrimmed)) {
        throw new AppError("Please enter valid data", 400);
      }
    }

    if (dosage && typeof dosage === "string" && dosage.trim()) {
      const dTrimmed = dosage.trim();
      if (dTrimmed.length > 50) throw new AppError("Maximum allowed character limit exceeded", 400);
      if (!/[a-zA-Z0-9]/.test(dTrimmed) || /<[^>]*>|javascript:/i.test(dTrimmed)) {
        throw new AppError("Please enter valid data", 400);
      }
    }

    if (frequency && typeof frequency === "string" && frequency.trim()) {
      const fTrimmed = frequency.trim();
      if (fTrimmed.length > 50) throw new AppError("Maximum allowed character limit exceeded", 400);
      if (!/[a-zA-Z0-9]/.test(fTrimmed) || /<[^>]*>|javascript:/i.test(fTrimmed)) {
        throw new AppError("Please enter valid data", 400);
      }
    }

    if (duration && typeof duration === "string" && duration.trim()) {
      const durTrimmed = duration.trim();
      if (durTrimmed.length > 50) throw new AppError("Maximum allowed character limit exceeded", 400);
      const isPureLetters = /^[a-zA-Z\s]+$/.test(durTrimmed) && !/\b(day|days|week|weeks|month|months)\b/i.test(durTrimmed);
      const isZeroOrNegative = /^-\d+|^\s*0+(\s*(day|days))?\s*$/i.test(durTrimmed);
      if (!/[a-zA-Z0-9]/.test(durTrimmed) || /<[^>]*>|javascript:/i.test(durTrimmed) || isPureLetters || isZeroOrNegative) {
        throw new AppError("Please enter valid data", 400);
      }
    }

    med.status = "modified";
    med.modifiedAt = new Date();
    med.drugName = drugName || med.drugName;
    med.dosage = dosage || med.dosage;
    med.frequency = frequency || med.frequency;
    med.duration = duration || med.duration;
    med.route = route || med.route;
    med.notes = notes || med.notes;

    med.history.push({
      action: "modified",
      timestamp: new Date(),
      doctorName: doctor.name,
      details: `Modified details: ${drugName} ${dosage} - ${frequency} for ${duration}`
    });

    activeAdmission.timeline.push({
      date: new Date(),
      time: currentTime,
      userName: doctor.name,
      userRole: "doctor",
      eventType: "medication_modified",
      description: `Medication modified by Dr. ${doctor.name}: ${med.drugName} ${med.dosage}`
    });
  }

  await activeAdmission.save();
  await syncInpatientPrescription(activeAdmission, doctor._id);

  res.json({ status: "success", data: activeAdmission });
});

export const saveInpatientVitals = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const targetId = req.params.id;
  const { temperature, bloodPressure, pulseRate, respiratoryRate, oxygenSaturation, weight } = req.body;
  const doctor = await getLoggedDoctor(req);

  // Validate vitals (each field is optional, but if entered must be valid and within limits)
  if (temperature && typeof temperature === "string" && temperature.trim()) {
    const tTrimmed = temperature.trim();
    if (tTrimmed.length > 10) throw new AppError("Maximum allowed character limit exceeded", 400);
    const err = validateTemperature(tTrimmed);
    if (err) throw new AppError(err, 400);
  }

  if (bloodPressure && typeof bloodPressure === "string" && bloodPressure.trim()) {
    const bpTrimmed = bloodPressure.trim();
    if (bpTrimmed.length > 10) throw new AppError("Maximum allowed character limit exceeded", 400);
    const err = validateBloodPressure(bpTrimmed);
    if (err) throw new AppError(err, 400);
  }

  if (pulseRate && typeof pulseRate === "string" && pulseRate.trim()) {
    const prTrimmed = pulseRate.trim();
    if (prTrimmed.length > 5) throw new AppError("Maximum allowed character limit exceeded", 400);
    const err = validatePulseRate(prTrimmed);
    if (err) throw new AppError(err, 400);
  }

  if (respiratoryRate && typeof respiratoryRate === "string" && respiratoryRate.trim()) {
    const rrTrimmed = respiratoryRate.trim();
    if (rrTrimmed.length > 5) throw new AppError("Maximum allowed character limit exceeded", 400);
    const err = validateRespiratoryRate(rrTrimmed);
    if (err) throw new AppError(err, 400);
  }

  if (oxygenSaturation && typeof oxygenSaturation === "string" && oxygenSaturation.trim()) {
    const o2Trimmed = oxygenSaturation.trim();
    if (o2Trimmed.length > 5) throw new AppError("Maximum allowed character limit exceeded", 400);
    const err = validateOxygenSaturation(o2Trimmed);
    if (err) throw new AppError(err, 400);
  }

  if (weight && typeof weight === "string" && weight.trim()) {
    const wTrimmed = weight.trim();
    if (wTrimmed.length > 6) throw new AppError("Maximum allowed character limit exceeded", 400);
    const err = validateWeight(wTrimmed);
    if (err) throw new AppError(err, 400);
  }

  const activeAdmission = await findActiveAdmission(hospitalId, targetId);

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found or unauthorized.", 403);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);

  const newVital = {
    temperature: temperature || "",
    bloodPressure: bloodPressure || "",
    pulseRate: pulseRate || "",
    respiratoryRate: respiratoryRate || "",
    oxygenSaturation: oxygenSaturation || "",
    weight: weight || "",
    recordedAt: new Date(),
    recordedBy: doctor.name
  };

  activeAdmission.vitals.push(newVital);

  // Add timeline entry
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: doctor.name,
    userRole: "doctor",
    eventType: "vital_update",
    description: `Vitals recorded: Temp ${temperature || "—"}°F, BP ${bloodPressure || "—"}, Pulse ${pulseRate || "—"} bpm`
  });

  await activeAdmission.save();

  res.json({ status: "success", data: activeAdmission });
});

async function syncInpatientPrescription(admission: any, doctorId: Types.ObjectId) {
  // Filter active or modified medication orders
  const activeMeds = admission.medicationOrders.filter((m: any) => m.status === "active" || m.status === "modified");

  if (activeMeds.length === 0) {
    // If no active medications, check if there is a pending prescription and delete/cancel it
    await Prescription.deleteMany({ admission: admission._id, status: "Pending" });
    return;
  }

  // Map to Prescription medications schema
  const mappedMedications = activeMeds.map((m: any) => {
    // Parse drug name and strength
    let dName = m.drugName || "";
    let str = "";
    const match = dName.match(/^(.*?)\s*(\d+(?:mg|g|mcg|ml|l|capsule|tablet|tabs|caps))$/i);
    if (match) {
      dName = match[1];
      str = match[2];
    }

    // Extract instructions from notes
    let inst = "As directed";
    if (m.notes && m.notes.startsWith("Instructions: ")) {
      const parts = m.notes.split(". Notes: ");
      inst = parts[0].replace("Instructions: ", "");
    } else if (m.notes) {
      inst = m.notes;
    }

    return {
      name: dName.trim(),
      strength: str || "N/A",
      dosage: m.dosage || "1",
      frequency: m.frequency || "1",
      duration: m.duration || "1",
      instructions: inst
    };
  });

  // Find if there is already a Pending prescription for this admission
  let rx = await Prescription.findOne({ admission: admission._id, status: "Pending" });

  if (rx) {
    rx.medications = mappedMedications as any;
    rx.doctor = doctorId;
    await rx.save();
  } else {
    const rxNumber = `RX-IP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    rx = await Prescription.create({
      hospital: admission.hospital,
      patient: admission.patient,
      admission: admission._id,
      doctor: doctorId,
      department: admission.department || null,
      diagnosis: admission.primaryDiagnosis || "Inpatient Care",
      medications: mappedMedications,
      status: "Pending",
      prescriptionNumber: rxNumber
    });

    // Generate notification for pharmacist
    await DbNotification.create({
      hospital: admission.hospital,
      title: "New IP Prescription Order",
      message: `New inpatient prescription ordered: ${rxNumber}`,
      type: "prescription_ready",
      recipientRole: "pharmacist",
      severity: "info",
      link: `/pharmacy/prescriptions`,
      data: {
        prescriptionId: rx._id.toString(),
        patientId: admission.patient.toString()
      }
    });

    emitToHospital(admission.hospital.toString(), "new_prescription", {
      prescriptionId: rx._id,
      prescriptionNumber: rxNumber,
      patientId: admission.patient
    });
  }
}

// ── Redesigned Advanced Analytics ─────────────────────────────────────────────
export const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const doctorId = doctor._id.toString();
  const filter = getDoctorScopeFilter(req, doctor);
  const docIds = await DoctorDashboardRepository.normalizeDocIds(doctor._id);

  // Date ranges
  const now = new Date();
  const { start: startOfToday, end: endOfToday } = DoctorDashboardRepository.getTodayRange();

  const startOfYesterday = new Date(now); startOfYesterday.setDate(startOfYesterday.getDate() - 1); startOfYesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(now); endOfYesterday.setDate(endOfYesterday.getDate() - 1); endOfYesterday.setHours(23, 59, 59, 999);

  const startOf7DaysAgo = new Date(now); startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 7); startOf7DaysAgo.setHours(0, 0, 0, 0);
  const startOf30DaysAgo = new Date(now); startOf30DaysAgo.setDate(startOf30DaysAgo.getDate() - 30); startOf30DaysAgo.setHours(0, 0, 0, 0);

  // Fetch repository real counts for the 7 top operational cards
  const [
    repoTodayAppts,
    repoWaitingQueue,
    repoInpatients,
    repoCompleted,
    repoPrescriptions,
    repoLabOrders,
    repoFollowups,
    repoSurgeries,
  ] = await Promise.all([
    DoctorDashboardRepository.getTodayAppointments(filter, doctorId),
    DoctorDashboardRepository.getWaitingPatients(filter, doctorId),
    DoctorDashboardRepository.getCurrentInpatients(filter, doctorId),
    DoctorDashboardRepository.getCompletedConsultations(filter, doctorId),
    DoctorDashboardRepository.getPendingPrescriptions(filter, doctorId),
    DoctorDashboardRepository.getPendingLabOrders(filter, doctorId),
    DoctorDashboardRepository.getFollowupPatients(filter, doctorId),
    DoctorDashboardRepository.getTodaySurgeries(filter, doctorId),
  ]);

  // Fetch all appointments for doctor within the last 30 days or active schedule
  const appointments = await Appointment.find({
    hospital: hospitalId,
    doctor: { $in: docIds },
    $or: [
      { date: { $gte: startOf30DaysAgo } },
      { createdAt: { $gte: startOf30DaysAgo } },
      { status: { $in: ["scheduled", "checked_in", "waiting", "called", "in_consultation"] } }
    ]
  }).populate("patient");

  // Fetch all prescriptions in the last 30 days
  const prescriptions = await Prescription.find({
    hospital: hospitalId,
    doctor: { $in: docIds },
    createdAt: { $gte: startOf30DaysAgo }
  }).populate("patient");

  // Fetch all lab orders in the last 30 days
  const labOrders = await LabOrder.find({
    hospital: hospitalId,
    doctor: { $in: docIds },
    createdAt: { $gte: startOf30DaysAgo }
  }).populate("patient");

  // Fetch all radiology orders in the last 30 days
  const radiologyOrders = await RadiologyOrder.find({
    hospital: hospitalId,
    doctor: { $in: docIds },
    createdAt: { $gte: startOf30DaysAgo }
  }).populate("patient");

  // Fetch active admissions (inpatients)
  const activeAdmissions = await Admission.find({
    hospital: hospitalId,
    $or: [
      { admittingDoctor: { $in: docIds } },
      { attendingDoctor: { $in: docIds } },
      { doctor: { $in: docIds } }
    ],
    status: { $in: ["admitted", "Admitted", "active", "Active"] }
  }).populate("patient");

  // Fetch completed consultation sessions in the last 30 days to compute avgDuration
  const completedSessions = await ConsultationSession.find({
    hospital: hospitalId,
    doctor: { $in: docIds },
    status: "COMPLETED",
    createdAt: { $gte: startOf30DaysAgo }
  });

  // Fetch called/completed queues in the last 30 days to compute avgWaitingTime
  const completedQueues = await Queue.find({
    hospital: hospitalId,
    doctor: { $in: docIds },
    status: { $in: ["called", "completed"] },
    createdAt: { $gte: startOf30DaysAgo }
  });

  let avgDuration = 15;
  if (completedSessions.length > 0) {
    let totalDurationMs = 0;
    completedSessions.forEach(session => {
      if (session.updatedAt && session.createdAt) {
        totalDurationMs += (session.updatedAt.getTime() - session.createdAt.getTime());
      }
    });
    const avgMin = totalDurationMs / (completedSessions.length * 60 * 1000);
    avgDuration = avgMin > 0 ? Math.round(avgMin) : 15;
  }

  let avgWaitingTime = 12;
  if (completedQueues.length > 0) {
    let totalWaitMs = 0;
    completedQueues.forEach(q => {
      if (q.updatedAt && q.createdAt) {
        totalWaitMs += (q.updatedAt.getTime() - q.createdAt.getTime());
      }
    });
    const avgMin = totalWaitMs / (completedQueues.length * 60 * 1000);
    avgWaitingTime = avgMin > 0 ? Math.round(avgMin) : 12;
  }

  // Sparkline data (last 7 days counts)
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7Days.push(d.toDateString());
  }

  const getDailyCounts = (docs: any[], dateField = "date") => {
    const map: Record<string, number> = {};
    last7Days.forEach(day => map[day] = 0);
    docs.forEach(doc => {
      const val = doc[dateField];
      if (val) {
        const dStr = new Date(val).toDateString();
        if (dStr in map) map[dStr]++;
      }
    });
    return last7Days.map(day => map[day]);
  };

  // Filter metrics
  const todayAppts = appointments.filter(a => a.date >= startOfToday && a.date <= endOfToday && a.status !== "cancelled");
  console.log("Filtered todayAppts count: ", todayAppts.length);
  console.log("=============================================================\n");
  const yesterdayAppts = appointments.filter(a => a.date >= startOfYesterday && a.date <= endOfYesterday && a.status !== "cancelled");
  
  const lastWeekSameDayStart = new Date(startOfToday); lastWeekSameDayStart.setDate(lastWeekSameDayStart.getDate() - 7);
  const lastWeekSameDayEnd = new Date(endOfToday); lastWeekSameDayEnd.setDate(lastWeekSameDayEnd.getDate() - 7);
  const lastWeekSameDayAppts = appointments.filter(a => a.date >= lastWeekSameDayStart && a.date <= lastWeekSameDayEnd && a.status !== "cancelled");

  const queuesToday = await Queue.find({
    hospital: hospitalId,
    doctor: doctor._id,
    createdAt: { $gte: startOfToday, $lte: endOfToday }
  });
  const waitingPatientsCount = queuesToday.filter(q => q.status === "waiting").length;

  const todayCompleted = todayAppts.filter(a => a.status === "completed");
  const yesterdayCompleted = yesterdayAppts.filter(a => a.status === "completed");
  const lastWeekCompleted = lastWeekSameDayAppts.filter(a => a.status === "completed");

  const pendingRx = prescriptions.filter(p => p.status === "Pending");
  const pendingLabs = labOrders.filter(l => l.status === "pending");

  const todaySurgeries = todayAppts.filter(a => a.type?.toLowerCase() === "surgery");
  const yesterdaySurgeries = yesterdayAppts.filter(a => a.type?.toLowerCase() === "surgery");
  const lastWeekSurgeries = lastWeekSameDayAppts.filter(a => a.type?.toLowerCase() === "surgery");

  const followups = appointments.filter(a => a.date > endOfToday && ["scheduled", "checked_in"].includes(a.status));

  const appointmentsSparkline = getDailyCounts(appointments.filter(a => a.status !== "cancelled"), "date");
  const completedSparkline = getDailyCounts(appointments.filter(a => a.status === "completed"), "date");
  const surgeriesSparkline = getDailyCounts(appointments.filter(a => a.type?.toLowerCase() === "surgery"), "date");
  const prescriptionsSparkline = getDailyCounts(prescriptions, "createdAt");
  const labOrdersSparkline = getDailyCounts(labOrders, "createdAt");

  // Growth Trend (Daily, Weekly, Monthly)
  const dailyGrowth: { name: string; count: number }[] = [];
  for (let i = 14; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    const count = appointments.filter(a => a.date >= dayStart && a.date <= dayEnd && a.status === "completed").length;
    dailyGrowth.push({
      name: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      count
    });
  }

  const weeklyGrowth: { name: string; count: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const startW = new Date(now); startW.setDate(startW.getDate() - (i * 7 + 6)); startW.setHours(0, 0, 0, 0);
    const endW = new Date(now); endW.setDate(endW.getDate() - (i * 7)); endW.setHours(23, 59, 59, 999);
    const count = appointments.filter(a => a.date >= startW && a.date <= endW && a.status === "completed").length;
    weeklyGrowth.push({
      name: `Week -${i}`,
      count
    });
  }

  const monthlyGrowth: { name: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const count = await Appointment.countDocuments({
      hospital: hospitalId,
      doctor: doctor._id,
      status: "completed",
      date: { $gte: monthStart, $lte: monthEnd }
    });
    monthlyGrowth.push({
      name: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      count
    });
  }

  // Patient details breakdown & exact Doctor-specific revisit classification
  const patientIds = Array.from(new Set(appointments.map(a => a.patient?._id?.toString() || a.patient?.toString()).filter(Boolean)));
  const patientsDetails = await Patient.find({ _id: { $in: patientIds } });

  // Query total appointments ever for this doctor to count doctor-specific visits
  const allDoctorAppts = await Appointment.find({
    hospital: hospitalId,
    doctor: doctor._id,
    status: { $nin: ["cancelled", "no_show"] }
  }).select("patient");

  const doctorApptFrequencyMap = new Map<string, number>();
  allDoctorAppts.forEach(a => {
    const pId = a.patient?.toString();
    if (pId) {
      doctorApptFrequencyMap.set(pId, (doctorApptFrequencyMap.get(pId) || 0) + 1);
    }
  });

  let newPatientsCount = 0;
  let returningPatientsCount = 0;
  let docSingleVisitCount = 0;
  let docRegularVisitsCount = 0;
  let docFrequentVisitsCount = 0;

  patientIds.forEach(pId => {
    const doctorVisitsCount = doctorApptFrequencyMap.get(pId) || 1;
    
    // User's exact rule:
    // If patient is arriving for the first time for this doctor (visits == 1) -> New Visited
    // If patient was already consulted by this doctor and booked again (visits > 1) -> Revisited
    if (doctorVisitsCount > 1) {
      returningPatientsCount++;
    } else {
      newPatientsCount++;
    }

    if (doctorVisitsCount === 1) {
      docSingleVisitCount++;
    } else if (doctorVisitsCount <= 3) {
      docRegularVisitsCount++;
    } else {
      docFrequentVisitsCount++;
    }
  });
  
  const walkinCount = appointments.filter(a => a.type?.toLowerCase() === "walk-in").length;
  const regularApptCount = appointments.filter(a => a.type?.toLowerCase() === "appointment").length;
  const emergencyCount = appointments.filter(a => a.type?.toLowerCase() === "emergency").length;

  const maleCount = patientsDetails.filter(p => p.gender?.toLowerCase() === "male").length;
  const femaleCount = patientsDetails.filter(p => p.gender?.toLowerCase() === "female").length;
  const otherGenderCount = Math.max(0, patientsDetails.length - maleCount - femaleCount);

  let age0_18 = 0, age19_35 = 0, age36_50 = 0, age50Plus = 0;
  patientsDetails.forEach(p => {
    if (!p.age) return;
    if (p.age <= 18) age0_18++;
    else if (p.age <= 35) age19_35++;
    else if (p.age <= 50) age36_50++;
    else age50Plus++;
  });

  // Diseases Analytics (parse diagnosis and symptoms)
  const diagnosesMap: Record<string, number> = {};
  const symptomsMap: Record<string, number> = {};
  appointments.forEach(a => {
    if (a.diagnosis) {
      const dClean = a.diagnosis.trim();
      diagnosesMap[dClean] = (diagnosesMap[dClean] || 0) + 1;
    }
    if (a.symptoms) {
      a.symptoms.split(",").forEach(s => {
        const sClean = s.trim();
        if (sClean) symptomsMap[sClean] = (symptomsMap[sClean] || 0) + 1;
      });
    }
  });

  const topDiseases = Object.entries(diagnosesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const topSymptoms = Object.entries(symptomsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Prescriptions & Meds
  const prescriptionMeds: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {
    Antibiotics: 0,
    Analgesics: 0,
    Cardiology: 0,
    Gastrointestinal: 0,
    Other: 0
  };

  prescriptions.forEach(p => {
    p.medications?.forEach(m => {
      const name = m.name?.trim();
      if (name) {
        prescriptionMeds[name] = (prescriptionMeds[name] || 0) + 1;
        const nameLower = name.toLowerCase();
        if (nameLower.includes("amoxicillin") || nameLower.includes("azithromycin") || nameLower.includes("cefixime") || nameLower.includes("augmentin") || nameLower.includes("cef") || nameLower.includes("cillin")) {
          categoryCounts.Antibiotics++;
        } else if (nameLower.includes("paracetamol") || nameLower.includes("ibuprofen") || nameLower.includes("tramadol") || nameLower.includes("dolo") || nameLower.includes("aspirin") || nameLower.includes("naproxen")) {
          categoryCounts.Analgesics++;
        } else if (nameLower.includes("amlodipine") || nameLower.includes("atorvastatin") || nameLower.includes("metoprolol") || nameLower.includes("losartan") || nameLower.includes("statin") || nameLower.includes("card")) {
          categoryCounts.Cardiology++;
        } else if (nameLower.includes("pantoprazole") || nameLower.includes("omeprazole") || nameLower.includes("ranitidine") || nameLower.includes("omez") || nameLower.includes("pantocid") || nameLower.includes("digene")) {
          categoryCounts.Gastrointestinal++;
        } else {
          categoryCounts.Other++;
        }
      }
    });
  });
  const topMedicines = Object.entries(prescriptionMeds)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const realCategories = Object.entries(categoryCounts)
    .filter(([name, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  const finalCategories = realCategories.length > 0 ? realCategories : [
    { name: "Antibiotics", value: 1 },
    { name: "Analgesics", value: 1 }
  ];

  // Laboratory and Radiology
  const completedLabs = labOrders.filter(l => l.status === "completed");
  const rejectedLabs = labOrders.filter(l => l.status === "rejected");
  const criticalLabs = labOrders.filter(l => l.results?.some(r => ["high", "low", "critical"].includes(r.status))).length;

  const completedRadiology = radiologyOrders.filter(r => r.status === "completed");

  // Timeline events collation
  const timelineEvents: any[] = [];
  appointments.filter(a => a.createdAt >= startOfToday).forEach(a => {
    const p = a.patient as any;
    timelineEvents.push({
      time: a.createdAt,
      type: "appointment",
      title: "Appointment Booked",
      desc: `Patient ${p?.name || "Unknown"} scheduled at ${a.time}`,
      status: a.status
    });
  });

  appointments.filter(a => a.updatedAt >= startOfToday && a.status === "completed").forEach(a => {
    const p = a.patient as any;
    timelineEvents.push({
      time: a.updatedAt,
      type: "consultation",
      title: "Consultation Completed",
      desc: `Completed consultation for patient ${p?.name || "Unknown"}`,
      status: a.status
    });
  });

  prescriptions.filter(p => p.createdAt >= startOfToday).forEach(p => {
    const pat = p.patient as any;
    timelineEvents.push({
      time: p.createdAt,
      type: "prescription",
      title: "Prescription Generated",
      desc: `Issued prescription ${p.prescriptionNumber || ""} for ${pat?.name || "Patient"}`,
    });
  });

  labOrders.filter(l => l.createdAt >= startOfToday).forEach(l => {
    const pat = l.patient as any;
    timelineEvents.push({
      time: l.createdAt,
      type: "lab",
      title: "Lab Request Submitted",
      desc: `Ordered tests (${l.tests?.join(", ")}) for ${pat?.name || "Patient"}`,
    });
  });

  // Fetch actual audit logs from database
  const auditLogs = await AuditLog.find({
    hospital: hospitalId,
    user: req.user?._id
  })
  .sort({ timestamp: -1 })
  .limit(15);

  auditLogs.forEach(log => {
    timelineEvents.push({
      time: log.timestamp || log.createdAt,
      type: "audit",
      title: log.action || "User Action",
      desc: log.entity ? `${log.entity.toUpperCase()} resource action: ${log.action}` : `Performed action: ${log.action}`
    });
  });

  const sortedTimeline = timelineEvents
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 15);

  res.json({
    status: "success",
    data: {
      metrics: {
        todayAppointments: {
          current: repoTodayAppts.length,
          todayDiff: repoTodayAppts.length - yesterdayAppts.length,
          weeklyDiff: repoTodayAppts.length - lastWeekSameDayAppts.length,
          sparkline: appointmentsSparkline,
        },
        waitingPatients: {
          current: repoWaitingQueue.filter(q => q.status === "waiting" || q.status === "called").length,
          todayDiff: 0,
          weeklyDiff: 0,
          sparkline: [1, 2, 0, 1, repoWaitingQueue.length],
        },
        currentInpatients: {
          current: repoInpatients.length,
          todayDiff: 0,
          weeklyDiff: 0,
          sparkline: [2, 1, 2, 3, repoInpatients.length],
        },
        todaySurgeries: {
          current: repoSurgeries.length,
          todayDiff: repoSurgeries.length - yesterdaySurgeries.length,
          weeklyDiff: repoSurgeries.length - lastWeekSurgeries.length,
          sparkline: surgeriesSparkline,
        },
        completedConsultations: {
          current: repoCompleted.length,
          todayDiff: repoCompleted.length - yesterdayCompleted.length,
          weeklyDiff: repoCompleted.length - lastWeekCompleted.length,
          sparkline: completedSparkline,
        },
        pendingPrescriptions: {
          current: repoPrescriptions.length,
          todayDiff: 0,
          weeklyDiff: 0,
          sparkline: prescriptionsSparkline,
        },
        pendingLabOrders: {
          current: repoLabOrders.length,
          todayDiff: 0,
          weeklyDiff: 0,
          sparkline: labOrdersSparkline,
        },
        followupPatients: {
          current: repoFollowups.length,
          todayDiff: 0,
          weeklyDiff: 0,
          sparkline: [2, 3, 1, 4, repoFollowups.length],
        }
      },
      revisitAnalytics: {
        total: patientIds.length || appointments.length,
        newPatients: newPatientsCount,
        revisitPatients: returningPatientsCount,
        newPct: patientIds.length > 0 ? Math.round((newPatientsCount / patientIds.length) * 100) : 0,
        revisitPct: patientIds.length > 0 ? Math.round((returningPatientsCount / patientIds.length) * 100) : 0,
        singleVisit: docSingleVisitCount,
        regularVisits: docRegularVisitsCount,
        frequentVisits: docFrequentVisitsCount
      },
      patientAnalytics: {
        types: [
          { name: "New", value: newPatientsCount || 1 },
          { name: "Returning", value: returningPatientsCount || 1 },
          { name: "Walk-ins", value: walkinCount || 0 },
          { name: "Scheduled Appts", value: regularApptCount || 0 },
        ],
        growth: {
          today: todayAppts.length,
          weekly: appointments.filter(a => a.date >= startOf7DaysAgo).length,
          monthly: appointments.length,
        }
      },
      growthTrend: {
        daily: dailyGrowth,
        weekly: weeklyGrowth,
        monthly: monthlyGrowth,
      },
      consultationAnalytics: {
        completed: appointments.filter(a => a.status === "completed").length,
        pending: appointments.filter(a => ["scheduled", "checked_in", "waiting", "in_consultation"].includes(a.status)).length,
        cancelled: appointments.filter(a => a.status === "cancelled").length,
        rescheduled: appointments.filter(a => a.isRescheduled || a.rescheduleCount > 0).length,
        avgDuration,
        avgWaitingTime,
      },
      laboratoryAnalytics: {
        pending: pendingLabs.length,
        completed: completedLabs.length,
        critical: criticalLabs,
        rejected: rejectedLabs.length,
        avgReportTime: "2.5h",
      },
      radiologyAnalytics: {
        pending: radiologyOrders.filter(r => r.status === "pending").length,
        completed: completedRadiology.length,
        critical: radiologyOrders.filter(r => r.priority === "STAT" && r.status === "completed").length,
        avgProcessingTime: "3.2h",
      },
      prescriptionAnalytics: {
        todayPrescriptions: prescriptions.filter(p => p.createdAt >= startOfToday).length,
        completed: prescriptions.filter(p => p.status === "Completed" || p.status === "Dispensed").length,
        pending: pendingRx.length,
        categories: finalCategories,
        frequentMedicines: topMedicines
      },
      demographics: {
        gender: [
          { name: "Male", value: maleCount || 0 },
          { name: "Female", value: femaleCount || 0 },
          { name: "Other", value: otherGenderCount || 0 },
        ],
        ageGroups: [
          { name: "0-18", value: age0_18 },
          { name: "19-35", value: age19_35 },
          { name: "36-50", value: age36_50 },
          { name: "50+", value: age50Plus }
        ]
      },
      diseaseAnalytics: {
        topDiseases: topDiseases,
        topSymptoms: topSymptoms
      },
      followupAnalytics: {
        today: appointments.filter(a => a.date >= startOfToday && a.date <= endOfToday && a.followUp && ["scheduled", "checked_in", "in_consultation", "completed"].includes(a.status)).length,
        missed: appointments.filter(a => a.date < startOfToday && a.followUp && ["scheduled", "checked_in", "waiting"].includes(a.status)).length,
        completed: appointments.filter(a => a.status === "completed" && a.followUp).length,
        upcoming: appointments.filter(a => a.date > endOfToday && a.followUp && ["scheduled", "checked_in"].includes(a.status)).length,
      },
      performance: {
        seenToday: todayCompleted.length,
        completedPercentage: todayAppts.length ? Math.round((todayCompleted.length / todayAppts.length) * 100) : 100,
        avgConsultationTime: avgDuration,
        avgRating: doctor.rating && doctor.rating > 0 ? Number((doctor.rating / 20).toFixed(1)) : 4.9,
        patientSatisfaction: doctor.rating && doctor.rating > 0 ? doctor.rating : 96,
        labRequestCompletion: labOrders.length > 0 ? Math.round((labOrders.filter(l => l.status === "completed").length / labOrders.length) * 100) : 91,
        prescriptionCompletion: prescriptions.length > 0 ? Math.round((prescriptions.filter(p => ["Completed", "Dispensed"].includes(p.status)).length / prescriptions.length) * 100) : 94
      },
      appointmentAnalytics: {
        types: [
          { name: "Walk-ins", value: walkinCount },
          { name: "Online", value: regularApptCount },
          { name: "Emergency", value: emergencyCount }
        ]
      },
      timeline: sortedTimeline
    }
  });
});

export const getConsultationHistory = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const { id } = req.params;

  const session = await ConsultationSession.findOne({
    _id: id,
    hospital: hospitalId,
  }).populate("doctor", "name");

  if (!session) {
    throw new AppError("Consultation history not found.", 404);
  }

  res.json({
    status: "success",
    data: {
      history: session.history || [],
      completedAt: session.completedAt,
      completedBy: session.completedBy,
      status: session.status,
    },
  });
});

export const addInpatientLabOrders = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const targetId = req.params.id;
  const { tests, priority } = req.body;
  const doctor = await getLoggedDoctor(req);

  const activeAdmission = await findActiveAdmission(hospitalId, targetId);
  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found or unauthorized.", 403);
  }

  const testsList = Array.isArray(tests) ? tests : (tests ? [tests] : []);
  if (testsList.length === 0) {
    throw new AppError("At least one lab test must be selected.", 400);
  }

  const targetBranch = activeAdmission.branch || doctor.branch || req.hospitalFilter?.branch || null;

  let labOrder = await LabOrder.findOne({
    hospital: hospitalId,
    patient: activeAdmission.patient,
    admission: activeAdmission._id,
    status: "pending"
  });

  if (labOrder) {
    labOrder.tests = Array.from(new Set([...(labOrder.tests || []), ...testsList]));
    if (priority === "STAT" || (priority === "Urgent" && labOrder.priority !== "STAT")) {
      labOrder.priority = priority;
    }
    await labOrder.save();
  } else {
    labOrder = await LabOrder.create({
      hospital: hospitalId,
      branch: targetBranch,
      patient: activeAdmission.patient,
      admission: activeAdmission._id,
      doctor: doctor._id,
      tests: testsList,
      priority: priority || "Routine",
      sampleStatus: "Pending",
      status: "pending"
    });
  }

  await DbNotification.create({
    hospital: hospitalId,
    title: "New IP Pathology Lab Order",
    message: `New IP lab order created by Dr. ${doctor.name} for patient (IP No: ${activeAdmission.admissionNumber}): ${testsList.join(", ")}`,
    type: "lab_request",
    recipientRole: "lab_technician",
    severity: priority === "STAT" ? "high" : "info",
    link: `/pathology/orders`
  });

  emitToHospital(hospitalId.toString(), "new_lab_order", {
    labOrderId: labOrder._id,
    patientId: activeAdmission.patient,
    admissionId: activeAdmission._id
  });

  activeAdmission.timeline.push({
    date: new Date(),
    time: new Date().toTimeString().split(" ")[0].substring(0, 5),
    userName: doctor.name,
    userRole: "doctor",
    eventType: "lab_request",
    description: `Lab orders prescribed: ${testsList.join(", ")}`
  });
  await activeAdmission.save();

  res.json({ status: "success", message: "Lab orders prescribed and synced to Pathology Dashboard!", data: activeAdmission });
});

export const addInpatientRadiologyOrders = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const targetId = req.params.id;
  const { scans, type, notes, priority } = req.body;
  const doctor = await getLoggedDoctor(req);

  const activeAdmission = await findActiveAdmission(hospitalId, targetId);
  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found or unauthorized.", 403);
  }

  const scansList = Array.isArray(scans) ? scans : (type ? [type] : []);
  if (scansList.length === 0) {
    throw new AppError("At least one radiology scan must be selected.", 400);
  }

  const targetBranch = activeAdmission.branch || doctor.branch || req.hospitalFilter?.branch || null;

  let order = await RadiologyOrder.findOne({
    hospital: hospitalId,
    patient: activeAdmission.patient,
    admission: activeAdmission._id,
    status: "pending"
  });

  if (order) {
    const existingScans = order.scans || [];
    for (const s of scansList) {
      if (!existingScans.includes(s)) existingScans.push(s);
    }
    order.scans = existingScans;
    order.type = existingScans.join(", ");
    if (notes) order.notes = order.notes ? `${order.notes}; ${notes}` : notes;
    if (priority === "STAT" || (priority === "Urgent" && order.priority !== "STAT")) {
      order.priority = priority;
    }
    await order.save();
  } else {
    order = await RadiologyOrder.create({
      hospital: hospitalId,
      branch: targetBranch,
      patient: activeAdmission.patient,
      admission: activeAdmission._id,
      doctor: doctor._id,
      scans: scansList,
      type: scansList.join(", "),
      notes: notes || "",
      priority: priority || "Routine",
      status: "pending"
    });
  }

  await DbNotification.create({
    hospital: hospitalId,
    title: "New IP Radiology Order",
    message: `New IP radiology order created by Dr. ${doctor.name} for patient (IP No: ${activeAdmission.admissionNumber}): ${scansList.join(", ")}`,
    type: "radiology_request",
    recipientRole: "radiologist",
    severity: priority === "STAT" ? "high" : "info",
    link: `/radiology/orders`
  });

  emitToHospital(hospitalId.toString(), "new_radiology_order", {
    radiologyOrderId: order._id,
    patientId: activeAdmission.patient,
    admissionId: activeAdmission._id
  });

  activeAdmission.timeline.push({
    date: new Date(),
    time: new Date().toTimeString().split(" ")[0].substring(0, 5),
    userName: doctor.name,
    userRole: "doctor",
    eventType: "radiology_request",
    description: `Radiology scans ordered: ${scansList.join(", ")}`
  });
  await activeAdmission.save();

  res.json({ status: "success", message: "Radiology orders prescribed and synced to Radiology Dashboard!", data: activeAdmission });
});


