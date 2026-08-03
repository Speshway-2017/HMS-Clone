import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { cloudinary } from "../config/cloudinary";
import { Doctor } from "../models/Doctor";
import { LabOrder } from "../models/LabOrder";
import { RadiologyOrder } from "../models/RadiologyOrder";
import { DiagnosticReport } from "../models/DiagnosticReport";
import { DbNotification } from "../models/DbNotification";
import { Patient } from "../models/Patient";
import { emitToDoctor, emitToHospital } from "../config/socket";
import { logAudit } from "../utils/auditLogger";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { notifyAssignedDoctorForPatient } from "../utils/autoNotifyAssignedDoctor";

async function findOrder(requestId: string) {
  let order: any = await LabOrder.findById(requestId).populate("patient").populate("doctor");
  let type: "Laboratory" | "Radiology" = "Laboratory";
  if (!order) {
    order = await RadiologyOrder.findById(requestId).populate("patient").populate("doctor");
    type = "Radiology";
  }
  return { order, type };
}

export const getRequests = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;

  const [labOrders, radOrders] = await Promise.all([
    LabOrder.find({ hospital: hospitalId })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("appointment", "referenceId chiefComplaint diagnosis clinicalNotes advice vitals")
      .sort({ createdAt: -1 }),
    RadiologyOrder.find({ hospital: hospitalId })
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("appointment", "referenceId chiefComplaint diagnosis clinicalNotes advice vitals")
      .sort({ createdAt: -1 })
  ]);

  // ─── Single map keyed by appointment ID ───────────────────────────────────
  // Both LabOrder and RadiologyOrder from the same appointment are MERGED into
  // ONE request entry so the lab dashboard shows a single row per consultation.
  const apptGroupMap = new Map<string, any>();
  const standaloneOrders: any[] = [];

  const priorityOrder: Record<string, number> = { "STAT": 3, "Urgent": 2, "Routine": 1 };
  const statusOrder: Record<string, number> = {
    "pending": 1, "accepted": 2, "processing": 3,
    "report_uploaded": 4, "verified": 5, "completed": 6
  };

  const mergeIntoGroup = (group: any, tests: string[], priority: string, status: string, sampleStatus: string, rejectionReason: string, type: "Laboratory" | "Radiology") => {
    // Merge tests
    tests.forEach((t: string) => { if (!group.tests.includes(t)) group.tests.push(t); });
    // Elevate priority
    if ((priorityOrder[priority] || 1) > (priorityOrder[group.priority] || 1)) group.priority = priority;
    // Lowest status wins
    if ((statusOrder[status] || 1) < (statusOrder[group.status] || 1)) {
      group.status = status;
      group.sampleStatus = sampleStatus;
      group.rejectionReason = rejectionReason;
    }
    // Track which types are present
    if (!group._types) group._types = new Set<string>();
    group._types.add(type);
  };

  // ── Process Lab orders ──
  labOrders.forEach(o => {
    if (o.appointment) {
      const apptId = (o.appointment as any)._id.toString();
      if (!apptGroupMap.has(apptId)) {
        apptGroupMap.set(apptId, {
          _id: o._id,
          patientId: (o.patient as any)?._id,
          patientName: (o.patient as any)?.name,
          patientAge: (o.patient as any)?.age,
          patientGender: (o.patient as any)?.gender,
          patientPhone: (o.patient as any)?.phone,
          patientUhid: (o.patient as any)?.uhid,
          orderedBy: (o.doctor as any)?.name,
          tests: [...o.tests],
          priority: o.priority,
          date: o.date,
          status: o.status,
          rejectionReason: o.rejectionReason,
          sampleStatus: o.sampleStatus,
          appointment: o.appointment,
          _types: new Set(["Laboratory"]),
        });
      } else {
        mergeIntoGroup(
          apptGroupMap.get(apptId),
          o.tests, o.priority, o.status, o.sampleStatus || "", o.rejectionReason || "", "Laboratory"
        );
      }
    } else {
      standaloneOrders.push({
        _id: o._id,
        patientId: (o.patient as any)?._id,
        patientName: (o.patient as any)?.name,
        patientAge: (o.patient as any)?.age,
        patientGender: (o.patient as any)?.gender,
        patientPhone: (o.patient as any)?.phone,
        patientUhid: (o.patient as any)?.uhid,
        orderedBy: (o.doctor as any)?.name,
        tests: o.tests,
        priority: o.priority,
        date: o.date,
        status: o.status,
        requestType: "Laboratory",
        rejectionReason: o.rejectionReason,
        sampleStatus: o.sampleStatus,
        appointment: null
      });
    }
  });

  // ── Process Radiology orders — merged into the SAME appointment group ──
  radOrders.forEach(o => {
    if (o.appointment) {
      const apptId = (o.appointment as any)._id.toString();
      if (!apptGroupMap.has(apptId)) {
        apptGroupMap.set(apptId, {
          _id: o._id,
          patientId: (o.patient as any)?._id,
          patientName: (o.patient as any)?.name,
          patientAge: (o.patient as any)?.age,
          patientGender: (o.patient as any)?.gender,
          patientPhone: (o.patient as any)?.phone,
          patientUhid: (o.patient as any)?.uhid,
          orderedBy: (o.doctor as any)?.name,
          tests: [o.type],
          priority: o.priority,
          date: o.date,
          status: o.status,
          rejectionReason: "",
          sampleStatus: "",
          appointment: o.appointment,
          _types: new Set(["Radiology"]),
        });
      } else {
        mergeIntoGroup(
          apptGroupMap.get(apptId),
          [o.type], o.priority, o.status, "", "", "Radiology"
        );
      }
    } else {
      standaloneOrders.push({
        _id: o._id,
        patientId: (o.patient as any)?._id,
        patientName: (o.patient as any)?.name,
        patientAge: (o.patient as any)?.age,
        patientGender: (o.patient as any)?.gender,
        patientPhone: (o.patient as any)?.phone,
        patientUhid: (o.patient as any)?.uhid,
        orderedBy: (o.doctor as any)?.name,
        tests: [o.type],
        priority: o.priority,
        date: o.date,
        status: o.status,
        requestType: "Radiology",
        rejectionReason: "",
        sampleStatus: "",
        appointment: null
      });
    }
  });

  // ── Finalise requestType label per group ──
  const groupedRows = Array.from(apptGroupMap.values()).map(group => {
    const types: Set<string> = group._types;
    let requestType = "Laboratory";
    if (types.has("Laboratory") && types.has("Radiology")) requestType = "Combined";
    else if (types.has("Radiology")) requestType = "Radiology";
    const { _types, ...rest } = group;
    return { ...rest, requestType };
  });

  const unified = [...groupedRows, ...standaloneOrders];

  res.json({ status: "success", data: unified });
});

