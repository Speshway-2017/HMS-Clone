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
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { Types } from "mongoose";

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
    DoctorDashboardRepository.getNotifications(hospitalId),
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
  const { patientId, diagnosis, medicines, notes } = req.body;

  const prescription = await Prescription.create({
    hospital: hospitalId,
    patient: patientId,
    doctor: doctor._id,
    diagnosis,
    medicines,
    notes: notes || "",
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
              visitType: "Prescription Issued",
              doctorName: doctor.name,
              diagnosis,
              notes: medicines.map((m: any) => `${m.name} (${m.dosage}, ${m.frequency}, ${m.duration})`).join("; "),
              status: "Completed",
            },
          ],
          $position: 0,
        },
      },
    }
  );

  res.status(201).json({ status: "success", data: prescription });
});

export const completePrescription = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const prescriptionId = req.params.id;

  const prescription = await Prescription.findOneAndUpdate(
    { _id: prescriptionId, hospital: hospitalId },
    { status: "completed" },
    { new: true }
  );

  if (!prescription) {
    throw new AppError("Prescription not found.", 404);
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
  const data = await DoctorDashboardRepository.getNotifications(hospitalId);
  res.json({ status: "success", data });
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

  const [queueItem, prescriptions, labOrders, radiologyOrders, admissions] = await Promise.all([
    Queue.findOne({ appointment: appointmentId, hospital: hospitalId, doctor: doctorId }),
    Prescription.find({ patient: patientId, doctor: doctorId, hospital: hospitalId }),
    LabOrder.find({ patient: patientId, doctor: doctorId, hospital: hospitalId }),
    RadiologyOrder.find({ patient: patientId, doctor: doctorId, hospital: hospitalId }),
    Admission.find({ patient: patientId, hospital: hospitalId }),
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
  const { suggestedWard, diagnosis, notes } = req.body;
  const doctor = await getLoggedDoctor(req);

  const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId, doctor: doctor._id })
    .populate("patient")
    .populate("doctor");

  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }

  const patient = appointment.patient as any;
  const docProfile = appointment.doctor as any;

  // Create notification for receptionist
  const notification = await DbNotification.create({
    hospital: hospitalId,
    title: "Inpatient Admission Recommended",
    message: `Patient ${patient.name} recommended for IP admission by Dr. ${docProfile.name}.`,
    type: "admission_request",
    recipientRole: "receptionist",
    severity: "warning",
    data: {
      patientId: patient._id.toString(),
      opVisitId: appointmentId,
      diagnosis: diagnosis || appointment.diagnosis || "OP Consultation",
      suggestedWard: suggestedWard || "General Ward",
      notes: notes || appointment.clinicalNotes || "",
    },
  });

  res.status(201).json({ status: "success", data: notification });
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

  const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId, doctor: doctor._id })
    .populate("patient")
    .populate("doctor")
    .populate("department");

  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }

  // Update appointment status to completed
  appointment.status = "completed";
  await appointment.save();

  // Update queue item status to completed if exists
  await Queue.findOneAndUpdate(
    { appointment: appointmentId, hospital: hospitalId, doctor: doctor._id },
    { status: "completed" }
  );

  // Push to patient's medicalHistory array
  const departmentName = (appointment.department as any)?.name || "General OPD";
  const diagnosis = appointment.diagnosis || "Consultation";
  const notes = `Chief Complaint: ${appointment.chiefComplaint || "None"}. Vitals: BP: ${appointment.vitals?.bloodPressure || "—"}, Temp: ${appointment.vitals?.temperature || "—"}. Notes: ${appointment.clinicalNotes || "None"}. Plan: ${appointment.treatmentPlan || "None"}.`;

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
              diagnosis,
              notes,
              status: "Completed",
            },
          ],
          $position: 0,
        },
      },
    }
  );

  res.json({ status: "success", data: appointment });
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
