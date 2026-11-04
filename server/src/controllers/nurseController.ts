import { Request, Response } from "express";
import { Types } from "mongoose";
import { Admission } from "../models/Admission";
import { Staff } from "../models/Staff";
import { Bed } from "../models/Bed";
import { ShiftHandover } from "../models/ShiftHandover";
import { DbNotification } from "../models/DbNotification";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken } from "../utils/token";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { emitToHospital } from "../config/socket";
import { Patient } from "../models/Patient";
import { notifyAssignedDoctorForPatient, checkCriticalVitalsAndNotify } from "../utils/autoNotifyAssignedDoctor";
import {
  validateTemperature,
  validateBloodPressure,
  validatePulseRate,
  validateRespiratoryRate,
  validateOxygenSaturation,
  validateWeight,
} from "../utils/consultationValidation";

// 1. Get Nurse Inpatients
export const getNurseInpatients = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const inpatients = await Admission.find({
    hospital: hospitalId,
    status: { $nin: ["discharged", "Discharged", "Cancelled", "Transferred Out (Final)", "DISCHARGED"] }
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

  // Validate vitals (if provided must be valid and within limits)
  if (temperature && typeof temperature === "string" && temperature.trim()) {
    const tTrimmed = temperature.trim();
    if (tTrimmed.length > 10) throw new AppError("The Temp (°F) field should validate long text input correctly and should not accept unsupported data. Characters limit: 10. Too long text is not accepted. Too long data is not accepted. Please enter valid data", 400);
    const err = validateTemperature(tTrimmed);
    if (err) throw new AppError("The Temp (°F) field should validate invalid input correctly and should not accept unsupported data. Please enter valid data", 400);
  }

  if (bloodPressure && typeof bloodPressure === "string" && bloodPressure.trim()) {
    const bpTrimmed = bloodPressure.trim();
    if (bpTrimmed.length > 10) throw new AppError("The BP (mmHg) field should validate long text input correctly and should not accept unsupported data. Characters limit: 10. Too long text is not accepted. Too long data is not accepted. Please enter valid data", 400);
    const err = validateBloodPressure(bpTrimmed);
    if (err) throw new AppError("The BP (mmHg) field should validate invalid input correctly and should not accept unsupported data. Please enter valid data", 400);
  }

  if (pulseRate && typeof pulseRate === "string" && pulseRate.trim()) {
    const prTrimmed = pulseRate.trim();
    if (prTrimmed.length > 5) throw new AppError("The Pulse (bpm) field should validate long text input correctly and should not accept unsupported data. Characters limit: 5. Too long text is not accepted. Too long data is not accepted. Please enter valid data", 400);
    const err = validatePulseRate(prTrimmed);
    if (err) throw new AppError("The Pulse (bpm) field should validate invalid input correctly and should not accept unsupported data. Please enter valid data", 400);
  }

  if (respiratoryRate && typeof respiratoryRate === "string" && respiratoryRate.trim()) {
    const rrTrimmed = respiratoryRate.trim();
    if (rrTrimmed.length > 5) throw new AppError("Maximum allowed character limit exceeded", 400);
    const err = validateRespiratoryRate(rrTrimmed);
    if (err) throw new AppError(err, 400);
  }

  if (oxygenSaturation && typeof oxygenSaturation === "string" && oxygenSaturation.trim()) {
    const o2Trimmed = oxygenSaturation.trim();
    if (o2Trimmed.length > 5) throw new AppError("The SpO2 (%) field should validate long text input correctly and should not accept unsupported data. Characters limit: 5. Too long text is not accepted. Too long data is not accepted. Please enter valid data", 400);
    const err = validateOxygenSaturation(o2Trimmed);
    if (err) throw new AppError("The SpO2 (%) field should validate invalid input correctly and should not accept unsupported data. Please enter valid data", 400);
  }

  if (weight && typeof weight === "string" && weight.trim()) {
    const wTrimmed = weight.trim();
    if (wTrimmed.length > 6) throw new AppError("Maximum allowed character limit exceeded", 400);
    const err = validateWeight(wTrimmed);
    if (err) throw new AppError(err, 400);
  }

  if (observationNotes && typeof observationNotes === "string" && observationNotes.trim()) {
    const obTrimmed = observationNotes.trim();
    if (obTrimmed.length > 500) throw new AppError("The Observation Notes field should validate long text input correctly and should not accept unsupported data. Observation Notes cannot exceed 500 characters. Too long text is not accepted. Too long data is not accepted. Please enter valid data", 400);
    if (/<script\b|javascript:/i.test(obTrimmed) || (!/[a-zA-Z0-9]/.test(obTrimmed) && obTrimmed.length > 0)) {
      throw new AppError("The Observation Notes field should validate invalid input correctly and should not accept unsupported data. Observation Notes contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data", 400);
    }
  }

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

  // Populate patient details for auto-notification to assigned doctor
  const populatedAdmission = await Admission.findById(activeAdmission._id).populate("patient", "name uhid");
  const ptName = (populatedAdmission?.patient as any)?.name || "Inpatient";
  const ptUhid = (populatedAdmission?.patient as any)?.uhid || "";

  // Automatically notify the patient's assigned doctor (Normal vs Critical Red Alert)
  await checkCriticalVitalsAndNotify({
    hospitalId,
    patientId,
    patientName: ptName,
    uhid: ptUhid,
    nurseName: recordedByName,
    temperature,
    bloodPressure,
    pulseRate,
    respiratoryRate,
    oxygenSaturation,
    bloodSugar,
    painScore
  });

  // Broadcast real-time WebSockets events for Doctor IP Management Dashboard sync
  emitToHospital(hospitalId, "vitals_updated", { patientId, admissionId: activeAdmission._id });
  emitToHospital(hospitalId, "ip_management_update", { patientId, admissionId: activeAdmission._id });
  emitToHospital(hospitalId, "dashboard_update", { patientId });

  res.json({ status: "success", data: activeAdmission });
});

