import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  getMetrics,
  getTodayAppointments,
  getQueue,
  callPatient,
  skipPatient,
  markNoShow,
  getInpatients,
  addInpatientNotes,
  addInpatientLabOrders,
  addInpatientRadiologyOrders,
  getCompletedConsultations,
  getPrescriptions,
  createPrescription,
  completePrescription,
  getLabOrders,
  createLabOrder,
  getFollowups,
  getSurgeries,
  getNotifications,
  markNotificationRead,
  getCalendar,
  getCertificates,
  createCertificate,
  startConsultation,
  getWorkspace,
  saveVitals,
  saveClinicalNotes,
  recommendAdmission,
  createRadiologyOrder,
  completeConsultation,
  getRadiologyOrders,
  startConsultationSession,
  getConsultationDraft,
  updateConsultationDraft,
  completeConsultationSession,
  cancelConsultationSession,
  getConsultationHistory,
  // Doctor-scoped laboratory endpoints
  getMyLabOrders,
  getMyLabOrderById,
  // Doctor-scoped patient record endpoints
  getMyPatients,
  getMyPatientById,
  // Discharge
  finalizeDischarge,
  // New Inpatient EMR Flow
  getInpatientDetails,
  addInpatientMedication,
  updateInpatientMedication,
  saveInpatientVitals,
  getAnalytics,
} from "../controllers/doctorDashboardController";

const router = Router();

// Protect and secure all endpoints — doctor role only
router.use(protect, restrictTo("doctor"), scopeToHospital);

router.get("/metrics", getMetrics);
router.get("/analytics", getAnalytics);
router.get("/appointments/today", getTodayAppointments);

router.get("/queue", getQueue);
router.post("/queue/:id/call", callPatient);
router.post("/queue/:id/skip", skipPatient);
router.post("/queue/:id/noshow", markNoShow);

router.get("/inpatients", getInpatients);
router.post("/inpatients/:id/notes", addInpatientNotes);
router.get("/inpatients/:id/details", getInpatientDetails);
router.post("/inpatients/:id/medications", addInpatientMedication);
router.put("/inpatients/:id/medications", updateInpatientMedication);
router.post("/inpatients/:id/vitals", saveInpatientVitals);
router.post("/inpatients/:id/lab-orders", addInpatientLabOrders);
router.post("/inpatients/:id/radiology-orders", addInpatientRadiologyOrders);

router.get("/consultations/completed", getCompletedConsultations);

router.route("/prescriptions")
  .get(getPrescriptions)
  .post(createPrescription);
router.post("/prescriptions/:id/complete", completePrescription);

router.route("/laboratory")
  .get(getLabOrders)
  .post(createLabOrder);

router.get("/followups", getFollowups);
router.get("/surgeries", getSurgeries);
router.get("/notifications", getNotifications);
router.post("/notifications/:id/read", markNotificationRead);
router.get("/calendar", getCalendar);

router.route("/certificates")
  .get(getCertificates)
  .post(createCertificate);

// Consultation Workspace Routes
router.post("/appointments/:id/start", startConsultation);
router.get("/appointments/:id/workspace", getWorkspace);
router.post("/appointments/:id/vitals", saveVitals);
router.post("/appointments/:id/notes", saveClinicalNotes);
router.post("/appointments/:id/complete", completeConsultation);
router.post("/appointments/:id/admission", recommendAdmission);
router.post("/appointments/:id/radiology", createRadiologyOrder);
router.get("/radiology/list", getRadiologyOrders);

// Draft Consultation Lifecycle Routes
router.post("/consultations/start", startConsultationSession);
router.get("/consultations/:appointmentId/draft", getConsultationDraft);
router.put("/consultations/:consultationId/draft", updateConsultationDraft);
router.post("/consultations/:consultationId/complete", completeConsultationSession);
router.post("/consultations/:consultationId/cancel", cancelConsultationSession);
router.get("/consultations/:id/history", getConsultationHistory);

// ── Doctor-scoped lab order records (security-enforced, audit-logged) ─────────
router.get("/my-lab-orders", getMyLabOrders);
router.get("/my-lab-orders/:labOrderId", getMyLabOrderById);

// ── Doctor-scoped patient records (security-enforced, no cross-doctor leakage) ─
router.get("/my-patients", getMyPatients);
router.get("/my-patients/:patientId", getMyPatientById);

// ── IP Discharge (Doctor initiates, Receptionist confirms) ─
router.post("/admissions/:admissionId/finalize-discharge", finalizeDischarge);

export default router;
