import { BillingService } from "../services/billingService";
import { Request, Response } from "express";
import { z } from "zod";
import { catchAsync } from "../utils/catchAsync";
import { ReceptionService } from "../services/receptionService";
import { ReceptionRepository } from "../repositories/receptionRepository";
import { AppError } from "../utils/AppError";
import { Types } from "mongoose";
import { getDoctorDynamicStatus, getBusyDoctorIds } from "../utils/doctorStatus";
import { buildBranchQuery, combineBranchQuery } from "../utils/branchQueryHelper";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import { Queue } from "../models/Queue";
import { Payment } from "../models/Payment";
import { Invoice } from "../models/Invoice";
import { Admission } from "../models/Admission";
import { IPBill } from "../models/IPBill";
import { IPBillPayment } from "../models/IPBillPayment";
import { Appointment } from "../models/Appointment";
import { getIPBillItemsSummary } from "./ipBillController";
import { AppointmentSlotService } from "../services/appointmentSlotService";
import {
  requiredTrimmedString,
  optionalTrimmedString,
  emailValidator,
  phoneValidator,
  numberValidator,
} from "../utils/validators";



const PATIENT_LIMITS = {
  NAME: 100,
  NAME_MIN: 2,
  PHONE: 10,
  ALLERGIES: 100,
  INSURANCE: 100,
  POLICY_NUMBER: 50,
  CONTACT_NAME: 100,
  CONTACT_NAME_MIN: 2,
  CONTACT_PHONE: 10,
  RELATION: 50,
  RELATION_MIN: 2,
  ADDRESS: 500,
};

