import { Request, Response } from "express";
import { z } from "zod";
import { Invoice, INVOICE_STATUSES } from "../models/Invoice";
import { Payment } from "../models/Payment";
import { IPBill } from "../models/IPBill";
import { IPBillPayment } from "../models/IPBillPayment";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { emitToHospital } from "../config/socket";

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

function computeTotals(invoice: { items: { quantity: number; amount: number }[]; taxRate: number; serviceFee: number; insuranceCoveragePercent: number }) {
  const subtotal = invoice.items.reduce((sum, i) => sum + i.quantity * i.amount, 0);
  const taxAmount = subtotal * (invoice.taxRate / 100);
  const total = subtotal + taxAmount + invoice.serviceFee;
  const insuranceCovered = total * (invoice.insuranceCoveragePercent / 100);
  const patientBalance = total - insuranceCovered;
  return { subtotal, taxAmount, total, insuranceCovered, patientBalance };
}

export const listInvoices = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req, 20);
  const { status, patient, billingType } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { ...req.hospitalFilter };
  if (status) filter.status = status;
  if (patient) filter.patient = patient;
  if (billingType) filter.billingType = billingType;

  // Query OP invoices
  const opInvoicesPromise = Invoice.find(filter)
    .populate("patient", "name")
    .sort({ createdAt: -1 });

  // Determine IP Bill filters
  const ipFilter: any = { ...req.hospitalFilter };
  if (status) {
    if (status === "pending" || status === "partially_paid") {
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
    ? IPBill.find(ipFilter).populate("patient", "name").sort({ createdAt: -1 })
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

  // Fetch all related OP payments for efficiency
  const opInvoiceIds = opInvoices.map(inv => inv._id);
  const opPayments = await Payment.find({ 
    hospital: req.hospitalFilter!.hospital, 
    invoice: { $in: opInvoiceIds } 
  }).sort({ paidAt: -1 });

  // Create a map for invoiceId -> { totalPaid, lastPaymentDate }
  const invoicePaymentMap = new Map();
  opPayments.forEach(payment => {
    const invId = payment.invoice.toString();
    if (!invoicePaymentMap.has(invId)) {
      invoicePaymentMap.set(invId, { totalPaid: 0, lastPaymentDate: payment.paidAt });
    }
    invoicePaymentMap.get(invId).totalPaid += payment.amount;
  });

  // Map IP bills to conformed invoice structure
  const mappedIpInvoices = ipBills.map((bill: any) => {
    const totalAmount = bill.grandTotal || 0;
    const amountPaid = Math.max(0, totalAmount - (bill.outstanding || 0));
    const amountDue = Math.max(0, bill.outstanding || 0);
    return {
      _id: bill._id,
      patient: bill.patient,
      issuedAt: bill.billingDate || bill.createdAt,
      dueDate: bill.billingDate || bill.createdAt,
      billingType: "IP",
      status: bill.status === "Paid" ? "paid" : (bill.status === "Generated" ? "partially_paid" : "pending"),
      items: [{ description: "Inpatient stay & treatment charges", quantity: 1, amount: bill.grandTotal }],
      totals: {
        subtotal: bill.grandTotal,
        taxAmount: bill.taxRate,
        total: bill.grandTotal,
        insuranceCovered: bill.insuranceCovered,
        patientBalance: amountDue
      },
      totalAmount,
      amountPaid,
      amountDue,
      lastPaymentDate: null
    };
  });

  // Map OP invoices
  const mappedOpInvoices = opInvoices.map((inv: any) => {
    const invObj = inv.toObject();
    const paymentData = invoicePaymentMap.get(inv._id.toString()) || { totalPaid: 0, lastPaymentDate: null };
    const computedTotals = computeTotals(inv);

    const totalAmount = invObj.totalAmount ?? computedTotals.total;
    const amountPaid = invObj.amountPaid ?? paymentData.totalPaid;
    const amountDue = invObj.amountDue ?? Math.max(0, totalAmount - amountPaid);
    const lastPaymentDate = invObj.lastPaymentDate ?? paymentData.lastPaymentDate;

    return {
      ...invObj,
      totals: {
        ...computedTotals,
        patientBalance: amountDue
      },
      totalAmount,
      amountPaid,
      amountDue,
      lastPaymentDate
    };
  });

  // Combine and sort
  const combined = [...mappedOpInvoices, ...mappedIpInvoices];
  combined.sort((a: any, b: any) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  // Paginate combined list
  const paginatedData = combined.slice(skip, skip + limit);
  const total = combined.length;

  const totalBilling = 
    allForHospital.reduce((sum: number, inv: any) => sum + computeTotals(inv).total, 0) +
    allIPBillsForHospital.reduce((sum: number, bill: any) => sum + (bill.grandTotal || 0), 0);

  const netRevenue = 
    allPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) +
    allIPPaymentsForHospital.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const pendingCount = 
    allForHospital.filter((inv: any) => inv.status === "pending" || inv.status === "overdue" || inv.status === "partially_paid").length +
    allIPBillsForHospital.filter((bill: any) => bill.status === "Generated" && bill.outstanding > 0).length;

  res.json({
    status: "success",
    data: paginatedData,
    pagination: paginatedResponse(paginatedData, total, { page, limit, skip }).pagination,
    counts: {
      totalBilling,
      netRevenue,
      pendingCount,
      all: allForHospital.length + allIPBillsForHospital.length,
      op: opCount,
      ip: allIPBillsForHospital.length,
      pharmacy: pharmacyCount,
      laboratory: labCount
    },
  });
});

