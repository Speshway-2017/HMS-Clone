import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { Appointment } from "../models/Appointment";
import { InventoryItem } from "../models/InventoryItem";
import { Invoice } from "../models/Invoice";
import { Patient } from "../models/Patient";
import { Doctor } from "../models/Doctor";

export const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const hospitalFilter = req.hospitalFilter as Record<string, unknown>;
  const isDoctor = req.user!.role === "doctor";

  // Find the doctor ID for this user if they are a doctor
  let doctorId: string | null = null;
  if (isDoctor) {
    const docProfile = await Doctor.findOne({ email: req.user!.email });
    if (docProfile) {
      doctorId = docProfile._id.toString();
    }
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfTomorrow = new Date(now);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
  endOfTomorrow.setHours(0, 0, 0, 0);

  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const apptFilter: Record<string, any> = {
    ...hospitalFilter,
    status: "scheduled",
    date: { $gte: startOfToday, $lt: endOfTomorrow },
  };

  const patientFilter: Record<string, any> = {
    ...hospitalFilter,
    createdAt: { $gte: last24h },
  };

  if (isDoctor && doctorId) {
    apptFilter.doctor = doctorId;
    patientFilter.assignedDoctor = doctorId;
  }

  const [upcomingAppointments, lowStockItems, actionableInvoices, newPatients] = await Promise.all([
    // Appointments scheduled today or tomorrow
    Appointment.find(apptFilter)
      .populate("patient", "name")
      .populate("doctor", "name")
      .sort({ date: 1 })
      .limit(10)
      .lean(),

    // Inventory at or below reorder level (only fetch for admins)
    !isDoctor
      ? InventoryItem.find({ ...hospitalFilter, $expr: { $lte: ["$stockQty", "$reorderLevel"] } })
          .sort({ stockQty: 1 })
          .limit(10)
          .lean()
      : Promise.resolve([]),

    // Overdue invoices or pending invoices with a passed due date (only fetch for admins)
    !isDoctor
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

    // Patients registered in the last 24 hours (assigned to doctor if user is doctor)
    Patient.find(patientFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  type Notification = {
    id: string;
    type: "appointment" | "inventory" | "invoice" | "patient";
    title: string;
    message: string;
    link: string;
    severity: "info" | "warning" | "critical";
    createdAt: Date | string;
  };

  const notifications: Notification[] = [];

  // ── Appointments ──
  for (const appt of upcomingAppointments) {
    const patientName = (appt.patient as { name?: string })?.name ?? "Unknown patient";
    const doctorName = (appt.doctor as { name?: string })?.name ?? "Unknown doctor";
    const apptDate = new Date(appt.date);
    const isToday = apptDate >= startOfToday && apptDate < endOfTomorrow;
    const dayLabel = isToday && apptDate < new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) ? "today" : "tomorrow";

    notifications.push({
      id: `appt-${appt._id}`,
      type: "appointment",
      title: "Upcoming Appointment",
      message: `${patientName} with Dr. ${doctorName} at ${appt.time} ${dayLabel}`,
      link: isDoctor ? `/doctor/op-management` : `/admin/appointments/${appt._id}`,
      severity: "info",
      createdAt: appt.date,
    });
  }

  // ── Inventory ──
  for (const item of lowStockItems) {
    const isCritical = item.stockQty <= 0;
    notifications.push({
      id: `inv-${item._id}`,
      type: "inventory",
      title: isCritical ? "Out of Stock" : "Low Stock Alert",
      message: `${item.name} — ${item.stockQty} ${item.unit} remaining (reorder at ${item.reorderLevel})`,
      link: `/admin/inventory/${item._id}`,
      severity: isCritical ? "critical" : "warning",
      createdAt: item.updatedAt as Date,
    });
  }

  // ── Invoices ──
  for (const inv of actionableInvoices) {
    const patientName = (inv.patient as { name?: string })?.name ?? "Unknown patient";
    notifications.push({
      id: `inv-${inv._id}`,
      type: "invoice",
      title: inv.status === "overdue" ? "Overdue Invoice" : "Pending Invoice",
      message: `Invoice for ${patientName} is ${inv.status}${inv.dueDate ? ` (due ${new Date(inv.dueDate).toLocaleDateString()})` : ""}`,
      link: `/admin/finance/invoices/${inv._id}`,
      severity: inv.status === "overdue" ? "critical" : "warning",
      createdAt: inv.dueDate ?? (inv.issuedAt as Date),
    });
  }

  // ── New Patients ──
  for (const patient of newPatients) {
    notifications.push({
      id: `pat-${patient._id}`,
      type: "patient",
      title: "New Patient Registered",
      message: `${patient.name} was added to the system`,
      link: isDoctor ? `/doctor/patient-records` : `/admin/patients/${patient._id}`,
      severity: "info",
      createdAt: patient.createdAt as Date,
    });
  }

  // Sort newest-first
  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  res.json({
    status: "success",
    data: { notifications, total: notifications.length },
  });
});
