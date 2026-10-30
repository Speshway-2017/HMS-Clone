import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Staff, STAFF_DUTY_STATUSES } from "../models/Staff";
import { User } from "../models/User";
import { Admission } from "../models/Admission";
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
  numberValidator,
} from "../utils/validators";

const staffSchema = z.object({
  department: z.string().optional().nullable(),
  name: z.string().min(1),
  gender: z.string().min(1, "Gender is required").default("Male"),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
  role: z.string().optional().default(""),
  employeeId: z.string().optional().default(""),
  qualifications: z.string().optional().default(""),
  dateOfJoining: z.coerce.date().optional().nullable(),
  dutyStatus: z.enum(STAFF_DUTY_STATUSES).optional(),
  checkInTime: z.string().optional().default(""),
  taskLoad: z.coerce.number().min(0).max(100).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
});

import { Doctor } from "../models/Doctor";

export async function syncDoctorStaffRecords() {
  try {
    const doctorStaffList = await Staff.find({
      $or: [
        { role: { $regex: /^doctor$/i } },
        { role: { $regex: /doctor/i } }
      ]
    });

    for (const s of doctorStaffList) {
      let existingDoc = await Doctor.findOne({
        hospital: s.hospital,
        $or: [
          ...(s.email ? [{ email: s.email.toLowerCase() }] : []),
          ...(s.employeeId ? [{ licenseNo: s.employeeId }] : []),
          { name: s.name, hospital: s.hospital }
        ]
      });

      if (!existingDoc) {
        await Doctor.create({
          hospital: s.hospital,
          branch: s.branch,
          name: s.name,
          gender: s.gender || "Male",
          email: s.email || "",
          phone: s.phone || "",
          photoUrl: s.photoUrl || "",
          department: s.department || null,
          qualification: s.qualifications || "",
          licenseNo: s.employeeId || "",
          rating: s.rating || 0,
          status: s.dutyStatus === "on_leave" ? "on_leave" : s.dutyStatus === "off_duty" ? "off_duty" : "on_duty",
          isActive: true,
        });
      }

      if (s.email) {
        await User.findOneAndUpdate(
          { email: s.email.toLowerCase() },
          { role: "doctor" }
        );
      }

      await Staff.deleteOne({ _id: s._id });
    }
  } catch (err) {
    console.error("Error syncing doctor staff records:", err);
  }
}

