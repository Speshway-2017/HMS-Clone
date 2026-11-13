import { Request, Response } from "express";
import { Hospital } from "../models/Hospital";
import { Branch } from "../models/Branch";
import { Invoice } from "../models/Invoice";
import { Payment } from "../models/Payment";
import { Department } from "../models/Department";
import { Doctor } from "../models/Doctor";
import { Staff } from "../models/Staff";
import { Patient } from "../models/Patient";
import { Appointment } from "../models/Appointment";
import { InventoryItem } from "../models/InventoryItem";
import { User } from "../models/User";
import { catchAsync } from "../utils/catchAsync";

function calculateInvoiceTotal(inv: any): number {
  if (inv.totals && typeof inv.totals.total === "number" && inv.totals.total > 0) {
    return inv.totals.total;
  }
  const itemsSum = inv.items?.reduce((s: number, i: any) => s + (i.quantity || 1) * (i.amount || 0), 0) || 0;
  const tax = (itemsSum * (inv.taxRate || 0)) / 100;
  const fee = inv.serviceFee || 0;
  const discount = inv.discount || 0;
  return Math.max(0, itemsSum + tax + fee - discount);
}

export const getGlobalAnalytics = catchAsync(async (_req: Request, res: Response) => {
  // Purge any dummy records previously seeded
  await Promise.all([
    Hospital.deleteMany({ code: { $in: ["PFC-MAIN", "PFC-CHN", "PFC-CBE"] } }),
    Branch.deleteMany({ branchId: { $in: ["BR-MDU-01", "BR-MDU-02", "BR-CHN-01", "BR-CHN-02", "BR-CBE-01"] } }),
    Department.deleteMany({
      code: {
        $in: [
          "IVF-01",
          "OBG-01",
          "EMB-01",
          "FET-01",
          "NICU-01",
          "CHN-IVF",
          "CHN-OBG",
          "CHN-SURG",
          "CBE-IVF",
          "CBE-OBG",
          "CBE-EMB",
        ],
      },
    }),
    User.deleteMany({
      email: {
        $in: [
          "admin_madurai@preethifertility.com",
          "admin_chennai@preethifertility.com",
          "admin_coimbatore@preethifertility.com",
        ],
      },
    }),
  ]);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Fetch real hospitals
  const [totalHospitals, activeHospitals, inactiveHospitals, hospitals] = await Promise.all([
    Hospital.countDocuments(),
    Hospital.countDocuments({ status: "active" }),
    Hospital.countDocuments({ status: "inactive" }),
    Hospital.find().sort({ createdAt: -1 }),
  ]);

  // 2. Fetch real paid invoices and payments
  const paidInvoices = await Invoice.find({ status: "paid" });

  let totalSales = 0;
  let todaySales = 0;
  let thisMonthSales = 0;

  const salesByHospitalMap = new Map<string, { sales: number; count: number }>();

  for (const inv of paidInvoices) {
    const amount = calculateInvoiceTotal(inv);
    const hospId = inv.hospital ? inv.hospital.toString() : "unassigned";

    totalSales += amount;

    const invoiceDate = inv.issuedAt || (inv as any).createdAt || now;
    if (new Date(invoiceDate) >= startOfDay) {
      todaySales += amount;
    }
    if (new Date(invoiceDate) >= startOfMonth) {
      thisMonthSales += amount;
    }

    const current = salesByHospitalMap.get(hospId) || { sales: 0, count: 0 };
    salesByHospitalMap.set(hospId, {
      sales: current.sales + amount,
      count: current.count + 1,
    });
  }

  // Also check direct payments if any exist
  const directPayments = await Payment.find();
  let directPaymentTotal = 0;
  for (const p of directPayments) {
    directPaymentTotal += p.amount || 0;
  }
  // Use whichever sales representation is non-zero
  if (totalSales === 0 && directPaymentTotal > 0) {
    totalSales = directPaymentTotal;
  }

  // 3. Build per-hospital simple sales & branch summary
  const hospitalList = await Promise.all(
    hospitals.map(async (h) => {
      const branchCount = await Branch.countDocuments({ hospital: h._id });
      const stats = salesByHospitalMap.get(h._id.toString()) || { sales: 0, count: 0 };

      return {
        _id: h._id.toString(),
        name: h.name,
        code: h.code,
        address: h.address,
        contactEmail: h.contactEmail,
        contactPhone: h.contactPhone,
        status: h.status,
        totalBranches: branchCount,
        totalSales: stats.sales,
        totalInvoices: stats.count,
        createdAt: (h as any).createdAt,
      };
    }),
  );

  // 4. Sales by hospital chart data
  const salesByHospitalChart = hospitalList.map((h) => ({
    name: h.name,
    code: h.code,
    sales: h.totalSales,
    invoices: h.totalInvoices,
  }));

  // 5. Recent 7 days sales trend (real data only)
  const last7DaysMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    last7DaysMap.set(dateStr, 0);
  }

  for (const inv of paidInvoices) {
    const invDate = new Date(inv.issuedAt || (inv as any).createdAt || now);
    const diffDays = Math.floor((now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 6 && diffDays >= 0) {
      const dateStr = invDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (last7DaysMap.has(dateStr)) {
        last7DaysMap.set(dateStr, (last7DaysMap.get(dateStr) || 0) + calculateInvoiceTotal(inv));
      }
    }
  }

  const salesTrend = Array.from(last7DaysMap.entries()).map(([date, sales]) => ({
    date,
    sales,
  }));

  res.json({
    status: "success",
    data: {
      hospitals: {
        total: totalHospitals,
        active: activeHospitals,
        inactive: inactiveHospitals,
        list: hospitalList,
      },
      sales: {
        totalSales,
        todaySales,
        thisMonthSales,
        totalInvoices: paidInvoices.length,
        salesByHospital: salesByHospitalChart,
        salesTrend,
      },
      // Backwards-compatible counts object for any legacy hooks
      counts: {
        totalHospitals,
        activeHospitals,
        totalSales,
        todaySales,
        thisMonthSales,
        totalInvoices: paidInvoices.length,
      },
    },
  });
});

export const getHospitalAnalytics = catchAsync(async (req: Request, res: Response) => {
  let hospitalFilter = req.hospitalFilter as Record<string, unknown>;

  if (req.user?.role === "super_admin" && req.query.hospitalId) {
    hospitalFilter = { hospital: req.query.hospitalId };
  }

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
    (sum, inv) => sum + calculateInvoiceTotal(inv),
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
      sales: {
        totalSales: totalRevenue,
        paidInvoices: paidInvoices.length,
      },
    },
  });
});