export const createInvoice = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital!;
  const body = invoiceSchema.parse(req.body);
  const invoice = await Invoice.create({ ...body, hospital: hospitalId });
  
  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "NEW_INVOICE",
    invoiceId: invoice._id,
    billingType: invoice.billingType,
    total: computeTotals(invoice).total,
    timestamp: new Date()
  });

  res.status(201).json({ status: "success", data: { invoice: { ...invoice.toObject(), totals: computeTotals(invoice) } } });
});

export const getInvoice = catchAsync(async (req: Request, res: Response) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("patient");
  if (!invoice) {
    throw new AppError("Invoice not found.", 404);
  }
  
  // Fetch payments for this invoice
  const payments = await Payment.find({ 
    hospital: req.hospitalFilter!.hospital, 
    invoice: invoice._id 
  }).sort({ paidAt: -1 });
  
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const lastPaymentDate = payments.length > 0 ? payments[0].paidAt : null;
  
  const invObj = invoice.toObject();
  const computedTotals = computeTotals(invoice);
  
  const totalAmount = invObj.totalAmount ?? computedTotals.total;
  const amountPaid = invObj.amountPaid ?? totalPaid;
  const amountDue = invObj.amountDue ?? Math.max(0, totalAmount - amountPaid);
  
  res.json({ 
    status: "success", 
    data: { 
      invoice: { 
        ...invObj, 
        totals: { ...computedTotals, patientBalance: amountDue },
        totalAmount,
        amountPaid,
        amountDue,
        lastPaymentDate
      } 
    } 
  });
});

export const updateInvoice = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital!;
  const body = invoiceSchema.partial().parse(req.body);
  const invoice = await Invoice.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, body, {
    new: true,
    runValidators: true,
  });
  if (!invoice) {
    throw new AppError("Invoice not found.", 404);
  }

  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "INVOICE_UPDATE",
    invoiceId: invoice._id,
    billingType: invoice.billingType,
    status: invoice.status,
    timestamp: new Date()
  });

  res.json({ status: "success", data: { invoice: { ...invoice.toObject(), totals: computeTotals(invoice) } } });
});

export const deleteInvoice = catchAsync(async (req: Request, res: Response) => {
  const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!invoice) {
    throw new AppError("Invoice not found.", 404);
  }
  res.status(204).send();
});
