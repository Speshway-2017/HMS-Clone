import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { cloudinary } from "../config/cloudinary";
import { Doctor } from "../models/Doctor";
import { LabOrder } from "../models/LabOrder";
import { RadiologyOrder } from "../models/RadiologyOrder";
import { DiagnosticReport } from "../models/DiagnosticReport";
import { DbNotification } from "../models/DbNotification";
import { Patient } from "../models/Patient";
import { Appointment } from "../models/Appointment";
import { Admission } from "../models/Admission";
import { Invoice } from "../models/Invoice";
import { emitToDoctor, emitToHospital } from "../config/socket";
import { logAudit } from "../utils/auditLogger";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { notifyAssignedDoctorForPatient } from "../utils/autoNotifyAssignedDoctor";

import { buildBranchQuery } from "../utils/branchQueryHelper";

async function findOrder(requestId: string, hospitalFilter?: any) {
  const filter = buildBranchQuery(hospitalFilter);
  const query: any = { _id: requestId, ...filter };
  let order: any = await LabOrder.findOne(query).populate("patient").populate("doctor");
  let type: "Laboratory" | "Radiology" = "Laboratory";
  if (!order) {
    order = await RadiologyOrder.findOne(query).populate("patient").populate("doctor");
    type = "Radiology";
  }
  return { order, type };
}

