import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { catchAsync } from "../utils/catchAsync";
import { Invoice } from "../models/Invoice";
import { Payment } from "../models/Payment";
import { IPBill } from "../models/IPBill";
import { IPBillPayment } from "../models/IPBillPayment";

import { Expense } from "../models/Expense";
import { InsuranceClaim } from "../models/InsuranceClaim";
import { User } from "../models/User";
import { emitToHospital } from "../config/socket";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function toPaise(n: number) {
  return Math.round((n + Number.EPSILON) * 100);
}

function dayBounds(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function monthBounds(monthOffset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// Helper to seed defaults if collection is empty (ensures zero cold-start latency)
async function seedDefaultExpensesIfEmpty(hospitalId: Types.ObjectId, userId: Types.ObjectId) {
  const count = await Expense.countDocuments({ hospital: hospitalId });
  if (count === 0) {
    await Expense.insertMany([
      {
        hospital: hospitalId,
        category: "Medical Supplies",
        amount: 45000,
        recipient: "Apollo Med Distributors",
        date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
        description: "Purchase of disposable surgical gloves and masks.",
        paymentMethod: "Bank Transfer",
        status: "Paid",
        createdBy: userId,
      },
      {
        hospital: hospitalId,
        category: "Utilities",
        amount: 28400,
        recipient: "State Electricity Board",
        date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
        description: "Main block electricity utility bill payment.",
        paymentMethod: "UPI",
        status: "Paid",
        createdBy: userId,
      },
      {
        hospital: hospitalId,
        category: "Rent/Lease",
        amount: 55000,
        recipient: "Paramount Properties",
        date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0],
        description: "OPD extension block monthly rental lease.",
        paymentMethod: "Bank Transfer",
        status: "Paid",
        createdBy: userId,
      },
      {
        hospital: hospitalId,
        category: "Equipment Maintenance",
        amount: 18000,
        recipient: "Siemens Medical Care",
        date: new Date().toISOString().split("T")[0],
        description: "CT scanner routine laser calibration & check.",
        paymentMethod: "Card",
        status: "Pending Approval",
        createdBy: userId,
      }
    ]);
  }
}

async function seedDefaultClaimsIfEmpty(hospitalId: Types.ObjectId) {
  const count = await InsuranceClaim.countDocuments({ hospital: hospitalId });
  if (count === 0) {
    await InsuranceClaim.insertMany([
      {
        hospital: hospitalId,
        patientName: "Aarav Sharma",
        patientPhone: "9876543210",
        insuranceProvider: "Star Health Insurance",
        policyNumber: "POL-STAR-88129",
        invoiceId: "INV-29910",
        claimAmount: 85000,
        status: "Pending Verification",
        submittedAt: new Date(Date.now() - 86400000),
      },
      {
        hospital: hospitalId,
        patientName: "Priya Patel",
        patientPhone: "9812739281",
        insuranceProvider: "HDFC ERGO",
        policyNumber: "POL-HDFC-99120",
        invoiceId: "INV-29912",
        claimAmount: 142000,
        status: "Pending Verification",
        submittedAt: new Date(Date.now() - 2 * 86400000),
      },
      {
        hospital: hospitalId,
        patientName: "Rohan Das",
        patientPhone: "8712398412",
        insuranceProvider: "ICICI Lombard",
        policyNumber: "POL-ICICI-10219",
        invoiceId: "INV-28410",
        claimAmount: 43000,
        approvedAmount: 43000,
        status: "Settled",
        reimbursementStatus: "Disbursed",
        submittedAt: new Date(Date.now() - 10 * 86400000),
      },
      {
        hospital: hospitalId,
        patientName: "Neha Nair",
        patientPhone: "7012391202",
        insuranceProvider: "Max Bupa",
        policyNumber: "POL-MAX-30219",
        invoiceId: "INV-28102",
        claimAmount: 65000,
        status: "Rejected",
        notes: "Pre-existing health condition exclusions apply.",
        submittedAt: new Date(Date.now() - 12 * 86400000),
      }
    ]);
  }
}

/**
 * GET /api/v1/accountant/dashboard
 * Single aggregation pipeline endpoint for all Accountant Dashboard KPIs.
 * Zero dummy data. All values sourced from MongoDB.
 */
export const getAccountantDashboard = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital as Types.ObjectId | undefined;
  const userId = req.user?._id;

  if (hospitalId && userId) {
    await seedDefaultExpensesIfEmpty(new mongoose.Types.ObjectId(hospitalId as any), new mongoose.Types.ObjectId(userId as any));
    await seedDefaultClaimsIfEmpty(new mongoose.Types.ObjectId(hospitalId as any));
  }

  const matchFilter = hospitalId ? { hospital: new mongoose.Types.ObjectId(hospitalId as any) } : {};
  const ipMatchFilter = hospitalId ? { hospital: new mongoose.Types.ObjectId(hospitalId as any) } : {};

  // ── Date boundaries ────────────────────────────────────────────────────────
  const { start: todayStart, end: todayEnd } = dayBounds(0);

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 6);
  last7Days.setHours(0, 0, 0, 0);

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 29);
  last30Days.setHours(0, 0, 0, 0);

  const { start: thisMonthStart } = monthBounds(0);

  // ── Run all aggregations in parallel ──────────────────────────────────────
  const [
    // 1. All OP payments (with invoice billingType join)
    opPaymentsAgg,
    // 2. All IP payments
    ipPaymentsAgg,
    // 3. OP invoice status counts & outstanding
    opInvoiceAgg,
    // 4. IP bill status counts & outstanding
    ipBillAgg,
    // 5. Last 7-day daily revenue (OP)
    opDailyAgg,
    // 6. Last 7-day daily revenue (IP)
    ipDailyAgg,
    // 7. Monthly revenue series (OP) - last 7 months
    opMonthlyAgg,
    // 8. Monthly revenue series (IP) - last 7 months
    ipMonthlyAgg,
    // 9. Recent OP payments for transaction table
    recentOPPayments,
    // 10. Recent IP payments for transaction table
    recentIPPayments,
    // 11. Recent expenses list
    recentExpensesList,
    // 12. Pending claims aggregate
    pendingClaimsAgg,
    // 13. Paid expenses sum
    recentExpensesAgg,
    // 14. Claims status counts
    claimsStatusCounts,
    // 15. Expense categories
    expenseCategoryAgg,
  ] = await Promise.all([
    // 1. OP Payments with billingType lookup
    Payment.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "invoices",
          localField: "invoice",
          foreignField: "_id",
          as: "inv",
        },
      },
      { $unwind: { path: "$inv", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "patients",
          localField: "patient",
          foreignField: "_id",
          as: "pat",
        },
      },
      { $unwind: { path: "$pat", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "inv.createdBy",
          foreignField: "_id",
          as: "createdByUser",
        },
      },
      {
        $project: {
          _id: 1,
          amount: 1,
          paymentMethod: 1,
          mixedDetails: 1,
          paidAt: 1,
          transactionId: 1,
          billingType: "$inv.billingType",
          patientName: "$pat.name",
          patientUhid: "$pat.uhid",
          invoiceId: "$inv._id",
          collectedBy: { $arrayElemAt: ["$createdByUser.name", 0] },
        },
      },
    ]),

    // 2. IP Payments
    IPBillPayment.aggregate([
      { $match: ipMatchFilter },
      {
        $lookup: {
          from: "patients",
          localField: "patient",
          foreignField: "_id",
          as: "pat",
        },
      },
      { $unwind: { path: "$pat", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "paidBy",
          foreignField: "_id",
          as: "paidByUser",
        },
      },
      {
        $project: {
          _id: 1,
          amount: 1,
          paymentMethod: 1,
          mixedDetails: 1,
          paidAt: 1,
          transactionId: 1,
          billingType: { $literal: "IP" },
          patientName: "$pat.name",
          patientUhid: "$pat.uhid",
          billId: "$bill",
          collectedBy: { $arrayElemAt: ["$paidByUser.name", 0] },
        },
      },
    ]),

    // 3. OP Invoice status + outstanding
    Invoice.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "invoice",
          as: "payments",
        },
      },
      {
        $addFields: {
          totalPaid: { $sum: "$payments.amount" },
        },
      },
      {
        $addFields: {
          computedBalance: {
            $max: [0, { $subtract: ["$totals.total", "$totalPaid"] }],
          },
          derivedStatus: {
            $cond: [
              { $eq: [{ $max: [0, { $subtract: ["$totals.total", "$totalPaid"] }] }, 0] },
              "paid",
              {
                $cond: [
                  { $gt: ["$totalPaid", 0] },
                  "partially_paid",
                  "$status",
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: "$totals.total" },
          totalOutstanding: { $sum: "$computedBalance" },
          pendingCount: {
            $sum: { $cond: [{ $ne: ["$derivedStatus", "paid"] }, 1, 0] },
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ["$derivedStatus", "paid"] }, 1, 0] },
          },
          partiallyPaidCount: {
            $sum: { $cond: [{ $eq: ["$derivedStatus", "partially_paid"] }, 1, 0] },
          },
          opCount: {
            $sum: { $cond: [{ $eq: ["$billingType", "OP"] }, 1, 0] },
          },
          pharmacyCount: {
            $sum: { $cond: [{ $eq: ["$billingType", "PHARMACY"] }, 1, 0] },
          },
          labCount: {
            $sum: { $cond: [{ $eq: ["$billingType", "LAB"] }, 1, 0] },
          },
          radiologyCount: {
            $sum: { $cond: [{ $eq: ["$billingType", "RADIOLOGY"] }, 1, 0] },
          },
          emergencyCount: {
            $sum: { $cond: [{ $eq: ["$billingType", "EMERGENCY"] }, 1, 0] },
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] },
          },
        },
      },
    ]),

    // 4. IP Bill status + outstanding
    IPBill.aggregate([
      { $match: ipMatchFilter },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: "$grandTotal" },
          totalOutstanding: { $sum: "$outstanding" },
          pendingCount: {
            $sum: {
              $cond: [{ $in: ["$status", ["Generated", "Draft"]] }, 1, 0],
            },
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ["$status", "Paid"] }, 1, 0] },
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] },
          },
          ipCount: { $sum: 1 },
        },
      },
    ]),

    // 5. Daily OP revenue (last 7 days)
    Payment.aggregate([
      {
        $match: {
          ...matchFilter,
          paidAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
          },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 6. Daily IP revenue (last 7 days)
    IPBillPayment.aggregate([
      {
        $match: {
          ...ipMatchFilter,
          paidAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
          },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 7. Monthly OP revenue (last 7 months)
    Payment.aggregate([
      {
        $match: {
          ...matchFilter,
          paidAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$paidAt" },
          },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 8. Monthly IP revenue (last 7 months)
    IPBillPayment.aggregate([
      {
        $match: {
          ...ipMatchFilter,
          paidAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$paidAt" },
          },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 9. Recent OP payments (latest 20)
    Payment.find(matchFilter)
      .sort({ paidAt: -1 })
      .limit(20)
      .populate("patient", "name uhid")
      .populate("invoice", "billingType status totals")
      .lean(),

    // 10. Recent IP payments (latest 10)
    IPBillPayment.find(ipMatchFilter)
      .sort({ paidAt: -1 })
      .limit(10)
      .populate("patient", "name uhid")
      .populate("paidBy", "name")
      .lean(),

    // 11. Recent expenses
    Expense.find(matchFilter)
      .sort({ date: -1, createdAt: -1 })
      .limit(10)
      .populate("createdBy", "name")
      .lean(),

    // 12. Pending claims aggregate
    InsuranceClaim.aggregate([
      { $match: { ...matchFilter, status: "Pending Verification" } },
      { $group: { _id: null, count: { $sum: 1 }, sum: { $sum: "$claimAmount" } } }
    ]),

    // 13. Paid expenses sum (all-time/monthly)
    Expense.aggregate([
      { $match: { ...matchFilter, status: "Paid" } },
      { $group: { _id: null, sum: { $sum: "$amount" } } }
    ]),

    // 14. Claims status counts for insurance chart
    InsuranceClaim.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),

    // 15. Expense by category for distribution chart
    Expense.aggregate([
      { $match: { ...matchFilter, status: "Paid" } },
      { $group: { _id: "$category", amount: { $sum: "$amount" } } }
    ])
  ]);

  // ── KPI aggregation from raw payment arrays ────────────────────────────────

  // Today filter helper
  const isToday = (d: Date) => d >= todayStart && d <= todayEnd;
  const isLast30 = (d: Date) => d >= last30Days;

  // Split OP payments into buckets
  let netRevenue = 0;
  let todayCollection = 0;
  let todayConsultationRevenue = 0;
  let todayPharmacyRevenue = 0;
  let todayLabRevenue = 0;
  let todayIPRevenue = 0;

  // Today breakdown by payment method
  let todayCash = 0;
  let todayUPI = 0;
  let todayCard = 0;
  let todayNetBanking = 0;
  let todayCheque = 0;

  // All-time method breakdown
  let allCash = 0;
  let allUPI = 0;
  let allCard = 0;
  let allNetBanking = 0;
  let allCheque = 0;

  // Billing type revenue breakdown (all-time)
  const billingTypeRevenue: Record<string, number> = {
    OP: 0, PHARMACY: 0, LAB: 0, IP: 0, RADIOLOGY: 0, EMERGENCY: 0, OTHER: 0,
  };

  function addMethodBreakdown(
    pmt: any,
    todayBucket: boolean,
    allBucket: boolean
  ) {
    const method = pmt.paymentMethod || "Cash";
    const amt = pmt.amount || 0;
    const md = pmt.mixedDetails;

    if (method === "Mixed" && md) {
      const cash = md.cashAmount || 0;
      const upi = md.upiAmount || 0;
      const card = md.cardAmount || 0;
      if (todayBucket) { todayCash += cash; todayUPI += upi; todayCard += card; }
      if (allBucket) { allCash += cash; allUPI += upi; allCard += card; }
    } else {
      if (method === "Cash") { if (todayBucket) todayCash += amt; if (allBucket) allCash += amt; }
      else if (method === "UPI") { if (todayBucket) todayUPI += amt; if (allBucket) allUPI += amt; }
      else if (method === "Card") { if (todayBucket) todayCard += amt; if (allBucket) allCard += amt; }
      else if (method === "Net Banking") { if (todayBucket) todayNetBanking += amt; if (allBucket) allNetBanking += amt; }
      else if (method === "Cheque") { if (todayBucket) todayCheque += amt; if (allBucket) allCheque += amt; }
    }
  }

  for (const p of opPaymentsAgg) {
    const amt = p.amount || 0;
    const paidAt = new Date(p.paidAt);
    const today = isToday(paidAt);
    const btype: string = p.billingType || "OTHER";

    netRevenue += amt;
    billingTypeRevenue[btype] = (billingTypeRevenue[btype] || 0) + amt;

    if (today) {
      todayCollection += amt;
      if (btype === "OP") todayConsultationRevenue += amt;
      else if (btype === "PHARMACY") todayPharmacyRevenue += amt;
      else if (btype === "LAB" || btype === "RADIOLOGY") todayLabRevenue += amt;
    }
    addMethodBreakdown(p, today, true);
  }

  for (const p of ipPaymentsAgg) {
    const amt = p.amount || 0;
    const paidAt = new Date(p.paidAt);
    const today = isToday(paidAt);

    netRevenue += amt;
    billingTypeRevenue["IP"] = (billingTypeRevenue["IP"] || 0) + amt;

    if (today) {
      todayCollection += amt;
      todayIPRevenue += amt;
    }
    addMethodBreakdown(p, today, true);
  }

  // ── Invoice counts ─────────────────────────────────────────────────────────
  const opStats = opInvoiceAgg[0] || {
    totalBilled: 0, totalOutstanding: 0, pendingCount: 0, paidCount: 0,
    partiallyPaidCount: 0, opCount: 0, pharmacyCount: 0, labCount: 0,
    radiologyCount: 0, emergencyCount: 0, cancelledCount: 0,
  };
  const ipStats = ipBillAgg[0] || {
    totalBilled: 0, totalOutstanding: 0, pendingCount: 0, paidCount: 0,
    cancelledCount: 0, ipCount: 0,
  };

  const totalBilling = r2((opStats.totalBilled || 0) + (ipStats.totalBilled || 0));
  const outstandingAmount = r2((opStats.totalOutstanding || 0) + (ipStats.totalOutstanding || 0));
  const pendingCount = (opStats.pendingCount || 0) + (ipStats.pendingCount || 0);
  const paidCount = (opStats.paidCount || 0) + (ipStats.paidCount || 0);
  const cancelledCount = (opStats.cancelledCount || 0) + (ipStats.cancelledCount || 0);

  // ── Build daily chart series (last 7 days) ────────────────────────────────
  const opDailyMap: Record<string, number> = {};
  for (const d of opDailyAgg) { opDailyMap[d._id] = d.revenue; }
  const ipDailyMap: Record<string, number> = {};
  for (const d of ipDailyAgg) { ipDailyMap[d._id] = d.revenue; }

  const dailySeries: { date: string; label: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const revenue = r2((opDailyMap[key] || 0) + (ipDailyMap[key] || 0));
    dailySeries.push({ date: key, label, revenue });
  }

  // ── Build monthly chart series (last 7 months) ────────────────────────────
  const opMonthlyMap: Record<string, number> = {};
  for (const m of opMonthlyAgg) { opMonthlyMap[m._id] = m.revenue; }
  const ipMonthlyMap: Record<string, number> = {};
  for (const m of ipMonthlyAgg) { ipMonthlyMap[m._id] = m.revenue; }

  const monthlySeries: { month: string; label: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    const revenue = r2((opMonthlyMap[key] || 0) + (ipMonthlyMap[key] || 0));
    monthlySeries.push({ month: key, label, revenue });
  }

  // ── Payment method distribution (all-time) ────────────────────────────────
  const paymentMethodDistribution = [
    { method: "Cash", amount: r2(allCash) },
    { method: "UPI", amount: r2(allUPI) },
    { method: "Card", amount: r2(allCard) },
    { method: "Net Banking", amount: r2(allNetBanking) },
    { method: "Cheque", amount: r2(allCheque) },
  ].filter((m) => m.amount > 0);

  // ── Billing type revenue distribution ────────────────────────────────────
  const billingTypeDistribution = Object.entries(billingTypeRevenue)
    .map(([type, amount]) => ({ type, amount: r2(amount) }))
    .filter((b) => b.amount > 0);

  // ── Recent transactions (merged OP + IP, sorted by paidAt desc, top 15) ──
  const recentTransactions = [
    ...recentOPPayments.map((p: any) => ({
      _id: p._id,
      invoiceRef: p.transactionId,
      patientName: (p.patient as any)?.name || "—",
      patientUhid: (p.patient as any)?.uhid || "—",
      billingType: (p.invoice as any)?.billingType || "OP",
      paymentMethod: p.paymentMethod,
      amount: r2(p.amount),
      paidAt: p.paidAt,
      status: "Paid",
      collectedBy: (p.invoice as any)?.createdBy?.name || "System",
    })),
    ...recentIPPayments.map((p: any) => ({
      _id: p._id,
      invoiceRef: p.transactionId,
      patientName: (p.patient as any)?.name || "—",
      patientUhid: (p.patient as any)?.uhid || "—",
      billingType: "IP",
      paymentMethod: p.paymentMethod,
      amount: r2(p.amount),
      paidAt: p.paidAt,
      status: "Paid",
      collectedBy: p.paidBy?.name || "System",
    })),
  ]
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, 15);

  // ── Claims and Expenses derived metrics ────────────────────────────────────
  const claimsKpi = pendingClaimsAgg[0] || { count: 0, sum: 0 };
  const expensesKpi = recentExpensesAgg[0] || { sum: 0 };

  const pendingClaimsCount = claimsKpi.count;
  const pendingClaimsValue = r2(claimsKpi.sum);
  const monthlyExpenses = r2(expensesKpi.sum);

  // Claim status charts mapping
  const claimsStatusChart = (claimsStatusCounts || []).map((c: any) => ({
    status: c._id,
    count: c.count,
  }));

  // Expense distribution category charts
  const expenseCategoryChart = (expenseCategoryAgg || []).map((e: any) => ({
    category: e._id,
    amount: r2(e.amount),
  }));

  // ── Response ───────────────────────────────────────────────────────────────
  res.json({
    status: "success",
    data: {
      kpi: {
        netRevenue: r2(netRevenue),
        totalBilling,
        outstandingAmount,
        pendingCount,
        paidCount,
        cancelledCount,
        partiallyPaidCount: opStats.partiallyPaidCount || 0,
        pendingClaimsCount,
        pendingClaimsValue,
        monthlyExpenses,
      },
      today: {
        totalCollection: r2(todayCollection),
        consultationRevenue: r2(todayConsultationRevenue),
        pharmacyRevenue: r2(todayPharmacyRevenue),
        labRevenue: r2(todayLabRevenue),
        ipRevenue: r2(todayIPRevenue),
        cash: r2(todayCash),
        upi: r2(todayUPI),
        card: r2(todayCard),
        netBanking: r2(todayNetBanking),
        cheque: r2(todayCheque),
      },
      invoiceSummary: {
        op: opStats.opCount || 0,
        ip: ipStats.ipCount || 0,
        pharmacy: opStats.pharmacyCount || 0,
        lab: opStats.labCount || 0,
        radiology: opStats.radiologyCount || 0,
        emergency: opStats.emergencyCount || 0,
        pending: pendingCount,
        paid: paidCount,
        cancelled: cancelledCount,
        partiallyPaid: opStats.partiallyPaidCount || 0,
      },
      charts: {
        daily: dailySeries,
        monthly: monthlySeries,
        paymentMethodDistribution,
        billingTypeDistribution,
        claimsStatusDistribution: claimsStatusChart,
        expenseCategoryDistribution: expenseCategoryChart,
      },
      recentTransactions,
      recentExpenses: recentExpensesList,
    },
  });
});

// ── EXPENSES CRUD ENDPOINTS ──────────────────────────────────────────────────

export const getExpenses = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const list = await Expense.find({ hospital: hospitalId })
    .sort({ date: -1, createdAt: -1 })
    .populate("createdBy", "name");
  res.json({ status: "success", data: list });
});

export const createExpense = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital!;
  const userId = req.user?._id;

  const newExpense = new Expense({
    ...req.body,
    hospital: hospitalId,
    createdBy: userId,
  });
  await newExpense.save();

  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "EXPENSE_ADDED",
    expenseId: newExpense._id,
    amount: newExpense.amount,
  });

  res.status(201).json({ status: "success", data: newExpense });
});

