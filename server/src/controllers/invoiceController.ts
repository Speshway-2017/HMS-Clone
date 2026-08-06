import { Request, Response } from "express";
import { z } from "zod";
import { Invoice, INVOICE_STATUSES } from "../models/Invoice";
import { Payment } from "../models/Payment";
import { IPBill } from "../models/IPBill";
import { IPBillPayment } from "../models/IPBillPayment";
import { Patient } from "../models/Patient";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { emitToHospital } from "../config/socket";
import { logAudit } from "../utils/auditLogger";

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  category: z.string().optional().default(""),
  quantity: z.coerce.number().min(1).optional().default(1),
  amount: z.coerce.number().min(0),
});

const invoiceSchema = z.object({
  patient: z.string().min(1),
  items: z.array(invoiceItemSchema).min(1),
  taxRate: z.coerce.number().min(0).optional().default(0),
  serviceFee: z.coerce.number().min(0).optional().default(0),
  insuranceCoveragePercent: z.coerce.number().min(0).max(100).optional().default(0),
  billingType: z.enum(["OP", "IP", "LAB", "PHARMACY", "RADIOLOGY", "SURGERY", "EMERGENCY", "OTHER"]),
  status: z.enum(INVOICE_STATUSES).optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

function computeTotals(
  invoice: { items: { quantity: number; amount: number }[]; taxRate: number; serviceFee: number; insuranceCoveragePercent: number; discount?: number; status?: string; totals?: any },
  totalPaid: number = 0
) {
  const subtotal = invoice.items.reduce((sum, i) => sum + i.quantity * i.amount, 0);
  const taxAmount = subtotal * (invoice.taxRate / 100);
  const discount = invoice.discount || 0;
  const total = Math.max(0, subtotal + taxAmount + invoice.serviceFee - discount);
  const insuranceCovered = total * (invoice.insuranceCoveragePercent / 100);

  const isPaidInDb = (invoice.status || "").toLowerCase() === "paid" || invoice.totals?.patientBalance === 0;
  const patientBalance = isPaidInDb ? 0 : Math.max(0, total - insuranceCovered - totalPaid);
  return { subtotal, taxAmount, total, insuranceCovered, patientBalance };
}

export const listInvoices = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req, 20);
  const { status, patient, billingType } = req.query as Record<string, string | undefined>;

  const filter: Record<string, any> = { ...req.hospitalFilter };
  // "pending" in business logic = any invoice with outstanding balance (pending + partially_paid + overdue)
  if (status) {
    if (status === "pending") {
      filter.status = { $in: ["pending", "partially_paid", "overdue"] };
    } else {
      filter.status = status;
    }
  }
  if (patient) filter.patient = patient;
  if (billingType) filter.billingType = billingType;

  // Determine IP Bill filters
  const ipFilter: any = { ...req.hospitalFilter };
  if (patient) ipFilter.patient = patient;

  // Enforce patient data isolation for invoices listing
  if (req.user!.role === "patient") {
    const patientDoc = await Patient.findOne({ email: req.user!.email });
    if (patientDoc) {
      filter.patient = patientDoc._id;
      ipFilter.patient = patientDoc._id;
    } else {
      filter.patient = "000000000000000000000000";
      ipFilter.patient = "000000000000000000000000";
    }
  }

  // Query OP invoices
  const opInvoicesPromise = Invoice.find(filter)
    .populate("patient", "name uhid phone age gender status")
    .populate("appointment")
    .populate("admission")
    .sort({ createdAt: -1 });
  if (status) {
    if (status === "pending" || status === "partially_paid" || status === "overdue") {
      // All unpaid IP bills
      ipFilter.status = "Generated";
      ipFilter.outstanding = { $gt: 0 };
    } else if (status === "paid") {
      ipFilter.status = "Paid";
    } else {
      ipFilter.status = status;
    }
  }
  if (patient) ipFilter.patient = patient;

  const includeIP = !billingType || billingType === "IP";

  const ipBillsPromise = includeIP
    ? IPBill.find(ipFilter).populate("patient", "name uhid phone age gender status").sort({ createdAt: -1 })
    : Promise.resolve([]);

  const [
    opInvoices,
    ipBills,
    allForHospital,
    allIPBillsForHospital,
    opCount,
    pharmacyCount,
    labCount,
    allPayments,
    allIPPaymentsForHospital
  ] = await Promise.all([
    opInvoicesPromise,
    ipBillsPromise,
    Invoice.find(req.hospitalFilter as Record<string, unknown>),
    IPBill.find(req.hospitalFilter as Record<string, unknown>),
    Invoice.countDocuments({ ...req.hospitalFilter, billingType: "OP" }),
    Invoice.countDocuments({ ...req.hospitalFilter, billingType: "PHARMACY" }),
    Invoice.countDocuments({ ...req.hospitalFilter, billingType: "LAB" }),
    Payment.find(req.hospitalFilter as Record<string, unknown>),
    IPBillPayment.find(req.hospitalFilter as Record<string, unknown>)
  ]);

  // Map IP bills to conformed invoice structure
  const mappedIpInvoices = ipBills.map((bill: any) => {
    const ipAmountPaid = Math.max(0, (bill.grandTotal || 0) - (bill.outstanding || 0));
    return {
      _id: bill._id,
      patient: bill.patient,
      issuedAt: bill.billingDate || bill.createdAt,
      dueDate: bill.billingDate || bill.createdAt,
      billingType: "IP",
      status: bill.status === "Paid" ? "paid" : (bill.status === "Generated" ? "partially_paid" : "pending"),
      items: [{ description: "Inpatient stay & treatment charges", quantity: 1, amount: bill.grandTotal }],
      amountPaid: ipAmountPaid,
      totals: {
        subtotal: bill.grandTotal,
        taxAmount: bill.taxRate,
        total: bill.grandTotal,
        insuranceCovered: bill.insuranceCovered,
        patientBalance: bill.outstanding
      }
    };
  });

  // Group payments by invoice
  const paymentsMap: Record<string, number> = {};
  allPayments.forEach((p: any) => {
    if (p.invoice) {
      const invId = p.invoice.toString();
      paymentsMap[invId] = (paymentsMap[invId] || 0) + (p.amount || 0);
    }
  });

  // Map OP invoices
  const mappedOpInvoices = opInvoices.map((inv: any) => {
    const totalPaid = paymentsMap[inv._id.toString()] || 0;
    const computedTotals = computeTotals(inv, totalPaid);
    // Derive a real-time status from actual payments (guards against stale DB status)
    let derivedStatus = inv.status;
    if (computedTotals.patientBalance === 0) {
      derivedStatus = "paid";
    } else if (totalPaid > 0 && computedTotals.patientBalance > 0) {
      derivedStatus = "partially_paid";
    } else if (inv.dueDate && new Date(inv.dueDate) < new Date() && computedTotals.patientBalance > 0) {
      derivedStatus = "overdue";
    }
    return {
      ...inv.toObject(),
      amountPaid: totalPaid,
      status: derivedStatus,
      totals: computedTotals
    };
  });

  // Combine and sort
  let combined = [...mappedOpInvoices, ...mappedIpInvoices];
  combined.sort((a: any, b: any) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  // Post-filter: when status=pending, keep ONLY invoices with outstanding balance > 0
  // This ensures partially_paid and overdue are included, and any that became fully-paid are excluded
  if (status === "pending") {
    combined = combined.filter((inv: any) => (inv.totals?.patientBalance ?? 0) > 0);
  }

  // Paginate combined list
  const paginatedData = combined.slice(skip, skip + limit);
  const total = combined.length;

  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  // ── Outstanding & pending count (payment-aware, not stale DB status) ──────
  let opOutstanding = 0;
  let opPending = 0;
  let opCompleted = 0;

  allForHospital.forEach((inv: any) => {
    const paid = paymentsMap[inv._id.toString()] || 0;
    const t = computeTotals(inv, paid);
    opOutstanding += t.patientBalance;
    if (t.patientBalance === 0) {
      opCompleted += 1;
    } else {
      opPending += 1;
    }
  });

  const ipOutstanding = allIPBillsForHospital.reduce(
    (sum: number, bill: any) => sum + (bill.outstanding || 0), 0
  );
  const ipPending = allIPBillsForHospital.filter(
    (bill: any) => bill.status !== "Paid"
  ).length;
  const ipCompleted = allIPBillsForHospital.filter(
    (bill: any) => bill.status === "Paid"
  ).length;

  const outstandingAmount = r2(opOutstanding + ipOutstanding);
  const pendingCount = opPending + ipPending;
  const completedCount = opCompleted + ipCompleted;

  // ── Billing totals ────────────────────────────────────────────────────────
  const totalBilling = r2(
    allForHospital.reduce(
      (sum: number, inv: any) =>
        sum + computeTotals(inv, paymentsMap[inv._id.toString()] || 0).total,
      0
    ) +
      allIPBillsForHospital.reduce(
        (sum: number, bill: any) => sum + (bill.grandTotal || 0),
        0
      )
  );

  const netRevenue = r2(
    allPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) +
      allIPPaymentsForHospital.reduce(
        (sum: number, p: any) => sum + (p.amount || 0),
        0
      )
  );

  // ── Date helpers ──────────────────────────────────────────────────────────
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todayPayments = allPayments.filter((p: any) => {
    const d = new Date(p.paidAt || p.createdAt);
    return d >= startOfToday && d <= endOfToday;
  });
  const todayIPPayments = allIPPaymentsForHospital.filter((p: any) => {
    const d = new Date(p.paidAt || p.createdAt);
    return d >= startOfToday && d <= endOfToday;
  });

  const todayCollection = r2(
    todayPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) +
      todayIPPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
  );

  // ── Pharmacy revenue today ────────────────────────────────────────────────
  const invoiceBillingTypeMap: Record<string, string> = {};
  allForHospital.forEach((inv: any) => {
    invoiceBillingTypeMap[inv._id.toString()] = inv.billingType;
  });
  const todayPharmacyRevenue = r2(
    todayPayments
      .filter(
        (p: any) =>
          invoiceBillingTypeMap[p.invoice?.toString()] === "PHARMACY"
      )
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
  );

  // ── Payment method breakdown — TODAY only (matches todayCollection) ───────
  let cashCollection = 0;
  let upiCollection = 0;
  let cardCollection = 0;

  const allTodayPayments = [...todayPayments, ...todayIPPayments];
  allTodayPayments.forEach((p: any) => {
    const method = p.paymentMethod || p.paymentMode || "Cash";
    if (method === "Cash") {
      cashCollection += p.amount || 0;
    } else if (method === "UPI") {
      upiCollection += p.amount || 0;
    } else if (method === "Card") {
      cardCollection += p.amount || 0;
    } else if (method === "Mixed" && p.mixedDetails) {
      cashCollection += p.mixedDetails.cashAmount || 0;
      upiCollection += p.mixedDetails.upiAmount || 0;
      cardCollection += p.mixedDetails.cardAmount || 0;
    }
  });
  cashCollection = r2(cashCollection);
  upiCollection = r2(upiCollection);
  cardCollection = r2(cardCollection);

  // ── Monthly series for Revenue vs Expenses chart (last 7 months) ─────────
  const now = new Date();
  const monthlySeries: { month: string; revenue: number; payments: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });

    const monthRevenue = r2(
      allPayments
        .filter((p: any) => {
          const pd = new Date(p.paidAt || p.createdAt);
          return pd >= monthStart && pd <= monthEnd;
        })
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) +
        allIPPaymentsForHospital
          .filter((p: any) => {
            const pd = new Date(p.paidAt || p.createdAt);
            return pd >= monthStart && pd <= monthEnd;
          })
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    );

    monthlySeries.push({ month: label, revenue: monthRevenue, payments: monthRevenue });
  }

  const currentMonthRevenue = monthlySeries[monthlySeries.length - 1]?.revenue ?? 0;

  res.json({
    status: "success",
    data: paginatedData,
    pagination: paginatedResponse(paginatedData, total, { page, limit, skip }).pagination,
    counts: {
      totalBilling,
      netRevenue,
      pendingCount,
      completedCount,
      outstandingAmount,
      todayCollection,
      todayPharmacyRevenue,
      cashCollection,
      upiCollection,
      cardCollection,
      currentMonthRevenue,
      monthlySeries,
      all: allForHospital.length + allIPBillsForHospital.length,
      op: opCount,
      ip: allIPBillsForHospital.length,
      pharmacy: pharmacyCount,
      laboratory: labCount,
    },
  });
});