// 4. Add Nurse Inpatient Progress Notes / Care Logs
export const addNurseInpatientNotes = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const notes = req.body.notes ? String(req.body.notes).trim().slice(0, 5000) : "";
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

  // Populate patient details for doctor notification
  const populatedAdmission = await Admission.findById(activeAdmission._id).populate("patient", "name uhid");
  const ptName = (populatedAdmission?.patient as any)?.name || "Inpatient";
  const ptUhid = (populatedAdmission?.patient as any)?.uhid || "";

  // Send real-time notification to patient's assigned doctor
  await notifyAssignedDoctorForPatient({
    hospitalId,
    patientId,
    patientName: ptName,
    uhid: ptUhid,
    nurseName: recordedByName,
    title: "New Nursing Note",
    message: `A new nursing note has been added for Patient ${ptName} by Nurse ${recordedByName}.`,
    severity: "info",
    extraData: {
      type: "nursing_note",
      notesSnippet: notes ? (notes.length > 80 ? notes.substring(0, 80) + "..." : notes) : ""
    }
  });

  res.json({ status: "success", data: activeAdmission });
});

// 5. Administer Inpatient Medication
export const administerNurseInpatientMed = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const { medOrderId, action, scheduledTime, administrationTime, remarks, medicineName, dosage } = req.body;

  if (remarks && remarks.length > 500) {
    throw new AppError("The Remarks / Observation field should validate the input length and should not accept unsupported long text. Remarks / Observation cannot exceed 500 characters. Too long text is not accepted. Too long data is not accepted. Please enter valid data", 400);
  }
  if (remarks && (/<[^>]*>|javascript:/i.test(remarks) || !/[a-zA-Z0-9]/.test(remarks))) {
    throw new AppError("The Remarks / Observation field should validate invalid input and should not accept unsupported data. Remarks / Observation contains invalid data. Invalid data not accepted. Invalid data is not accepted. Validation message should be displayed invalid data not accepted. Please enter valid data", 400);
  }

  const staff = await Staff.findOne({ email: req.user!.email });
  const recordedByName = staff?.name || req.user!.name || "Nurse";

  let queryFilter: any = {
    hospital: hospitalId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  };

  if (Types.ObjectId.isValid(patientId)) {
    queryFilter.$or = [{ patient: patientId }, { _id: patientId }];
  } else {
    queryFilter.patient = patientId;
  }

  const activeAdmission = await Admission.findOne(queryFilter);

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  let medOrder = (activeAdmission.medicationOrders as any).id(medOrderId);
  if (!medOrder) {
    // If order does not exist in array (e.g. fallback demo order from UI), create a valid new order entry
    const docId = activeAdmission.admittingDoctor || staff?._id || (req.user as any)!._id;
    const docName = "Attending Doctor";

    const newOrder = {
      drugName: medicineName || req.body.drugName || "Paracetamol 500mg",
      dosage: dosage || "1 Tab",
      frequency: "TID",
      duration: "5 Days",
      route: "Oral",
      status: "active",
      scheduledTime: scheduledTime || "14:00 PM",
      prescribingDoctor: docId,
      prescribingDoctorName: docName,
      orderedAt: new Date(),
      notes: "Logged via medication administration",
      history: [],
      administrationLogs: []
    };
    activeAdmission.medicationOrders.push(newOrder as any);
    medOrder = activeAdmission.medicationOrders[activeAdmission.medicationOrders.length - 1];
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
    description: `Medication ${action}: ${medOrder.drugName || medicineName} (${medOrder.dosage || dosage}). Remarks: ${remarks || "None"}`
  });

  // Save record into Nursing Notes as well
  const drugName = medOrder.drugName || medicineName || "Medication";
  const dosageInfo = (medOrder.dosage || dosage) ? ` (${medOrder.dosage || dosage})` : "";
  const noteContent = `Medication ${action}: ${drugName}${dosageInfo}. Scheduled: ${scheduledTime || medOrder.scheduledTime || "N/A"}. Administered at: ${administrationTime || currentTime}.${remarks ? ` Remarks: ${remarks}` : ""}`;

  activeAdmission.nursingNotes.push({
    observationType: "Medication Administration",
    painAssessment: "N/A",
    mobility: "N/A",
    mentalStatus: "N/A",
    skinCondition: "N/A",
    fluidIntake: "N/A",
    output: "N/A",
    diet: "N/A",
    woundCare: "N/A",
    treatmentProgress: noteContent,
    additionalNotes: noteContent,
    recordedBy: staff?._id || (req.user as any)!._id,
    recordedByName: recordedByName,
    recordedAt: new Date()
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

  // Populate patient details for doctor notification
  const populatedAdmission = await Admission.findById(activeAdmission._id).populate("patient", "name uhid");
  const ptName = (populatedAdmission?.patient as any)?.name || "Inpatient";
  const ptUhid = (populatedAdmission?.patient as any)?.uhid || "";

  // Send real-time notification to patient's assigned doctor
  await notifyAssignedDoctorForPatient({
    hospitalId,
    patientId,
    patientName: ptName,
    uhid: ptUhid,
    nurseName: staff.name || req.user!.name || "Nurse",
    title: "New Nursing Note",
    message: `A new nursing note has been added for Patient ${ptName} by Nurse ${staff.name || req.user!.name || "Nurse"}.`,
    severity: "info",
    extraData: {
      type: "nursing_note",
      observationType: observationType || "Routine",
      treatmentProgress: treatmentProgress || ""
    }
  });

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
    patientHandoverItems,
    pendingMedication,
    pendingProcedures,
    criticalPatients,
    specialInstructions,
    remarks,
    handoverNotesChips,
    nurseSignature,
    incomingNurseId,
    incomingNurseName,
    isVerified
  } = req.body;

  const clientIp = (req.headers["x-forwarded-for"] as string || req.ip || req.socket.remoteAddress || "").split(",")[0].trim();
  const userAgent = (req.headers["user-agent"] as string) || "Web Browser";

  const handover = await ShiftHandover.create({
    hospital: hospitalId,
    currentShift: currentShift || "Morning",
    nextShift: nextShift || "Evening",
    status: "Submitted",
    patientsHandedOverCount: Number(patientsHandedOverCount) || (Array.isArray(patientHandoverItems) ? patientHandoverItems.length : 0),
    patientsHandedOverDetails: patientsHandedOverDetails || "",
    patientHandoverItems: Array.isArray(patientHandoverItems) ? patientHandoverItems : [],
    pendingMedication: pendingMedication || "",
    pendingProcedures: pendingProcedures || "",
    criticalPatients: criticalPatients || "",
    specialInstructions: specialInstructions || "",
    remarks: remarks || "",
    handoverNotesChips: Array.isArray(handoverNotesChips) ? handoverNotesChips : [],
    nurseSignature: nurseSignature || (staff.name || "Nurse"),
    isVerified: isVerified !== false,
    loggedBy: staff._id,
    loggedByName: staff.name || req.user!.name || "Nurse",
    incomingNurse: incomingNurseId ? new Types.ObjectId(incomingNurseId) : undefined,
    incomingNurseName: incomingNurseName || "",
    ipAddress: clientIp,
    deviceInfo: userAgent,
    timestamp: new Date()
  });

  // Emit WebSocket real-time update to hospital
  emitToHospital(hospitalId, "shift_handover_created", handover);

  // If incoming nurse specified, send DB notification
  if (incomingNurseId) {
    await DbNotification.create({
      hospital: hospitalId,
      title: "Handover Required",
      message: `Shift handover submitted by Nurse ${staff.name || req.user!.name}. Please review and accept pending patient handovers.`,
      type: "general",
      recipientRole: "nurse",
      isRead: false
    });
  }

  res.json({ status: "success", data: handover });
});

