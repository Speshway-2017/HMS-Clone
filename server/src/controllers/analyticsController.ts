import { Request, Response } from "express";
import { Hospital } from "../models/Hospital";
import { Branch } from "../models/Branch";
import { Department } from "../models/Department";
import { User } from "../models/User";
import { catchAsync } from "../utils/catchAsync";

export const getGlobalAnalytics = catchAsync(async (_req: Request, res: Response) => {
  const [
    totalHospitals,
    activeHospitals,
    totalBranches,
    totalDepartments,
    totalAdmins,
    bedCapacityAgg,
    branchesPerHospital,
    adminsByRole,
  ] = await Promise.all([
    Hospital.countDocuments(),
    Hospital.countDocuments({ status: "active" }),
    Branch.countDocuments(),
    Department.countDocuments(),
    User.countDocuments({ role: { $in: ["hospital_admin", "accountant"] } }),
    Hospital.aggregate([{ $group: { _id: null, total: { $sum: "$bedCapacity" } } }]),
    Branch.aggregate([
      { $group: { _id: "$hospital", branches: { $sum: 1 } } },
      { $lookup: { from: "hospitals", localField: "_id", foreignField: "_id", as: "hospital" } },
      { $unwind: "$hospital" },
      { $project: { _id: 0, hospital: "$hospital.name", branches: 1 } },
      { $sort: { branches: -1 } },
      { $limit: 8 },
    ]),
    User.aggregate([
      { $match: { role: { $in: ["hospital_admin", "accountant"] } } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    status: "success",
    data: {
      counts: {
        totalHospitals,
        activeHospitals,
        totalBranches,
        totalDepartments,
        totalAdmins,
        totalBedCapacity: bedCapacityAgg[0]?.total ?? 0,
      },
      pending: {
        totalRevenue: true,
        activePatients: true,
        avgWaitTime: true,
        bedOccupancy: true,
      },
      charts: {
        branchesPerHospital,
        adminsByRole: adminsByRole.map((a) => ({ role: a._id, count: a.count })),
      },
    },
  });
});
