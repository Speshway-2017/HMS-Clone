import { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { Hospital } from "../models/Hospital";
import { Branch } from "../models/Branch";
import { User } from "../models/User";
import { Department } from "../models/Department";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import { Appointment } from "../models/Appointment";
import { Enquiry } from "../models/Enquiry";
import { emitToHospital } from "../config/socket";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { AppointmentSlotService } from "../services/appointmentSlotService";

import { generateUniqueHospitalCode } from "../utils/idGenerator";
import {
  requiredTrimmedString,
  optionalTrimmedString,
  emailValidator,
  phoneValidator,
  tenDigitPhoneValidator,
  urlValidator,
  codeValidator,
  numberValidator,
  nameValidator,
} from "../utils/validators";

const hospitalSchema = z.object({
  name: requiredTrimmedString("Hospital Name", 2, 100),
  code: z.string().max(20, "Hospital Code cannot exceed 20 characters").optional().default(""),
  address: optionalTrimmedString("Address", 250),
  contactEmail: emailValidator("Contact Email", false, 100),
  contactPhone: tenDigitPhoneValidator("Primary Phone", false),
  logoUrl: z
    .string()
    .optional()
    .default("")
    .refine(
      (val) => {
        if (!val) return true;
        const lower = val.toLowerCase();
        return (
          lower.startsWith("data:image/") ||
          lower.endsWith(".png") ||
          lower.endsWith(".jpg") ||
          lower.endsWith(".jpeg") ||
          lower.endsWith(".webp") ||
          lower.endsWith(".svg") ||
          lower.includes(".png?") ||
          lower.includes(".jpg?") ||
          lower.includes(".jpeg?") ||
          lower.includes(".webp?") ||
          lower.includes(".svg?") ||
          lower.includes("/image/upload/")
        );
      },
      {
        message: "Hospital Logo must be a valid image file (PNG, JPEG, WEBP, or SVG)",
      }
    ),
  licenseUrl: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || val.toLowerCase().endsWith(".pdf") || val.toLowerCase().includes(".pdf?"), {
      message: "Only PDF files should be accepted. Remaining files are not accepted.",
    }),
  bedCapacity: z.coerce.number().min(0).optional().default(0),
  opExpiryLimit: z.coerce.number().min(0).optional().default(10),
  availableLabTests: z.array(z.string()).optional(),
  availableRadiologyTests: z.array(z.string()).optional(),
  investigationPrices: z.record(z.coerce.number()).optional(),
  primaryAdminId: z.string().optional(),
  
  // Marketing & Public website fields
  heroBannerUrl: z.string().optional().default(""),
  aboutText: z.string().optional().default(""),
  googleMapsLink: z.string().optional().default(""),
  workingHours: z.string().optional().default(""),
  footerText: z.string().optional().default(""),
  socialLinks: z.record(z.string()).optional(),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  heroTitle: z.string().optional().default(""),
  heroSub: z.string().optional().default(""),
  whyChooseUs: z.array(z.object({ title: z.string(), desc: z.string() })).optional(),
  missionText: z.string().optional().default(""),
  visionText: z.string().optional().default(""),
  valuesText: z.string().optional().default(""),
});

export const listHospitals = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string | undefined;

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [{ name: new RegExp(search, "i") }, { code: new RegExp(search, "i") }];
  }
  if (status && status !== "all") {
    filter.status = status;
  }

  const [hospitals, total, statusCounts] = await Promise.all([
    Hospital.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Hospital.countDocuments(filter),
    Hospital.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const hospitalIds = hospitals.map((h) => h._id);
  const admins = await User.find({ hospital: { $in: hospitalIds }, role: "hospital_admin" }).select("name hospital");
  const adminByHospital = new Map(admins.map((a) => [String(a.hospital), a.name]));

  const data = hospitals.map((h) => ({
    ...h.toObject(),
    primaryAdminName: adminByHospital.get(String(h._id)) ?? null,
  }));

  res.json({
    status: "success",
    ...paginatedResponse(data, total, { page, limit, skip }),
    counts: {
      total,
      active: statusCounts.find((s) => s._id === "active")?.count ?? 0,
      inactive: statusCounts.find((s) => s._id === "inactive")?.count ?? 0,
    },
  });
});

export const getHospitalCode = catchAsync(async (req: Request, res: Response) => {
  const name = (req.query.name as string) || "";
  const code = await generateUniqueHospitalCode(name);
  res.json({ status: "success", data: { code } });
});

