import { Types } from "mongoose";
import { Invoice } from "../models/Invoice";
import { IPBill } from "../models/IPBill";
import { Payment } from "../models/Payment";
import { IPBillPayment } from "../models/IPBillPayment";
import "../models/Patient";
import "../models/Doctor";
import "../models/Department";
import "../models/Admission";
import "../models/Appointment";

export interface PendingInvoicesFilter {
  dateFrom?: string;
  dateTo?: string;
  department?: string;
  doctor?: string;
  billingType?: string;
  status?: string;
  branch?: string;
  search?: string;
  uhid?: string;
  page?: number;
  limit?: number;
}

export interface UnifiedInvoiceItem {
  _id: any;
  invoiceNo: string;
  patient: any;
  doctor: any;
  department: any;
  billingType: string;
  issuedAt: Date;
  dueDate: Date | null;
  daysOverdue: number;
  status: "pending" | "partially_paid" | "overdue" | "paid";
  totals: {
    subtotal: number;
    taxAmount: number;
    total: number;
    insuranceCovered: number;
    patientBalance: number;
  };
  amountPaid: number;
  pendingAmount: number;
  paymentMode: string;
  branch: any;
  isIpBill: boolean;
}

export class BillingService {
  /**
   * Single Source of Truth for Pending & Overdue Invoices
   * Merges OP Invoices and IP Bills into a single conformed dataset.
   */
  static async getPendingInvoices(hospitalId: Types.ObjectId, filters: PendingInvoicesFilter = {}) {
    const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const now = new Date();

    const {
      dateFrom, dateTo, department, doctor, billingType, status,
      branch, search, uhid, page: pageQ = 1, limit: limitQ = 20
    } = filters;

    const pageNum = Math.max(1, Number(pageQ));
    const pageLimit = Math.min(100, Math.max(1, Number(limitQ)));
    const skip = (pageNum - 1) * pageLimit;

    // ─────────────────────────────────────────────────────────────
    // 1. FETCH OP INVOICES
    // ─────────────────────────────────────────────────────────────
    const opFilter: Record<string, any> = { hospital: hospitalId };
    opFilter.status = { $in: ["pending", "partially_paid", "overdue"] };
    if (branch) opFilter.branch = branch;
    if (billingType && billingType.toUpperCase() !== "IP") {
      opFilter.billingType = billingType.toUpperCase();
    }
    if (dateFrom || dateTo) {
      opFilter.issuedAt = {};
      if (dateFrom) opFilter.issuedAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        opFilter.issuedAt.$lte = to;
      }
    }

    const rawOpInvoices = await Invoice.find(opFilter)
      .populate("patient", "name uhid phone age gender email bloodGroup")
      .populate({ path: "provisionalData.doctorId", select: "name specialization" })
      .populate({ path: "provisionalData.departmentId", select: "name" })
      .populate({
        path: "appointment",
        select: "doctor department",
        populate: [
          { path: "doctor", select: "name specialization" },
          { path: "department", select: "name" }
        ]
      })
      .sort({ issuedAt: -1, createdAt: -1 });

    const opInvoiceIds = rawOpInvoices.map((i: any) => i._id);
    const opPayments = await Payment.find({ invoice: { $in: opInvoiceIds }, hospital: hospitalId });
    const opPaidMap: Record<string, number> = {};
    opPayments.forEach((p: any) => {
      const k = p.invoice.toString();
      opPaidMap[k] = (opPaidMap[k] || 0) + (p.amount || 0);
    });

