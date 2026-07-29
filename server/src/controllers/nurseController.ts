import { Request, Response } from "express";
import { Types } from "mongoose";
import { Admission } from "../models/Admission";
import { Staff } from "../models/Staff";
import { Bed } from "../models/Bed";
import { ShiftHandover } from "../models/ShiftHandover";
import { DbNotification } from "../models/DbNotification";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

// 1. Get Nurse Inpatients
export const getNurseInpatients = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const inpatients = await Admission.find({
    hospital: hospitalId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  })
    .populate("patient", "name uhid age gender phone bloodGroup allergies insuranceProvider")
    .populate("room", "roomNumber category")
    .populate("bed", "bedNumber")
    .populate("admittingDoctor", "name specialization")
    .sort({ admissionDate: -1 });

  res.json({ status: "success", data: inpatients });
});

// 2. Get Nurse Inpatient Details
export const getNurseInpatientDetails = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const admission = await Admission.findOne({
    hospital: hospitalId,
    patient: req.params.id,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  })
    .populate("patient")
    .populate("room")
    .populate("bed")
    .populate("admittingDoctor", "name specialization");

  if (!admission) {
    throw new AppError("No active inpatient admission found.", 404);
  }
  res.json({ status: "success", data: admission });
});

// 3. Save / Update Nurse Inpatient Vitals
export const saveNurseInpatientVitals = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const { 
    vitalId, 
    temperature, 
    bloodPressure, 
    pulseRate, 
    respiratoryRate, 
    oxygenSaturation, 
    weight,
    height,
    bmi,
    painScore,
    bloodSugar,
    observationNotes
  } = req.body;

  const staff = await Staff.findOne({ email: req.user!.email });
  const recordedByName = staff?.name || req.user!.name || "Nurse";

  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  });

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);

  if (vitalId) {
    // UPDATE existing vitals entry
    const vital = (activeAdmission.vitals as any).id(vitalId);
    if (!vital) {
      throw new AppError("Vital record not found.", 404);
    }
    
    vital.temperature = temperature || "";
    vital.bloodPressure = bloodPressure || "";
    vital.pulseRate = pulseRate || "";
    vital.respiratoryRate = respiratoryRate || "";
    vital.oxygenSaturation = oxygenSaturation || "";
    vital.weight = weight || "";
    vital.height = height || "";
    vital.bmi = bmi || "";
    vital.painScore = painScore || "";
    vital.bloodSugar = bloodSugar || "";
    vital.observationNotes = observationNotes || "";
    vital.recordedAt = new Date();
    vital.recordedBy = recordedByName;

    activeAdmission.timeline.push({
      date: new Date(),
      time: currentTime,
      userName: recordedByName,
      userRole: "nurse",
      eventType: "vital_update",
      description: `Vitals updated: Temp ${temperature || "—"}°F, BP ${bloodPressure || "—"}, SpO2 ${oxygenSaturation || "—"}%`
    });

  } else {
    // CREATE new vitals entry
    const newVital = {
      temperature: temperature || "",
      bloodPressure: bloodPressure || "",
      pulseRate: pulseRate || "",
      respiratoryRate: respiratoryRate || "",
      oxygenSaturation: oxygenSaturation || "",
      weight: weight || "",
      height: height || "",
      bmi: bmi || "",
      painScore: painScore || "",
      bloodSugar: bloodSugar || "",
      observationNotes: observationNotes || "",
      recordedAt: new Date(),
      recordedBy: recordedByName
    };

    activeAdmission.vitals.push(newVital);

    activeAdmission.timeline.push({
      date: new Date(),
      time: currentTime,
      userName: recordedByName,
      userRole: "nurse",
      eventType: "vital_update",
      description: `Vitals recorded: Temp ${temperature || "—"}°F, BP ${bloodPressure || "—"}, SpO2 ${oxygenSaturation || "—"}%`
    });
  }

  await activeAdmission.save();
  res.json({ status: "success", data: activeAdmission });
});

// 4. Add Nurse Inpatient Progress Notes / Care Logs
export const addNurseInpatientNotes = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const { notes } = req.body;
  const staff = await Staff.findOne({ email: req.user!.email });
  const recordedByName = staff?.name || req.user!.name || "Nurse";

  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  });

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);

  // Add to progress notes log or timeline
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: recordedByName,
    userRole: "nurse",
    eventType: "clinical_note",
    description: notes || ""
  });

  await activeAdmission.save();
  res.json({ status: "success", data: activeAdmission });
});

