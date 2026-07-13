import { Request, Response } from "express";
import { z } from "zod";
import { catchAsync } from "../utils/catchAsync";
import { ReceptionService } from "../services/receptionService";
import { ReceptionRepository } from "../repositories/receptionRepository";
import { AppError } from "../utils/AppError";
import { Types } from "mongoose";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import { Queue } from "../models/Queue";
import { Payment } from "../models/Payment";
import { Invoice } from "../models/Invoice";
import { Admission } from "../models/Admission";


// Validation Schemas
const patientRegistrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(5, "Phone is required"),
  age: z.coerce.number().min(0, "Age must be positive"),
  gender: z.string().min(1, "Gender is required"),
  bloodGroup: z.string().default(""),
  address: z.string().default(""),
  allergies: z.string().default(""),
  insuranceProvider: z.string().default(""),
  insurancePolicyNumber: z.string().default(""),
  emergencyContact: z.object({
    name: z.string().default(""),
    phone: z.string().default(""),
    relation: z.string().default(""),
  }).optional()
});

const appointmentBookingSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  doctorId: z.string().min(1, "Doctor ID is required"),
  departmentId: z.string().min(1, "Department ID is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.enum(["Consultation", "Walk-in", "Emergency"]).default("Consultation"),
  notes: z.string().optional().default("")
});

const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentMethod: z.enum(["UPI", "Cash", "Card", "Mixed"]),
  mixedDetails: z.object({
    upiAmount: z.coerce.number().default(0),
    cashAmount: z.coerce.number().default(0),
    cardAmount: z.coerce.number().default(0),
  }).optional()
});

const admissionSchema = z.object({
  notificationId: z.string().optional(),
  patientId: z.string().min(1, "Patient ID is required"),
  opVisitId: z.string().optional().nullable(),
  admissionDate: z.string().min(1, "Admission date is required"),
  admissionTime: z.string().optional().default(""),
  ward: z.string().min(1, "Ward is required"),
  roomId: z.string().min(1, "Room ID is required"),
  bedId: z.string().min(1, "Bed ID is required"),
  attenderName: z.string().min(1, "Attender name is required"),
  attenderPhone: z.string().min(1, "Attender phone is required"),
  insuranceProvider: z.string().optional().default(""),
  insurancePolicyNumber: z.string().optional().default(""),
  advanceAmount: z.coerce.number().min(0).default(0),
  admissionNotes: z.string().optional().default(""),
  paymentMethod: z.string().optional().default("Cash"),

  // Receptionist Initiated Specifics
  admissionMode: z.enum(["Doctor Requested", "Receptionist Initiated"]).optional().default("Doctor Requested"),
  admittingDoctor: z.string().optional().nullable(),
  priority: z.enum(["Routine", "Urgent", "Emergency"]).optional().default("Routine"),
  admissionReason: z.string().optional().default(""),
  verbalApproval: z.boolean().optional().default(false)
});

export const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await ReceptionService.getStats(req.hospitalFilter!.hospital as any);
  res.json({ status: "success", data: stats });
});

export const registerPatient = catchAsync(async (req: Request, res: Response) => {
  const patientData = patientRegistrationSchema.parse(req.body);
  const patient = await ReceptionService.registerPatient(
    req.hospitalFilter!.hospital as any,
    patientData,
    req.user!._id
  );
  res.status(201).json({
    success: true,
    patient: {
      _id: patient._id,
      uhid: patient.uhid,
      patientCode: patient.patientCode,
      name: patient.name,
      createdAt: patient.createdAt
    }
  });
});

export const searchPatients = catchAsync(async (req: Request, res: Response) => {
  const query = (req.query.query as string) || "";
  const patients = await ReceptionService.searchPatients(req.hospitalFilter!.hospital as any, query);
  res.json({ status: "success", data: { patients } });
});

export const listPatients = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string) || "";
  const result = await ReceptionService.listPatients(req.hospitalFilter!.hospital as any, page, limit, search);
  res.json({
    status: "success",
    data: result.data,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit)
    }
  });
});

export const getOPHistory = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string) || "";
  const result = await ReceptionRepository.getOPHistory(req.hospitalFilter!.hospital as any, page, limit, search);
  res.json({
    status: "success",
    data: result.data,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit)
    }
  });
});


export const bookAppointment = catchAsync(async (req: Request, res: Response) => {
  const appointmentData = appointmentBookingSchema.parse(req.body);
  const result = await ReceptionService.bookAppointment(
    req.hospitalFilter!.hospital as any,
    appointmentData,
    req.user!._id
  );
  res.status(201).json({ status: "success", data: result });
});

export const processBillingPayment = catchAsync(async (req: Request, res: Response) => {
  const paymentData = paymentSchema.parse(req.body);
  const result = await ReceptionService.processPayment(
    req.hospitalFilter!.hospital as any,
    paymentData,
    req.user!._id
  );
  res.json({ status: "success", data: result });
});

export const getQueueState = catchAsync(async (req: Request, res: Response) => {
  const dateStr = (req.query.date as string) || new Date().toISOString();
  const tokens = await ReceptionRepository.getQueueByDate(req.hospitalFilter!.hospital as any, new Date(dateStr));
  res.json({ status: "success", data: { tokens } });
});

export const simulateDoctorCall = catchAsync(async (req: Request, res: Response) => {
  const queueId = req.params.id;
  const token = await ReceptionService.simulateDoctorCall(req.hospitalFilter!.hospital as any, queueId, req.user!._id);
  res.json({ status: "success", data: { token } });
});