// 11. Get Shift Handovers Audit History (with filters)
export const getShiftHandovers = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const { dateRange, startDate, endDate, search, shift, status } = req.query;

  const filterQuery: any = { hospital: hospitalId };

  // Status Filter
  if (status && typeof status === "string" && status !== "All") {
    filterQuery.status = status;
  }

  // Shift Filter
  if (shift && typeof shift === "string" && shift !== "All") {
    filterQuery.currentShift = shift;
  }

  // Date Range Filtering
  const now = new Date();
  if (dateRange === "today") {
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));
    filterQuery.timestamp = { $gte: startOfDay, $lte: endOfDay };
  } else if (dateRange === "yesterday") {
    const yesterdayStart = new Date(now.setDate(now.getDate() - 1));
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);
    filterQuery.timestamp = { $gte: yesterdayStart, $lte: yesterdayEnd };
  } else if (dateRange === "7days") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    filterQuery.timestamp = { $gte: sevenDaysAgo };
  } else if (dateRange === "30days") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    filterQuery.timestamp = { $gte: thirtyDaysAgo };
  } else if (dateRange === "custom" && startDate && endDate) {
    filterQuery.timestamp = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string)
    };
  }

  // Text Search across Nurse Name, Incoming Nurse Name, Patient Details, Remarks
  if (search && typeof search === "string" && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i");
    filterQuery.$or = [
      { loggedByName: searchRegex },
      { incomingNurseName: searchRegex },
      { currentShift: searchRegex },
      { nextShift: searchRegex },
      { remarks: searchRegex },
      { "patientHandoverItems.patientName": searchRegex },
      { "patientHandoverItems.uhid": searchRegex },
      { "patientHandoverItems.ward": searchRegex }
    ];
  }

  const handovers = await ShiftHandover.find(filterQuery)
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