// 5. Administer Inpatient Medication
export const administerNurseInpatientMed = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const { medOrderId, action, scheduledTime, administrationTime, remarks } = req.body;
  const staff = await Staff.findOne({ email: req.user!.email });
  const recordedByName = staff?.name || req.user!.name || "Nurse";

  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  });

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  const medOrder = (activeAdmission.medicationOrders as any).id(medOrderId);
  if (!medOrder) {
    throw new AppError("Medication prescription order not found.", 404);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);

  // Push new administration log
  medOrder.administrationLogs.push({
    action,
    scheduledTime: scheduledTime || medOrder.scheduledTime || "",
    administrationTime: administrationTime || currentTime,
    remarks: remarks || "",
    nurseName: recordedByName,
    timestamp: new Date()
  });

  // If rescheduled, update the medication order's scheduledTime
  if (action === "Rescheduled" && scheduledTime) {
    medOrder.scheduledTime = scheduledTime;
  }

  // Add event to EMR timeline
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: recordedByName,
    userRole: "nurse",
    eventType: "medication_admin",
    description: `Medication ${action}: ${medOrder.drugName} (${medOrder.dosage}). Remarks: ${remarks || "None"}`
  });

  await activeAdmission.save();
  res.json({ status: "success", data: activeAdmission });
});

// 6. Save Inpatient Daily Nursing Note
export const saveNurseInpatientNote = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const staff = await Staff.findOne({ email: req.user!.email });
  if (!staff) {
    throw new AppError("Staff record not found.", 404);
  }

  const { 
    observationType,
    painAssessment,
    mobility,
    mentalStatus,
    skinCondition,
    fluidIntake,
    output,
    diet,
    woundCare,
    treatmentProgress,
    additionalNotes 
  } = req.body;

  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  });

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  const newNote = {
    observationType: observationType || "Routine",
    painAssessment: painAssessment || "",
    mobility: mobility || "",
    mentalStatus: mentalStatus || "",
    skinCondition: skinCondition || "",
    fluidIntake: fluidIntake || "",
    output: output || "",
    diet: diet || "",
    woundCare: woundCare || "",
    treatmentProgress: treatmentProgress || "",
    additionalNotes: additionalNotes || "",
    recordedBy: staff._id,
    recordedByName: staff.name || req.user!.name || "Nurse",
    recordedAt: new Date()
  };

  activeAdmission.nursingNotes.push(newNote);

  // Sync to general timeline
  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: staff.name || req.user!.name || "Nurse",
    userRole: "nurse",
    eventType: "clinical_note",
    description: `[Nursing Note: ${observationType || "Routine"}] Progress: ${treatmentProgress || "—"}`
  });

  await activeAdmission.save();
  res.json({ status: "success", data: activeAdmission });
});

// 7. Update Own Nursing Note
export const updateNurseInpatientNote = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const { noteId } = req.params;
  const staff = await Staff.findOne({ email: req.user!.email });
  if (!staff) {
    throw new AppError("Staff record not found.", 404);
  }

  const { 
    observationType,
    painAssessment,
    mobility,
    mentalStatus,
    skinCondition,
    fluidIntake,
    output,
    diet,
    woundCare,
    treatmentProgress,
    additionalNotes 
  } = req.body;

  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  });

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  const note = (activeAdmission.nursingNotes as any).id(noteId);
  if (!note) {
    throw new AppError("Nursing note not found.", 404);
  }

  // Verify ownership
  if (note.recordedBy.toString() !== staff._id.toString()) {
    throw new AppError("You can only edit your own notes.", 403);
  }

  note.observationType = observationType || "Routine";
  note.painAssessment = painAssessment || "";
  note.mobility = mobility || "";
  note.mentalStatus = mentalStatus || "";
  note.skinCondition = skinCondition || "";
  note.fluidIntake = fluidIntake || "";
  note.output = output || "";
  note.diet = diet || "";
  note.woundCare = woundCare || "";
  note.treatmentProgress = treatmentProgress || "";
  note.additionalNotes = additionalNotes || "";
  note.modifiedAt = new Date();

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: staff.name || req.user!.name || "Nurse",
    userRole: "nurse",
    eventType: "clinical_note",
    description: `[Nursing Note Updated] Observation: ${observationType || "Routine"}`
  });

  await activeAdmission.save();
  res.json({ status: "success", data: activeAdmission });
});