export const acceptRequest = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const hospitalId = req.hospitalFilter!.hospital;
  const { order, type } = await findOrder(requestId);
  if (!order) throw new AppError("Request not found", 404);

  if (order.appointment) {
    // Propagate to all LabOrder AND RadiologyOrder documents in this appointment
    await Promise.all([
      LabOrder.updateMany(
        { appointment: order.appointment, hospital: hospitalId },
        { status: "accepted", sampleStatus: "Collected" }
      ),
      RadiologyOrder.updateMany(
        { appointment: order.appointment, hospital: hospitalId },
        { status: "accepted" }
      )
    ]);
  } else {
    order.status = "accepted";
    if (type === "Laboratory") order.sampleStatus = "Collected";
    await order.save();
  }

  if (hospitalId) {
    emitToHospital(hospitalId, "lab_order_updated", { requestId, status: "accepted" });
  }

  await logAudit({
    req,
    action: "ACCEPT_LAB_REQUEST",
    entity: "LabOrder",
    entityId: requestId,
    details: { type, status: "accepted" }
  });

  res.json({ status: "success", data: order });
});

export const rejectRequest = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const hospitalId = req.hospitalFilter!.hospital;
  const { rejectionReason } = req.body;
  const { order, type } = await findOrder(requestId);
  if (!order) throw new AppError("Request not found", 404);

  if (order.appointment) {
    await Promise.all([
      LabOrder.updateMany(
        { appointment: order.appointment, hospital: hospitalId },
        { status: "rejected", sampleStatus: "Rejected", rejectionReason: rejectionReason || "" }
      ),
      RadiologyOrder.updateMany(
        { appointment: order.appointment, hospital: hospitalId },
        { status: "rejected" }
      )
    ]);
  } else {
    order.status = "rejected";
    if (type === "Laboratory") order.sampleStatus = "Rejected";
    order.rejectionReason = rejectionReason || "";
    await order.save();
  }

  if (hospitalId) {
    emitToHospital(hospitalId, "lab_order_updated", { requestId, status: "rejected" });
  }

  await logAudit({
    req,
    action: "REJECT_LAB_REQUEST",
    entity: "LabOrder",
    entityId: requestId,
    details: { type, status: "rejected", rejectionReason }
  });

  res.json({ status: "success", data: order });
});

