import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { generateTempPassword, generateUniqueEmployeeId } from "../utils/idGenerator";
import { getPagination, paginatedResponse } from "../utils/pagination";
import {
  emailValidator,
  tenDigitPhoneValidator,
} from "../utils/validators";

const ADMIN_ROLES = ["hospital_admin", "accountant"] as const;

const createAdminSchema = z.object({
  name: z
    .string({ invalid_type_error: "Full Name must be a string" })
    .trim()
    .min(2, "Full Name is required and must be at least 2 characters")
    .max(100, "Full Name cannot exceed 100 characters")
    .regex(/^[a-zA-Z\s\.\-']+$/, "Full Name should contain only letters, dots, hyphens, and spaces"),
  email: emailValidator("Email Address", true, 100),
  role: z.literal("hospital_admin"),   // Super Admin can only create Hospital Admins
  hospital: z.string().min(1, "Assigned Hospital is required"),
  title: z
    .string({ invalid_type_error: "Display Title must be a string" })
    .trim()
    .min(2, "Display Title is required and must be at least 2 characters")
    .max(100, "Display Title cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9\s\.\-/'&]+$/, "Display Title contains invalid characters"),
  phone: tenDigitPhoneValidator("Contact Number", true),
  employeeId: z
    .string({ invalid_type_error: "Employee ID must be a string" })
    .trim()
    .min(2, "Employee ID is required and must be at least 2 characters")
    .max(50, "Employee ID cannot exceed 50 characters")
    .regex(/^[A-Za-z0-9\-_]+$/, "Employee ID must contain only letters, numbers, hyphens, and underscores"),
  avatarUrl: z.string().optional().default(""),
});

const updateAdminSchema = z.object({
  name: z
    .string({ invalid_type_error: "Full Name must be a string" })
    .trim()
    .min(2, "Full Name must be at least 2 characters")
    .max(100, "Full Name cannot exceed 100 characters")
    .regex(/^[a-zA-Z\s\.\-']+$/, "Full Name should contain only letters, dots, hyphens, and spaces")
    .optional(),
  email: emailValidator("Email Address", false, 100).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  hospital: z.string().min(1, "Assigned Hospital is required").optional(),
  title: z
    .string({ invalid_type_error: "Display Title must be a string" })
    .trim()
    .min(2, "Display Title must be at least 2 characters")
    .max(100, "Display Title cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9\s\.\-/'&]+$/, "Display Title contains invalid characters")
    .optional(),
  phone: tenDigitPhoneValidator("Contact Number", true).optional(),
  employeeId: z
    .string({ invalid_type_error: "Employee ID must be a string" })
    .trim()
    .min(2, "Employee ID must be at least 2 characters")
    .max(50, "Employee ID cannot exceed 50 characters")
    .regex(/^[A-Za-z0-9\-_]+$/, "Employee ID must contain only letters, numbers, hyphens, and underscores")
    .optional(),
  avatarUrl: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const listAdmins = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const hospitalId = req.query.hospitalId as string | undefined;
  const role = req.query.role as string | undefined;

  const filter: Record<string, unknown> = { role: { $in: ADMIN_ROLES } };
  if (hospitalId) {
    filter.hospital = hospitalId;
  }
  if (role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
    filter.role = role;
  }

  const [admins, total] = await Promise.all([
    User.find(filter).populate("hospital", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ status: "success", ...paginatedResponse(admins, total, { page, limit, skip }) });
});

export const getAdmin = catchAsync(async (req: Request, res: Response) => {
  const admin = await User.findOne({ _id: req.params.id, role: { $in: ADMIN_ROLES } }).populate("hospital", "name");
  if (!admin) {
    throw new AppError("Admin not found.", 404);
  }
  res.json({ status: "success", data: { admin } });
});

export const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const body = createAdminSchema.parse(req.body);

  const existingEmail = await User.findOne({ email: body.email.toLowerCase() });
  if (existingEmail) {
    throw new AppError("An administrator with this email address already exists.", 400);
  }

  let employeeId = body.employeeId?.trim();
  if (!employeeId && body.hospital) {
    employeeId = await generateUniqueEmployeeId("hospital_admin", body.hospital);
  } else if (employeeId && body.hospital) {
    const existingEmp = await User.findOne({ employeeId, hospital: body.hospital });
    if (existingEmp) {
      throw new AppError("An administrator with this Employee ID already exists in the selected hospital.", 400);
    }
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const admin = await User.create({ ...body, employeeId, passwordHash });

  res.status(201).json({
    status: "success",
    data: {
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, employeeId: admin.employeeId },
      tempPassword,
    },
  });
});

export const updateAdmin = catchAsync(async (req: Request, res: Response) => {
  const body = updateAdminSchema.parse(req.body);

  const admin = await User.findOne({ _id: req.params.id, role: { $in: ADMIN_ROLES } });
  if (!admin) {
    throw new AppError("Admin not found.", 404);
  }

  if (body.email && body.email.toLowerCase() !== admin.email) {
    const emailInUse = await User.findOne({
      email: body.email.toLowerCase(),
      _id: { $ne: admin._id },
    });
    if (emailInUse) {
      throw new AppError("An administrator with this email address already exists.", 400);
    }
  }

  if (body.employeeId && body.employeeId !== admin.employeeId) {
    const hospId = body.hospital || admin.hospital;
    if (hospId) {
      const existingEmp = await User.findOne({
        employeeId: body.employeeId,
        hospital: hospId,
        _id: { $ne: admin._id },
      });
      if (existingEmp) {
        throw new AppError("An administrator with this Employee ID already exists in the selected hospital.", 400);
      }
    }
  }

  Object.assign(admin, body);
  await admin.save();

  res.json({ status: "success", data: { admin } });
});

export const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  const admin = await User.findOneAndDelete({ _id: req.params.id, role: { $in: ADMIN_ROLES } });
  if (!admin) {
    throw new AppError("Admin not found.", 404);
  }
  res.status(204).send();
});