// 8. Delete Own Nursing Note
export const deleteNurseInpatientNote = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const { noteId } = req.params;
  const staff = await Staff.findOne({ email: req.user!.email });
  if (!staff) {
    throw new AppError("Staff record not found.", 404);
  }

  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  });

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  const note = (activeAdmission.nursingNotes as any).id(noteId);
  if (!note) {
    throw new AppError("Nursing note not found.", 404);
  }

  // Verify ownership
  if (note.recordedBy.toString() !== staff._id.toString()) {
    throw new AppError("You can only delete your own notes.", 403);
  }

  note.deleteOne();

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: staff.name || req.user!.name || "Nurse",
    userRole: "nurse",
    eventType: "clinical_note",
    description: `[Nursing Note Deleted] Deleted by ${staff.name}`
  });

  await activeAdmission.save();
  res.json({ status: "success", data: activeAdmission });
});

// 9. Save Bedside Care Checklist Logs
export const saveNurseInpatientBedsideChecks = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const staff = await Staff.findOne({ email: req.user!.email });
  const recordedByName = staff?.name || req.user!.name || "Nurse";

  const { 
    bedPosition,
    patientHygiene,
    oralCare,
    bathGiven,
    dressingChanged,
    ivLineChecked,
    catheterCare,
    pressureUlcerPrevention,
    fallPrevention,
    mobilityAssistance,
    oxygenSupport,
    nutrition,
    fluidIntake,
    outputMonitoring,
    remarks,
    completionStatus
  } = req.body;

  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  });

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  const newLog = {
    bedPosition: !!bedPosition,
    patientHygiene: !!patientHygiene,
    oralCare: !!oralCare,
    bathGiven: !!bathGiven,
    dressingChanged: !!dressingChanged,
    ivLineChecked: !!ivLineChecked,
    catheterCare: !!catheterCare,
    pressureUlcerPrevention: !!pressureUlcerPrevention,
    fallPrevention: !!fallPrevention,
    mobilityAssistance: !!mobilityAssistance,
    oxygenSupport: !!oxygenSupport,
    nutrition: !!nutrition,
    fluidIntake: !!fluidIntake,
    outputMonitoring: !!outputMonitoring,
    remarks: remarks || "",
    completionStatus: completionStatus || "Completed",
    completedBy: recordedByName,
    completedTime: new Date()
  };

  activeAdmission.bedsideCareLogs.push(newLog);

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: recordedByName,
    userRole: "nurse",
    eventType: "care_update",
    description: `Bedside checks recorded. Completion Status: ${completionStatus}. Remarks: ${remarks || "None"}`
  });

  await activeAdmission.save();
  res.json({ status: "success", data: activeAdmission });
});

// 10. Save Shift Handover
export const saveShiftHandover = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const staff = await Staff.findOne({ email: req.user!.email });
  if (!staff) {
    throw new AppError("Staff record not found.", 404);
  }

  const { 
    currentShift,
    nextShift,
    patientsHandedOverCount,
    patientsHandedOverDetails,
    pendingMedication,
    pendingProcedures,
    criticalPatients,
    specialInstructions,
    remarks,
    nurseSignature
  } = req.body;

  const handover = await ShiftHandover.create({
    hospital: hospitalId,
    currentShift,
    nextShift,
    patientsHandedOverCount: Number(patientsHandedOverCount) || 0,
    patientsHandedOverDetails: patientsHandedOverDetails || "",
    pendingMedication: pendingMedication || "",
    pendingProcedures: pendingProcedures || "",
    criticalPatients: criticalPatients || "",
    specialInstructions: specialInstructions || "",
    remarks: remarks || "",
    nurseSignature,
    loggedBy: staff._id,
    loggedByName: staff.name || req.user!.name || "Nurse",
    timestamp: new Date()
  });

  res.json({ status: "success", data: handover });
});

// 11. Get Shift Handovers Audit History
export const getShiftHandovers = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const handovers = await ShiftHandover.find({ hospital: hospitalId })
    .sort({ timestamp: -1 });

  res.json({ status: "success", data: handovers });
});

