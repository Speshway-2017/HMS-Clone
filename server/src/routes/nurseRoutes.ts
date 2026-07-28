import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  getNursesInpatients,
  getInpatientDetailsForNurse,
  saveVitalsForNurse,
  administerMedication,
  logFluid,
  getNurses
} from "../controllers/nurseController";

const router = Router();

// Allow nurse and hospital_admin to use these endpoints
router.use(protect, restrictTo("nurse", "hospital_admin"), scopeToHospital);

router.get("/inpatients", getNursesInpatients);
router.get("/inpatients/:id/details", getInpatientDetailsForNurse);
router.post("/inpatients/:id/vitals", saveVitalsForNurse);
router.post("/inpatients/:id/medications/:medicationId/administer", administerMedication);
router.post("/inpatients/:id/fluid-logs", logFluid);
router.get("/nurses", getNurses);

export default router;