export const getRequests = catchAsync(async (req: Request, res: Response) => {
  const filter = buildBranchQuery(req.hospitalFilter);

  const [labOrders, radOrders, invoices] = await Promise.all([
    LabOrder.find(filter)
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("appointment", "referenceId chiefComplaint diagnosis clinicalNotes advice vitals")
      .sort({ createdAt: -1 }),
    RadiologyOrder.find(filter)
      .populate("patient", "name uhid age gender phone")
      .populate("doctor", "name")
      .populate("appointment", "referenceId chiefComplaint diagnosis clinicalNotes advice vitals")
      .sort({ createdAt: -1 }),
    Invoice.find({ ...filter, billingType: { $in: ["LAB", "RADIOLOGY"] } })
  ]);

  const paidApptSet = new Set<string>();
  const paidPatientSet = new Set<string>();
  const unpaidApptSet = new Set<string>();

  invoices.forEach((inv: any) => {
    const isPaid = inv.status === "paid" || inv.totals?.patientBalance === 0;
    if (inv.appointment) {
      if (isPaid) paidApptSet.add(inv.appointment.toString());
      else unpaidApptSet.add(inv.appointment.toString());
    }
    if (inv.patient) {
      if (isPaid) paidPatientSet.add(inv.patient.toString());
    }
  });

  const checkPaymentStatus = (o: any): "PAID" | "PAYMENT_PENDING" => {
    if (o.appointment) {
      const apptId = (o.appointment._id || o.appointment).toString();
      if (unpaidApptSet.has(apptId)) return "PAYMENT_PENDING";
      if (paidApptSet.has(apptId)) return "PAID";
    }
    return "PAID";
  };

  const apptGroupMap = new Map<string, any>();
  const standaloneOrders: any[] = [];

  const priorityOrder: Record<string, number> = { "STAT": 3, "Urgent": 2, "Routine": 1 };
  const statusOrder: Record<string, number> = {
    "pending": 1, "accepted": 2, "processing": 3,
    "report_uploaded": 4, "verified": 5, "completed": 6
  };

  const mergeIntoGroup = (group: any, tests: string[], priority: string, status: string, sampleStatus: string, rejectionReason: string, type: "Laboratory" | "Radiology") => {
    tests.forEach((t: string) => { if (!group.tests.includes(t)) group.tests.push(t); });
    if ((priorityOrder[priority] || 1) > (priorityOrder[group.priority] || 1)) group.priority = priority;
    if ((statusOrder[status] || 1) < (statusOrder[group.status] || 1)) {
      group.status = status;
      group.sampleStatus = sampleStatus;
      group.rejectionReason = rejectionReason;
    }
    if (!group._types) group._types = new Set<string>();
    group._types.add(type);
  };

  labOrders.forEach(o => {
    const paymentStatus = checkPaymentStatus(o);
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
          paymentStatus,
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
        paymentStatus,
        requestType: "Laboratory",
        rejectionReason: o.rejectionReason,
        sampleStatus: o.sampleStatus,
        appointment: null
      });
    }
  });

  radOrders.forEach(o => {
    const paymentStatus = checkPaymentStatus(o);
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
          paymentStatus,
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
        paymentStatus,
        requestType: "Radiology",
        rejectionReason: "",
        sampleStatus: "",
        appointment: null
      });
    }
  });

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
  const { order, type } = await findOrder(requestId, hospitalId);
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
  const { order, type } = await findOrder(requestId, hospitalId);
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
  const { order, type } = await findOrder(requestId, hospitalId);
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
  const hospitalId = req.hospitalFilter!.hospital;
  const files = req.files as Express.Multer.File[];

  const { order, type } = await findOrder(requestId, hospitalId);
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

        // Prevent duplicate: check if a DiagnosticReport already exists for this requestId + testName
        const existingReport = await DiagnosticReport.findOne({
          requestId: order._id,
          testName: rep.testName
        }).session(session);

        let report;
        if (existingReport) {
          // Archive current content as a version before overwriting
          const versionEntry = {
            version: existingReport.version || 1,
            observations: existingReport.observations || "",
            remarks: existingReport.remarks || "",
            files: existingReport.files || [],
            editedBy: req.user!._id,
            editedAt: new Date()
          };
          existingReport.versions = existingReport.versions || [];
          existingReport.versions.push(versionEntry as any);
          existingReport.version = (existingReport.version || 1) + 1;
          existingReport.observations = rep.observations ? String(rep.observations).trim().slice(0, 5000) : existingReport.observations;
          existingReport.remarks = rep.remarks ? String(rep.remarks).trim().slice(0, 2000) : existingReport.remarks;
          if (uploadedFiles.length > 0) existingReport.files = uploadedFiles as any;
          existingReport.status = "completed";
          existingReport.uploadedBy = req.user!._id as any;
          existingReport.uploadedAt = new Date();
          await existingReport.save({ session });
          report = existingReport;
        } else {
          const created = await DiagnosticReport.create(
            [
              {
                hospital: order.hospital,
                branch: order.branch || req.hospitalFilter?.branch || (req.user as any)?.branch || null,
                patient: order.patient._id,
                doctor: order.doctor._id,
                appointment: order.appointment || new mongoose.Types.ObjectId(),
                requestType,
                requestId: order._id,
                testName: rep.testName,
                observations: rep.observations ? String(rep.observations).trim().slice(0, 5000) : "",
                remarks: rep.remarks ? String(rep.remarks).trim().slice(0, 2000) : "",
                files: uploadedFiles,
                uploadedBy: req.user!._id,
                status: "completed",
                version: 1,
                versions: []
              }
            ],
            { session }
          );
          report = created[0];
        }
        createdReports.push(report);
      }

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
            branch: order.branch || req.hospitalFilter?.branch || (req.user as any)?.branch || null,
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
            status: "completed"
          }
        ],
        { session }
      );

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
  const hospitalId = req.hospitalFilter!.hospital;
  const { order, type } = await findOrder(requestId, hospitalId);
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
  const hospitalId = req.hospitalFilter!.hospital;
  const { order, type } = await findOrder(requestId, hospitalId);
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
  const hospitalId = req.hospitalFilter?.hospital;
  const query: any = { _id: reportId };
  if (hospitalId) query.hospital = hospitalId;
  const report = await DiagnosticReport.findOne(query)
    .populate("patient")
    .populate("doctor")
    .populate("uploadedBy", "name");
  if (!report) throw new AppError("Report not found", 404);

  if (req.user!.role === "doctor") {
    const doctor = await Doctor.findOne({ email: req.user!.email });
    if (!doctor) throw new AppError("Doctor profile not found", 404);
    const repDocId = (report.doctor as any)?._id
      ? (report.doctor as any)._id.toString()
      : report.doctor?.toString();
    if (repDocId !== doctor._id.toString()) {
      const isAssigned =
        (await Appointment.exists({ patient: report.patient, doctor: doctor._id, hospital: hospitalId })) ||
        (await Admission.exists({ patient: report.patient, doctor: doctor._id, hospital: hospitalId }));
      if (!isAssigned) {
        throw new AppError("You are not authorized to view this report.", 403);
      }
    }
  }

  res.json({ status: "success", data: report });
});

