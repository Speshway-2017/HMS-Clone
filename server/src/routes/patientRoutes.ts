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

router.use(protect, restrictTo("hospital_admin", "doctor", "receptionist", "accountant", "pharmacist", "laboratory"), scopeToHospital);

router.route("/")
  .get(listPatients)
  .post(restrictTo("hospital_admin", "receptionist"), createPatient);

router.post("/:id/medical-history", restrictTo("hospital_admin", "doctor"), addMedicalHistoryEntry);

router.route("/:id")
  .get(getPatient)
  .patch(restrictTo("hospital_admin", "doctor", "receptionist"), updatePatient)
  .delete(restrictTo("hospital_admin"), deletePatient);

export default router;