export const createHospital = catchAsync(async (req: Request, res: Response) => {
  const body = hospitalSchema.parse(req.body);
  let { code, primaryAdminId, ...hospitalFields } = body;

  // Validate Primary Admin eligibility if specified
  if (primaryAdminId) {
    if (!Types.ObjectId.isValid(primaryAdminId)) {
      throw new AppError("Invalid or ineligible administrator should not be accepted.", 400);
    }
    const eligibleAdmin = await User.findOne({
      _id: primaryAdminId,
      role: "hospital_admin",
      hospital: null,
      status: "active",
    });
    if (!eligibleAdmin) {
      throw new AppError("Invalid or ineligible administrator should not be accepted.", 400);
    }
  }

  let generatedCode = code?.trim();
  if (!generatedCode) {
    generatedCode = await generateUniqueHospitalCode(body.name);
  } else if (await Hospital.exists({ code: generatedCode.toUpperCase() })) {
    generatedCode = await generateUniqueHospitalCode(body.name);
  }

  const hospital = await Hospital.create({
    ...hospitalFields,
    code: generatedCode.toUpperCase(),
    createdBy: req.user!._id,
  });

  if (primaryAdminId) {
    await User.findByIdAndUpdate(primaryAdminId, { hospital: hospital._id });
  }

  res.status(201).json({ status: "success", data: { hospital } });
});

export const getHospital = catchAsync(async (req: Request, res: Response) => {
  const hospital = await Hospital.findById(req.params.id);
  if (!hospital) {
    throw new AppError("Hospital not found.", 404);
  }

  const [branchCount, admin] = await Promise.all([
    Branch.countDocuments({ hospital: hospital._id }),
    User.findOne({ hospital: hospital._id, role: "hospital_admin" }).select("name email"),
  ]);

  const branches = await Branch.find({ hospital: hospital._id }).limit(6);

  res.json({
    status: "success",
    data: {
      hospital,
      stats: { branchCount, primaryAdmin: admin ?? null },
      branches,
    },
  });
});

export const updateHospital = catchAsync(async (req: Request, res: Response) => {
  const body = hospitalSchema.partial().parse(req.body);
  const { primaryAdminId, ...hospitalFields } = body;

  const hospital = await Hospital.findByIdAndUpdate(req.params.id, hospitalFields, {
    new: true,
    runValidators: true,
  });
  if (!hospital) {
    throw new AppError("Hospital not found.", 404);
  }

  if (primaryAdminId) {
    if (!Types.ObjectId.isValid(primaryAdminId)) {
      throw new AppError("Invalid or ineligible administrator should not be accepted.", 400);
    }
    const eligibleAdmin = await User.findOne({
      _id: primaryAdminId,
      role: "hospital_admin",
      status: "active",
      $or: [{ hospital: null }, { hospital: hospital._id }],
    });
    if (!eligibleAdmin) {
      throw new AppError("Invalid or ineligible administrator should not be accepted.", 400);
    }
    await User.findByIdAndUpdate(primaryAdminId, { hospital: hospital._id });
  }

  emitToHospital(hospital._id, "hospital:updated", hospital);

  res.json({ status: "success", data: { hospital } });
});

export const deleteHospital = catchAsync(async (req: Request, res: Response) => {
  const hospital = await Hospital.findByIdAndDelete(req.params.id);
  if (!hospital) {
    throw new AppError("Hospital not found.", 404);
  }
  emitToHospital(req.params.id, "hospital:deleted", { id: req.params.id });
  res.status(204).send();
});

export const listUnassignedHospitalAdmins = catchAsync(async (_req: Request, res: Response) => {
  const admins = await User.find({ role: "hospital_admin", hospital: null, status: "active" })
    .select("name email status")
    .sort({ name: 1 });
  res.json({ status: "success", data: { admins } });
});

export const getMyHospital = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.user!.hospital;
  if (!hospitalId) {
    throw new AppError("No hospital assigned to this user.", 404);
  }
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new AppError("Hospital not found.", 404);
  }
  res.json({ status: "success", data: { hospital } });
});

export const updateMyHospital = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.user!.hospital;
  if (!hospitalId) {
    throw new AppError("No hospital assigned to this user.", 404);
  }
  const body = hospitalSchema.partial().parse(req.body);
  const hospital = await Hospital.findByIdAndUpdate(hospitalId, body, {
    new: true,
    runValidators: true,
  });
  if (hospital) {
    emitToHospital(hospital._id, "hospital:updated", hospital);
  }
  res.json({ status: "success", data: { hospital } });
});