export const createInvoice = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital!;
  const body = invoiceSchema.parse(req.body);

  const computedTotals = computeTotals({
    items: body.items,
    taxRate: body.taxRate || 0,
    serviceFee: body.serviceFee || 0,
    insuranceCoveragePercent: body.insuranceCoveragePercent || 0,
  });

  if (req.body.totals && req.body.totals.patientBalance !== undefined) {
    computedTotals.patientBalance = Number(req.body.totals.patientBalance);
  }

  const invoice = await Invoice.create({
    ...body,
    totals: computedTotals,
    hospital: hospitalId
  });
  
  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "NEW_INVOICE",
    invoiceId: invoice._id,
    billingType: invoice.billingType,
    total: computedTotals.total,
    timestamp: new Date()
  });

  await logAudit({
    req,
    action: "CREATE_INVOICE",
    entity: "Invoice",
    entityId: invoice._id.toString(),
    details: { billingType: invoice.billingType, total: computedTotals.total }
  });

  res.status(201).json({ status: "success", data: { invoice: { ...invoice.toObject(), totals: computedTotals } } });
});

export const getInvoice = catchAsync(async (req: Request, res: Response) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("patient");
  if (!invoice) {
    throw new AppError("Invoice not found.", 404);
  }
  const payments = await Payment.find({ invoice: invoice._id, hospital: invoice.hospital });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  res.json({ status: "success", data: { invoice: { ...invoice.toObject(), totals: computeTotals(invoice, totalPaid) } } });
});