export const viewReport = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const hospitalId = req.hospitalFilter?.hospital;
  const query: any = { _id: reportId };
  if (hospitalId) query.hospital = hospitalId;
  const report = await DiagnosticReport.findOne(query)
    .populate("patient", "name uhid age gender")
    .populate("doctor", "name title specialization")
    .populate("uploadedBy", "name");
  if (!report) throw new AppError("Report not found", 404);

  if (req.user!.role === "doctor") {
    const doctor = await Doctor.findOne({ email: req.user!.email });
    if (!doctor) throw new AppError("Doctor profile not found", 404);
    const repDocId = (report.doctor as any)?._id
      ? (report.doctor as any)._id.toString()
      : report.doctor?.toString();
    if (repDocId !== doctor._id.toString()) {
      const isAssigned =
        (await Appointment.exists({ patient: report.patient, doctor: doctor._id, hospital: hospitalId })) ||
        (await Admission.exists({ patient: report.patient, doctor: doctor._id, hospital: hospitalId }));
      if (!isAssigned) {
        throw new AppError("You are not authorized to view this report.", 403);
      }
    }
  }

  const fileIndex = req.query.fileIndex !== undefined ? parseInt(String(req.query.fileIndex), 10) : 0;
  const targetFile = (report.files && report.files[fileIndex]) ? report.files[fileIndex] : (report.files?.[0]);

  if (targetFile?.secure_url) {
    return res.redirect(targetFile.secure_url);
  }

  const patient = report.patient as any;
  const doctor = report.doctor as any;
  const uploader = report.uploadedBy as any;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${report.testName} - Diagnostic Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem; margin: 0; }
        .card { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); padding: 2rem; border: 1px solid #e2e8f0; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #dcfce7; color: #15803d; text-transform: uppercase; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 13px; }
        .label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px; margin-bottom: 2px; }
        .val { font-weight: 600; color: #0f172a; }
        .section { margin-bottom: 1.5rem; }
        .section-title { font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; margin-bottom: 0.5rem; }
        .content-box { background: #f1f5f9; padding: 1rem; border-radius: 8px; font-size: 14px; white-space: pre-wrap; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div>
            <h1 style="margin: 0; font-size: 20px; color: #0f172a;">${report.testName}</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${report.requestType} Investigation Report · Ref #${report._id}</p>
          </div>
          <span class="badge">${report.status}</span>
        </div>
        <div class="grid">
          <div>
            <div class="label">Patient Name</div>
            <div class="val">${patient?.name || "N/A"}</div>
          </div>
          <div>
            <div class="label">UHID</div>
            <div class="val">${patient?.uhid || "N/A"}</div>
          </div>
          <div>
            <div class="label">Age / Gender</div>
            <div class="val">${patient?.age ? patient.age + " Yrs" : "—"} / ${patient?.gender || "—"}</div>
          </div>
          <div>
            <div class="label">Ordering Doctor</div>
            <div class="val">Dr. ${doctor?.name || "Attending Physician"}</div>
          </div>
          <div>
            <div class="label">Date Published</div>
            <div class="val">${new Date(report.uploadedAt).toLocaleString()}</div>
          </div>
          <div>
            <div class="label">Processed By</div>
            <div class="val">${uploader?.name || "Staff"}</div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Findings / Observations</div>
          <div class="content-box">${report.observations || "No specific observations recorded."}</div>
        </div>
        <div class="section">
          <div class="section-title">Technical Remarks</div>
          <div class="content-box" style="background: #fffbeb; color: #92400e;">${report.remarks || "No technical remarks."}</div>
        </div>
      </div>
    </body>
    </html>
  `);
});

export const downloadReport = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const hospitalId = req.hospitalFilter?.hospital;
  const query: any = { _id: reportId };
  if (hospitalId) query.hospital = hospitalId;
  const report = await DiagnosticReport.findOne(query);
  if (!report) throw new AppError("Report not found", 404);

  if (req.user!.role === "doctor") {
    const doctor = await Doctor.findOne({ email: req.user!.email });
    if (!doctor) throw new AppError("Doctor profile not found", 404);
    const repDocId = (report.doctor as any)?._id
      ? (report.doctor as any)._id.toString()
      : report.doctor?.toString();
    if (repDocId !== doctor._id.toString()) {
      const isAssigned =
        (await Appointment.exists({ patient: report.patient, doctor: doctor._id, hospital: hospitalId })) ||
        (await Admission.exists({ patient: report.patient, doctor: doctor._id, hospital: hospitalId }));
      if (!isAssigned) {
        throw new AppError("You are not authorized to download this report.", 403);
      }
    }
  }

  const fileIndex = req.query.fileIndex !== undefined ? parseInt(String(req.query.fileIndex), 10) : 0;
  const targetFile = (report.files && report.files[fileIndex]) ? report.files[fileIndex] : (report.files?.[0]);

  if (!targetFile || !targetFile.secure_url) {
    const safeName = (report.testName || "Diagnostic_Report").replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_${report._id}.txt"`);
    return res.send(
      `Hospital Management System - Diagnostic Report\n` +
      `---------------------------------------------\n` +
      `Test Name: ${report.testName}\n` +
      `Type: ${report.requestType}\n` +
      `Status: ${report.status}\n` +
      `Date: ${new Date(report.uploadedAt).toLocaleString()}\n` +
      `Observations:\n${report.observations || "No specific observations logged."}\n\n` +
      `Technical Remarks:\n${report.remarks || "No technical remarks."}\n`
    );
  }

  let downloadUrl = targetFile.secure_url;
  const originalName = targetFile.original_filename || `${report.testName}_${report._id}.pdf`;
  const cleanFilename = originalName.replace(/[^\w.-]/g, "_");

  if (downloadUrl.includes("res.cloudinary.com") && downloadUrl.includes("/upload/")) {
    downloadUrl = downloadUrl.replace(
      /\/upload\/(?:fl_attachment[^/]*\/)?/,
      `/upload/fl_attachment:${encodeURIComponent(cleanFilename)}/`
    );
  }

  res.setHeader("Content-Disposition", `attachment; filename="${cleanFilename}"`);
  return res.redirect(downloadUrl);
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

