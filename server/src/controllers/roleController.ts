import { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { CustomRole } from "../models/Role";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

export const CANONICAL_ROLES = [
  {
    role: "super_admin",
    label: "Super Admin",
    description: "Full network oversight across every hospital, branch, CMS, public pages, and admin accounts.",
    permissions: ["Full System Access", "Manage Institutions", "Website CMS Control", "Public Enquiries", "Security Override"],
  },
  {
    role: "admin",
    label: "Hospital Admin",
    description: "Runs day-to-day operations, departments, clinical workforce, and facilities for an assigned hospital.",
    permissions: ["Manage Staff", "View Hospital Analytics", "Manage Departments", "Inventory Control", "Bed & Ward Management"],
  },
  {
    role: "receptionist",
    label: "Receptionist",
    description: "Manages patient onboarding, schedules appointments, and handles clinic front desk operations.",
    permissions: ["Patient Registration", "Appointment Scheduling", "Visitor Log", "Billing Intake", "Patient Management", "Queue Management"],
  },
  {
    role: "pharmacist",
    label: "Pharmacist",
    description: "Verifies prescriptions, dispenses medicines, manages inventory, and handles pharmacy billing.",
    permissions: ["Verify Prescriptions", "Dispense Medicines", "Inventory Management", "Pharmacy Billing"],
  },
  {
    role: "doctor",
    label: "Doctor",
    description: "Provides medical care, creates prescriptions, manages IP/OP records, and orders lab tests.",
    permissions: ["Patient Consultation", "Electronic Prescriptions", "Clinical Notes", "IP/OP Management"],
  },
  {
    role: "staff",
    label: "Clinical Staff",
    description: "Provides direct patient care, records vital signs, administers medications, handles shift handovers, and manages ward workflows.",
    permissions: ["Record Vitals", "Administer Medications", "Ward Management", "Patient Care", "Shift Handover", "Nursing Notes"],
  },
  {
    role: "patient",
    label: "Patient",
    description: "Accesses own medical records, prescriptions, billing summaries, and appointments scheduler.",
    permissions: ["View Personal Records", "View Prescriptions", "Book Appointments", "View Billing"],
  },
] as const;

export const listRoles = catchAsync(async (req: Request, res: Response) => {
  // 1. Purge legacy duplicate roles from the database to eliminate duplicate cards
  await CustomRole.deleteMany({
    role: { $in: ["hospital_admin", "nurse", "accountant", "laboratory"] },
  });

  // 2. Ensure each canonical role is safely initialized and persisted in the database
  for (const cr of CANONICAL_ROLES) {
    const existing = await CustomRole.findOne({ role: cr.role });
    if (!existing) {
      await CustomRole.create({
        role: cr.role,
        label: cr.label,
        description: cr.description,
        permissions: cr.permissions,
        hospital: null,
      });
    }
  }

  // 3. Count assigned users per role (aggregating legacy aliases to canonical roles)
  const isHospitalScoped = req.user!.role !== "super_admin";
  const hospitalId = req.user!.hospital;
  const matchStage = isHospitalScoped && hospitalId ? { hospital: hospitalId } : {};

  const counts = await User.aggregate([{ $match: matchStage }, { $group: { _id: "$role", count: { $sum: 1 } } }]);
  const countByRole = new Map(counts.map((c) => [c._id, c.count]));

  const adminUsers = (countByRole.get("admin") || 0) + (countByRole.get("hospital_admin") || 0);
  const staffUsers = (countByRole.get("staff") || 0) + (countByRole.get("nurse") || 0);

  // 4. Retrieve roles strictly from the database
  const dbRoles = await CustomRole.find({
    role: { $in: CANONICAL_ROLES.map((r) => r.role) },
  });

  // Preserve canonical display order
  const orderMap = new Map<string, number>(CANONICAL_ROLES.map((r, idx) => [r.role, idx]));
  const sortedDbRoles = dbRoles.sort((a, b) => (orderMap.get(a.role) ?? 99) - (orderMap.get(b.role) ?? 99));

  const roles = sortedDbRoles.map((r) => {
    let assignedCount = countByRole.get(r.role) || 0;
    if (r.role === "admin") assignedCount = adminUsers;
    if (r.role === "staff") assignedCount = staffUsers;

    return {
      _id: r._id,
      role: r.role,
      label: r.label,
      description: r.description,
      permissions: r.permissions,
      assignedUsers: assignedCount,
      isCustom: false,
    };
  });

  res.json({ status: "success", data: { roles } });
});

const updateRoleSchema = z.object({
  label: z.string().trim().max(50).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateRole = catchAsync(async (req: Request, res: Response) => {
  const body = updateRoleSchema.parse(req.body);

  const role = await CustomRole.findByIdAndUpdate(
    req.params.id,
    { $set: body },
    { new: true, runValidators: true }
  );

  if (!role) {
    throw new AppError("Role not found in the database.", 404);
  }

  res.json({ status: "success", data: { role } });
});

export const deleteRole = catchAsync(async (_req: Request, _res: Response) => {
  throw new AppError("System operates strictly on the 7 canonical clinical roles. Roles cannot be deleted.", 400);
});

export const createRole = catchAsync(async (_req: Request, _res: Response) => {
  throw new AppError("The system operates strictly on the 7 canonical clinical roles. Adding custom roles is disabled.", 400);
});