// 13. Get Nurse Notifications
export const getNurseNotifications = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;

  const notifications = await DbNotification.find({
    hospital: hospitalId,
    recipientRole: "nurse"
  }).sort({ createdAt: -1 });

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

  await DbNotification.deleteOne({ _id: notificationId });
  res.json({ status: "success", message: "Notification dismissed." });
});

// 18. Complete Shift Handover and Session Switch
export const completeShiftHandover = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const outgoingStaff = await Staff.findOne({ email: req.user!.email });
  if (!outgoingStaff) {
    throw new AppError("Outgoing staff record not found.", 404);
  }

  const {
    incomingNurseId,
    currentShift,
    nextShift,
    patientsHandedOverCount,
    patientsHandedOverDetails,
    pendingMedication,
    pendingProcedures,
    criticalPatients,
    specialInstructions,
    remarks,
    nurseSignature,
    selectedAdmissionIds
  } = req.body;

  if (!incomingNurseId) {
    throw new AppError("Incoming nurse selection is required.", 400);
  }

  if (!nurseSignature || !nurseSignature.trim()) {
    throw new AppError("Outgoing Nurse Signature is required. Field is required. Please fill out this field", 400);
  }
  if (nurseSignature.length > 100) {
    throw new AppError("Outgoing Nurse Signature cannot exceed 100 characters. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. It should not accept too long data. Please enter valid data", 400);
  }
  if (!/^[a-zA-Z\s\.\'\(\)\-]+$/.test(nurseSignature.trim()) || !/[a-zA-Z]/.test(nurseSignature.trim()) || /<[^>]*>|javascript:/i.test(nurseSignature)) {
    throw new AppError("Outgoing Nurse Signature contains invalid data. Invalid data not accepted. Invalid data is not accepted. Validation message should be displayed invalid data not accepted. It should not accept invalid data. Please enter valid data", 400);
  }

  if (remarks && remarks.length > 500) {
    throw new AppError("Handoff Remarks cannot exceed 500 characters. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. It should not accept too long data. Please enter valid data", 400);
  }
  if (remarks && (/<[^>]*>|javascript:/i.test(remarks) || !/[a-zA-Z0-9]/.test(remarks))) {
    throw new AppError("Handoff Remarks contains invalid data. Invalid data not accepted. Invalid data is not accepted. Validation message should be displayed invalid data not accepted. It should not accept invalid data. Please enter valid data", 400);
  }

  const incomingStaff = await Staff.findById(incomingNurseId);
  if (!incomingStaff) {
    throw new AppError("Incoming nurse record not found.", 404);
  }

  // Find User record of incoming nurse to sign new JWT tokens
  const incomingUser = await User.findOne({ email: incomingStaff.email });
  if (!incomingUser) {
    throw new AppError("Incoming nurse user account not found.", 404);
  }

  // 1. Save shift handover report for audit log history
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
    loggedBy: outgoingStaff._id,
    loggedByName: outgoingStaff.name || req.user!.name || "Nurse",
    incomingNurse: incomingStaff._id,
    incomingNurseName: incomingStaff.name || "Incoming Nurse",
    timestamp: new Date()
  });

  // 2. Transfer only selected patient admissions to the incoming nurse
  const activeAdmissionsStatuses = ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"];
  if (Array.isArray(selectedAdmissionIds) && selectedAdmissionIds.length > 0) {
    await Admission.updateMany(
      {
        _id: { $in: selectedAdmissionIds },
        hospital: hospitalId,
        assignedNurse: outgoingStaff._id,
        status: { $in: activeAdmissionsStatuses }
      },
      { assignedNurse: incomingStaff._id }
    );
  } else {
    await Admission.updateMany(
      {
        hospital: hospitalId,
        assignedNurse: outgoingStaff._id,
        status: { $in: activeAdmissionsStatuses }
      },
      { assignedNurse: incomingStaff._id }
    );
  }

  // Notify assigned doctors for all handed over inpatients
  const handedOverAdmissions = await Admission.find({
    hospital: hospitalId,
    assignedNurse: incomingStaff._id,
    status: { $in: activeAdmissionsStatuses }
  }).populate("patient", "name uhid");

  for (const adm of handedOverAdmissions) {
    if (adm.patient) {
      const ptName = (adm.patient as any).name || "Inpatient";
      const ptUhid = (adm.patient as any).uhid || "";
      await notifyAssignedDoctorForPatient({
        hospitalId,
        patientId: (adm.patient as any)._id,
        patientName: ptName,
        uhid: ptUhid,
        nurseName: outgoingStaff.name || "Nurse",
        title: "New Shift Handover Note",
        message: `Shift handover notes updated for Patient ${ptName} by Nurse ${outgoingStaff.name || "Nurse"}.`,
        severity: "info"
      });
    }
  }

  // 3. Mark outgoing nurse shift as completed (off_duty) and incoming nurse as on_duty
  outgoingStaff.dutyStatus = "off_duty";
  await outgoingStaff.save();

  incomingStaff.dutyStatus = "on_duty";
  await incomingStaff.save();

  // Create DB notification for the incoming nurse (role-wide nurse dashboard notification)
  await DbNotification.create({
    hospital: hospitalId,
    title: "Shift Handover Received",
    message: `Incoming shift duties handed over to you from ${outgoingStaff.name || "Nurse"}. You are now the active duty nurse for ${patientsHandedOverCount || 0} patient(s).`,
    type: "general",
    severity: "info",
    recipientRole: "nurse",
    data: {
      type: "shift_handover",
      outgoingNurseId: outgoingStaff._id,
      outgoingNurseName: outgoingStaff.name || "Nurse",
      incomingNurseId: incomingStaff._id,
      incomingNurseName: incomingStaff.name || "Incoming Nurse",
      patientsCount: patientsHandedOverCount || 0,
      patientsDetails: patientsHandedOverDetails || "",
      pendingMedication: pendingMedication || "",
      pendingProcedures: pendingProcedures || "",
      criticalPatients: criticalPatients || "",
      specialInstructions: specialInstructions || "",
      remarks: remarks || "",
      nurseSignature: nurseSignature || "",
      currentShift: currentShift || "Morning",
      nextShift: nextShift || "Evening"
    }
  });

  // 4. Generate JWT tokens to activate the selected nurse's session
  const payload = { id: incomingUser._id.toString(), role: incomingUser.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.json({
    status: "success",
    message: "Shift handover completed successfully.",
    data: {
      handover,
      token: accessToken,
      refreshToken
    }
  });
});

