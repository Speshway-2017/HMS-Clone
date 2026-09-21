import { Router } from "express";
import {
  getPayrollSummary,
  recalculatePayroll,
  savePayrollAdjustments,
  lockPayroll,
  disbursePayroll,
  processPayrollPayment,
  getPayslip,
} from "../controllers/payrollController";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";

const router = Router();

router.use(protect);
router.use(scopeToHospital);

router.get("/summary", restrictTo("accountant", "hospital_admin", "super_admin"), getPayrollSummary);
router.post("/recalculate", restrictTo("accountant", "hospital_admin", "super_admin"), recalculatePayroll);
router.post("/adjust", restrictTo("accountant", "hospital_admin", "super_admin"), savePayrollAdjustments);
router.post("/lock", restrictTo("accountant", "hospital_admin", "super_admin"), lockPayroll);
router.post("/disburse", restrictTo("accountant", "hospital_admin", "super_admin"), disbursePayroll);
router.post("/process", restrictTo("accountant", "hospital_admin", "super_admin"), processPayrollPayment);
router.get("/payslip/:employeeId/:month", restrictTo("accountant", "hospital_admin", "super_admin"), getPayslip);

export default router;

