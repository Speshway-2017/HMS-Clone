import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  savePrescription,
  listPrescriptions,
  verifyPrescriptionPublic,
  downloadPrescription,
  dispensePrescription,
  updatePrescriptionStatus,
  getPatientPrescriptions,
} from "../controllers/prescriptionController";

const router = Router();

// Publicly accessible QR-Code Verification scan endpoint
router.get("/:id/verify", verifyPrescriptionPublic);

// Secure PDF Download (internally checks signed URL token OR staff JWT session)
router.get("/:id/download", (req, res, next) => {
  if (req.query.token) {
    return next();
  }
  return protect(req, res, next);
}, downloadPrescription);

// Patient portal endpoint support
router.get("/patient", protect, getPatientPrescriptions);

// Staff restricted operations
router.use(protect, scopeToHospital);

router.route("/")
  .get(restrictTo("doctor", "pharmacist", "hospital_admin", "receptionist"), listPrescriptions)
  .post(restrictTo("doctor"), savePrescription);

router.patch("/:id/dispense", restrictTo("pharmacist"), dispensePrescription);
router.patch("/:id/status", restrictTo("pharmacist", "doctor", "hospital_admin"), updatePrescriptionStatus);

export default router;