export const updateInvoice = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital!;
  const body = invoiceSchema.partial().parse(req.body);
  const updatePayload: any = { ...body };
  if (body.status && body.status.toLowerCase() === "paid") {
    updatePayload["totals.patientBalance"] = 0;
  }
  const invoice = await Invoice.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, updatePayload, {
    new: true,
    runValidators: true,
  });
  if (!invoice) {
    throw new AppError("Invoice not found.", 404);
  }
  const payments = await Payment.find({ invoice: invoice._id, hospital: hospitalId });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "INVOICE_UPDATE",
    invoiceId: invoice._id,
    billingType: invoice.billingType,
    status: invoice.status,
    timestamp: new Date()
  });

  await logAudit({
    req,
    action: "UPDATE_INVOICE",
    entity: "Invoice",
    entityId: invoice._id.toString(),
    details: body
  });

  res.json({ status: "success", data: { invoice: { ...invoice.toObject(), totals: computeTotals(invoice, totalPaid) } } });
});

export const deleteInvoice = catchAsync(async (req: Request, res: Response) => {
  const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!invoice) {
    throw new AppError("Invoice not found.", 404);
  }

  if (req.hospitalFilter?.hospital) {
    emitToHospital(req.hospitalFilter.hospital.toString(), "dashboard_update", {
      type: "DELETE_INVOICE",
      invoiceId: req.params.id,
      timestamp: new Date()
    });
  }

  await logAudit({
    req,
    action: "DELETE_INVOICE",
    entity: "Invoice",
    entityId: req.params.id,
    details: { billingType: invoice.billingType }
  });

  res.status(204).send();
});