const NAME_REGEX = /^[a-zA-Z\s.\-']+$/;
const TEXT_GENERAL_REGEX = /^[a-zA-Z0-9\s,\.\-/'&()#]+$/;

// Validation Schemas
const patientRegistrationSchema = z.object({
  name: z
    .string({ required_error: "Full Name is required. Please fill out this field. Field is required" })
    .trim()
    .min(1, "Full Name is required. Please fill out this field. Field is required")
    .max(PATIENT_LIMITS.NAME, `Full Name cannot exceed ${PATIENT_LIMITS.NAME} characters. Too long text is not accepted. Value exceeding the allowed character limit is not accepted. Please enter valid data`)
    .refine(
      (val: string) => val.length >= PATIENT_LIMITS.NAME_MIN,
      `Full Name must be at least ${PATIENT_LIMITS.NAME_MIN} characters. Value must be at least ${PATIENT_LIMITS.NAME_MIN} characters. Minimum characters required: ${PATIENT_LIMITS.NAME_MIN}. Too short text is not accepted. Please enter valid data`
    )
    .refine(
      (val) => NAME_REGEX.test(val),
      "Full Name should contain only letters, dots, hyphens, and spaces. Invalid data not accepted. Invalid data is not accepted. Please enter valid data"
    ),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address. Invalid data not accepted")
    .optional()
    .or(z.literal("")),
  phone: z
    .string({ required_error: "Phone Number is required. Please fill out this field. Field is required" })
    .trim()
    .min(1, "Phone Number is required. Please fill out this field. Field is required")
    .refine(
      (val) => !/[^\d]/.test(val),
      "Invalid phone number. Phone Number should accept 10 digits only. Invalid data not accepted. Invalid data is not accepted. Please enter valid data"
    )
    .refine(
      (val) => val.length <= PATIENT_LIMITS.PHONE,
      `Phone Number cannot exceed ${PATIENT_LIMITS.PHONE} digits. Too long text is not accepted. Value exceeding the allowed length is not accepted. Please enter valid data`
    )
    .refine(
      (val) => val.length === 10,
      "Invalid phone number. Phone Number should accept 10 digits only. Invalid data not accepted. Invalid data is not accepted. Please enter valid data"
    ),
  age: z.coerce.number().min(0, "Age must be at least 0").max(150, "Age cannot exceed 150 years"),
  gender: z.string().min(1, "Gender is required. Please fill out this field. Field is required"),
  bloodGroup: z.string().default(""),
  address: z
    .string()
    .max(PATIENT_LIMITS.ADDRESS, `Residential Address cannot exceed ${PATIENT_LIMITS.ADDRESS} characters. Too long text is not accepted`)
    .default(""),
  allergies: z
    .string()
    .max(PATIENT_LIMITS.ALLERGIES, `Known Allergies cannot exceed ${PATIENT_LIMITS.ALLERGIES} characters. Too long text is not accepted. Value exceeding the allowed character limit is not accepted. Please enter valid data`)
    .refine(
      (val) => !val || TEXT_GENERAL_REGEX.test(val),
      "Known Allergies contains invalid characters. Invalid data not accepted. Invalid data is not accepted. Please enter valid data"
    )
    .default(""),
  insuranceProvider: z
    .string()
    .max(PATIENT_LIMITS.INSURANCE, `Insurance Provider cannot exceed ${PATIENT_LIMITS.INSURANCE} characters. Too long text is not accepted. Value exceeding the allowed character limit is not accepted. Please enter valid data`)
    .refine(
      (val) => !val || TEXT_GENERAL_REGEX.test(val),
      "Insurance Provider contains invalid characters. Invalid data not accepted. Invalid data is not accepted. Please enter valid data"
    )
    .default(""),
  insurancePolicyNumber: z
    .string()
    .max(PATIENT_LIMITS.POLICY_NUMBER, `Policy Number cannot exceed ${PATIENT_LIMITS.POLICY_NUMBER} characters. Too long text is not accepted`)
    .default(""),
  photoUrl: z.string().optional().default(""),
  emergencyContact: z
    .object({
      name: z
        .string()
        .max(PATIENT_LIMITS.CONTACT_NAME, `Contact Name cannot exceed ${PATIENT_LIMITS.CONTACT_NAME} characters. Too long text is not accepted. Value exceeding the allowed character limit is not accepted. Please enter valid data`)
        .refine(
          (val: string) => !val || val.length >= PATIENT_LIMITS.CONTACT_NAME_MIN,
          `Contact Name must be at least ${PATIENT_LIMITS.CONTACT_NAME_MIN} characters. Value must be at least ${PATIENT_LIMITS.CONTACT_NAME_MIN} characters. Minimum characters required: ${PATIENT_LIMITS.CONTACT_NAME_MIN}. Too short text is not accepted. Please enter valid data`
        )
        .refine(
          (val) => !val || NAME_REGEX.test(val),
          "Contact Name contains invalid characters. Invalid data not accepted. Invalid data is not accepted. Please enter valid data"
        )
        .default(""),
      phone: z
        .string()
        .refine(
          (val) => !val || !/[^\d]/.test(val),
          "Invalid Contact Phone. Contact Phone should accept 10 digits only. Invalid data not accepted. Invalid data is not accepted. Please enter valid data"
        )
        .refine(
          (val) => !val || val.length <= PATIENT_LIMITS.CONTACT_PHONE,
          `Contact Phone cannot exceed ${PATIENT_LIMITS.CONTACT_PHONE} digits. Too long text is not accepted. Value exceeding the allowed length is not accepted. Please enter valid data`
        )
        .refine(
          (val) => !val || val.length === 10,
          "Invalid Contact Phone. Contact Phone should accept 10 digits only. Invalid data not accepted. Invalid data is not accepted. Please enter valid data"
        )
        .default(""),
      relation: z
        .string()
        .max(PATIENT_LIMITS.RELATION, `Relation cannot exceed ${PATIENT_LIMITS.RELATION} characters. Too long text is not accepted. Value exceeding the allowed character limit is not accepted. Please enter valid data`)
        .refine(
          (val: string) => !val || val.length >= PATIENT_LIMITS.RELATION_MIN,
          `Relation must be at least ${PATIENT_LIMITS.RELATION_MIN} characters. Value must be at least ${PATIENT_LIMITS.RELATION_MIN} characters. Minimum characters required: ${PATIENT_LIMITS.RELATION_MIN}. Too short text is not accepted. Please enter valid data`
        )
        .refine(
          (val) => !val || NAME_REGEX.test(val),
          "Relation contains invalid characters. Invalid data not accepted. Invalid data is not accepted. Please enter valid data"
        )
        .default(""),
    })
    .optional()
});

const appointmentBookingSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  doctorId: z.string().min(1, "Doctor ID is required"),
  departmentId: z.string().min(1, "Department ID is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.enum(["Consultation", "Walk-in", "Emergency", "Appointment"]).default("Appointment"),
  notes: optionalTrimmedString("Chief Complaints / Notes", 500),
  // Follow-up booking fields
  followUp: z.boolean().optional().default(false),
  parentAppointmentId: z.string().optional().nullable(),
  followUpReason: optionalTrimmedString("Follow-up reason", 500),
});

const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.coerce.number().positive("Amount must be positive").max(10000000, "Amount cannot exceed 10,000,000"),
  paymentMethod: z.enum(["UPI", "Cash", "Card", "Net Banking", "Cheque", "Mixed"]),
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
  attenderName: optionalTrimmedString("Attender name", 100),
  attenderPhone: phoneValidator("Attender phone", false),
  assignedNurse: z.string().min(1, "Assigned nurse is required"),
  insuranceProvider: optionalTrimmedString("Insurance Provider", 100),
  insurancePolicyNumber: optionalTrimmedString("Policy Number", 50),
  advanceAmount: z.coerce.number().min(0).default(0),
  admissionNotes: optionalTrimmedString("Admission Remarks", 500),
  paymentMethod: z.string().optional().default("Cash"),

  // Receptionist Initiated Specifics
  admissionMode: z.enum(["Doctor Requested", "Receptionist Initiated"]).optional().default("Doctor Requested"),
  admittingDoctor: z.string().optional().nullable(),
  priority: z.enum(["Routine", "Urgent", "Emergency"]).optional().default("Routine"),
  admissionReason: z.string().optional().default(""),
  verbalApproval: z.boolean().optional().default(false),

  // Manual Admission specifics
  departmentId: z.string().optional().nullable(),
  admissionType: z.enum(["Emergency", "Elective", "Direct Admission"]).optional().default("Direct Admission"),
  expectedStay: optionalTrimmedString("Expected Stay", 10),
  primaryDiagnosis: optionalTrimmedString("Primary Diagnosis", 150),
  requestId: z.string().optional().nullable()
});