// 19. Accept Incoming Shift Handover
export const acceptShiftHandover = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const staff = await Staff.findOne({ email: req.user!.email });
  if (!staff) {
    throw new AppError("Staff record not found.", 404);
  }

  const { handoverId } = req.body;
  if (!handoverId) {
    throw new AppError("Handover ID is required.", 400);
  }

  const handover = await ShiftHandover.findOne({ _id: handoverId, hospital: hospitalId });
  if (!handover) {
    throw new AppError("Shift handover record not found.", 404);
  }

  handover.status = "Completed";
  handover.acceptedBy = staff._id;
  handover.acceptedByName = staff.name || req.user!.name || "Nurse";
  handover.acceptedAt = new Date();
  await handover.save();

  // Update duty status to on_duty
  staff.dutyStatus = "on_duty";
  await staff.save();

  // Transfer patient admissions to accepting nurse if specified
  const activeAdmissionsStatuses = ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"];
  if (handover.loggedBy) {
    await Admission.updateMany(
      {
        hospital: hospitalId,
        assignedNurse: handover.loggedBy,
        status: { $in: activeAdmissionsStatuses }
      },
      { assignedNurse: staff._id }
    );
  }

  // Emit WebSocket update
  emitToHospital(hospitalId, "shift_handover_accepted", handover);

  res.json({ status: "success", message: "Handover accepted successfully.", data: handover });
});

