import { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { CustomRole } from "../models/Role";
import { ROLES } from "../utils/roles";
import { ROLE_PERMISSIONS } from "../utils/rolePermissions";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

const createRoleSchema = z.object({
  role: z.string().min(2).max(30).regex(/^[a-z_]+$/, "Role key must be lowercase and contain only letters and underscores"),
  label: z.string().min(2).max(50),
  description: z.string().optional().default(""),
  permissions: z.array(z.string()).default([]),
});

export const listRoles = catchAsync(async (req: Request, res: Response) => {
  const isHospitalScoped = req.user!.role !== "super_admin";
  const hospitalId = req.user!.hospital;

  // Lazy-initialize default roles for this hospital if no roles exist in DB
  if (isHospitalScoped && hospitalId) {
    const existingRolesCount = await CustomRole.countDocuments({ hospital: hospitalId });
    if (existingRolesCount === 0) {
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
          role: "receptionist",
          label: "Receptionist",
          description: "Manages patient onboarding, schedules appointments, and handles clinic front desk operations.",
          permissions: ["Patient Registration", "Appointment Scheduling", "Visitor Log", "Billing Intake"],
        },
      ];

      await CustomRole.insertMany(
        defaultRoles.map((dr) => ({ ...dr, hospital: hospitalId }))
      );
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
      isCustom: true, // Mark all as custom/editable since they are now in the DB!
    }));
  } else {
    // For super admins (system-wide standard roles view)
    const visibleRoles = ROLES;
    roles = visibleRoles.map((role) => ({
      role,
      ...ROLE_PERMISSIONS[role],
      assignedUsers: countByRole.get(role) ?? 0,
      isCustom: false,
    }));
  }

  res.json({ status: "success", data: { roles } });
});

const updateRoleSchema = z.object({
  label: z.string().min(2).max(50).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateRole = catchAsync(async (req: Request, res: Response) => {
  const body = updateRoleSchema.parse(req.body);
  const hospitalId = req.user!.hospital;

  if (!hospitalId) {
    throw new AppError("Hospital context required to update a custom role.", 400);
  }

  const role = await CustomRole.findOneAndUpdate(
    { _id: req.params.id, hospital: hospitalId },
    body,
    { new: true, runValidators: true }
  );

  if (!role) {
    throw new AppError("Custom role not found.", 404);
  }

  res.json({ status: "success", data: { role } });
});

export const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.user!.hospital;

  if (!hospitalId) {
    throw new AppError("Hospital context required to delete a custom role.", 400);
  }

  const role = await CustomRole.findOne({ _id: req.params.id, hospital: hospitalId });
  if (!role) {
    throw new AppError("Custom role not found.", 404);
  }

  // Prevent deleting custom role if users are assigned to it
  const assignedUsersCount = await User.countDocuments({ role: role.role, hospital: hospitalId });
  if (assignedUsersCount > 0) {
    throw new AppError("Cannot delete this role because users are currently assigned to it.", 400);
  }

  await CustomRole.deleteOne({ _id: role._id });

  res.status(204).send();
});


export const createRole = catchAsync(async (req: Request, res: Response) => {
  const body = createRoleSchema.parse(req.body);
  const hospitalId = req.user!.hospital;

  if (!hospitalId) {
    throw new AppError("Hospital context required to create a custom role.", 400);
  }

  // Ensure role does not collide with static roles
  if (ROLES.includes(body.role as any)) {
    throw new AppError("A system role with this name already exists.", 400);
  }

  // Check if role key already exists for this hospital
  const existing = await CustomRole.findOne({ hospital: hospitalId, role: body.role });
  if (existing) {
    throw new AppError("A custom role with this name already exists in this hospital.", 400);
  }

  const role = await CustomRole.create({
    ...body,
    hospital: hospitalId,
  });

  res.status(201).json({ status: "success", data: { role } });
});