export const getPatientDetail = catchAsync(async (req: Request, res: Response) => {
  const result = await ReceptionService.getPatientDetail(
    req.hospitalFilter as any,
    req.params.id
  );
  res.json({ status: "success", data: result });
});

export const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await ReceptionService.getStats(req.hospitalFilter as any);
  res.json({ status: "success", data: stats });
});

export const registerPatient = catchAsync(async (req: Request, res: Response) => {
  const patientData = patientRegistrationSchema.parse(req.body);
  const patient = await ReceptionService.registerPatient(
    req.hospitalFilter as any,
    patientData,
    req.user!._id
  );
  res.status(201).json({
    success: true,
    patientId: patient._id,
    patient,
    uhid: patient.uhid,
    status: "success",
    data: { patient }
  });
});

export const searchPatients = catchAsync(async (req: Request, res: Response) => {
  const query = (req.query.query as string) || "";
  const patients = await ReceptionService.searchPatients(req.hospitalFilter as any, query);
  res.json({ status: "success", data: { patients } });
});

export const listPatients = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string) || "";
  const result = await ReceptionService.listPatients(req.hospitalFilter as any, page, limit, search);
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
  const result = await ReceptionRepository.getOPHistory(req.hospitalFilter as any, page, limit, search);
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
    req.hospitalFilter as any,
    appointmentData,
    req.user!._id
  );
  res.status(201).json({ status: "success", data: result });
});

export const checkDuplicateAppointment = catchAsync(async (req: Request, res: Response) => {
  const { patientId, doctorId, date } = req.query as Record<string, string>;
  if (!patientId || !doctorId || !date) {
    throw new AppError("patientId, doctorId and date are required query parameters.", 400);
  }
  const result = await ReceptionService.checkDuplicateAppointment(
    req.hospitalFilter as any,
    patientId,
    doctorId,
    date
  );
  res.json({ status: "success", data: result });
});

export const processBillingPayment = catchAsync(async (req: Request, res: Response) => {
  const paymentData = paymentSchema.parse(req.body);
  
  const invoice = await Invoice.findOne({ _id: paymentData.invoiceId, ...buildBranchQuery(req.hospitalFilter) });
  if (!invoice) {
    throw new AppError("Invoice not found.", 404);
  }

  // 1. Receptionists are NOT authorized to collect pharmacy bills
  if (invoice.billingType === "PHARMACY" && req.user!.role === "receptionist") {
    throw new AppError("Receptionists are not authorized to collect pharmacy bills. Please collect at the pharmacy counter.", 403);
  }

  // 2. Pharmacists are ONLY authorized to collect pharmacy bills
  if (invoice.billingType !== "PHARMACY" && req.user!.role === "pharmacist") {
    throw new AppError("Pharmacists are not authorized to collect non-pharmacy bills.", 403);
  }

  const result = await ReceptionService.processPayment(
    req.hospitalFilter as any,
    paymentData,
    req.user!._id
  );
  res.status(201).json({ status: "success", data: result });
});

