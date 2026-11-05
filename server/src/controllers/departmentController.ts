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
import {
  requiredTrimmedString,
  optionalTrimmedString,
  codeValidator,
  numberValidator,
} from "../utils/validators";

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const DEPT_CODE_RE = /^[A-Za-z0-9\-_]{1,20}$/;

const departmentSchema = z.object({
  hospital: z.string().optional(),
  branch: z.string().optional().nullable(),
  name: z.string().trim().min(1, "Department name is required").max(50, "Department name cannot exceed 50 characters"),
  code: z.string().trim().max(20, "Department code cannot exceed 20 characters").optional().default(""),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional().default(""),
  specialization: z.string().trim().max(100, "Specialization cannot exceed 100 characters").optional().default(""),
  category: z.string().optional().default("general"),
  headName: z.string().trim().max(100, "Department Head cannot exceed 100 characters").optional().default(""),
  departmentHead: z.string().optional().nullable(),
  location: z.string().trim().max(100, "Location cannot exceed 100 characters").optional().default(""),
  floor: z.string().trim().max(50, "Floor cannot exceed 50 characters").optional().default(""),
  building: z.string().trim().max(50, "Building cannot exceed 50 characters").optional().default(""),
  totalBeds: z.coerce.number().min(0, "Total beds cannot be negative").max(9999, "Total beds cannot exceed 9999").optional().default(0),
  occupiedBeds: z.coerce.number().min(0, "Occupied beds cannot be negative").max(9999, "Occupied beds cannot exceed 9999").optional().default(0),
  doctors: z.coerce.number().min(0, "Doctors cannot be negative").max(9999, "Doctors cannot exceed 9999").optional().default(0),
  nurses: z.coerce.number().min(0, "Nurses cannot be negative").max(9999, "Nurses cannot exceed 9999").optional().default(0),
  support: z.coerce.number().min(0, "Support staff cannot be negative").max(9999, "Support staff cannot exceed 9999").optional().default(0),
  services: z.array(z.string()).optional().default([]),
  rating: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(DEPARTMENT_STATUSES).optional(),
  consultationFee: z.coerce.number().min(0, "Consultation fee cannot be negative").max(100000, "Consultation fee cannot exceed 100,000").optional().default(0),
  isEmergency: z.boolean().optional().default(false),
  colorTheme: z.string().optional().default(""),
  displayOrder: z.coerce.number().min(0, "Display order cannot be negative").max(9999, "Display order cannot exceed 9999").optional().default(0),
});