export const getPublicHospital = catchAsync(async (_req: Request, res: Response) => {
  let hospital = await Hospital.findOne({ status: "active" }).sort({ createdAt: 1 });
  if (!hospital) {
    hospital = await Hospital.findOne().sort({ createdAt: 1 });
  }
  res.json({ status: "success", data: { hospital: hospital ?? null } });
});

export const getPublicHospitalDepartments = catchAsync(async (_req: Request, res: Response) => {
  try {
    let hospital = await Hospital.findOne({ status: "active" }).sort({ createdAt: 1 });
    if (!hospital) {
      hospital = await Hospital.findOne().sort({ createdAt: 1 });
    }

    let departments: any[] = [];
    if (hospital) {
      departments = await Department.find({ hospital: hospital._id, isDisabled: { $ne: true } })
        .populate("departmentHead", "name")
        .sort({ displayOrder: 1 });
    }

    if (!departments || departments.length === 0) {
      departments = await Department.find({ isDisabled: { $ne: true } })
        .populate("departmentHead", "name")
        .sort({ displayOrder: 1 });
    }

    res.json({ status: "success", data: { departments } });
  } catch (err: any) {
    console.error("Error fetching public departments:", err);
    const fallbackDepts = await Department.find({}).catch(() => []);
    res.json({ status: "success", data: { departments: fallbackDepts } });
  }
});

export const getPublicHospitalDoctors = catchAsync(async (_req: Request, res: Response) => {
  try {
    const doctors = await Doctor.find({
      isActive: { $ne: false },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
    })
      .populate("department", "name consultationFee")
      .populate("branch", "name code city address")
      .sort({ createdAt: -1 });

    return res.json({ status: "success", data: { doctors: doctors || [] } });
  } catch (err: any) {
    console.error("Error fetching public doctors:", err);
    return res.json({ status: "success", data: { doctors: [] } });
  }
});

import { getRealtimeStaffCountsForBranches } from "../utils/branchStaffHelper";

export const getPublicHospitalBranches = catchAsync(async (_req: Request, res: Response) => {
  try {
    const rawBranches = await Branch.find({ status: { $ne: "inactive" } })
      .select("name code branchId city state street phone status totalStaff")
      .sort({ name: 1 });
    const countMap = await getRealtimeStaffCountsForBranches(rawBranches.map((b) => b._id));
    const branches = rawBranches.map((b) => {
      const obj = b.toObject();
      obj.totalStaff = countMap.get(b._id.toString()) ?? 0;
      return obj;
    });
    return res.json({ status: "success", data: { branches: branches || [] } });
  } catch (err: any) {
    console.error("Error fetching public branches:", err);
    return res.json({ status: "success", data: { branches: [] } });
  }
});

export const getPublicBookedSlots = catchAsync(async (req: Request, res: Response) => {
  const { doctorId, date, phone, patientId } = req.query as Record<string, string>;
  if (!doctorId || !date) {
    return res.json({ status: "success", data: { bookedSlots: [] } });
  }

  let resolvedPatientId = patientId;
  if (!resolvedPatientId && phone) {
    const patientDoc = await Patient.findOne({ phone: phone.trim() }).select("_id");
    if (patientDoc) {
      resolvedPatientId = patientDoc._id.toString();
    }
  }

  // Delegate to the shared AppointmentSlotService — single source of truth.
  const bookedSlots = await AppointmentSlotService.getBookedSlots(doctorId, date, undefined, resolvedPatientId);
  res.json({ status: "success", data: { bookedSlots } });
});