// 20. Get Current Nurse Shift Status & Live Countdown Details
export const getNurseShiftStatus = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const staff = await Staff.findOne({ email: req.user!.email });
  if (!staff) {
    throw new AppError("Staff record not found.", 404);
  }

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeMinutes = currentHours * 60 + currentMinutes;

  // Determine active 3-shift rotation timing:
  // Morning: 06:00 (360) - 14:00 (840)
  // Evening: 14:00 (840) - 22:00 (1320)
  // Night: 22:00 (1320) - 06:00 (360 next day)
  let currentShift = "Morning";
  let nextShift = "Evening";
  let shiftStartMinutes = 6 * 60; // 06:00 AM
  let shiftEndMinutes = 14 * 60;  // 02:00 PM

  if (currentTimeMinutes >= 6 * 60 && currentTimeMinutes < 14 * 60) {
    currentShift = "Morning";
    nextShift = "Evening";
    shiftStartMinutes = 6 * 60;
    shiftEndMinutes = 14 * 60;
  } else if (currentTimeMinutes >= 14 * 60 && currentTimeMinutes < 22 * 60) {
    currentShift = "Evening";
    nextShift = "Night";
    shiftStartMinutes = 14 * 60;
    shiftEndMinutes = 22 * 60;
  } else {
    currentShift = "Night";
    nextShift = "Morning";
    shiftStartMinutes = 22 * 60;
    shiftEndMinutes = 6 * 60; // Crosses midnight
  }

  // Calculate remaining seconds to shift end
  let remainingSeconds = 0;
  if (currentShift === "Night") {
    if (currentTimeMinutes >= 22 * 60) {
      remainingSeconds = (24 * 60 - currentTimeMinutes + 6 * 60) * 60 - now.getSeconds();
    } else {
      remainingSeconds = (6 * 60 - currentTimeMinutes) * 60 - now.getSeconds();
    }
  } else {
    remainingSeconds = (shiftEndMinutes - currentTimeMinutes) * 60 - now.getSeconds();
  }

  if (remainingSeconds < 0) remainingSeconds = 0;

  // Calculate shift state:
  // "On Duty", "Shift Ending Soon" (<= 15 min), "Handover Required" (<= 5 min), "Waiting for Handover"
  let shiftState = "On Duty";
  if (remainingSeconds <= 0) {
    shiftState = "Waiting for Handover";
  } else if (remainingSeconds <= 5 * 60) {
    shiftState = "Handover Required";
  } else if (remainingSeconds <= 15 * 60) {
    shiftState = "Shift Ending Soon";
  }

  // Check pending handovers for this nurse
  const pendingIncomingHandovers = await ShiftHandover.find({
    hospital: hospitalId,
    incomingNurse: staff._id,
    status: { $in: ["Pending", "Submitted", "In Progress"] }
  }).sort({ timestamp: -1 });

  // Check latest outgoing handover submitted by this nurse today
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const latestOutgoingHandover = await ShiftHandover.findOne({
    hospital: hospitalId,
    loggedBy: staff._id,
    timestamp: { $gte: startOfDay }
  }).sort({ timestamp: -1 });

  if (latestOutgoingHandover) {
    if (latestOutgoingHandover.status === "Completed") {
      shiftState = "Shift Completed";
    } else if (latestOutgoingHandover.status === "Submitted") {
      shiftState = "Handover In Progress";
    }
  }

  res.json({
    status: "success",
    data: {
      currentShift,
      nextShift,
      shiftState,
      remainingSeconds,
      dutyStatus: staff.dutyStatus || "on_duty",
      pendingIncomingHandovers,
      latestOutgoingHandover
    }
  });
});

