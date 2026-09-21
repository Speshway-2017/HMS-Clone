import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  getActiveAdmittedPatients,
  createIPBill,
  getIPBillDetails,
  addBillChargeItem,
  updateBillChargeItem,
  deleteBillChargeItem,
  generateIPBillInvoice,
  postIPBillPayment,
  getIPBillReceiptDetails
} from "../controllers/ipBillController";

const router = Router();

// Secure all receptionist and accountant billing routes
router.use(protect, restrictTo("receptionist", "accountant", "hospital_admin"), scopeToHospital);

router.get("/admissions", getActiveAdmittedPatients);
router.post("/", createIPBill);
router.get("/:admissionId", getIPBillDetails);
router.post("/:id/charges", addBillChargeItem);
router.put("/:id/charges/:itemId", updateBillChargeItem);
router.delete("/:id/charges/:itemId", deleteBillChargeItem);
router.post("/:id/generate-invoice", generateIPBillInvoice);
router.post("/:id/payment", postIPBillPayment);
router.get("/:id/receipt/:paymentId", getIPBillReceiptDetails);

export default router;
