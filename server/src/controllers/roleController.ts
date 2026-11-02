import { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { CustomRole } from "../models/Role";
import { ROLES } from "../utils/roles";
import { ROLE_PERMISSIONS } from "../utils/rolePermissions";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

const createRoleSchema = z.object({
  role: z
    .string({ invalid_type_error: "Role Key must be a string" })
    .trim()
    .min(2, "Role Key must be at least 2 characters")
    .max(50, "Role Key cannot exceed 50 characters")
    .regex(/^[a-z0-9_]+$/, "Role Key must contain only lowercase characters and underscores"),
  label: z
    .string({ invalid_type_error: "Role Label must be a string" })
    .trim()
    .min(2, "Role Label must be at least 2 characters")
    .max(50, "Role Label cannot exceed 50 characters")
    .regex(/^[a-zA-Z][a-zA-Z0-9\s\.\-/'&]*$/, "Role Label contains invalid characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .default(""),
  permissions: z.array(z.string()).default([]),
});

export const listRoles = catchAsync(async (req: Request, res: Response) => {
  const isHospitalScoped = req.user!.role !== "super_admin";
  const hospitalId = req.user!.hospital;

  // Lazy-initialize default roles for this hospital if missing in DB
  if (isHospitalScoped && hospitalId) {
    const defaultRoles = [
      {
        role: "hospital_admin",
        label: "Hospital Admin",
        description: "Runs day-to-day operations for a single assigned hospital.",
        permissions: ["Manage Staff", "View Hospital Analytics", "Manage Departments", "Inventory Control"],
      },
      {
        role: "accountant",
        label: "Accountant",
        description: "Handles billing, payroll, claims, and financial reporting for an assigned hospital.",
        permissions: ["Billing Operations", "Payroll Processing", "Insurance Claims", "Financial Reports"],
      },
      {
        role: "doctor",
        label: "Doctor",
        description: "Provides medical care, creates prescriptions, manages IP/OP records, and orders lab tests.",
        permissions: ["Patient Consultation", "Electronic Prescriptions", "Clinical Notes", "IP/OP Management"],
      },
      {
        role: "nurse",
        label: "Nurse",
        description: "Provides direct patient care, records vital signs, administers medications, and manages ward workflows.",
        permissions: ["Record Vitals", "Administer Medications", "Ward Management", "Patient Care"],
      },
      {
        role: "receptionist",
        label: "Receptionist",
        description: "Manages patient onboarding, schedules appointments, and handles clinic front desk operations.",
        permissions: ["Patient Registration", "Appointment Scheduling", "Visitor Log", "Billing Intake"],
      },
      {
        role: "pharmacist",
        label: "Pharmacist",
        description: "Verifies prescriptions, dispenses medicines, manages inventory, and handles pharmacy billing.",
        permissions: ["Verify Prescriptions", "Dispense Medicines", "Inventory Management", "Pharmacy Billing"],
      },
      {
        role: "laboratory",
        label: "Laboratory",
        description: "The Laboratory role manages lab test requests, sample collections, test processing, quality control, laboratory inventory, and report delivery.",
        permissions: ["Manage Test Requests", "Collect Samples", "Process Tests", "Quality Control", "Lab Inventory", "Report Delivery"],
      },
    ];

    for (const dr of defaultRoles) {
      const exists = await CustomRole.findOne({ hospital: hospitalId, role: dr.role });
      if (!exists) {
        await CustomRole.create({ ...dr, hospital: hospitalId });
      }
    }
  }

  const matchStage = isHospitalScoped ? { hospital: hospitalId } : {};

  // Count assigned users per role
  const counts = await User.aggregate([{ $match: matchStage }, { $group: { _id: "$role", count: { $sum: 1 } } }]);
  const countByRole = new Map(counts.map((c) => [c._id, c.count]));

  let roles: any[] = [];

  if (isHospitalScoped && hospitalId) {
    // Fetch all roles from DB (default + custom)
    const dbRoles = await CustomRole.find({ hospital: hospitalId });
    roles = dbRoles.map((r) => ({
      _id: r._id,
      role: r.role,
      label: r.label,
      description: r.description,
      permissions: r.permissions,
      assignedUsers: countByRole.get(r.role) ?? 0,
      isCustom: true,
    }));
  } else {
    // For super admins (system-wide standard roles view + custom system roles)
    const visibleRoles = ROLES;
    const staticRoles = visibleRoles.map((role) => ({
      role,
      ...ROLE_PERMISSIONS[role],
      assignedUsers: countByRole.get(role) ?? 0,
      isCustom: false,
    }));

    const dbCustomRoles = await CustomRole.find({});
    const customRoles = dbCustomRoles
      .filter((r) => !visibleRoles.includes(r.role as any))
      .map((r) => ({
        _id: r._id,
        role: r.role,
        label: r.label,
        description: r.description,
        permissions: r.permissions,
        assignedUsers: countByRole.get(r.role) ?? 0,
        isCustom: true,
      }));

    roles = [...staticRoles, ...customRoles];
  }

  res.json({ status: "success", data: { roles } });
});

const updateRoleSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, "Role Label must be at least 2 characters")
    .max(50, "Role Label cannot exceed 50 characters")
    .regex(/^[a-zA-Z][a-zA-Z0-9\s\.\-/'&]*$/, "Role Label contains invalid characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateRole = catchAsync(async (req: Request, res: Response) => {
  const body = updateRoleSchema.parse(req.body);
  const isSuperAdmin = req.user!.role === "super_admin";
  const hospitalId = isSuperAdmin ? null : req.user!.hospital;

  const filter = hospitalId ? { _id: req.params.id, hospital: hospitalId } : { _id: req.params.id };

  const role = await CustomRole.findOneAndUpdate(
    filter,
    body,
    { new: true, runValidators: true }
  );

  if (!role) {
    throw new AppError("Custom role not found.", 404);
  }

  res.json({ status: "success", data: { role } });
});

export const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const isSuperAdmin = req.user!.role === "super_admin";
  const hospitalId = isSuperAdmin ? null : req.user!.hospital;

  const filter = hospitalId ? { _id: req.params.id, hospital: hospitalId } : { _id: req.params.id };

  const role = await CustomRole.findOne(filter);
  if (!role) {
    throw new AppError("Custom role not found.", 404);
  }

  // Prevent deleting custom role if users are assigned to it
  const userFilter = hospitalId ? { role: role.role, hospital: hospitalId } : { role: role.role };
  const assignedUsersCount = await User.countDocuments(userFilter);
  if (assignedUsersCount > 0) {
    throw new AppError("Cannot delete this role because users are currently assigned to it.", 400);
  }

  await CustomRole.deleteOne({ _id: role._id });

  res.status(204).send();
});

export const createRole = catchAsync(async (req: Request, res: Response) => {
  const body = createRoleSchema.parse(req.body);
  const isSuperAdmin = req.user!.role === "super_admin";
  const hospitalId = isSuperAdmin ? null : req.user!.hospital;

  if (!isSuperAdmin && !hospitalId) {
    throw new AppError("Hospital context required to create a custom role.", 400);
  }

  // Ensure role does not collide with static roles
  if (["super_admin", "hospital_admin"].includes(body.role)) {
    throw new AppError("A system role with this name already exists.", 400);
  }

  // Check if role key already exists
  const existing = await CustomRole.findOne(
    hospitalId ? { hospital: hospitalId, role: body.role } : { role: body.role }
  );
  if (existing) {
    throw new AppError("A role with this key already exists.", 400);
  }

  const role = await CustomRole.create({
    ...body,
    hospital: hospitalId,
  });

  res.status(201).json({ status: "success", data: { role } });
});