export const startProcessing = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const hospitalId = req.hospitalFilter!.hospital;
  const { order, type } = await findOrder(requestId);
  if (!order) throw new AppError("Request not found", 404);

  if (order.appointment) {
    await Promise.all([
      LabOrder.updateMany(
        { appointment: order.appointment, hospital: hospitalId },
        { status: "processing", sampleStatus: "Processing" }
      ),
      RadiologyOrder.updateMany(
        { appointment: order.appointment, hospital: hospitalId },
        { status: "processing" }
      )
    ]);
  } else {
    order.status = "processing";
    if (type === "Laboratory") order.sampleStatus = "Processing";
    await order.save();
  }

  if (hospitalId) {
    emitToHospital(hospitalId, "lab_order_updated", { requestId, status: "processing" });
  }

  await logAudit({
    req,
    action: "START_LAB_PROCESSING",
    entity: "LabOrder",
    entityId: requestId,
    details: { type, status: "processing" }
  });

  res.json({ status: "success", data: order });
});

export const uploadReport = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const files = req.files as Express.Multer.File[];

  const { order, type } = await findOrder(requestId);
  if (!order) throw new AppError("Request not found", 404);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const hospital = await mongoose.model("Hospital").findById(order.hospital).session(session);
    const radTests = hospital?.availableRadiologyTests || [];

    // Check if we received structured reports data
    if (req.body.reportsData) {
      const reportsList = JSON.parse(req.body.reportsData) as Array<{
        testName: string;
        observations: string;
        remarks: string;
      }>;

      const createdReports = [];

      for (const rep of reportsList) {
        // Find files matching this test
        const testFiles = files.filter(f => f.fieldname === `files_${rep.testName}`);
        const uploadedFiles = [];

        for (const file of testFiles) {
          const uploadResult = await new Promise<{ secure_url: string; public_id: string; resource_type: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: `hms/diagnostic-reports`, resource_type: "auto" },
              (error, uploadResult) => {
                if (error || !uploadResult) {
                  reject(error ?? new Error("Cloudinary upload failed."));
                  return;
                }
                resolve(uploadResult);
              }
            );
            stream.end(file.buffer);
          });

          uploadedFiles.push({
            public_id: uploadResult.public_id,
            secure_url: uploadResult.secure_url,
            original_filename: file.originalname,
            mime_type: file.mimetype,
            file_size: file.size
          });
        }

        // Determine if it is Lab or Radiology
        const isRadiology = type === "Radiology" || radTests.includes(rep.testName) || /mri|x-ray|xray|ct|ultrasound|scan|mammogram|pet|echo|ecg|radiology|usg/i.test(rep.testName);
        const requestType = isRadiology ? "Radiology" : "Laboratory";

        const report = await DiagnosticReport.create(
          [
            {
              hospital: order.hospital,
              patient: order.patient._id,
              doctor: order.doctor._id,
              appointment: order.appointment || new mongoose.Types.ObjectId(),
              requestType,
              requestId: order._id,
              testName: rep.testName,
              observations: rep.observations || "",
              remarks: rep.remarks || "",
              files: uploadedFiles,
              uploadedBy: req.user!._id,
              status: "report_uploaded"
            }
          ],
          { session }
        );
        createdReports.push(report[0]);
      }

      if (order.appointment) {
        await Promise.all([
          LabOrder.updateMany(
            { appointment: order.appointment, hospital: order.hospital },
            { status: "report_uploaded" },
            { session }
          ),
          RadiologyOrder.updateMany(
            { appointment: order.appointment, hospital: order.hospital },
            { status: "report_uploaded" },
            { session }
          )
        ]);
      } else {
        order.status = "report_uploaded";
        await order.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      if (order.hospital) {
        emitToHospital(order.hospital, "lab_report_uploaded", { requestId: order._id });
      }

      if (order.patient) {
        const ptName = (order.patient as any).name || "Patient";
        const ptUhid = (order.patient as any).uhid || "";
        await notifyAssignedDoctorForPatient({
          hospitalId: order.hospital,
          patientId: (order.patient as any)._id || order.patient,
          patientName: ptName,
          uhid: ptUhid,
          nurseName: (req.user as any)?.name || "Nurse",
          title: "New Patient Report Uploaded",
          message: `A new report has been uploaded for Patient ${ptName}.`,
          severity: "info",
          extraData: {
            type: "patient_report",
            reportType: type || "Clinical Report"
          }
        });
      }

      await logAudit({
        req,
        action: "UPLOAD_LAB_REPORT",
        entity: "DiagnosticReport",
        entityId: order._id.toString(),
        details: { requestType: type }
      });

      return res.status(201).json({ status: "success", data: { reports: createdReports, order } });
    } else {
      // Fallback to legacy single report behavior
      if (!files || files.length === 0) {
        throw new AppError("At least one report file is required.", 400);
      }
      const { observations, remarks } = req.body;
      const uploadedFiles = [];
      for (const file of files) {
        const uploadResult = await new Promise<{ secure_url: string; public_id: string; resource_type: string }>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: `hms/diagnostic-reports`, resource_type: "auto" },
            (error, uploadResult) => {
              if (error || !uploadResult) {
                reject(error ?? new Error("Cloudinary upload failed."));
                return;
              }
              resolve(uploadResult);
            }
          );
          stream.end(file.buffer);
        });

        uploadedFiles.push({
          public_id: uploadResult.public_id,
          secure_url: uploadResult.secure_url,
          original_filename: file.originalname,
          mime_type: file.mimetype,
          file_size: file.size
        });
      }

      let testNames = "";
      if (order.appointment) {
        const [relatedLab, relatedRad] = await Promise.all([
          LabOrder.find({ appointment: order.appointment, hospital: order.hospital }).session(session),
          RadiologyOrder.find({ appointment: order.appointment, hospital: order.hospital }).session(session)
        ]);
        const allTests = Array.from(new Set([
          ...relatedLab.flatMap(o => o.tests),
          ...relatedRad.map(o => o.type)
        ]));
        testNames = allTests.join(", ");
      } else if (type === "Laboratory") {
        testNames = order.tests.join(", ");
      } else {
        testNames = order.type;
      }

      const report = await DiagnosticReport.create(
        [
          {
            hospital: order.hospital,
            patient: order.patient._id,
            doctor: order.doctor._id,
            appointment: order.appointment || new mongoose.Types.ObjectId(),
            requestType: type,
            requestId: order._id,
            testName: testNames,
            observations: observations || "",
            remarks: remarks || "",
            files: uploadedFiles,
            uploadedBy: req.user!._id,
            status: "report_uploaded"
          }
        ],
        { session }
      );

      if (order.appointment) {
        await Promise.all([
          LabOrder.updateMany(
            { appointment: order.appointment, hospital: order.hospital },
            { status: "report_uploaded" },
            { session }
          ),
          RadiologyOrder.updateMany(
            { appointment: order.appointment, hospital: order.hospital },
            { status: "report_uploaded" },
            { session }
          )
        ]);
      } else {
        order.status = "report_uploaded";
        await order.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      if (order.hospital) {
        emitToHospital(order.hospital, "lab_report_uploaded", { requestId: order._id });
      }

      await logAudit({
        req,
        action: "UPLOAD_LAB_REPORT",
        entity: "DiagnosticReport",
        entityId: order._id.toString(),
        details: { requestType: type }
      });

      res.status(201).json({ status: "success", data: { report: report[0], order } });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const verifyReport = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { order, type } = await findOrder(requestId);
  if (!order) throw new AppError("Request not found", 404);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (order.appointment) {
      await Promise.all([
        LabOrder.updateMany(
          { appointment: order.appointment, hospital: order.hospital },
          { status: "verified" },
          { session }
        ),
        RadiologyOrder.updateMany(
          { appointment: order.appointment, hospital: order.hospital },
          { status: "verified" },
          { session }
        )
      ]);
    } else {
      order.status = "verified";
      await order.save({ session });
    }

    await DiagnosticReport.findOneAndUpdate(
      { requestId: order._id },
      { status: "verified" },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ status: "success", data: order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const publishReport = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { order, type } = await findOrder(requestId);
  if (!order) throw new AppError("Request not found", 404);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (order.appointment) {
      await Promise.all([
        LabOrder.updateMany(
          { appointment: order.appointment, hospital: order.hospital },
          { status: "completed", sampleStatus: "Completed" },
          { session }
        ),
        RadiologyOrder.updateMany(
          { appointment: order.appointment, hospital: order.hospital },
          { status: "completed" },
          { session }
        )
      ]);
    } else {
      order.status = "completed";
      if (type === "Laboratory") order.sampleStatus = "Completed";
      await order.save({ session });
    }

    const report = await DiagnosticReport.findOneAndUpdate(
      { requestId: order._id },
      { status: "completed" },
      { new: true, session }
    );

    let testNames = "";
    if (order.appointment) {
      const [relatedLab, relatedRad] = await Promise.all([
        LabOrder.find({ appointment: order.appointment, hospital: order.hospital }).session(session),
        RadiologyOrder.find({ appointment: order.appointment, hospital: order.hospital }).session(session)
      ]);
      const allTests = Array.from(new Set([
        ...relatedLab.flatMap(o => o.tests),
        ...relatedRad.map(o => o.type)
      ]));
      testNames = allTests.join(", ");
    } else {
      testNames = type === "Laboratory" ? order.tests.join(", ") : order.type;
    }

    if (order.doctor) {
      await DbNotification.create(
        [
          {
            hospital: order.hospital,
            title: "Diagnostic Report Published",
            message: `The diagnostic report for patient ${order.patient.name} (${type}: ${testNames}) is now published and available.`,
            type: "general",
            severity: "info",
            recipientRole: "doctor",
            recipientDoctor: order.doctor._id,
            link: `/doctor/patient-records?patientId=${order.patient._id}&tab=4`,
            data: { patientId: order.patient._id, reportId: report?._id }
          }
        ],
        { session }
      );

      emitToDoctor(order.doctor._id.toString(), "notification:new", {
        title: "Diagnostic Report Published",
        message: `The diagnostic report for patient ${order.patient.name} is now available.`
      });
    }

    await DbNotification.create(
      [
        {
          hospital: order.hospital,
          title: "Diagnostic Report Ready",
          message: `Your ${type} report for ${testNames} is ready and has been shared with your doctor.`,
          type: "general",
          severity: "info",
          recipientRole: "patient",
          recipientPatient: order.patient._id,
          data: { reportId: report?._id }
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ status: "success", data: { order, report } });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});



export const getConsultationReports = catchAsync(async (req: Request, res: Response) => {
  const { consultationId } = req.params;
  const hospitalId = req.hospitalFilter!.hospital;

  const reports = await DiagnosticReport.find({
    hospital: hospitalId,
    appointment: consultationId,
    status: "completed"
  }).populate("uploadedBy", "name");

  if (req.user!.role === "doctor") {
    const doctor = await Doctor.findOne({ email: req.user!.email });
    if (!doctor) throw new AppError("Doctor profile not found.", 404);

    for (const report of reports) {
      if (report.doctor.toString() !== doctor._id.toString()) {
        throw new AppError("You are not authorized to view reports for this consultation.", 403);
      }
    }
  }

  res.json({ status: "success", data: reports });
});

export const getReportById = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const report = await DiagnosticReport.findById(reportId)
    .populate("patient")
    .populate("doctor")
    .populate("uploadedBy", "name");
  if (!report) throw new AppError("Report not found", 404);

  if (req.user!.role === "doctor") {
    const doctor = await Doctor.findOne({ email: req.user!.email });
    if (!doctor || report.doctor.toString() !== doctor._id.toString()) {
      throw new AppError("You are not authorized to view this report.", 403);
    }
  }

  res.json({ status: "success", data: report });
});