export const listStaff = catchAsync(async (req: Request, res: Response) => {
  await syncDoctorStaffRecords();

  const { page, limit, skip } = getPagination(req, 20);
  const { role, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { ...req.hospitalFilter };
  if (role) {
    filter.role = role;
  } else {
    filter.role = { $nin: ["doctor", "Doctor", "DOC", "doc"] };
  }
  if (search) filter.name = new RegExp(search, "i");

  const [staff, total, dutyCounts] = await Promise.all([
    Staff.find(filter).populate("department", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Staff.countDocuments(filter),
    Staff.aggregate([
      { $match: { ...(req.hospitalFilter as Record<string, unknown>), role: { $nin: ["doctor", "Doctor", "DOC", "doc"] } } },
      { $group: { _id: "$dutyStatus", count: { $sum: 1 } } }
    ]),
  ]);

  const countByStatus = (key: string) => dutyCounts.find((c) => c._id === key)?.count ?? 0;

  const staffWithPatients = await Promise.all(
    staff.map(async (member) => {
      if (member.role === "nurse") {
        const activeAdmissionsStatuses = ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"];
        const count = await Admission.countDocuments({
          assignedNurse: member._id,
          status: { $in: activeAdmissionsStatuses }
        });
        return {
          ...member.toObject(),
          assignedPatientCount: count,
          shift: member.dutyStatus === "on_duty" ? "Evening" : "Morning"
        };
      }
      return member.toObject();
    })
  );

  res.json({
    status: "success",
    ...paginatedResponse(staffWithPatients, total, { page, limit, skip }),
    counts: {
      present: countByStatus("on_duty"),
      late: countByStatus("late"),
      absent: countByStatus("off_duty"),
      onLeave: countByStatus("on_leave"),
    },
  });
});

export const getTopStaff = catchAsync(async (req: Request, res: Response) => {
  await syncDoctorStaffRecords();

  const filter = {
    ...(req.hospitalFilter as Record<string, unknown>),
    role: { $nin: ["doctor", "Doctor", "DOC", "doc"] }
  };

  const staff = await Staff.find(filter)
    .sort({ rating: -1 })
    .limit(3);
  res.json({ status: "success", data: { staff } });
});

export const getNextEmployeeId = catchAsync(async (req: Request, res: Response) => {
  const role = (req.query.role as string) || "staff";
  const hospitalId = req.hospitalFilter?.hospital || (req.query.hospital as string);
  const branchId = req.hospitalFilter?.branch || (req.query.branch as string) || null;
  const employeeId = await generateUniqueEmployeeId(role, hospitalId, branchId);
  res.json({ status: "success", data: { employeeId } });
});

import { emitToHospital } from "../config/socket";

export const createStaff = catchAsync(async (req: Request, res: Response) => {
  const body = staffSchema.parse(req.body);
  const hospitalId = req.hospitalFilter!.hospital;
  const branchId = req.hospitalFilter?.branch || (req.body as any).branch || null;

  const isDoctorRole = (body.role || "").toLowerCase().includes("doctor");

  let employeeId = body.employeeId?.trim();
  if (!employeeId) {
    employeeId = await generateUniqueEmployeeId(body.role || "staff", hospitalId, branchId);
  }

  let createdRecord: any;
  let tempPassword: string | undefined;

  if (isDoctorRole) {
    let doc = await Doctor.findOne({
      hospital: hospitalId,
      $or: [
        ...(body.email ? [{ email: body.email.toLowerCase() }] : []),
        { licenseNo: employeeId }
      ]
    });

    if (!doc) {
      doc = await Doctor.create({
        hospital: hospitalId,
        branch: branchId,
        name: body.name,
        gender: body.gender || "Male",
        email: body.email || "",
        phone: body.phone || "",
        photoUrl: body.photoUrl || "",
        department: body.department || null,
        qualification: body.qualifications || "",
        licenseNo: employeeId,
        rating: body.rating || 0,
        status: body.dutyStatus === "on_leave" ? "on_leave" : body.dutyStatus === "off_duty" ? "off_duty" : "on_duty",
        isActive: true,
      });
    }
    createdRecord = doc.toObject();

    if (body.email) {
      tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const existingUser = await User.findOne({ email: body.email.toLowerCase() });
      if (!existingUser) {
        await User.create({
          name: body.name,
          email: body.email,
          passwordHash,
          role: "doctor",
          employeeId,
          hospital: hospitalId,
          branch: branchId,
        });
      }
    }
  } else {
    const staff = await Staff.create({ ...body, employeeId, hospital: hospitalId, branch: branchId });
    createdRecord = staff.toObject();

    if (body.email) {
      tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const existingUser = await User.findOne({ email: body.email.toLowerCase() });
      if (!existingUser) {
        await User.create({
          name: body.name,
          email: body.email,
          passwordHash,
          role: body.role || "receptionist",
          employeeId,
          hospital: hospitalId,
          branch: branchId,
        });
      }
    }
  }

  emitToHospital(hospitalId, "staff:created", createdRecord);
  emitToHospital(hospitalId, "staff:updated", createdRecord);

  res.status(201).json({
    status: "success",
    data: { staff: createdRecord, tempPassword: tempPassword ?? null },
  });
});

export const getStaffMember = catchAsync(async (req: Request, res: Response) => {
  const staff = await Staff.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("department", "name");
  if (!staff) {
    throw new AppError("Staff member not found.", 404);
  }

  let assignedPatients: any[] = [];
  if (staff.role && (staff.role.toLowerCase() === "nurse" || staff.role.toLowerCase().includes("nurse"))) {
    assignedPatients = await Admission.find({
      assignedNurse: staff._id,
      status: { $nin: ["discharged", "Discharged", "Cancelled", "Transferred Out (Final)"] }
    })
      .populate("patient", "name uhid age gender phone bloodGroup photoUrl")
      .populate("room", "roomNumber type")
      .populate("bed", "bedNumber");
  }

  res.json({
    status: "success",
    data: {
      staff,
      assignedPatients,
    },
  });
});

export const updateStaff = catchAsync(async (req: Request, res: Response) => {
  const body = staffSchema.partial().parse(req.body);
  const staff = await Staff.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, body, {
    new: true,
    runValidators: true,
  });
  if (!staff) {
    throw new AppError("Staff member not found.", 404);
  }
  emitToHospital(staff.hospital, "staff:updated", staff);
  res.json({ status: "success", data: { staff } });
});

export const deleteStaff = catchAsync(async (req: Request, res: Response) => {
  const staff = await Staff.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!staff) {
    throw new AppError("Staff member not found.", 404);
  }
  emitToHospital(staff.hospital, "staff:deleted", { id: staff._id });
  res.status(204).send();
});

export const getStaffProfileMe = catchAsync(async (req: Request, res: Response) => {
  const userEmail = (req.user!.email || "").trim();
  let staff = null;

  if (userEmail) {
    staff = await Staff.findOne({
      email: { $regex: `^${userEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, $options: "i" },
    }).populate("department", "name");
  }

  if (!staff) {
    const hospitalId = req.user!.hospital;
    const userName = req.user!.name || "Staff Member";
    const userRole = req.user!.role || "nurse";

    if (hospitalId) {
      staff = await Staff.create({
        hospital: hospitalId,
        name: userName,
        email: userEmail,
        phone: req.user!.phone || "",
        role: userRole,
        dutyStatus: "on_duty",
      });
    } else {
      return res.json({
        status: "success",
        data: {
          staff: {
            name: userName,
            email: userEmail,
            role: userRole,
            dutyStatus: "on_duty",
          },
        },
      });
    }
  }

  res.json({ status: "success", data: { staff } });
});