// 12. Save Inpatient Discharge Preparation Checklist (Nurse Assistance Only)
export const saveNurseInpatientDischargePrep = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const staff = await Staff.findOne({ email: req.user!.email });
  const recordedByName = staff?.name || req.user!.name || "Nurse";

  const { 
    doctorApprovalStatus,
    finalVitalSigns,
    medicationCompleted,
    patientEducationCompleted,
    pendingNursingTasks,
    medicalEquipmentReturned,
    dischargeDocumentsReady,
    wheelchairRequired,
    transportRequired,
    remarks,
    status
  } = req.body;

  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  });

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  // Nurses cannot approve final discharge (discharge status parameter)
  // They only coordinate prep work and flag "Ready for Doctor Review" or "Pending"
  let targetStatus = status || "Pending";
  if (targetStatus === "Completed" && !doctorApprovalStatus) {
    throw new AppError("Nurses cannot sign off final discharge clearance. Admitting physician approval status is required.", 403);
  }

  activeAdmission.dischargePreparation = {
    doctorApprovalStatus: !!doctorApprovalStatus,
    finalVitalSigns: !!finalVitalSigns,
    medicationCompleted: !!medicationCompleted,
    patientEducationCompleted: !!patientEducationCompleted,
    pendingNursingTasks: !!pendingNursingTasks,
    medicalEquipmentReturned: !!medicalEquipmentReturned,
    dischargeDocumentsReady: !!dischargeDocumentsReady,
    wheelchairRequired: !!wheelchairRequired,
    transportRequired: !!transportRequired,
    remarks: remarks || "",
    status: targetStatus,
    updatedBy: recordedByName,
    updatedAt: new Date()
  };

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: recordedByName,
    userRole: "nurse",
    eventType: "care_update",
    description: `Discharge preparation checklist updated. Status: ${targetStatus}. Remarks: ${remarks || "None"}`
  });

  await activeAdmission.save();
  res.json({ status: "success", data: activeAdmission });
});

// 13. Get Nurse Notifications with Auto-Seeding
export const getNurseNotifications = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  
  let notifications = await DbNotification.find({
    hospital: hospitalId,
    recipientRole: "nurse"
  }).sort({ createdAt: -1 });

  if (notifications.length === 0) {
    const mockNotifs = [
      {
        hospital: hospitalId,
        title: "Medication Reminder: Scheduled Dose Due",
        message: "Scheduled Medication Dose is due for administration.",
        type: "general",
        severity: "warning", // Priority: High
        recipientRole: "nurse",
        isRead: false,
        data: {
          type: "medication",
          patientName: "Jayanth sai Chikkala",
          uhid: "UHID-1736567290",
          roomNumber: "101",
          ward: "General Ward",
          medicineName: "Paracetamol",
          dosage: "650mg",
          scheduledTime: "15:30",
          priority: "High"
        }
      },
      {
        hospital: hospitalId,
        title: "Vital Signs Recording Reminder",
        message: "Routine 4-hourly vital signs recording is now due.",
        type: "general",
        severity: "info", // Priority: Medium
        recipientRole: "nurse",
        isRead: false,
        data: {
          type: "vitals",
          patientName: "Santhosh",
          uhid: "UHID-8326773101",
          roomNumber: "101",
          ward: "General Ward",
          dueTime: "16:00",
          priority: "Medium"
        }
      },
      {
        hospital: hospitalId,
        title: "CRITICAL ALERT: Low Oxygen Saturation",
        message: "Patient recorded abnormal SpO2 level (88%). Resuscitation cart alert.",
        type: "general",
        severity: "critical", // Priority: Critical
        recipientRole: "nurse",
        isRead: false,
        data: {
          type: "critical_alert",
          patientName: "Jayanth sai Chikkala",
          uhid: "UHID-1736567290",
          roomNumber: "101",
          ward: "General Ward",
          priority: "Critical"
        }
      },
      {
        hospital: hospitalId,
        title: "EMERGENCY: Patient Call Button Pressed",
        message: "Patient initiated emergency code from bedside handset.",
        type: "general",
        severity: "critical", // Priority: Critical
        recipientRole: "nurse",
        isRead: false,
        data: {
          type: "emergency",
          patientName: "Santhosh",
          uhid: "UHID-8326773101",
          roomNumber: "101",
          ward: "General Ward",
          priority: "Critical"
        }
      },
      {
        hospital: hospitalId,
        title: "New Inpatient Assignment",
        message: "You have been assigned as the primary duty nurse for this inpatient.",
        type: "general",
        severity: "info", // Priority: Medium
        recipientRole: "nurse",
        isRead: false,
        data: {
          type: "assignment",
          patientName: "Jayanth sai Chikkala",
          uhid: "UHID-1736567290",
          roomNumber: "101",
          ward: "General Ward",
          assignedDoctor: "doctor1",
          priority: "Medium"
        }
      },
      {
        hospital: hospitalId,
        title: "Bedside Care Reminder: IV Line Check",
        message: "Catheter patency and IV line check round is due for verification.",
        type: "general",
        severity: "neutral", // Priority: Low
        recipientRole: "nurse",
        isRead: false,
        data: {
          type: "bedside",
          patientName: "Santhosh",
          uhid: "UHID-8326773101",
          roomNumber: "101",
          ward: "General Ward",
          priority: "Low"
        }
      },
      {
        hospital: hospitalId,
        title: "Pending Nursing Notes Reminder",
        message: "Shift progress note logs are pending for 2 assigned patients.",
        type: "general",
        severity: "neutral", // Priority: Low
        recipientRole: "nurse",
        isRead: false,
        data: {
          type: "notes_reminder",
          priority: "Low"
        }
      },
      {
        hospital: hospitalId,
        title: "Shift Handover Sync Reminder",
        message: "Please complete shift sync checklist and log outgoing notes.",
        type: "general",
        severity: "warning", // Priority: High
        recipientRole: "nurse",
        isRead: false,
        data: {
          type: "handover_reminder",
          priority: "High"
        }
      },
      {
        hospital: hospitalId,
        title: "Discharge Preparation Request",
        message: "Admitting physician has flagged patient as ready for discharge preparation.",
        type: "general",
        severity: "info", // Priority: Medium
        recipientRole: "nurse",
        isRead: false,
        data: {
          type: "discharge_prep",
          patientName: "Jayanth sai Chikkala",
          uhid: "UHID-1736567290",
          roomNumber: "101",
          ward: "General Ward",
          priority: "Medium"
        }
      },
      {
        hospital: hospitalId,
        title: "New Doctor Instructions Updated",
        message: "Dr. Doctor1 modified care directives regarding diet control and monitoring.",
        type: "general",
        severity: "info", // Priority: Medium
        recipientRole: "nurse",
        isRead: false,
        data: {
          type: "doctor_instruction",
          patientName: "Santhosh",
          uhid: "UHID-8326773101",
          roomNumber: "101",
          ward: "General Ward",
          priority: "Medium"
        }
      }
    ];

    notifications = await DbNotification.create(mockNotifs);
    // Sort seeded notifications
    notifications.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  res.json({ status: "success", data: notifications });
});