/**
 * GET /invoices/pending-overdue
 * Returns all pending/partially_paid/overdue invoices with full patient, doctor, department details.
 * Supports filters: dateFrom, dateTo, department, doctor, billingType, status, branch, search, uhid.
 * Returns summary KPIs: pendingPatients, totalPendingAmount, overdueAmount, todayCollection, monthCollection.
 */
export const getPendingOverdue = catchAsync(async (req: Request, res: Response) => {
  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const now = new Date();

  const {
    dateFrom, dateTo, department, doctor, billingType, status,
    branch, search, uhid, page: pageQ, limit: limitQ
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(pageQ || "1"));
  const pageLimit = Math.min(100, Math.max(10, parseInt(limitQ || "20")));
  const skip = (pageNum - 1) * pageLimit;

  // Base filter - always hospital scoped
  const baseFilter: Record<string, any> = { ...req.hospitalFilter };

  // Only pending, partially_paid, overdue statuses
  const targetStatuses = status && ["pending", "partially_paid", "overdue"].includes(status)
    ? [status]
    : ["pending", "partially_paid", "overdue"];
  baseFilter.status = { $in: targetStatuses };

  if (branch) baseFilter.branch = branch;
  if (billingType) baseFilter.billingType = billingType.toUpperCase();
  if (dateFrom || dateTo) {
    baseFilter.issuedAt = {};
    if (dateFrom) baseFilter.issuedAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      baseFilter.issuedAt.$lte = to;
    }
  }

  // Fetch all matching invoices with populations
  let query = Invoice.find(baseFilter)
    .populate("patient", "name uhid phone age gender email bloodGroup")
    .populate({ path: "provisionalData.doctorId", select: "name specialization" })
    .populate({ path: "provisionalData.departmentId", select: "name" })
    .populate({ path: "appointment", select: "doctor department", populate: [
      { path: "doctor", select: "name specialization" },
      { path: "department", select: "name" }
    ]})
    .sort({ issuedAt: -1 });

  const allInvoices: any[] = await query;

  // Fetch all payments at once for patient-balance computation
  const invoiceIds = allInvoices.map((i: any) => i._id);
  const paymentsAll = await Payment.find({ invoice: { $in: invoiceIds } });
  const paidMap: Record<string, number> = {};
  paymentsAll.forEach((p: any) => {
    const key = p.invoice.toString();
    paidMap[key] = (paidMap[key] || 0) + (p.amount || 0);
  });

  // Enrich invoices with computed totals & derived fields
  const enriched = allInvoices
    .map((inv: any) => {
      const totalPaid = paidMap[inv._id.toString()] || 0;
      const totals = computeTotals(inv, totalPaid);

      // Determine real-time status
      let derivedStatus: string = inv.status;
      if (totals.patientBalance === 0) {
        derivedStatus = "paid";
      } else if (inv.dueDate && new Date(inv.dueDate) < now && totals.patientBalance > 0) {
        derivedStatus = "overdue";
      } else if (totalPaid > 0 && totals.patientBalance > 0) {
        derivedStatus = "partially_paid";
      }

      // Only include if actually still unpaid
      if (derivedStatus === "paid") return null;

      // Days overdue calculation
      let daysOverdue = 0;
      if (inv.dueDate) {
        const msOverdue = now.getTime() - new Date(inv.dueDate).getTime();
        if (msOverdue > 0) daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24));
      }

      // Derive doctor/department from populated appointment or provisionalData
      const docFromAppt = inv.appointment?.doctor;
      const deptFromAppt = inv.appointment?.department;
      const docFromProv = inv.provisionalData?.doctorId;
      const deptFromProv = inv.provisionalData?.departmentId;

      const resolvedDoctor = docFromAppt || docFromProv || null;
      const resolvedDepartment = deptFromAppt || deptFromProv || null;

      return {
        _id: inv._id,
        invoiceNo: inv._id.toString().slice(-8).toUpperCase(),
        patient: inv.patient,
        doctor: resolvedDoctor,
        department: resolvedDepartment,
        billingType: inv.billingType,
        issuedAt: inv.issuedAt,
        dueDate: inv.dueDate,
        daysOverdue,
        status: derivedStatus,
        totals,
        amountPaid: totalPaid,
        pendingAmount: totals.patientBalance,
        paymentMode: inv.paymentMode,
        branch: inv.branch,
      };
    })
    .filter(Boolean) as any[];

  // Apply patient name/UHID search filter post-population
  let filtered = enriched;
  if (search) {
    const re = new RegExp(search, "i");
    filtered = filtered.filter(inv =>
      re.test(inv.patient?.name || "") || re.test(inv.patient?.phone || "")
    );
  }
  if (uhid) {
    const re = new RegExp(uhid, "i");
    filtered = filtered.filter(inv => re.test(inv.patient?.uhid || ""));
  }
  if (doctor) {
    filtered = filtered.filter(inv => inv.doctor?._id?.toString() === doctor);
  }
  if (department) {
    filtered = filtered.filter(inv => inv.department?._id?.toString() === department);
  }

  // Summary KPIs
  const uniquePatients = new Set(filtered.map(inv => inv.patient?._id?.toString()).filter(Boolean));
  const totalPendingAmount = r2(filtered.reduce((sum, inv) => sum + inv.pendingAmount, 0));
  const overdueAmount = r2(
    filtered.filter(inv => inv.status === "overdue").reduce((sum, inv) => sum + inv.pendingAmount, 0)
  );

  // Today's collection
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const allTodayPayments = await Payment.find({
    ...req.hospitalFilter,
    $or: [
      { paidAt: { $gte: startOfToday, $lte: endOfToday } },
      { createdAt: { $gte: startOfToday, $lte: endOfToday } }
    ]
  });
  const todayCollection = r2(allTodayPayments.reduce((sum, p) => sum + (p.amount || 0), 0));

  // This month's collection
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const allMonthPayments = await Payment.find({
    ...req.hospitalFilter,
    $or: [
      { paidAt: { $gte: startOfMonth, $lte: endOfMonth } },
      { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
    ]
  });
  const monthCollection = r2(allMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0));

  // Paginate
  const total = filtered.length;
  const pageData = filtered.slice(skip, skip + pageLimit);

  res.json({
    status: "success",
    data: pageData,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit),
    },
    summary: {
      pendingPatients: uniquePatients.size,
      totalPendingAmount,
      overdueAmount,
      todayCollection,
      monthCollection,
    },
  });
});