export const simulateDoctorComplete = catchAsync(async (req: Request, res: Response) => {
  const data = {
    queueId: req.params.id,
    outcome: req.body.outcome, // 'op' or 'ip'
    notes: req.body.notes || "",
    ward: req.body.ward || "General",
    roomType: req.body.roomType || "General"
  };
  const result = await ReceptionService.simulateDoctorComplete(req.hospitalFilter!.hospital as any, data, req.user!._id);
  res.json({ status: "success", data: result });
});

export const getAdmissionRequests = catchAsync(async (req: Request, res: Response) => {
  const requests = await ReceptionService.getAdmissionRequests(req.hospitalFilter!.hospital as any);
  res.json({ status: "success", data: { requests } });
});

export const admitPatient = catchAsync(async (req: Request, res: Response) => {
  const admissionData = admissionSchema.parse(req.body);
  const result = await ReceptionService.admitPatient(
    req.hospitalFilter!.hospital as any,
    admissionData,
    req.user!._id
  );
  res.status(201).json({ status: "success", data: result });
});

export const transferPatient = catchAsync(async (req: Request, res: Response) => {
  const transferData = z.object({
    admissionId: z.string().min(1),
    newRoomId: z.string().min(1),
    newBedId: z.string().min(1),
    notes: z.string().optional()
  }).parse(req.body);

  const admission = await ReceptionService.transferPatient(
    req.hospitalFilter!.hospital as any,
    transferData,
    req.user!._id
  );
  res.json({ status: "success", data: { admission } });
});

export const getAdmissions = catchAsync(async (req: Request, res: Response) => {
  const status = (req.query.status as "admitted" | "discharged") || "admitted";
  const admissions = await ReceptionRepository.listAdmissions(req.hospitalFilter!.hospital as any, status);
  res.json({ status: "success", data: { admissions } });
});

export const requestDischarge = catchAsync(async (req: Request, res: Response) => {
  const admissionId = req.params.id;
  const notes = req.body.notes || "";
  const admission = await ReceptionService.requestDischarge(req.hospitalFilter!.hospital as any, admissionId, notes, req.user!._id);
  res.json({ status: "success", data: { admission } });
});

export const getDoctorsAvailability = catchAsync(async (req: Request, res: Response) => {
  const doctors = await Doctor.find({ hospital: req.hospitalFilter!.hospital as any }).populate("department", "name");
  res.json({ status: "success", data: { doctors } });
});

export const getRoomsAvailability = catchAsync(async (req: Request, res: Response) => {
  const availability = await ReceptionRepository.getRoomsAvailability(req.hospitalFilter!.hospital as any);
  res.json({ status: "success", data: { availability } });
});

export const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const notifs = await ReceptionRepository.getNotificationsByRole(req.hospitalFilter!.hospital as any, "receptionist");
  res.json({ status: "success", data: { notifications: notifs } });
});

export const markNotificationRead = catchAsync(async (req: Request, res: Response) => {
  const notif = await ReceptionRepository.markNotificationRead(req.hospitalFilter!.hospital as any, req.params.id);
  res.json({ status: "success", data: { notification: notif } });
});

export const exportReports = catchAsync(async (req: Request, res: Response) => {
  const today = new Date();
  const dateStr = today.toLocaleDateString();

  const mockReport = {
    title: `Reception Summary Report - ${dateStr}`,
    exportedAt: today.toISOString(),
    metrics: {
      totalPatientsRegistered: await Patient.countDocuments({ hospital: req.hospitalFilter!.hospital as any }),
      totalTokensIssuedToday: await Queue.countDocuments({ hospital: req.hospitalFilter!.hospital as any, createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) } }),
      totalRevenueCollected: await Payment.aggregate([
        { $match: { hospital: req.hospitalFilter!.hospital as any } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).then((arr: any[]) => arr[0]?.total || 0)
    }
  };

  res.json({ status: "success", data: mockReport });
});

export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const logs = await ReceptionRepository.getAuditLogs(req.hospitalFilter!.hospital as any);
  res.json({ status: "success", data: { logs } });
});

/**
 * GET /reception/billing/pending-invoices
 * Returns pending invoices using the SAME query as getStats pendingPayments count.
 * Dashboard card count == table row count.
 */
export const getPendingInvoices = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as any;
  const invoices = await Invoice.find({ hospital: hospitalId, status: "pending" })
    .populate("patient", "name uhid phone")
    .sort({ createdAt: -1 });
  res.json({ status: "success", data: { invoices, total: invoices.length } });
});

/**
 * GET /reception/billing/payment-history
 * Returns paid payments. Supports ?date=today filter.
 * Dashboard count == table row count.
 */
export const getPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as any;
  const dateFilter = req.query.date as string;
  const filter: any = { hospital: hospitalId };

  if (dateFilter === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    filter.paidAt = { $gte: today, $lt: tomorrow };
  }

  const payments = await Payment.find(filter)
    .populate("patient", "name uhid phone")
    .populate({ path: "invoice", select: "items totals status" })
    .sort({ paidAt: -1 });

  const totalAmount = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  res.json({ status: "success", data: { payments, total: payments.length, totalAmount } });
});

/**
 * GET /reception/billing/completed-invoices
 * Returns paid invoices. Dashboard completedPayments count == table row count.
 */
export const getCompletedInvoices = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as any;
  const invoices = await Invoice.find({ hospital: hospitalId, status: "paid" })
    .populate("patient", "name uhid phone")
    .sort({ updatedAt: -1 });
  res.json({ status: "success", data: { invoices, total: invoices.length } });
});

/**
 * GET /reception/patients/today
 * Returns patients registered today using the SAME query as getStats todayRegistrations.
 * Dashboard count == table row count.
 */
export const getTodayRegistrations = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as any;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const patients = await Patient.find({
    hospital: hospitalId,
    createdAt: { $gte: today, $lt: tomorrow }
  }).sort({ createdAt: -1 });

  res.json({ status: "success", data: { patients, total: patients.length } });
});
