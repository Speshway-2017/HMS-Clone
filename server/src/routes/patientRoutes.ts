import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listPatients,
  createPatient,
  getPatient,
  updatePatient,
  deletePatient,
  addMedicalHistoryEntry,
} from "../controllers/patientController";

const router = Router();

router.use(protect, restrictTo("hospital_admin"), scopeToHospital);

router.route("/").get(listPatients).post(createPatient);
router.post("/:id/medical-history", addMedicalHistoryEntry);
router.route("/:id").get(getPatient).patch(updatePatient).delete(deletePatient);

export default router;