export const createPublicAppointment = catchAsync(async (req: Request, res: Response) => {
  const { name, email, phone, gender, age, doctorId, departmentId, date, time, chiefComplaint } = req.body;
  
  let hospital = await Hospital.findOne({ status: "active" }).sort({ createdAt: 1 });
  if (!hospital) {
    hospital = await Hospital.findOne().sort({ createdAt: 1 });
  }
  if (!hospital) {
    throw new AppError("No active hospital configuration found.", 404);
  }
  
  // 1. Find or create Patient
  let patient = await Patient.findOne({ hospital: hospital._id, phone: phone.trim() });
  if (!patient) {
    const digits1 = Math.floor(Math.random() * 10000000000).toString().padStart(10, "0");
    const digits2 = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    const uhid = `UHID-${digits1}`;
    const patientCode = `PAT-${digits2}`;
    
    patient = await Patient.create({
      hospital: hospital._id,
      name: name.trim(),
      email: email?.trim() || "",
      phone: phone.trim(),
      gender: gender || "Male",
      age: age ? Number(age) : null,
      uhid,
      patientCode,
      status: "opd"
    });
  }

  const bookingDate = new Date(date);

  // 1b. Check doctor slot conflict
  const slotClash = await AppointmentSlotService.checkSlotConflict(
    doctorId,
    bookingDate,
    time,
    hospital._id
  );
  if (slotClash) {
    throw new AppError(
      "This appointment slot has already been booked. Please choose another available slot.",
      409
    );
  }

  // 1c. Check patient slot conflict across all doctors
  const patientSlotClash = await AppointmentSlotService.checkPatientSlotConflict(
    patient._id,
    bookingDate,
    time,
    hospital._id
  );
  if (patientSlotClash) {
    const otherDocName = (patientSlotClash.doctor as any)?.name || "another doctor";
    throw new AppError(
      `Patient already has an active appointment scheduled at ${time} with Dr. ${otherDocName}. A patient cannot book appointments with multiple doctors at the exact same time slot.`,
      409
    );
  }
  
  // 2. Generate Reference ID
  const dateStr = bookingDate.toISOString().split("T")[0].replace(/-/g, "");
  const aptPrefix = `APT-${dateStr}-`;
  
  const latestAppt = await Appointment.findOne({
    hospital: hospital._id,
    referenceId: new RegExp(`^${aptPrefix}`)
  }).sort({ createdAt: -1 });

  let nextSerial = 1;
  if (latestAppt) {
    const serialPart = latestAppt.referenceId.replace(aptPrefix, "");
    const lastSerial = parseInt(serialPart, 10);
    if (!isNaN(lastSerial)) {
      nextSerial = lastSerial + 1;
    }
  }
  const referenceId = `${aptPrefix}${String(nextSerial).padStart(6, "0")}`;
  
  // 3. Create Appointment
  const appointment = await Appointment.create({
    hospital: hospital._id,
    referenceId,
    patient: patient._id,
    doctor: doctorId,
    department: departmentId || null,
    date: bookingDate,
    time,
    type: "Appointment",
    status: "scheduled",
    chiefComplaint: chiefComplaint || "",
    notes: "Public Booking Request"
  });
  
  // 4. Emit Socket event
  emitToHospital(hospital._id, "new_appointment", appointment);
  
  res.status(201).json({ status: "success", data: { appointment } });
});

const publicEnquirySchema = z.object({
  name: nameValidator("Full Name", 2, 50, true),
  email: emailValidator("Email Address", true, 254),
  subject: optionalTrimmedString("Subject", 100, "General Enquiry"),
  message: requiredTrimmedString("Your Message", 10, 1000),
});

export const createPublicEnquiry = catchAsync(async (req: Request, res: Response) => {
  const parsed = publicEnquirySchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Please enter valid data";
    throw new AppError(firstIssue, 400);
  }
  const { name, email, subject, message } = parsed.data;

  let hospital = await Hospital.findOne({ status: "active" }).sort({ createdAt: 1 });
  if (!hospital) {
    hospital = await Hospital.findOne().sort({ createdAt: 1 });
  }
  if (!hospital) {
    hospital = await Hospital.create({
      name: "Sunrise Hospital",
      code: "MAIN",
      tagline: "Advanced Healthcare & Patient Care",
      status: "active"
    });
  }
  
  const enquiry = await Enquiry.create({
    hospital: hospital._id,
    name,
    email: email.toLowerCase(),
    subject: subject || "General Enquiry",
    message,
    status: "pending"
  });
  
  // Emit socket event for real-time admin dashboard update
  try {
    emitToHospital(hospital._id.toString(), "new_enquiry", enquiry);
    emitToHospital(hospital._id.toString(), "dashboard_update", enquiry);
  } catch (err) {
    console.error("Socket emit error:", err);
  }
  
  res.status(201).json({ status: "success", data: { enquiry } });
});

export const listHospitalEnquiries = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  let enquiries;
  if (hospitalId) {
    enquiries = await Enquiry.find({ hospital: hospitalId }).sort({ createdAt: -1 });
  } else {
    enquiries = await Enquiry.find({}).sort({ createdAt: -1 });
  }
  res.json({ status: "success", data: { enquiries } });
});

export const updateEnquiryStatus = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { status } = req.body;
  const enquiry = await Enquiry.findOneAndUpdate(
    { _id: req.params.id, hospital: hospitalId },
    { status },
    { new: true, runValidators: true }
  );
  if (!enquiry) {
    throw new AppError("Enquiry not found", 404);
  }
  emitToHospital(hospitalId, "enquiry:updated", enquiry);
  res.json({ status: "success", data: { enquiry } });
});