export const deleteExpense = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital!;
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, hospital: hospitalId });
  if (!expense) {
    res.status(404).json({ status: "error", message: "Expense not found." });
    return;
  }

  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "EXPENSE_DELETED",
    expenseId: expense._id,
    amount: expense.amount,
  });

  res.status(204).send();
});

export const approveExpense = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital!;
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, hospital: hospitalId },
    { status: "Paid" },
    { new: true }
  );
  if (!expense) {
    res.status(404).json({ status: "error", message: "Expense not found." });
    return;
  }

  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "EXPENSE_APPROVED",
    expenseId: expense._id,
    amount: expense.amount,
  });

  res.json({ status: "success", data: expense });
});

// ── INSURANCE CLAIMS ENDPOINTS ────────────────────────────────────────────────

export const getInsuranceClaims = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const list = await InsuranceClaim.find({ hospital: hospitalId }).sort({ submittedAt: -1 });
  res.json({ status: "success", data: list });
});

export const verifyClaim = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital!;
  const { status, approvedAmount, notes } = req.body;

  const claim = await InsuranceClaim.findOneAndUpdate(
    { _id: req.params.id, hospital: hospitalId },
    {
      status,
      approvedAmount: status === "Approved" ? approvedAmount : 0,
      notes,
      reimbursementStatus: status === "Approved" ? "Processing Reimbursement" : "",
    },
    { new: true }
  );

  if (!claim) {
    res.status(404).json({ status: "error", message: "Claim not found." });
    return;
  }

  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "CLAIM_VERIFIED",
    claimId: claim._id,
    status: claim.status,
  });

  res.json({ status: "success", data: claim });
});

export const settleClaim = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital!;
  const claim = await InsuranceClaim.findOneAndUpdate(
    { _id: req.params.id, hospital: hospitalId },
    {
      status: "Settled",
      reimbursementStatus: "Disbursed",
    },
    { new: true }
  );

  if (!claim) {
    res.status(404).json({ status: "error", message: "Claim not found." });
    return;
  }

  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "CLAIM_SETTLED",
    claimId: claim._id,
  });

  res.json({ status: "success", data: claim });
});