// 14. Mark Nurse Notification as Read
export const markNurseNotificationRead = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const notificationId = req.params.id;

  const notification = await DbNotification.findOneAndUpdate(
    { _id: notificationId, hospital: hospitalId, recipientRole: "nurse" },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new AppError("Notification not found.", 404);
  }

  res.json({ status: "success", data: notification });
});

// 15. Mark All Nurse Notifications as Read
export const markAllNurseNotificationsRead = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;

  await DbNotification.updateMany(
    { hospital: hospitalId, recipientRole: "nurse", isRead: false },
    { isRead: true }
  );

  res.json({ status: "success", message: "All notifications marked as read." });
});

// 16. Snooze Nurse Notification
export const snoozeNurseNotification = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const notificationId = req.params.id;

  const notif = await DbNotification.findOne({
    _id: notificationId,
    hospital: hospitalId,
    recipientRole: "nurse"
  });

  if (!notif) {
    throw new AppError("Notification not found.", 404);
  }

  const notifType = notif.type as string;
  if (notifType !== "medication" && notifType !== "vitals") {
    throw new AppError("Snooze is only available for medication and vital reminders.", 400);
  }

  const snoozedUntil = new Date(Date.now() + 15 * 60 * 1000); // Snooze for 15 mins
  notif.data = {
    ...notif.data,
    snoozedUntil
  };
  notif.markModified("data");
  await notif.save();

  res.json({ status: "success", data: notif });
});

// 17. Dismiss Nurse Notification
export const dismissNurseNotification = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const notificationId = req.params.id;

  const notif = await DbNotification.findOne({
    _id: notificationId,
    hospital: hospitalId,
    recipientRole: "nurse"
  });

  if (!notif) {
    throw new AppError("Notification not found.", 404);
  }

  const notifType = notif.type as string;
  if (notif.severity === "critical" || notifType === "critical_alert" || notifType === "emergency") {
    throw new AppError("Critical alerts and Emergency notifications cannot be dismissed.", 400);
  }

  await DbNotification.deleteOne({ _id: notificationId });
  res.json({ status: "success", message: "Notification dismissed." });
});
