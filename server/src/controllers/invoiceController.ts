import { Request, Response } from "express";
import { z } from "zod";
import { Invoice, INVOICE_STATUSES } from "../models/Invoice";
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

  const [
    invoices,
    total,
    allForHospital,
    opCount,
    ipCount,
    pharmacyCount,
    labCount
  ] = await Promise.all([
    Invoice.find(filter).populate("patient", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Invoice.countDocuments(filter),
    Invoice.find(req.hospitalFilter as Record<string, unknown>),
    Invoice.countDocuments({ ...req.hospitalFilter, billingType: "OP" }),
    Invoice.countDocuments({ ...req.hospitalFilter, billingType: "IP" }),
    Invoice.countDocuments({ ...req.hospitalFilter, billingType: "PHARMACY" }),
    Invoice.countDocuments({ ...req.hospitalFilter, billingType: "LAB" })
  ]);

  const totalBilling = allForHospital.reduce((sum, inv) => sum + computeTotals(inv).total, 0);
  const netRevenue = allForHospital.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + computeTotals(inv).total, 0);
  const pendingCount = allForHospital.filter((inv) => inv.status === "pending" || inv.status === "overdue").length;

  res.json({
    status: "success",
    data: invoices.map((inv) => ({ ...inv.toObject(), totals: computeTotals(inv) })),
    pagination: paginatedResponse(invoices, total, { page, limit, skip }).pagination,
    counts: {
      totalBilling,
      netRevenue,
      pendingCount,
      all: allForHospital.length,
      op: opCount,
      ip: ipCount,
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
  res.json({ status: "success", data: { invoice: { ...invoice.toObject(), totals: computeTotals(invoice) } } });
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