export const getQueueState = catchAsync(async (req: Request, res: Response) => {
  let dateObj = new Date();
  if (req.query.date && typeof req.query.date === "string") {
    const parsed = new Date(req.query.date);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }
  const tokens = await ReceptionRepository.getQueueByDate(req.hospitalFilter as any, dateObj);
  res.json({ status: "success", data: { tokens: tokens || [] } });
});

export const simulateDoctorCall = catchAsync(async (req: Request, res: Response) => {
  const queueId = req.params.id;
  const token = await ReceptionService.simulateDoctorCall(req.hospitalFilter as any, queueId, req.user!._id);
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
  const result = await ReceptionService.simulateDoctorComplete(req.hospitalFilter as any, data, req.user!._id);
  res.json({ status: "success", data: result });
});

export const getAdmissionRequests = catchAsync(async (req: Request, res: Response) => {
  const requests = await ReceptionService.getAdmissionRequests(req.hospitalFilter as any);
  res.json({ status: "success", data: { requests } });
});

export const admitPatient = catchAsync(async (req: Request, res: Response) => {
  if (!["receptionist", "hospital_admin", "super_admin"].includes(req.user!.role)) {
    throw new AppError("Forbidden: You do not have permission to perform this action.", 403);
  }
  const admissionData = admissionSchema.parse(req.body);
  const result = await ReceptionService.admitPatient(
    req.hospitalFilter as any,
    admissionData,
    req.user!._id
  );
  res.status(201).json({ status: "success", data: result });
});

export const rejectAdmissionRequest = catchAsync(async (req: Request, res: Response) => {
  if (!["receptionist", "hospital_admin", "super_admin"].includes(req.user!.role)) {
    throw new AppError("Forbidden: You do not have permission to perform this action.", 403);
  }
  const result = await ReceptionService.rejectAdmissionRequest(
    req.hospitalFilter as any,
    req.params.id,
    req.user!._id
  );
  res.json({ status: "success", data: result });
});

export const transferPatient = catchAsync(async (req: Request, res: Response) => {
  if (!["receptionist", "hospital_admin", "super_admin"].includes(req.user!.role)) {
    throw new AppError("Forbidden: You do not have permission to perform this action.", 403);
  }
  const transferData = z.object({
    admissionId: z.string().min(1),
    newRoomId: z.string().min(1),
    newBedId: z.string().min(1),
    notes: z.string().optional()
  }).parse(req.body);

  const admission = await ReceptionService.transferPatient(
    req.hospitalFilter as any,
    transferData,
    req.user!._id
  );
  res.json({ status: "success", data: { admission } });
});

export const getAdmissions = catchAsync(async (req: Request, res: Response) => {
  const status = (req.query.status as string) || "admitted";
  const patientId = req.query.patientId as string | undefined;

  let query: any = {
    ...buildBranchQuery(req.hospitalFilter),
  };

  if (patientId) {
    query.patient = patientId;
  }

  if (status === "admitted") {
    query.status = {
      $in: [
        "admitted",
        "Admitted",
        "Bed Allocated",
        "Under Observation",
        "Waiting for Bed",
        "In Ward",
        "ICU",
        "Operation Scheduled",
        "Under Treatment",
        "Transferred"
      ]
    };
  } else if (status === "discharge_requested") {
    query.status = "discharge_requested";
  } else if (status === "discharged") {
    query.status = {
      $in: [
        "discharged",
        "Discharged",
        "Cancelled",
        "Expired",
        "Against Medical Advice (AMA)",
        "Transferred Out (Final)"
      ]
    };
  } else if (status === "all") {
    // No status filter
  } else {
    query.status = status;
  }

  const admissions = await Admission.find(query)
    .populate("patient", "name uhid phone age gender bloodGroup")
    .populate("room", "roomNumber roomName roomType")
    .populate("bed", "bedNumber bedCode bedType")
    .populate("admittingDoctor", "name specialization")
    .populate("dischargeRequestedBy", "name specialization")
    .populate("assignedNurse", "name employeeId role")
    .sort({ admissionDate: -1 })
    .lean();

  // Enrich with lab/pharmacy dues
  for (const adm of admissions) {
    if (adm.patient) {
      const unpaidInvoices = await Invoice.find({
        patient: adm.patient._id,
        hospital: req.hospitalFilter!.hospital as any,
        billingType: { $in: ["LAB", "RADIOLOGY", "PHARMACY"] },
        status: { $ne: "paid" }
      });

      const duesTotal = unpaidInvoices.reduce((sum, inv: any) => sum + (inv.totals?.patientBalance ?? inv.totals?.total ?? 0), 0);

      (adm as any).labPharmacyDues = unpaidInvoices.map((inv: any) => ({
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        billingType: inv.billingType,
        status: inv.status,
        issuedAt: inv.issuedAt,
        balance: inv.totals?.patientBalance ?? inv.totals?.total ?? 0
      }));
      (adm as any).labPharmacyDuesTotal = duesTotal;
    } else {
      (adm as any).labPharmacyDues = [];
      (adm as any).labPharmacyDuesTotal = 0;
    }
  }

  res.json({ status: "success", data: { admissions } });
});

