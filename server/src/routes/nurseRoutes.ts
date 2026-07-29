import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  getNurseInpatients,
  getNurseInpatientDetails,
  saveNurseInpatientVitals,
  addNurseInpatientNotes
} from "../controllers/nurseController";
import { getStaffProfileMe } from "../controllers/staffController";

const router = Router();

// Protect and secure all endpoints — nurse role only
router.use(protect, restrictTo("nurse"), scopeToHospital);

router.get("/me", getStaffProfileMe);
router.get("/inpatients", getNurseInpatients);
router.route("/inpatients/:id")
  .get(getNurseInpatientDetails);
router.post("/inpatients/:id/vitals", saveNurseInpatientVitals);
router.post("/inpatients/:id/notes", addNurseInpatientNotes);

export default router;
