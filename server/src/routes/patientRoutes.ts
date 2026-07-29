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
} from "../controllers/patientController";

const router = Router();

// Allow patient to retrieve their own profile details
router.route("/me")
  .get(protect, restrictTo("patient"), getPatientProfileMe);

router.use(protect, restrictTo("hospital_admin", "doctor", "receptionist", "accountant", "pharmacist", "laboratory", "nurse"), scopeToHospital);

router.route("/")
  .get(listPatients)
  .post(restrictTo("hospital_admin", "receptionist"), createPatient);

router.post("/:id/medical-history", restrictTo("hospital_admin", "doctor"), addMedicalHistoryEntry);

router.route("/:id")
  .get(getPatient)
  .patch(restrictTo("hospital_admin", "doctor", "receptionist"), updatePatient)
  .delete(restrictTo("hospital_admin"), deletePatient);

export default router;