    const enrichedOp: UnifiedInvoiceItem[] = [];
    for (const inv of rawOpInvoices) {
      const totalPaid = opPaidMap[inv._id.toString()] || 0;
      const subtotal = inv.totals?.subtotal || inv.totals?.total || 0;
      const taxAmount = inv.totals?.taxAmount || 0;
      const total = inv.totals?.total || 0;
      const insuranceCovered = inv.totals?.insuranceCovered || 0;
      const patientBalance = Math.max(0, r2(total - insuranceCovered - totalPaid));

      // Auto-heal DB totals if out of sync
      if (inv.totals?.patientBalance !== patientBalance) {
        inv.totals.patientBalance = patientBalance;
        if (patientBalance === 0) inv.status = "paid";
        else if (totalPaid > 0) inv.status = "partially_paid";
        await inv.save().catch(() => {});
      }

      // Exclude fully paid invoices
      if (patientBalance === 0) continue;

      let derivedStatus: "pending" | "partially_paid" | "overdue" | "paid" = "pending";
      if (inv.dueDate && new Date(inv.dueDate) < now) {
        derivedStatus = "overdue";
      } else if (totalPaid > 0) {
        derivedStatus = "partially_paid";
      }

      let daysOverdue = 0;
      if (inv.dueDate) {
        const ms = now.getTime() - new Date(inv.dueDate).getTime();
        if (ms > 0) daysOverdue = Math.floor(ms / (1000 * 60 * 60 * 24));
      }

      const docFromAppt = (inv.appointment as any)?.doctor;
      const deptFromAppt = (inv.appointment as any)?.department;
      const docFromProv = inv.provisionalData?.doctorId;
      const deptFromProv = inv.provisionalData?.departmentId;

      enrichedOp.push({
        _id: inv._id,
        invoiceNo: inv._id.toString().slice(-8).toUpperCase(),
        patient: inv.patient,
        doctor: docFromAppt || docFromProv || null,
        department: deptFromAppt || deptFromProv || null,
        billingType: inv.billingType || "OP",
        issuedAt: inv.issuedAt || (inv as any).createdAt,
        dueDate: inv.dueDate || null,
        daysOverdue,
        status: derivedStatus,
        totals: {
          subtotal,
          taxAmount,
          total,
          insuranceCovered,
          patientBalance
        },
        amountPaid: totalPaid,
        pendingAmount: patientBalance,
        paymentMode: inv.paymentMode || "Cash",
        branch: inv.branch || null,
        isIpBill: false
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. FETCH IP BILLS (Inpatient Invoices)
    // ─────────────────────────────────────────────────────────────
    const includeIP = !billingType || billingType.toUpperCase() === "IP";
    let enrichedIp: UnifiedInvoiceItem[] = [];

    if (includeIP) {
      const ipFilter: Record<string, any> = {
        hospital: hospitalId,
        status: { $in: ["Generated", "Draft", "Partially Paid", "pending"] },
        outstanding: { $gt: 0 }
      };
      if (branch) ipFilter.branch = branch;
      if (dateFrom || dateTo) {
        ipFilter.billingDate = {};
        if (dateFrom) ipFilter.billingDate.$gte = new Date(dateFrom);
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          ipFilter.billingDate.$lte = to;
        }
      }

      const rawIpBills = await IPBill.find(ipFilter)
        .populate("patient", "name uhid phone age gender email bloodGroup")
        .populate({
          path: "admission",
          select: "doctor department ward room bed",
          populate: [
            { path: "doctor", select: "name specialization" },
            { path: "department", select: "name" }
          ]
        })
        .sort({ billingDate: -1, createdAt: -1 });

      const ipBillIds = rawIpBills.map((b: any) => b._id);
      const ipPayments = await IPBillPayment.find({ bill: { $in: ipBillIds }, hospital: hospitalId });
      const ipPaidMap: Record<string, number> = {};
      ipPayments.forEach((p: any) => {
        const k = p.bill.toString();
        ipPaidMap[k] = (ipPaidMap[k] || 0) + (p.amount || 0);
      });

      for (const bill of rawIpBills) {
        const totalPaid = (bill.advancePaid || 0) + (ipPaidMap[bill._id.toString()] || 0);
        const grandTotal = bill.grandTotal || 0;
        const outstanding = Math.max(0, r2(bill.outstanding != null ? bill.outstanding : (grandTotal - totalPaid)));

        if (outstanding === 0) continue;

        const admission = bill.admission as any;
        const docFromAdm = admission?.doctor;
        const deptFromAdm = admission?.department;

        let derivedStatus: "pending" | "partially_paid" | "overdue" | "paid" = "pending";
        if (totalPaid > 0) {
          derivedStatus = "partially_paid";
        }

        enrichedIp.push({
          _id: bill._id,
          invoiceNo: bill.billNumber || bill.invoiceNumber || bill._id.toString().slice(-8).toUpperCase(),
          patient: bill.patient,
          doctor: docFromAdm || null,
          department: deptFromAdm || null,
          billingType: "IP",
          issuedAt: bill.billingDate || (bill as any).createdAt,
          dueDate: null,
          daysOverdue: 0,
          status: derivedStatus,
          totals: {
            subtotal: grandTotal,
            taxAmount: bill.taxRate || 0,
            total: grandTotal,
            insuranceCovered: bill.insuranceCovered || 0,
            patientBalance: outstanding
          },
          amountPaid: totalPaid,
          pendingAmount: outstanding,
          paymentMode: bill.paymentMode || "Cash",
          branch: bill.branch || null,
          isIpBill: true
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. COMBINE & APPLY FILTERS
    // ─────────────────────────────────────────────────────────────
    let combined = [...enrichedOp, ...enrichedIp];
    combined.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    // Filter by target status parameter
    if (status && status.trim()) {
      const st = status.toLowerCase().trim();
      if (st === "pending") {
        combined = combined.filter(inv => inv.status === "pending");
      } else if (st === "partially_paid" || st === "partial") {
        combined = combined.filter(inv => inv.status === "partially_paid");
      } else if (st === "overdue") {
        combined = combined.filter(inv => inv.status === "overdue");
      }
    }

    // Filter by search query (patient name or phone)
    if (search && search.trim()) {
      const re = new RegExp(search.trim(), "i");
      combined = combined.filter(inv =>
        re.test(inv.patient?.name || "") || re.test(inv.patient?.phone || "")
      );
    }

    // Filter by UHID
    if (uhid && uhid.trim()) {
      const re = new RegExp(uhid.trim(), "i");
      combined = combined.filter(inv => re.test(inv.patient?.uhid || ""));
    }

    // Filter by doctor ID
    if (doctor && doctor.trim()) {
      combined = combined.filter(inv => inv.doctor?._id?.toString() === doctor.trim());
    }

    // Filter by department ID
    if (department && department.trim()) {
      combined = combined.filter(inv => inv.department?._id?.toString() === department.trim());
    }

    // ─────────────────────────────────────────────────────────────
    // 4. COMPUTE SUMMARY KPIs (From exact same dataset)
    // ─────────────────────────────────────────────────────────────
    const uniquePatients = new Set(combined.map(inv => inv.patient?._id?.toString()).filter(Boolean));
    const totalPendingAmount = r2(combined.reduce((sum, inv) => sum + inv.pendingAmount, 0));
    const overdueAmount = r2(
      combined.filter(inv => inv.status === "overdue").reduce((sum, inv) => sum + inv.pendingAmount, 0)
    );

    // Today's Collection
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

    const [todayOpPayments, todayIpPayments] = await Promise.all([
      Payment.find({
        hospital: hospitalId,
        $or: [
          { paidAt: { $gte: startOfToday, $lte: endOfToday } },
          { createdAt: { $gte: startOfToday, $lte: endOfToday } }
        ]
      }),
      IPBillPayment.find({
        hospital: hospitalId,
        $or: [
          { paidAt: { $gte: startOfToday, $lte: endOfToday } },
          { createdAt: { $gte: startOfToday, $lte: endOfToday } }
        ]
      })
    ]);

    const todayCollection = r2(
      todayOpPayments.reduce((sum, p) => sum + (p.amount || 0), 0) +
      todayIpPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    );

    // This Month's Collection
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [monthOpPayments, monthIpPayments] = await Promise.all([
      Payment.find({
        hospital: hospitalId,
        $or: [
          { paidAt: { $gte: startOfMonth, $lte: endOfMonth } },
          { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
        ]
      }),
      IPBillPayment.find({
        hospital: hospitalId,
        $or: [
          { paidAt: { $gte: startOfMonth, $lte: endOfMonth } },
          { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
        ]
      })
    ]);

    const monthCollection = r2(
      monthOpPayments.reduce((sum, p) => sum + (p.amount || 0), 0) +
      monthIpPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    );

    // ─────────────────────────────────────────────────────────────
    // 5. PAGINATE RESULT
    // ─────────────────────────────────────────────────────────────
    const total = combined.length;
    const pageData = combined.slice(skip, skip + pageLimit);

    return {
      invoices: pageData,
      pagination: {
        total,
        page: pageNum,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit) || 1,
      },
      summary: {
        pendingPatients: uniquePatients.size,
        totalPendingAmount,
        overdueAmount,
        todayCollection,
        monthCollection,
      }
    };
  }
}