export const requestDischarge = catchAsync(async (req: Request, res: Response) => {
  if (!["receptionist", "hospital_admin", "super_admin"].includes(req.user!.role)) {
    throw new AppError("Forbidden: You do not have permission to perform this action.", 403);
  }
  const admissionId = req.params.id;
  const notes = req.body.notes || "";
  const admission = await ReceptionService.requestDischarge(req.hospitalFilter!.hospital as any, admissionId, notes, req.user!._id);
  res.json({ status: "success", data: { admission } });
});

export const getDoctorsAvailability = catchAsync(async (req: Request, res: Response) => {
  const filter = buildBranchQuery(req.hospitalFilter);
  const busyDoctorIds = await getBusyDoctorIds(req.hospitalFilter?.hospital as any);
  const doctors = await Doctor.find(filter).populate("department", "name");
  const resolvedDoctors = doctors.map(d => {
    const docObj: any = d.toObject();
    const spec = (docObj.specialization && docObj.specialization.trim() !== "") ? docObj.specialization.trim() : "";
    return { ...docObj, specialization: spec, status: getDoctorDynamicStatus(d, busyDoctorIds) };
  });
  res.json({ status: "success", data: { doctors: resolvedDoctors } });
});

export const getRoomsAvailability = catchAsync(async (req: Request, res: Response) => {
  const availability = await ReceptionRepository.getRoomsAvailability(req.hospitalFilter as any);
  res.json({ status: "success", data: { availability } });
});

export const getNotifications = catchAsync(async (req: Request, res: Response) => {
  if (req.hospitalFilter?.hospital) {
    await ReceptionService.generateScheduledAlerts(req.hospitalFilter.hospital as any);
  }
  const notifs = await ReceptionRepository.getNotificationsByRole(req.hospitalFilter as any, "receptionist");
  res.json({ status: "success", data: { notifications: notifs } });
});

export const markNotificationRead = catchAsync(async (req: Request, res: Response) => {
  const notif = await ReceptionRepository.markNotificationRead(req.hospitalFilter as any, req.params.id);
  res.json({ status: "success", data: { notification: notif } });
});

export const exportReports = catchAsync(async (req: Request, res: Response) => {
  const today = new Date();
  const dateStr = today.toLocaleDateString();
  const filter = buildBranchQuery(req.hospitalFilter);

  const mockReport = {
    title: `Reception Summary Report - ${dateStr}`,
    exportedAt: today.toISOString(),
    metrics: {
      totalPatientsRegistered: await Patient.countDocuments(filter),
      totalTokensIssuedToday: await Queue.countDocuments({ ...filter, createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) } }),
      totalRevenueCollected: await Payment.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).then((arr: any[]) => arr[0]?.total || 0)
    }
  };

  res.json({ status: "success", data: mockReport });
});

export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const logs = await ReceptionRepository.getAuditLogs(req.hospitalFilter as any);
  res.json({ status: "success", data: { logs } });
});

/**
 * GET /reception/billing/pending-invoices
 * Returns pending invoices using BillingService (Single Source of Truth).
 * Dashboard card count == table row count.
 */
export const getPendingInvoices = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital as any;
  const branch = req.hospitalFilter?.branch;

  const result = await BillingService.getPendingInvoices(hospitalId, { branch, limit: 1000 });

  res.json({
    status: "success",
    data: {
      invoices: result.invoices,
      total: result.pagination.total,
      summary: result.summary,
    }
  });
});