// 21. Trigger Nursing Supervisor Alert for Overdue Handover
export const triggerSupervisorAlert = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const staff = await Staff.findOne({ email: req.user!.email });
  const nurseName = staff?.name || req.user!.name || "Nurse";

  // Create High Priority DB Notification for Nursing Supervisor & Hospital Admins
  const notification = await DbNotification.create({
    hospital: hospitalId,
    title: "SUPERVISOR ALERT: Shift Handover Failed / Overdue",
    message: `Nurse ${nurseName} failed to complete shift handover before leaving shift. Immediate action required.`,
    type: "general",
    severity: "error",
    recipientRole: "admin",
    isRead: false
  });

  // Broadcast WebSocket Alert
  emitToHospital(hospitalId, "supervisor_handover_alert", {
    nurseName,
    message: `Nurse ${nurseName} failed to complete shift handover. Immediate action required.`,
    timestamp: new Date()
  });

  res.json({ status: "success", message: "Supervisor alert dispatched successfully.", data: notification });
});

// 22. Send Note directly to Patient's Assigned Doctor
export const sendNoteToAssignedDoctor = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const { patientId, noteContent, observationType } = req.body;

  if (!patientId || !noteContent) {
    throw new AppError("Patient ID and Note Content are required.", 400);
  }

  const staff = await Staff.findOne({ email: req.user!.email });
  const recordedByName = staff?.name || req.user!.name || "Nurse";

  // Find active admission or patient details
  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  }).populate("patient", "name uhid").populate("admittingDoctor", "name specialization");

  let ptName = "Inpatient";
  let ptUhid = "";
  let doctorName = "Assigned Doctor";

  if (activeAdmission) {
    ptName = (activeAdmission.patient as any)?.name || ptName;
    ptUhid = (activeAdmission.patient as any)?.uhid || ptUhid;
    if (activeAdmission.admittingDoctor) {
      doctorName = (activeAdmission.admittingDoctor as any)?.name || doctorName;
    }
  } else {
    const pt = await Patient.findById(patientId);
    if (pt) {
      ptName = pt.name || ptName;
      ptUhid = pt.uhid || ptUhid || "N/A";
    }
  }

  // Trigger real-time notification to patient's assigned doctor
  const notif = await notifyAssignedDoctorForPatient({
    hospitalId,
    patientId,
    patientName: ptName,
    uhid: ptUhid,
    nurseName: recordedByName,
    title: "New Nursing Note",
    message: `A new nursing note has been sent for Patient ${ptName} by Nurse ${recordedByName}: "${noteContent.length > 60 ? noteContent.substring(0, 60) + '...' : noteContent}"`,
    severity: "info",
    extraData: {
      type: "nursing_note",
      observationType: observationType || "Clinical Note",
      noteContent
    }
  });

  res.json({
    status: "success",
    message: `Nursing note sent to ${doctorName} successfully!`,
    doctorName,
    notification: notif
  });
});

