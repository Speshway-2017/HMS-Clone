import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  getDashboardStats,
  registerPatient,
  searchPatients,
  listPatients,
  bookAppointment,
  processBillingPayment,
  getQueueState,
  simulateDoctorCall,
  simulateDoctorComplete,
  getAdmissionRequests,
  admitPatient,
  transferPatient,
  getAdmissions,
  requestDischarge,
  getDoctorsAvailability,
  getRoomsAvailability,
  getNotifications,
  markNotificationRead,
  exportReports,
  getAuditLogs,
  getOPHistory,
  getPendingInvoices,
  getPaymentHistory,
  getCompletedInvoices,
  getTodayRegistrations,
  cancelAppointment,
  rescheduleAppointment,
  checkDuplicateAppointment,
  getPatientDetail,
  rejectAdmissionRequest,
  getBookedSlots,
  checkInAppointment,
  getQueueDetails
} from "../controllers/receptionController";

const router = Router();

// Specific billing pay override to allow laboratory and pharmacy roles as well
router.post("/billing/pay", protect, restrictTo("receptionist", "hospital_admin", "accountant", "pharmacist", "laboratory"), scopeToHospital, processBillingPayment);

// Secure all receptionist routes
router.use(protect, restrictTo("receptionist", "hospital_admin", "accountant", "pharmacist"), scopeToHospital);

// Dashboard
router.get("/dashboard/stats", getDashboardStats);

// Patients — specific routes before parameterized ones
router.get("/patients/today", getTodayRegistrations);
router.get("/patients/search", searchPatients);
router.get("/patients/list", listPatients);
router.get("/patients/:id", getPatientDetail);
router.route("/patients").post(registerPatient);

// Appointments
router.get("/appointments/booked-slots", getBookedSlots);
router.get("/appointments/check-duplicate", checkDuplicateAppointment);
router.post("/appointments", bookAppointment);
router.post("/appointments/:id/cancel", cancelAppointment);
router.post("/appointments/:id/reschedule", rescheduleAppointment);
router.post("/appointments/:id/check-in", checkInAppointment);
router.get("/dashboard/queue-details", getQueueDetails);

// Billing — data-consistent endpoints (SAME query as dashboard stats)
router.get("/billing/pending-invoices", getPendingInvoices);
router.get("/billing/payment-history", getPaymentHistory);
router.get("/billing/completed-invoices", getCompletedInvoices);

// Queue
router.get("/queues/today", getQueueState);
router.post("/queues/:id/call", simulateDoctorCall);
router.post("/queues/:id/complete", simulateDoctorComplete);

// OP History
router.get("/op/history", getOPHistory);

// Admissions (IP)
router.get("/admissions/requests", getAdmissionRequests);
router.post("/admissions/requests/:id/reject", rejectAdmissionRequest);
router.route("/admissions").post(admitPatient).get(getAdmissions);
router.post("/admissions/transfer", transferPatient);
router.post("/admissions/:id/discharge", requestDischarge);

// Doctors / Rooms
router.get("/doctors/availability", getDoctorsAvailability);
router.get("/rooms/availability", getRoomsAvailability);

// Notifications
router.get("/notifications", getNotifications);
router.post("/notifications/:id/read", markNotificationRead);

// Reports / Audit
router.get("/reports/summary", exportReports);
router.get("/audit-logs", getAuditLogs);

export default router;