/**
 * GET /reception/billing/payment-history
 * Returns paid payments. Supports ?date=today filter.
 * Dashboard count == table row count.
 */
export const getPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const dateFilter = req.query.date as string;
  const filter: any = buildBranchQuery(req.hospitalFilter);

  if (dateFilter === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    filter.paidAt = { $gte: today, $lt: tomorrow };
  }

  // 1. Fetch OP payments
  const opPayments = await Payment.find(filter)
    .populate("patient", "name uhid phone")
    .populate({ path: "invoice", select: "items totals status billingType" })
    .sort({ paidAt: -1 });

  // 2. Fetch IP payments
  const ipPayments = await IPBillPayment.find(filter)
    .populate("patient", "name uhid phone")
    .populate({ path: "bill", select: "billNumber grandTotal outstanding status" })
    .sort({ paidAt: -1 });

  // Map IP payments to conformed layout
  const mappedIpPayments = ipPayments.map(p => {
    return {
      _id: p._id,
      patient: p.patient,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId,
      paidAt: p.paidAt,
      billingType: "IP",
      invoice: {
        _id: p.bill?._id,
        items: [{ description: "Inpatient stay & treatment charges" }],
        totals: {
          total: (p.bill as any)?.grandTotal || p.amount,
          patientBalance: (p.bill as any)?.outstanding || 0
        },
        status: (p.bill as any)?.status === "Paid" ? "paid" : "partially_paid"
      }
    };
  });

  const combinedPayments = [...opPayments, ...mappedIpPayments];
  combinedPayments.sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  const totalAmount = combinedPayments.reduce((sum: number, p: any) => {
    const amt = Number(p.amount) || 0;
    return Number.isFinite(amt) && amt > 0 && amt <= 100000000 ? sum + amt : sum;
  }, 0);
  res.json({ status: "success", data: { payments: combinedPayments, total: combinedPayments.length, totalAmount } });
});

/**
 * GET /reception/billing/completed-invoices
 * Returns paid invoices. Dashboard completedPayments count == table row count.
 */
export const getCompletedInvoices = catchAsync(async (req: Request, res: Response) => {
  const filter = buildBranchQuery(req.hospitalFilter);

  // 1. Fetch completed OP invoices
  const rawInvoices = await Invoice.find({ ...filter, status: "paid" })
    .populate("patient", "name uhid phone")
    .sort({ updatedAt: -1 });

  const invoices: any[] = [];
  for (const inv of rawInvoices) {
    const payments = await Payment.find({ invoice: inv._id, ...filter });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = Math.max(0, inv.totals.total - totalPaid);

    if (inv.totals.patientBalance !== remainingBalance || (remainingBalance > 0 && inv.status === "paid")) {
      inv.totals.patientBalance = remainingBalance;
      if (remainingBalance === 0) {
        inv.status = "paid";
      } else {
        inv.status = "partially_paid";
      }
      await inv.save();
    }

    if (remainingBalance === 0) {
      invoices.push(inv);
    }
  }

  // 2. Fetch completed IP bills (Paid status means fully paid)
  const completedIpBills = await IPBill.find({ ...filter, status: "Paid" })
    .populate("patient", "name uhid phone")
    .populate("admission")
    .sort({ updatedAt: -1 });

  // Map IP bills to conformed invoice structure
  const mappedIpBills = completedIpBills.map(bill => {
    return {
      _id: bill._id,
      patient: bill.patient,
      issuedAt: bill.billingDate || (bill as any).createdAt,
      billingType: "IP",
      totals: {
        subtotal: bill.grandTotal,
        taxAmount: bill.taxRate,
        total: bill.grandTotal,
        patientBalance: 0
      },
      status: "paid",
      outstanding: 0,
      admission: bill.admission
    };
  });

  const combined = [...invoices, ...mappedIpBills];

  res.json({ status: "success", data: { invoices: combined, total: combined.length } });
});

/**
 * GET /reception/patients/today
 * Returns patients registered today using the SAME query as getStats todayRegistrations.
 * Dashboard count == table row count.
 */
export const getTodayRegistrations = catchAsync(async (req: Request, res: Response) => {
  const filter = buildBranchQuery(req.hospitalFilter);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const patients = await Patient.find({
    ...filter,
    createdAt: { $gte: today, $lt: tomorrow }
  }).sort({ createdAt: -1 });

  res.json({ status: "success", data: { patients, total: patients.length } });
});

