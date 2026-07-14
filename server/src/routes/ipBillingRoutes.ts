import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  getActiveIPAdmissions,
  getIPAdmissionBillingDetails,
  addCustomCharge,
  deleteCustomCharge,
  postIPAdvancePayment,
  generateFinalIPInvoice
} from "../controllers/ipBillingController";

const router = Router();

// Secure all inpatient billing routes
router.use(protect, restrictTo("accountant", "hospital_admin"), scopeToHospital);

router.get("/admissions", getActiveIPAdmissions);
router.get("/admissions/:id/details", getIPAdmissionBillingDetails);
router.post("/admissions/:id/charges", addCustomCharge);
router.delete("/admissions/:id/charges/:chargeId", deleteCustomCharge);
router.post("/admissions/:id/payments", postIPAdvancePayment);
router.post("/admissions/:id/generate-invoice", generateFinalIPInvoice);

export default router;
