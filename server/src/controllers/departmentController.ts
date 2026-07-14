import { Request, Response } from "express";
import { z } from "zod";
import { Department, DEPARTMENT_STATUSES } from "../models/Department";
import { Doctor } from "../models/Doctor";
import { Appointment } from "../models/Appointment";
import { Admission } from "../models/Admission";
import { AuditLog } from "../models/AuditLog";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { emitToHospital } from "../config/socket";

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const DEPT_CODE_RE = /^[A-Za-z0-9\-_]{1,20}$/;

const departmentSchema = z.object({
  hospital: z.string().optional(),
  branch: z.string().optional().nullable(),
  name: z.string().min(1),
  code: z.string().optional().default(""),
  description: z.string().optional().default(""),
  specialization: z.string().optional().default(""),
  category: z.string().optional().default("general"),
  headName: z.string().optional().default(""),
  departmentHead: z.string().optional().nullable(),
  location: z.string().optional().default(""),
  floor: z.string().optional().default(""),
  building: z.string().optional().default(""),
  totalBeds: z.coerce.number().min(0).optional().default(0),
  occupiedBeds: z.coerce.number().min(0).optional().default(0),
  doctors: z.coerce.number().min(0).optional().default(0),
  nurses: z.coerce.number().min(0).optional().default(0),
  support: z.coerce.number().min(0).optional().default(0),
  services: z.array(z.string()).optional().default([]),
  rating: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(DEPARTMENT_STATUSES).optional(),
  consultationFee: z.coerce.number().min(0).optional().default(0),
  isEmergency: z.boolean().optional().default(false),
  colorTheme: z.string().optional().default(""),
  displayOrder: z.coerce.number().optional().default(0),
});

const updateDepartmentSchema = departmentSchema.partial().extend({
  name: z.string().min(1, "Department name is required").trim().optional(),
  code: z
    .string()
    .trim()
    .refine((v) => v === "" || DEPT_CODE_RE.test(v), {
      message: "Department code must be 1–20 alphanumeric/dash/underscore characters.",
    })
    .optional(),
  consultationFee: z.coerce
    .number()
    .min(0, "Consultation fee cannot be negative.")
    .optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract IP from request (proxy-aware) */
function getIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "";
}

/** Pick only the fields relevant for the audit diff snapshot */
function pickAuditFields(doc: Record<string, unknown>): Record<string, unknown> {
  const AUDIT_FIELDS = [
    "name", "code", "description", "specialization", "category",
    "headName", "departmentHead", "location", "floor", "building",
    "status", "consultationFee", "isEmergency", "colorTheme", "displayOrder",
    "isDisabled",
  ];
  return Object.fromEntries(AUDIT_FIELDS.map((k) => [k, doc[k]]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────────────────────────────────────

export const listDepartments = catchAsync(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { ...req.hospitalFilter };

  const departments = await Department.find(filter)
    .populate("hospital", "name")
    .populate("departmentHead", "name specialization")
    .sort({ displayOrder: 1, createdAt: -1 });

  res.json({ status: "success", data: { departments } });
});

export const createDepartment = catchAsync(async (req: Request, res: Response) => {
  const body = departmentSchema.parse(req.body);
  const hospital = (body.hospital && body.hospital.trim()) || (req.hospitalFilter?.hospital as string | undefined);
  if (!hospital) {
    throw new AppError("A hospital must be specified.", 400);
  }

  // Uniqueness check for name
  const trimmedName = body.name.trim();
  const existingName = await Department.findOne({ hospital, name: { $regex: `^${trimmedName}$`, $options: "i" } });
  if (existingName) {
    throw new AppError(`A department named "${trimmedName}" already exists.`, 409);
  }

  // Uniqueness check for code (if provided)
  if (body.code && body.code.trim()) {
    const existingCode = await Department.findOne({ hospital, code: body.code.trim() });
    if (existingCode) {
      throw new AppError(`Department code "${body.code.trim()}" is already in use.`, 409);
    }
  }

  const cleanBody = {
    ...body,
    name: trimmedName,
    code: body.code?.trim() ?? "",
    hospital,
    branch: (body.branch && body.branch.trim()) || null,
    departmentHead: body.departmentHead || null,
  };

  const department = await Department.create(cleanBody);
  res.status(201).json({ status: "success", data: { department } });
});

export const getDepartment = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findOne({ _id: req.params.id, ...req.hospitalFilter })
    .populate("hospital", "name")
    .populate("departmentHead", "name specialization");
  if (!department) {
    throw new AppError("Department not found.", 404);
  }
  res.json({ status: "success", data: { department } });
});

export const updateDepartment = catchAsync(async (req: Request, res: Response) => {
  const body = updateDepartmentSchema.parse(req.body);

  // Fetch current state for audit diff
  const existing = await Department.findOne({ _id: req.params.id, ...req.hospitalFilter });
  if (!existing) {
    throw new AppError("Department not found.", 404);
  }

  const hospital = (existing.hospital as unknown as string).toString();

  // ── Uniqueness validation ────────────────────────────────────────────────

  if (body.name !== undefined) {
    const trimmedName = body.name.trim();
    if (!trimmedName) {
      throw new AppError("Department name cannot be empty.", 400);
    }
    const dupName = await Department.findOne({
      hospital,
      name: { $regex: `^${trimmedName}$`, $options: "i" },
      _id: { $ne: existing._id },
    });
    if (dupName) {
      throw new AppError(`A department named "${trimmedName}" already exists.`, 409);
    }
    body.name = trimmedName;
  }

  if (body.code !== undefined && body.code.trim()) {
    const trimmedCode = body.code.trim();
    if (!DEPT_CODE_RE.test(trimmedCode)) {
      throw new AppError("Department code must be 1–20 alphanumeric/dash/underscore characters.", 400);
    }
    const dupCode = await Department.findOne({
      hospital,
      code: trimmedCode,
      _id: { $ne: existing._id },
    });
    if (dupCode) {
      throw new AppError(`Department code "${trimmedCode}" is already in use.`, 409);
    }
    body.code = trimmedCode;
  }

  if (body.consultationFee !== undefined && body.consultationFee < 0) {
    throw new AppError("Consultation fee cannot be negative.", 400);
  }

  // ── Build update payload ─────────────────────────────────────────────────

  const cleanBody: Record<string, unknown> = { ...body };
  if (body.branch === "") cleanBody.branch = null;
  if (body.departmentHead === "" || body.departmentHead === null) cleanBody.departmentHead = null;

  // ── Capture old values for audit ─────────────────────────────────────────
  const oldValues = pickAuditFields(existing.toObject() as Record<string, unknown>);

  // ── Persist update ───────────────────────────────────────────────────────
  const updated = await Department.findOneAndUpdate(
    { _id: req.params.id, ...req.hospitalFilter },
    cleanBody,
    { new: true, runValidators: true },
  ).populate("departmentHead", "name specialization");

  if (!updated) {
    throw new AppError("Department not found.", 404);
  }

  const newValues = pickAuditFields(updated.toObject() as Record<string, unknown>);

  // ── Write audit log ──────────────────────────────────────────────────────
  if (req.user) {
    await AuditLog.create({
      hospital,
      user: req.user._id,
      action: "department_updated",
      details: `Department "${updated.name}" updated.`,
      ipAddress: getIp(req),
      resource: "department",
      resourceId: updated._id,
      oldValues,
      newValues,
    });
  }

  // ── Emit real-time update ────────────────────────────────────────────────
  emitToHospital(hospital, "department:updated", { department: updated });

  res.json({ status: "success", data: { department: updated } });
});

export const toggleDepartmentStatus = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findOne({ _id: req.params.id, ...req.hospitalFilter });
  if (!department) {
    throw new AppError("Department not found.", 404);
  }

  const newDisabledState = !department.isDisabled;
  const hospital = department.hospital.toString();

  department.isDisabled = newDisabledState;
  department.disabledAt = newDisabledState ? new Date() : null;
  department.disabledBy = newDisabledState && req.user ? req.user._id : null;
  await department.save();

  // Audit log
  if (req.user) {
    await AuditLog.create({
      hospital,
      user: req.user._id,
      action: newDisabledState ? "department_disabled" : "department_enabled",
      details: `Department "${department.name}" ${newDisabledState ? "disabled" : "enabled"}.`,
      ipAddress: getIp(req),
      resource: "department",
      resourceId: department._id,
      oldValues: { isDisabled: !newDisabledState },
      newValues: { isDisabled: newDisabledState },
    });
  }

  // Socket event
  emitToHospital(hospital, "department:statusChanged", {
    departmentId: department._id.toString(),
    isDisabled: newDisabledState,
  });

  res.json({
    status: "success",
    data: { department, message: newDisabledState ? "Department disabled." : "Department enabled." },
  });
});

