import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  getNurseInpatients,
  getNurseInpatientDetails,
  saveNurseInpatientVitals,
  addNurseInpatientNotes,
  administerNurseInpatientMed,
  saveNurseInpatientNote,
  updateNurseInpatientNote,
  deleteNurseInpatientNote,
  saveNurseInpatientBedsideChecks,
  saveShiftHandover,
  getShiftHandovers,
  completeShiftHandover,
  acceptShiftHandover,
  getNurseShiftStatus,
  triggerSupervisorAlert,
  saveNurseInpatientDischargePrep,
  getNurseNotifications,
  markNurseNotificationRead,
  markAllNurseNotificationsRead,
  snoozeNurseNotification,
  dismissNurseNotification,
  sendNoteToAssignedDoctor
} from "../controllers/nurseController";
import { getStaffProfileMe } from "../controllers/staffController";

const router = Router();

// Protect and secure all endpoints — nurse role only
router.use(protect, restrictTo("nurse"), scopeToHospital);

router.get("/me", getStaffProfileMe);
router.get("/shift-status", getNurseShiftStatus);
router.get("/inpatients", getNurseInpatients);
router.route("/inpatients/:id")
  .get(getNurseInpatientDetails);
router.post("/notes/send-to-doctor", sendNoteToAssignedDoctor);
router.post("/inpatients/:id/vitals", saveNurseInpatientVitals);
router.post("/inpatients/:id/notes", addNurseInpatientNotes);
router.post("/inpatients/:id/medications/administer", administerNurseInpatientMed);
router.post("/inpatients/:id/nursing-notes", saveNurseInpatientNote);
router.put("/inpatients/:id/nursing-notes/:noteId", updateNurseInpatientNote);
router.delete("/inpatients/:id/nursing-notes/:noteId", deleteNurseInpatientNote);
router.post("/inpatients/:id/bedside-checks", saveNurseInpatientBedsideChecks);
router.post("/inpatients/:id/discharge-prep", saveNurseInpatientDischargePrep);
router.post("/handovers", saveShiftHandover);
router.post("/handovers/complete", completeShiftHandover);
router.post("/handovers/accept", acceptShiftHandover);
router.post("/handovers/supervisor-alert", triggerSupervisorAlert);
router.get("/handovers", getShiftHandovers);

// Notifications routes
router.get("/notifications", getNurseNotifications);
router.post("/notifications/read-all", markAllNurseNotificationsRead);
router.post("/notifications/:id/read", markNurseNotificationRead);
router.post("/notifications/:id/snooze", snoozeNurseNotification);
router.delete("/notifications/:id", dismissNurseNotification);

export default router;
