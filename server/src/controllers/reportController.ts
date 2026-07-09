import { Request, Response } from "express";
import { Hospital } from "../models/Hospital";
import { Branch } from "../models/Branch";
import { Department } from "../models/Department";
import { User } from "../models/User";
import { Report, REPORT_TYPES } from "../models/Report";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { toCsv } from "../utils/csv";

export const listReports = catchAsync(async (_req: Request, res: Response) => {
  const [reports, categoryCounts] = await Promise.all([
    Report.find().populate("generatedBy", "name").sort({ createdAt: -1 }).limit(20),
    Promise.all([
      Hospital.countDocuments(),
      Branch.countDocuments(),
      Department.countDocuments(),
      User.countDocuments({ role: { $in: ["hospital_admin", "accountant"] } }),
    ]),
  ]);

  const [hospitals, branches, departments, admins] = categoryCounts;

  res.json({
    status: "success",
    data: {
      reports,
      categories: [
        { type: "hospitals", label: "Hospitals", count: hospitals },
        { type: "branches", label: "Branches", count: branches },
        { type: "departments", label: "Departments", count: departments },
        { type: "admins", label: "Admins", count: admins },
      ],
    },
  });
});

export const exportReport = catchAsync(async (req: Request, res: Response) => {
  const type = req.params.type as (typeof REPORT_TYPES)[number];
  if (!REPORT_TYPES.includes(type)) {
    throw new AppError("Unknown report type.", 400);
  }

  let csv: string;
  let rowCount: number;

  if (type === "hospitals") {
    const rows = await Hospital.find().lean();
    rowCount = rows.length;
    csv = toCsv(rows, [
      { key: "name", header: "Name" },
      { key: "code", header: "Code" },
      { key: "status", header: "Status" },
      { key: "bedCapacity", header: "Bed Capacity" },
      { key: "contactEmail", header: "Contact Email" },
      { key: "contactPhone", header: "Contact Phone" },
    ]);
  } else if (type === "branches") {
    const rows = await Branch.find().populate("hospital", "name").lean();
    rowCount = rows.length;
    csv = toCsv(
      rows.map((r) => ({ ...r, hospitalName: (r.hospital as unknown as { name: string })?.name })),
      [
        { key: "branchId", header: "Branch ID" },
        { key: "name", header: "Name" },
        { key: "hospitalName", header: "Hospital" },
        { key: "category", header: "Category" },
        { key: "city", header: "City" },
        { key: "state", header: "State" },
        { key: "status", header: "Status" },
        { key: "totalStaff", header: "Total Staff" },
      ],
    );
  } else if (type === "departments") {
    const rows = await Department.find().populate("hospital", "name").lean();
    rowCount = rows.length;
    csv = toCsv(
      rows.map((r) => ({ ...r, hospitalName: (r.hospital as unknown as { name: string })?.name })),
      [
        { key: "name", header: "Name" },
        { key: "hospitalName", header: "Hospital" },
        { key: "category", header: "Category" },
        { key: "totalBeds", header: "Total Beds" },
        { key: "doctors", header: "Doctors" },
        { key: "nurses", header: "Nurses" },
        { key: "status", header: "Status" },
      ],
    );
  } else {
    const rows = await User.find({ role: { $in: ["hospital_admin", "accountant"] } })
      .populate("hospital", "name")
      .lean();
    rowCount = rows.length;
    csv = toCsv(
      rows.map((r) => ({ ...r, hospitalName: (r.hospital as unknown as { name: string })?.name })),
      [
        { key: "name", header: "Name" },
        { key: "email", header: "Email" },
        { key: "role", header: "Role" },
        { key: "hospitalName", header: "Hospital" },
        { key: "title", header: "Title" },
        { key: "status", header: "Status" },
      ],
    );
  }

  await Report.create({ type, format: "csv", rowCount, generatedBy: req.user!._id });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-export.csv"`);
  res.send(csv);
});