const cancelAppointmentSchema = z.object({
  reason: z.enum(["Patient Requested", "Doctor Unavailable", "Duplicate Booking", "Wrong Booking", "Emergency", "Other"]),
  remarks: z.string().optional().default(""),
  refundRequired: z.union([z.boolean(), z.enum(["Yes", "No"])]).default("No"),
});

export const cancelAppointment = catchAsync(async (req: Request, res: Response) => {
  const cancelData = cancelAppointmentSchema.parse(req.body);
  const result = await ReceptionService.cancelAppointment(
    req.hospitalFilter!.hospital as any,
    req.params.id,
    cancelData,
    req.user!._id
  );
  res.json({ status: "success", data: result });
});

const rescheduleAppointmentSchema = z.object({
  newDate: z.string().min(1, "New appointment date is required"),
  newTime: z.string().min(1, "New appointment time is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  departmentId: z.string().min(1, "Department is required"),
  reason: z.enum(["Patient Requested", "Doctor Requested", "Doctor Unavailable", "Equipment Issue", "Emergency", "Other"]),
  remarks: z.string().optional().default(""),
});

export const rescheduleAppointment = catchAsync(async (req: Request, res: Response) => {
  const rescheduleData = rescheduleAppointmentSchema.parse(req.body);
  const result = await ReceptionService.rescheduleAppointment(
    req.hospitalFilter!.hospital as any,
    req.params.id,
    rescheduleData,
    req.user!._id
  );
  res.json({ status: "success", data: result });
});

export const getBookedSlots = catchAsync(async (req: Request, res: Response) => {
  const { doctorId, date, patientId } = req.query as Record<string, string>;
  if (!doctorId || !date) {
    throw new AppError("doctorId and date are required query parameters.", 400);
  }

  // Delegate entirely to the shared AppointmentSlotService — single source of truth.
  const bookedSlots = await AppointmentSlotService.getBookedSlots(
    doctorId,
    date,
    req.hospitalFilter!.hospital,
    patientId
  );

  res.json({ status: "success", data: { bookedSlots } });
});

export const checkInAppointment = catchAsync(async (req: Request, res: Response) => {
  const appointmentId = req.params.id;
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const result = await ReceptionService.checkInAppointment(
    hospitalId,
    appointmentId,
    req.user!._id
  );
  res.json({ status: "success", data: result });
});

export const getQueueDetails = catchAsync(async (req: Request, res: Response) => {
  const hospitalFilter = buildBranchQuery(req.hospitalFilter);

  // Update scheduled alerts & mark missed appointments
  if (req.hospitalFilter?.hospital) {
    await ReceptionService.generateScheduledAlerts(req.hospitalFilter.hospital as any);
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // Fetch all appointments today
  const appointments = await Appointment.find({
    ...hospitalFilter,
    date: { $gte: startOfToday, $lte: endOfToday }
  })
    .populate("patient", "name uhid phone age gender")
    .populate("doctor", "name specialization department consultationFee")
    .populate("department", "name")
    .sort({ time: 1 });

  // Fetch all queue items today
  const queueItems = await Queue.find(combineBranchQuery(req.hospitalFilter, {
    $or: [
      { date: { $gte: startOfToday, $lte: endOfToday } },
      { createdAt: { $gte: startOfToday, $lte: endOfToday } }
    ]
  }))
    .populate("patient", "name uhid phone age gender")
    .populate("doctor", "name specialization department")
    .populate("department", "name")
    .populate("appointment");

  const now = new Date();

  const getSlotTimeDiff = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return (slotTime.getTime() - now.getTime()) / (60 * 1000);
  };

  const upcomingAppointments: any[] = [];

  appointments.forEach((appt: any) => {
    if (appt.status === "scheduled") {
      const diff = getSlotTimeDiff(appt.time);
      let alertColor: "green" | "orange" | "red" = "green";
      let alertLabel = "Upcoming";

      if (diff > 15) {
        alertColor = "green";
        alertLabel = "Upcoming";
      } else if (diff >= 0 && diff <= 15) {
        alertColor = "green";
        alertLabel = "Ready for Check-In";
      } else if (diff < 0 && diff >= -15) {
        alertColor = "orange";
        alertLabel = "Due Now";
      } else {
        alertColor = "red";
        alertLabel = "Late Arrival";
      }

      upcomingAppointments.push({
        _id: appt._id,
        referenceId: appt.referenceId,
        patient: appt.patient,
        doctor: appt.doctor,
        department: appt.department,
        time: appt.time,
        status: appt.status,
        type: appt.type,
        diff,
        alertColor,
        alertLabel
      });
    }
  });

  const waitingPatients = queueItems.filter(q => q.status === "waiting");
  const currentlyConsulting = queueItems.filter(q => q.status === "called");

  // Completed visits: combine completed appointments & completed queue items
  const completedApptIds = new Set(appointments.filter(a => a.status === "completed").map(a => a._id.toString()));
  const completedVisits = [
    ...appointments.filter(a => a.status === "completed"),
    ...queueItems.filter(q => q.status === "completed" && (!q.appointment || !completedApptIds.has((q.appointment as any)._id?.toString())))
  ];

  // All checked-in patients today (waiting, consulting, or completed)
  const checkedInPatients = queueItems;

  // Walk-in queue items waiting currently
  const currentWalkInQueue = queueItems.filter(q => {
    if (q.status !== "waiting") return false;
    const apptType = (q.appointment as any)?.type;
    return apptType === "Walk-in" || apptType === "Walk-in Visit" || (q as any).type === "walk-in" || !q.appointment;
  });

  // Missed or no-show appointments
  const missedAppointments = appointments.filter(a => a.status === "no_show" || a.status === "missed" || a.status === "cancelled");

  res.json({
    status: "success",
    data: {
      upcomingAppointments,
      currentWalkInQueue,
      checkedInPatients,
      waitingPatients,
      currentlyConsulting,
      missedAppointments,
      completedVisits
    }
  });
});

export const checkAdmissionBillingStatus = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as any;
  const admissionId = req.params.id;

  const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId }).populate("patient");
  if (!admission) {
    throw new AppError("Admission record not found.", 404);
  }

  // 1. Fetch all invoices for this patient during their stay
  const allInvoices = await Invoice.find({
    patient: admission.patient._id,
    hospital: hospitalId
  }).sort({ createdAt: -1 });

  // Calculate pending OP balance from unpaid invoices
  const unpaidInvoices = allInvoices.filter(inv => inv.status !== "paid");
  const totalPendingOP = unpaidInvoices.reduce((sum, inv) => sum + (inv.totals?.patientBalance ?? inv.totals?.total ?? 0), 0);

  // 2. Fetch IP bill status & outstanding
  const ipBill = await IPBill.findOne({
    admission: admissionId,
    hospital: hospitalId,
    status: { $ne: "Cancelled" }
  });

  let ipOutstanding = 0;
  let hasDraftIPBill = false;
  let ipBillItems: any[] = [];
  let ipBillSummary: any = null;

  if (ipBill) {
    const items = await getIPBillItemsSummary(ipBill, admission, hospitalId);
    ipBillItems = items;

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * (ipBill.taxRate / 100);
    const totalDiscount = ipBill.discountType === "percentage"
      ? subtotal * ((ipBill.hospitalDiscount + ipBill.doctorDiscount + ipBill.managementDiscount) / 100)
      : (ipBill.hospitalDiscount + ipBill.doctorDiscount + ipBill.managementDiscount);
    const grandTotal = subtotal + tax - totalDiscount;
    ipOutstanding = Math.max(0, grandTotal - ipBill.insuranceCovered - ipBill.advancePaid);

    if (ipBill.status === "Draft") {
      hasDraftIPBill = true;
    }

    ipBillSummary = {
      _id: ipBill._id,
      billNumber: ipBill.billNumber,
      status: ipBill.status,
      advancePaid: ipBill.advancePaid,
      insuranceCovered: ipBill.insuranceCovered,
      taxRate: ipBill.taxRate,
      discount: totalDiscount,
      subtotal,
      taxAmount: tax,
      grandTotal,
      outstanding: ipOutstanding
    };
  }

  const totalDues = totalPendingOP + ipOutstanding;

  res.json({
    status: "success",
    data: {
      hasOutstandingBills: totalDues > 1,
      totalPendingOP,
      ipOutstanding,
      totalDues,
      hasDraftIPBill,
      invoices: allInvoices,
      ipBill: ipBillSummary,
      ipBillItems: ipBillItems
    }
  });
});