const updateDepartmentSchema = departmentSchema.partial().extend({
  name: z.string().trim().min(1, "Department name is required").max(50, "Department name cannot exceed 50 characters").optional(),
  code: z
    .string()
    .trim()
    .max(20, "Department code cannot exceed 20 characters")
    .refine((v) => v === "" || DEPT_CODE_RE.test(v), {
      message: "Department code must be 1–20 alphanumeric/dash/underscore characters.",
    })
    .optional(),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional(),
  specialization: z.string().trim().max(100, "Specialization cannot exceed 100 characters").optional(),
  headName: z.string().trim().max(100, "Department Head cannot exceed 100 characters").optional(),
  location: z.string().trim().max(100, "Location cannot exceed 100 characters").optional(),
  floor: z.string().trim().max(50, "Floor cannot exceed 50 characters").optional(),
  building: z.string().trim().max(50, "Building cannot exceed 50 characters").optional(),
  consultationFee: z.coerce
    .number()
    .min(0, "Consultation fee cannot be negative.")
    .max(100000, "Consultation fee cannot exceed 100,000.")
    .optional(),
  displayOrder: z.coerce
    .number()
    .min(0, "Display order cannot be negative.")
    .max(9999, "Display order cannot exceed 9999.")
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

import { Branch } from "../models/Branch";

// ─────────────────────────────────────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────────────────────────────────────

export const listDepartments = catchAsync(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { ...req.hospitalFilter };

  if (req.user?.role === "patient" || !filter.hospital) {
    delete filter.hospital;
    delete filter.branch;
  }

  if (req.query.activeOnly === "true" || req.query.active === "true") {
    filter.isDisabled = { $ne: true };
  }

  const departments = await Department.find(filter)
    .populate("hospital", "name")
    .populate("branch", "name")
    .populate("departmentHead", "name specialization")
    .sort({ displayOrder: 1, createdAt: -1 });

  res.json({ status: "success", data: { departments } });
});

export const createDepartment = catchAsync(async (req: Request, res: Response) => {
  const body = departmentSchema.parse(req.body);
  const hospitalRaw = (body.hospital && body.hospital.trim()) || req.hospitalFilter?.hospital || req.user?.hospital;
  if (!hospitalRaw) {
    throw new AppError("A hospital must be specified.", 400);
  }
  const hospital = hospitalRaw.toString();
  const targetBranch = (body.branch && body.branch.trim()) || (req.hospitalFilter?.branch ? req.hospitalFilter.branch.toString() : null);

  // Uniqueness check for name within hospital & branch
  const trimmedName = body.name.trim();
  const existingName = await Department.findOne({
    hospital,
    branch: targetBranch,
    name: { $regex: `^${trimmedName}$`, $options: "i" },
  });
  if (existingName) {
    throw new AppError(`A department named "${trimmedName}" already exists for this hospital/branch.`, 409);
  }

  // Auto-generate code if empty, or enforce uniqueness
  let code = body.code?.trim() ?? "";
  if (!code) {
    const cleanWords = trimmedName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    const baseCode = (cleanWords[0]?.slice(0, 6) || "DEPT").toUpperCase();
    let num = 1;
    let candidate = `${baseCode}-${String(num).padStart(2, "0")}`;
    while (await Department.exists({ hospital, branch: targetBranch, code: candidate })) {
      num++;
      candidate = `${baseCode}-${String(num).padStart(2, "0")}`;
    }
    code = candidate;
  } else {
    const existingCode = await Department.findOne({ hospital, branch: targetBranch, code: code.toUpperCase() });
    if (existingCode) {
      throw new AppError(`Department code "${code.toUpperCase()}" is already in use.`, 409);
    }
    code = code.toUpperCase();
  }

  const isBranchOnly = targetBranch !== null;

  const cleanBody = {
    ...body,
    name: trimmedName,
    code,
    hospital,
    branch: targetBranch,
    departmentHead: body.departmentHead || null,
    isBranchOnly,
    isBranchCustomized: false,
    parentDepartment: null,
  };

  const department = await Department.create(cleanBody);

  // SYNC RULE: If Parent Hospital creates a new Department, automatically replicate to active branches
  if (targetBranch === null) {
    const activeBranches = await Branch.find({ hospital, status: "active" });
    for (const b of activeBranches) {
      const existsInBranch = await Department.findOne({
        hospital,
        branch: b._id,
        $or: [
          { parentDepartment: department._id },
          { name: { $regex: `^${trimmedName}$`, $options: "i" } },
        ],
      });
      if (!existsInBranch) {
        await Department.create({
          hospital,
          branch: b._id,
          parentDepartment: department._id,
          name: department.name,
          code: `${department.code}-${String(b._id).slice(-4)}`,
          description: department.description,
          specialization: department.specialization,
          category: department.category,
          consultationFee: department.consultationFee,
          isEmergency: department.isEmergency,
          colorTheme: department.colorTheme,
          displayOrder: department.displayOrder,
          status: department.status,
          isDisabled: false,
          isBranchCustomized: false,
          isBranchOnly: false,
        });
      }
    }
  }

  res.status(201).json({ status: "success", data: { department } });
});

export const getDepartment = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findOne({ _id: req.params.id, ...req.hospitalFilter })
    .populate("hospital", "name")
    .populate("branch", "name")
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
  const targetBranch = existing.branch ? existing.branch.toString() : null;

  // ── Uniqueness validation ────────────────────────────────────────────────

  if (body.name !== undefined) {
    const trimmedName = body.name.trim();
    if (!trimmedName) {
      throw new AppError("Department name cannot be empty.", 400);
    }
    const dupName = await Department.findOne({
      hospital,
      branch: targetBranch,
      name: { $regex: `^${trimmedName}$`, $options: "i" },
      _id: { $ne: existing._id },
    });
    if (dupName) {
      throw new AppError(`A department named "${trimmedName}" already exists in this scope.`, 409);
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
      branch: targetBranch,
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

  // Branch Admin editing department: mark as customized so parent updates won't overwrite it
  if (targetBranch !== null) {
    cleanBody.isBranchCustomized = true;
  }

  // ── Capture old values for audit ─────────────────────────────────────────
  const oldValues = pickAuditFields(existing.toObject() as Record<string, unknown>);

  // ── Persist update ───────────────────────────────────────────────────────
  const updated = await Department.findOneAndUpdate(
    { _id: req.params.id, ...req.hospitalFilter },
    cleanBody,
    { new: true, runValidators: true },
  )
    .populate("branch", "name")
    .populate("departmentHead", "name specialization");

  if (!updated) {
    throw new AppError("Department not found.", 404);
  }

  // SYNC RULE: If Parent Hospital updates a Department, propagate changes to non-customized branch departments
  if (targetBranch === null) {
    const cascadePayload: Record<string, unknown> = {};
    if (cleanBody.name !== undefined) cascadePayload.name = cleanBody.name;
    if (cleanBody.description !== undefined) cascadePayload.description = cleanBody.description;
    if (cleanBody.specialization !== undefined) cascadePayload.specialization = cleanBody.specialization;
    if (cleanBody.category !== undefined) cascadePayload.category = cleanBody.category;
    if (cleanBody.consultationFee !== undefined) cascadePayload.consultationFee = cleanBody.consultationFee;
    if (cleanBody.isEmergency !== undefined) cascadePayload.isEmergency = cleanBody.isEmergency;
    if (cleanBody.colorTheme !== undefined) cascadePayload.colorTheme = cleanBody.colorTheme;
    if (cleanBody.displayOrder !== undefined) cascadePayload.displayOrder = cleanBody.displayOrder;

    if (Object.keys(cascadePayload).length > 0) {
      await Department.updateMany(
        { parentDepartment: existing._id, isBranchCustomized: { $ne: true } },
        { $set: cascadePayload }
      );
    }
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
  const isParent = department.branch === null;

  // Gather all department IDs to check for dependency guard
  let targetDeptIds = [deptId];
  if (isParent) {
    const branchDepts = await Department.find({ parentDepartment: deptId }).select("_id");
    targetDeptIds = targetDeptIds.concat(branchDepts.map((d) => d._id));
  }

  // ── Dependency guard ─────────────────────────────────────────────────────
  const [doctorCount, appointmentCount, admissionCount] = await Promise.all([
    Doctor.countDocuments({ department: { $in: targetDeptIds } }),
    Appointment.countDocuments({ department: { $in: targetDeptIds } }),
    Admission.countDocuments({ department: { $in: targetDeptIds } }),
  ]);

  if (doctorCount > 0 || appointmentCount > 0 || admissionCount > 0) {
    const parts: string[] = [];
    if (doctorCount > 0) parts.push(`${doctorCount} doctor(s)`);
    if (appointmentCount > 0) parts.push(`${appointmentCount} appointment(s)`);
    if (admissionCount > 0) parts.push(`${admissionCount} admission(s)`);
    throw new AppError(
      `This department is in use and cannot be hard deleted. It is referenced by: ${parts.join(", ")}. Please disable it instead.`,
      409,
    );
  }

  // Safe to delete
  if (isParent) {
    // Delete parent department AND its non-customized inherited branch department copies
    await Department.deleteMany({
      $or: [
        { _id: deptId },
        { parentDepartment: deptId, isBranchCustomized: { $ne: true } }
      ]
    });
  } else {
    // Delete target branch department
    await Department.findByIdAndDelete(deptId);
  }

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
    .populate("branch", "name")
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
