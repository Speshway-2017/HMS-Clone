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
  getPatientProfileMe,
  updatePatientProfileMe,
} from "../controllers/patientController";

const router = Router();

// Allow patient to retrieve and update their own profile details
router.route("/me")
  .get(protect, restrictTo("patient"), getPatientProfileMe)
  .patch(protect, restrictTo("patient"), updatePatientProfileMe);

router.use(protect, restrictTo("hospital_admin", "doctor", "receptionist", "accountant", "pharmacist", "laboratory", "nurse", "patient"), scopeToHospital);

router.route("/")
  .get(listPatients)
  .post(restrictTo("hospital_admin", "receptionist"), createPatient);

router.post("/:id/medical-history", restrictTo("hospital_admin", "doctor"), addMedicalHistoryEntry);

router.route("/:id")
  .get(getPatient)
  .patch(restrictTo("hospital_admin", "doctor", "receptionist", "patient"), updatePatient)
  .delete(restrictTo("hospital_admin"), deletePatient);

export default router;
