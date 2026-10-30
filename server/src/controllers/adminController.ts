import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { generateTempPassword, generateUniqueEmployeeId } from "../utils/idGenerator";
import { getPagination, paginatedResponse } from "../utils/pagination";
import {
  requiredTrimmedString,
  optionalTrimmedString,
  emailValidator,
  phoneValidator,
  urlValidator,
} from "../utils/validators";

const ADMIN_ROLES = ["hospital_admin", "accountant"] as const;

const createAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.literal("hospital_admin"),   // Super Admin can only create Hospital Admins
  hospital: z.string().min(1),
  title: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  employeeId: z.string().optional().default(""),
  avatarUrl: z.string().optional().default(""),
});


const updateAdminSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  hospital: z.string().min(1).optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
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
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  let employeeId = body.employeeId?.trim();
  if (!employeeId && body.hospital) {
    employeeId = await generateUniqueEmployeeId("hospital_admin", body.hospital);
  }

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
  const admin = await User.findOneAndUpdate({ _id: req.params.id, role: { $in: ADMIN_ROLES } }, body, {
    new: true,
    runValidators: true,
  });
  if (!admin) {
    throw new AppError("Admin not found.", 404);
  }
  res.json({ status: "success", data: { admin } });
});

export const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  const admin = await User.findOneAndDelete({ _id: req.params.id, role: { $in: ADMIN_ROLES } });
  if (!admin) {
    throw new AppError("Admin not found.", 404);
  }
  res.status(204).send();
});
