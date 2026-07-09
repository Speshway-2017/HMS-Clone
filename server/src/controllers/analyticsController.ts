import { Request, Response } from "express";
import { Hospital } from "../models/Hospital";
import { Branch } from "../models/Branch";
import { Department } from "../models/Department";
import { Doctor } from "../models/Doctor";
import { Staff } from "../models/Staff";
import { Patient } from "../models/Patient";
import { Appointment } from "../models/Appointment";
import { InventoryItem } from "../models/InventoryItem";
import { Invoice } from "../models/Invoice";
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

export const getHospitalAnalytics = catchAsync(async (req: Request, res: Response) => {
  const hospitalFilter = req.hospitalFilter as Record<string, unknown>;
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date().setHours(24, 0, 0, 0));

  const [totalDoctors, totalStaff, totalPatients, todaysAppointments, departments, inventoryItems, paidInvoices] = await Promise.all([
    Doctor.countDocuments(hospitalFilter),
    Staff.countDocuments(hospitalFilter),
    Patient.countDocuments(hospitalFilter),
    Appointment.countDocuments({ ...hospitalFilter, date: { $gte: startOfDay, $lt: endOfDay } }),
    Department.find(hospitalFilter),
    InventoryItem.find(hospitalFilter),
    Invoice.find({ ...hospitalFilter, status: "paid" }),
  ]);

  const criticalStockCount = inventoryItems.filter((i) => i.stockQty <= i.reorderLevel).length;
  const totalBeds = departments.reduce((sum, d) => sum + d.totalBeds, 0);
  const occupiedBeds = departments.reduce((sum, d) => sum + d.occupiedBeds, 0);
  const bedOccupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const totalRevenue = paidInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, i) => s + i.quantity * i.amount, 0) * (1 + inv.taxRate / 100) + inv.serviceFee,
    0,
  );

  res.json({
    status: "success",
    data: {
      counts: {
        totalDoctors,
        totalStaff,
        totalPatients,
        todaysAppointments,
        totalDepartments: departments.length,
        criticalStockCount,
        totalBeds,
        occupiedBeds,
        bedOccupancyPercent,
        totalRevenue,
      },
    },
  });
});