export const collectSample = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const hospitalId = req.hospitalFilter!.hospital;
  const { sampleId, sampleType, collectedBy } = req.body;

  const { order } = await findOrder(requestId, hospitalId);
  if (!order) throw new AppError("Request not found", 404);

  const sampleDetails = {
    sampleId: sampleId || `SMP-${Date.now().toString().slice(-6)}`,
    sampleType: sampleType || "Blood",
    collectedBy: collectedBy || (req.user as any)?.name || "Lab Technician",
    collectedAt: new Date(),
  };

  if (order.appointment) {
    await LabOrder.updateMany(
      { appointment: order.appointment, hospital: hospitalId },
      { status: "Sample Collection", sampleStatus: "Collected", sampleDetails }
    );
  } else {
    order.status = "Sample Collection";
    order.sampleStatus = "Collected";
    order.sampleDetails = sampleDetails;
    await order.save();
  }

  if (hospitalId) {
    emitToHospital(hospitalId, "lab_order_updated", { requestId, status: "Sample Collection", sampleStatus: "Collected" });
  }

  res.json({ status: "success", data: order });
});

export const submitResults = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const hospitalId = req.hospitalFilter!.hospital;
  const { results } = req.body;

  const { order } = await findOrder(requestId, hospitalId);
  if (!order) throw new AppError("Request not found", 404);

  if (order.appointment) {
    await LabOrder.updateMany(
      { appointment: order.appointment, hospital: hospitalId },
      { status: "Quality Check", sampleStatus: "Processing", results: results || [] }
    );
  } else {
    order.status = "Quality Check";
    order.sampleStatus = "Processing";
    if (results) order.results = results;
    await order.save();
  }

  if (hospitalId) {
    emitToHospital(hospitalId, "lab_order_updated", { requestId, status: "Quality Check" });
  }

  res.json({ status: "success", data: order });
});

export const getCompletedReports = catchAsync(async (req: Request, res: Response) => {
  const filter = {
    ...buildBranchQuery(req.hospitalFilter),
    status: { $in: ["completed", "report_uploaded", "verified"] }
  };

  const reports = await DiagnosticReport.find(filter)
    .sort({ updatedAt: -1, createdAt: -1 })
    .populate("patient", "name uhid age gender phone")
    .populate("doctor", "name specialization")
    .populate("uploadedBy", "name email role")
    .populate("appointment", "referenceId date time chiefComplaint diagnosis");

  res.json({ status: "success", data: reports });
});

export const editReport = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const files = req.files as Express.Multer.File[];

  const report = await DiagnosticReport.findById(reportId);
  if (!report) throw new AppError("Diagnostic report not found", 404);

  const { observations, remarks } = req.body;

  const currentVersionData = {
    version: report.version || 1,
    observations: report.observations || "",
    remarks: report.remarks || "",
    files: report.files || [],
    editedBy: req.user!._id,
    editedAt: new Date()
  };

  report.versions = report.versions || [];
  report.versions.push(currentVersionData as any);
  report.version = (report.version || 1) + 1;

  if (observations !== undefined) report.observations = String(observations).trim().slice(0, 5000);
  if (remarks !== undefined) report.remarks = String(remarks).trim().slice(0, 2000);

  if (files && files.length > 0) {
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
    report.files = uploadedFiles as any;
  }

  await report.save();

  if (report.patient) {
    const ptName = (report.patient as any).name || "Patient";
    const ptUhid = (report.patient as any).uhid || "";
    await notifyAssignedDoctorForPatient({
      hospitalId: report.hospital,
      patientId: (report.patient as any)._id || report.patient,
      patientName: ptName,
      uhid: ptUhid,
      nurseName: (req.user as any)?.name || "Lab Staff",
      title: `Lab Report Updated (v${report.version})`,
      message: `Diagnostic report for ${report.testName} (Patient ${ptName}) has been updated to Version ${report.version}.`,
      severity: "info",
      extraData: {
        type: "patient_report_updated",
        reportId: report._id
      }
    });
  }

  await logAudit({
    req,
    action: "EDIT_LAB_REPORT",
    entity: "DiagnosticReport",
    entityId: report._id.toString(),
    details: { version: report.version }
  });

  res.json({ status: "success", data: report });
});
