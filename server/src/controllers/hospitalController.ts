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

const hospitalSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional().default(""),
  contactEmail: z.string().email().optional().or(z.literal("")).default(""),
  contactPhone: z.string().optional().default(""),
  logoUrl: z.string().optional().default(""),
  licenseUrl: z.string().optional().default(""),
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

export const createHospital = catchAsync(async (req: Request, res: Response) => {
  const body = hospitalSchema.parse(req.body);
  const { primaryAdminId, ...hospitalFields } = body;

  const hospital = await Hospital.create({ ...hospitalFields, createdBy: req.user!._id });

  if (primaryAdminId) {
    await User.findOneAndUpdate({ _id: primaryAdminId, role: "hospital_admin", hospital: null }, { hospital: hospital._id });
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
    await User.findOneAndUpdate({ _id: primaryAdminId, role: "hospital_admin" }, { hospital: hospital._id });
  }

  res.json({ status: "success", data: { hospital } });
});

export const deleteHospital = catchAsync(async (req: Request, res: Response) => {
  const hospital = await Hospital.findByIdAndDelete(req.params.id);
  if (!hospital) {
    throw new AppError("Hospital not found.", 404);
  }
  res.status(204).send();
});

export const listUnassignedHospitalAdmins = catchAsync(async (_req: Request, res: Response) => {
  const admins = await User.find({ role: "hospital_admin", hospital: null }).select("name email");
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
    let doctors = await Doctor.find({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
    })
      .populate("department", "name consultationFee")
      .sort({ createdAt: -1 });

    if (!doctors || doctors.length === 0) {
      doctors = await Doctor.find({})
        .populate("department", "name consultationFee")
        .sort({ createdAt: -1 });
    }

    return res.json({ status: "success", data: { doctors: doctors || [] } });
  } catch (err: any) {
    console.error("Error fetching public doctors:", err);
    const fallbackDoctors = await Doctor.find({}).catch(() => []);
    return res.json({ status: "success", data: { doctors: fallbackDoctors || [] } });
  }
});

export const getPublicBookedSlots = catchAsync(async (req: Request, res: Response) => {
  const { doctorId, date } = req.query as Record<string, string>;
  if (!doctorId || !date) {
    return res.json({ status: "success", data: { bookedSlots: [] } });
  }

  // Delegate to the shared AppointmentSlotService — single source of truth.
  // No hospitalId scope for public routes (doctor may be cross-hospital in a multi-tenant setup).
  const bookedSlots = await AppointmentSlotService.getBookedSlots(doctorId, date);
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
  
  // 2. Generate Reference ID
  const bookingDate = new Date(date);
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

export const createPublicEnquiry = catchAsync(async (req: Request, res: Response) => {
  const { name, email, subject, message } = req.body;
  
  const nameStr = name?.trim() || "";
  const emailStr = email?.trim() || "";
  const messageStr = message?.trim() || "";

  if (!nameStr || !emailStr || !messageStr) {
    throw new AppError("Name, email, and message are required fields.", 400);
  }

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
    name: nameStr,
    email: emailStr,
    subject: subject?.trim() || "General Enquiry",
    message: messageStr,
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
  res.json({ status: "success", data: { enquiry } });
});

