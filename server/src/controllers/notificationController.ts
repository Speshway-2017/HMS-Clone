import { Request, Response } from "express";
import { buildBranchQuery } from "../utils/branchQueryHelper";
import { Types } from "mongoose";
import { catchAsync } from "../utils/catchAsync";
import { Appointment } from "../models/Appointment";
import { InventoryItem } from "../models/InventoryItem";
import { Invoice } from "../models/Invoice";
import { Patient } from "../models/Patient";
import { Doctor } from "../models/Doctor";
import { LabOrder } from "../models/LabOrder";
import { RadiologyOrder } from "../models/RadiologyOrder";
import { DbNotification } from "../models/DbNotification";
import { PayrollRecord } from "../models/PayrollRecord";
import { NotificationDismissal } from "../models/NotificationDismissal";

export const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const hospitalFilter = req.hospitalFilter as Record<string, unknown>;
  const role = req.user!.role;
  const isDoctor = role === "doctor";
  const isLab = role === "laboratory";
  const isAccountant = role === "accountant";
  const isPharmacist = role === "pharmacist";
  const isReceptionist = role === "receptionist";
  const isNurse = role === "nurse";
  const isPatientUser = role === "patient";
  const isAdmin = role === "hospital_admin" || role === "super_admin";

  // Find Doctor ID or Patient ID if applicable
  let doctorId: string | null = null;
  let patientRefId: string | null = null;

  if (isDoctor) {
    const docProfile = await Doctor.findOne({ email: req.user!.email });
    if (docProfile) {
      doctorId = docProfile._id.toString();
    }
  } else if (isPatientUser) {
    const patProfile = await Patient.findOne({ email: req.user!.email });
    if (patProfile) {
      patientRefId = patProfile._id.toString();
    }
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfTomorrow = new Date(now);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
  endOfTomorrow.setHours(0, 0, 0, 0);

  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Filters
  const apptFilter: Record<string, any> = {
    ...hospitalFilter,
    status: { $in: ["scheduled", "checked_in", "in_consultation", "pending_payment"] },
    date: { $gte: startOfToday, $lt: endOfTomorrow },
  };

  const patientFilter: Record<string, any> = {
    ...hospitalFilter,
    createdAt: { $gte: last24h },
  };

  if (isDoctor && doctorId) {
    apptFilter.doctor = doctorId;
    patientFilter.assignedDoctor = doctorId;
  } else if (isPatientUser && patientRefId) {
    apptFilter.patient = patientRefId;
  }

  const [
    upcomingAppointments,
    lowStockItems,
    actionableInvoices,
    newPatients,
    pendingLabOrders,
    pendingRadiologyOrders,
    payrollRecalcRecords,
    dbNotifications,
    userDismissals,
  ] = await Promise.all([
    // Appointments: Doctor (own), Patient (own), Receptionist (hospital), Admin (hospital)
    (isDoctor || isPatientUser || isReceptionist || isAdmin)
      ? Appointment.find(apptFilter)
          .populate("patient", "name")
          .populate("doctor", "name")
          .sort({ date: 1 })
          .limit(10)
          .lean()
      : Promise.resolve([]),

    // Inventory low stock: Pharmacist, Accountant, Admin
    (isPharmacist || isAccountant || isAdmin)
      ? InventoryItem.find({ ...hospitalFilter, $expr: { $lte: ["$stockQty", "$reorderLevel"] } })
          .sort({ stockQty: 1 })
          .limit(10)
          .lean()
      : Promise.resolve([]),

    // Invoices & Billing: Accountant, Pharmacist, Admin
    (isAccountant || isPharmacist || isAdmin)
      ? Invoice.find({
          ...hospitalFilter,
          $or: [
            { status: "overdue" },
            { status: "pending", dueDate: { $lt: now } },
          ],
        })
          .populate("patient", "name")
          .sort({ dueDate: 1 })
          .limit(10)
          .lean()
      : Promise.resolve([]),

    // New Patients registered in last 24h: Doctor (assigned), Receptionist, Admin
    (isDoctor || isReceptionist || isAdmin)
      ? Patient.find(patientFilter)
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      : Promise.resolve([]),

    // Pending Lab Orders: Laboratory only
    isLab
      ? LabOrder.find({ ...buildBranchQuery(hospitalFilter), status: "pending" })
          .populate("patient", "name")
          .populate("doctor", "name")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
      : Promise.resolve([]),

    // Pending Radiology Orders: Laboratory only
    isLab
      ? RadiologyOrder.find({ ...buildBranchQuery(hospitalFilter), status: "pending" })
          .populate("patient", "name")
          .populate("doctor", "name")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
      : Promise.resolve([]),

    // Payroll Recalculation Alerts: Accountant, Admin
    (isAccountant || isAdmin)
      ? PayrollRecord.find({ ...hospitalFilter, status: "Needs Recalculation" })
          .sort({ updatedAt: -1 })
          .limit(10)
          .lean()
      : Promise.resolve([]),

    // Database Notifications: Targeted to doctorId, patientRefId, or role
    DbNotification.find({
      ...buildBranchQuery(hospitalFilter),
      $or: [
        ...(doctorId ? [
          { recipientDoctor: doctorId },
          { recipientDoctor: new Types.ObjectId(doctorId) }
        ] : []),
        ...(patientRefId ? [
          { recipientPatient: patientRefId },
          { recipientPatient: new Types.ObjectId(patientRefId) }
        ] : []),
        { recipientRole: req.user!.role },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),

    // Permanently dismissed notifications for this user
    NotificationDismissal.find({
      user: req.user!._id,
      hospital: hospitalFilter.hospital,
    }).lean(),
  ]);

  const dismissedSet = new Set(userDismissals.map(d => d.notificationId));


  type Notification = {
    id: string;
    type: "appointment" | "inventory" | "invoice" | "patient" | "admission_request" | "general";
    title: string;
    message: string;
    link: string;
    severity: "info" | "warning" | "critical";
    createdAt: Date | string;
  };

  const notifications: Notification[] = [];

  // ── 1. Appointments ──
  for (const appt of upcomingAppointments) {
    const patientName = (appt.patient as { name?: string })?.name ?? "Unknown patient";
    const doctorName = (appt.doctor as { name?: string })?.name ?? "Unknown doctor";
    const apptDate = new Date(appt.date);
    const isToday = apptDate >= startOfToday && apptDate < endOfTomorrow;
    const dayLabel = isToday && apptDate < new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) ? "today" : "tomorrow";

    const targetLink = isDoctor
      ? `/doctor/op-management`
      : isPatientUser
      ? `/patient/appointments`
      : isReceptionist
      ? `/receptionist/appointments`
      : `/admin/appointments/${appt._id}`;

    notifications.push({
      id: `appt-${appt._id}`,
      type: "appointment",
      title: "Upcoming Appointment",
      message: isPatientUser
        ? `Appointment with Dr. ${doctorName} at ${appt.time} ${dayLabel}`
        : `${patientName} with Dr. ${doctorName} at ${appt.time} ${dayLabel}`,
      link: targetLink,
      severity: "info",
      createdAt: appt.date,
    });
  }

  // ── 2. Inventory / Low Stock ──
  for (const item of lowStockItems) {
    const isCritical = item.stockQty <= 0;
    const targetLink = isAccountant
      ? `/accountant/expenses`
      : isPharmacist
      ? `/pharmacy/inventory`
      : `/admin/inventory/${item._id}`;

    notifications.push({
      id: `inv-${item._id}`,
      type: "inventory",
      title: isCritical ? "Out of Stock" : "Low Stock Alert",
      message: `${item.name} — ${item.stockQty} ${item.unit} remaining (reorder at ${item.reorderLevel})`,
      link: targetLink,
      severity: isCritical ? "critical" : "warning",
      createdAt: item.updatedAt as Date,
    });
  }

  // ── 3. Invoices & Billing ──
  for (const inv of actionableInvoices) {
    const patientName = (inv.patient as { name?: string })?.name ?? "Unknown patient";
    const targetLink = isAccountant
      ? `/accountant/billing`
      : isPharmacist
      ? `/pharmacy/billing`
      : `/admin/finance/invoices/${inv._id}`;

    notifications.push({
      id: `inv-${inv._id}`,
      type: "invoice",
      title: inv.status === "overdue" ? "Overdue Invoice" : "Pending Invoice",
      message: `Invoice for ${patientName} is ${inv.status}${inv.dueDate ? ` (due ${new Date(inv.dueDate).toLocaleDateString()})` : ""}`,
      link: targetLink,
      severity: inv.status === "overdue" ? "critical" : "warning",
      createdAt: inv.dueDate ?? (inv.issuedAt as Date),
    });
  }

  // ── 4. New Patients ──
  for (const patient of newPatients) {
    const targetLink = isDoctor
      ? `/doctor/patient-records`
      : isReceptionist
      ? `/receptionist/patients`
      : `/admin/patients/${patient._id}`;

    notifications.push({
      id: `pat-${patient._id}`,
      type: "patient",
      title: "New Patient Registered",
      message: `${patient.name} was added to the system`,
      link: targetLink,
      severity: "info",
      createdAt: patient.createdAt as Date,
    });
  }

  // ── 5. Consolidated Pending Lab Orders (Single Notification per Patient) ──
  const labOrdersByPatient = new Map<string, { patientName: string; doctorName: string; tests: Set<string>; priority: string; latestDate: Date }>();
  for (const order of pendingLabOrders) {
    const pId = (order.patient as any)?._id?.toString() || order.patient?.toString() || "unknown";
    const patientName = (order.patient as { name?: string })?.name ?? "Unknown patient";
    const doctorName = (order.doctor as { name?: string })?.name ?? "Unknown doctor";

    if (!labOrdersByPatient.has(pId)) {
      labOrdersByPatient.set(pId, {
        patientName,
        doctorName,
        tests: new Set(order.tests || []),
        priority: order.priority || "Routine",
        latestDate: order.createdAt as Date
      });
    } else {
      const existing = labOrdersByPatient.get(pId)!;
      (order.tests || []).forEach(t => existing.tests.add(t));
      if (order.priority === "STAT" || (order.priority === "Urgent" && existing.priority !== "STAT")) {
        existing.priority = order.priority;
      }
      if (new Date(order.createdAt).getTime() > new Date(existing.latestDate).getTime()) {
        existing.latestDate = order.createdAt as Date;
      }
    }
  }

  for (const [pId, info] of labOrdersByPatient.entries()) {
    const testsList = Array.from(info.tests).join(", ");
    notifications.push({
      id: `lab-${pId}`,
      type: "general",
      title: "New Lab Request",
      message: `Dr. ${info.doctorName} ordered [${testsList}] for ${info.patientName} (${info.priority})`,
      link: `/laboratory/requests`,
      severity: info.priority === "STAT" ? "critical" : info.priority === "Urgent" ? "warning" : "info",
      createdAt: info.latestDate,
    });
  }

  // ── 6. Consolidated Pending Radiology Orders (Single Notification per Patient) ──
  const radOrdersByPatient = new Map<string, { patientName: string; doctorName: string; types: Set<string>; priority: string; latestDate: Date }>();
  for (const order of pendingRadiologyOrders) {
    const pId = (order.patient as any)?._id?.toString() || order.patient?.toString() || "unknown";
    const patientName = (order.patient as { name?: string })?.name ?? "Unknown patient";
    const doctorName = (order.doctor as { name?: string })?.name ?? "Unknown doctor";
    const scanType = order.type || "Radiology Scan";

    if (!radOrdersByPatient.has(pId)) {
      radOrdersByPatient.set(pId, {
        patientName,
        doctorName,
        types: new Set([scanType]),
        priority: order.priority || "Routine",
        latestDate: order.createdAt as Date
      });
    } else {
      const existing = radOrdersByPatient.get(pId)!;
      existing.types.add(scanType);
      if (order.priority === "STAT" || (order.priority === "Urgent" && existing.priority !== "STAT")) {
        existing.priority = order.priority;
      }
      if (new Date(order.createdAt).getTime() > new Date(existing.latestDate).getTime()) {
        existing.latestDate = order.createdAt as Date;
      }
    }
  }

  for (const [pId, info] of radOrdersByPatient.entries()) {
    const typesList = Array.from(info.types).join(", ");
    notifications.push({
      id: `rad-${pId}`,
      type: "general",
      title: "New Radiology Request",
      message: `Dr. ${info.doctorName} requested [${typesList}] for ${info.patientName} (${info.priority})`,
      link: `/laboratory/requests`,
      severity: info.priority === "STAT" ? "critical" : info.priority === "Urgent" ? "warning" : "info",
      createdAt: info.latestDate,
    });
  }

  // ── 7. Payroll Recalculation Notifications ──
  for (const record of payrollRecalcRecords) {
    notifications.push({
      id: `pay-${record._id}`,
      type: "invoice",
      title: "Payroll Recalculation Needed",
      message: `Salary for ${record.employeeName} (${record.employeeId}) needs recalculation due to attendance/leave updates.`,
      link: isAccountant ? `/accountant/payroll` : `/admin/staff/attendance`,
      severity: "warning",
      createdAt: (record as any).updatedAt || new Date(),
    });
  }

  // ── 8. Database Notifications ──
  for (const notif of dbNotifications) {
    notifications.push({
      id: `db-${notif._id}`,
      type: (notif.type as any) || "general",
      title: notif.title,
      message: notif.message,
      link: notif.link,
      severity: (notif.severity as any) || "info",
      createdAt: notif.createdAt as Date,
    });
  }

  // Filter out any notifications that were permanently dismissed by this user
  const activeNotifications = notifications.filter(n => {
    const rawId = n.id.replace(/^(db-|pay-|appt-|patient-|lab-|rad-)/, "");
    return !dismissedSet.has(n.id) && !dismissedSet.has(rawId);
  });

  // Sort newest-first
  activeNotifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  res.json({
    status: "success",
    data: { notifications: activeNotifications, total: activeNotifications.length },
  });
});

export const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const hospitalFilter = req.hospitalFilter as Record<string, unknown>;

  // 1. Permanently record dismissal for this user so it never reappears across any dashboard
  await NotificationDismissal.findOneAndUpdate(
    { user: req.user!._id, notificationId: id, hospital: hospitalFilter.hospital as any },
    { user: req.user!._id, notificationId: id, hospital: hospitalFilter.hospital as any },
    { upsert: true, new: true }
  );

  // 2. If it corresponds to a DbNotification document, delete it from MongoDB
  const rawId = id.replace(/^(db-|pay-|appt-|patient-|lab-|rad-)/, "");
  await DbNotification.deleteOne({
    _id: rawId,
    hospital: hospitalFilter.hospital
  }).catch(() => {});

  res.json({
    status: "success",
    message: "Notification deleted successfully."
  });
});