export const sendEmergencyAlertToDoctor = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const { patientId, alertType, notes } = req.body;

  if (!patientId || !alertType) {
    throw new AppError("Patient ID and Alert Type are required.", 400);
  }

  const staff = await Staff.findOne({ email: req.user!.email });
  const recordedByName = staff?.name || req.user!.name || "Nurse";

  // Find active admission details
  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $nin: ["discharged", "Discharged", "Cancelled", "Transferred Out (Final)", "DISCHARGED"] }
  }).populate("patient", "name uhid").populate("admittingDoctor", "name specialization");

  let ptName = "Inpatient";
  let ptUhid = "";
  let doctorName = "Assigned Doctor";

  if (activeAdmission) {
    ptName = (activeAdmission.patient as any)?.name || ptName;
    ptUhid = (activeAdmission.patient as any)?.uhid || ptUhid;
    if (activeAdmission.admittingDoctor) {
      doctorName = (activeAdmission.admittingDoctor as any)?.name || doctorName;
    }
  } else {
    const pt = await Patient.findById(patientId);
    if (pt) {
      ptName = pt.name || ptName;
      ptUhid = pt.uhid || ptUhid || "N/A";
    }
  }

  // Trigger real-time critical notification to patient's consulting doctor
  const notif = await notifyAssignedDoctorForPatient({
    hospitalId,
    patientId,
    patientName: ptName,
    uhid: ptUhid,
    nurseName: recordedByName,
    title: `EMERGENCY ALERT: ${alertType.toUpperCase()}`,
    message: `CRITICAL EMERGENCY ALERT: Nurse ${recordedByName} broadcasted ${alertType} for Patient ${ptName} (${ptUhid}). Notes: ${notes || "Immediate doctor assistance required."}`,
    severity: "critical",
    type: "general",
    extraData: {
      type: "emergency_alert",
      alertType,
      notes: notes || "Immediate medical attention needed."
    }
  });

  // Log emergency event to admission timeline if active admission exists
  if (activeAdmission) {
    activeAdmission.timeline.push({
      eventType: "emergency_alert",
      description: `[CRITICAL EMERGENCY] ${alertType} triggered by Nurse ${recordedByName}. Notes: ${notes || "None"}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userName: recordedByName
    } as any);
    await activeAdmission.save();
  }

  res.json({
    status: "success",
    message: `Emergency Alert broadcasted to Dr. ${doctorName} successfully!`,
    doctorName,
    patientName: ptName
  });
});


// Aliases for backwards compatibility with mobile and web routes
export const getNursesInpatients = getNurseInpatients;
export const getInpatientDetailsForNurse = getNurseInpatientDetails;
export const saveVitalsForNurse = saveNurseInpatientVitals;
export const administerMedication = administerNurseInpatientMed;
export const logFluid = saveNurseInpatientBedsideChecks;
export const getNurses = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const nurses = await User.find({
    hospital: hospitalId,
    role: "nurse",
    status: "active"
  }).select("name email employeeId avatarUrl");

  res.json({
    status: "success",
    data: nurses
  });
});

