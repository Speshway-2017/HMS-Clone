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
  getCompletedConsultations,
  getPrescriptions,
  createPrescription,
  completePrescription,
  getLabOrders,
  createLabOrder,
  getFollowups,
  getSurgeries,
  getNotifications,
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
} from "../controllers/doctorDashboardController";

const router = Router();

// Protect and secure all endpoints
router.use(protect, restrictTo("doctor"), scopeToHospital);

router.get("/metrics", getMetrics);
router.get("/appointments/today", getTodayAppointments);

router.get("/queue", getQueue);
router.post("/queue/:id/call", callPatient);
router.post("/queue/:id/skip", skipPatient);
router.post("/queue/:id/noshow", markNoShow);

router.get("/inpatients", getInpatients);
router.post("/inpatients/:id/notes", addInpatientNotes);

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

export default router;