export const downloadReport = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const report = await DiagnosticReport.findById(reportId);
  if (!report) throw new AppError("Report not found", 404);

  if (req.user!.role === "doctor") {
    const doctor = await Doctor.findOne({ email: req.user!.email });
    if (!doctor || report.doctor.toString() !== doctor._id.toString()) {
      throw new AppError("You are not authorized to download this report.", 403);
    }
  }

  if (report.files.length === 0) {
    throw new AppError("No files associated with this report.", 400);
  }

  res.redirect(report.files[0].secure_url);
});

export const getPatientReports = catchAsync(async (req: Request, res: Response) => {
  const { patientId } = req.query;
  let resolvedPatientId = patientId;
  const hospitalId = req.hospitalFilter!.hospital;

  if (req.user!.role === "patient") {
    const patientDoc = await Patient.findOne({ email: req.user!.email });
    if (patientDoc) {
      resolvedPatientId = patientDoc._id.toString();
    } else {
      return res.json({ status: "success", data: [] });
    }
  }

  if (!resolvedPatientId) {
    throw new AppError("Patient ID is required.", 400);
  }

  const reports = await DiagnosticReport.find({
    hospital: hospitalId,
    patient: resolvedPatientId,
    status: { $in: ["report_uploaded", "verified", "completed"] }
  })
    .sort({ uploadedAt: -1 })
    .populate("uploadedBy", "name")
    .populate("doctor", "name title")
    .populate("appointment", "referenceId date time type chiefComplaint diagnosis");

  if (req.user!.role === "doctor") {
    const doctor = await Doctor.findOne({ email: req.user!.email });
    if (!doctor) throw new AppError("Doctor profile not found.", 404);

    const docIdStr = doctor._id.toString();
    const authorizedReports = reports.filter(r => {
      if (!r.doctor) return false;
      const repDocId = (r.doctor as any)._id ? (r.doctor as any)._id.toString() : r.doctor.toString();
      return repDocId === docIdStr;
    });
    return res.json({ status: "success", data: authorizedReports });
  }

  res.json({ status: "success", data: reports });
});