export const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findOne({ _id: req.params.id, ...req.hospitalFilter });
  if (!department) {
    throw new AppError("Department not found.", 404);
  }

  const deptId = department._id;
  const hospital = department.hospital.toString();

  // ── Dependency guard ─────────────────────────────────────────────────────
  const [doctorCount, appointmentCount, admissionCount] = await Promise.all([
    Doctor.countDocuments({ department: deptId }),
    Appointment.countDocuments({ department: deptId }),
    Admission.countDocuments({ department: deptId }),
  ]);

  if (doctorCount > 0 || appointmentCount > 0 || admissionCount > 0) {
    const parts: string[] = [];
    if (doctorCount > 0) parts.push(`${doctorCount} doctor(s)`);
    if (appointmentCount > 0) parts.push(`${appointmentCount} appointment(s)`);
    if (admissionCount > 0) parts.push(`${admissionCount} admission(s)`);
    throw new AppError(
      `This department is already in use and cannot be deleted. It is referenced by: ${parts.join(", ")}.`,
      409,
    );
  }

  await Department.findByIdAndDelete(deptId);

  // Audit log
  if (req.user) {
    await AuditLog.create({
      hospital,
      user: req.user._id,
      action: "department_deleted",
      details: `Department "${department.name}" deleted.`,
      ipAddress: getIp(req),
      resource: "department",
      resourceId: deptId,
      oldValues: { name: department.name, code: department.code },
      newValues: null,
    });
  }

  // Socket event
  emitToHospital(hospital, "department:deleted", { departmentId: deptId.toString() });

  res.status(204).send();
});

export const getDepartmentMetrics = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findOne({ _id: req.params.id, ...req.hospitalFilter })
    .populate("hospital", "name")
    .populate("departmentHead", "name specialization");
  if (!department) {
    throw new AppError("Department not found.", 404);
  }

  const bedOccupancyPercent =
    department.totalBeds > 0 ? Math.round((department.occupiedBeds / department.totalBeds) * 100) : 0;

  res.json({
    status: "success",
    data: {
      department,
      bedOccupancy: { percent: bedOccupancyPercent, occupied: department.occupiedBeds, total: department.totalBeds },
      patientVolumeTrend: { pending: true, data: [] },
      staffPerformance: { pending: true, data: [] },
    },
  });
});
