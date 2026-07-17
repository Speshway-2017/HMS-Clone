import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  getAccountantDashboard,
  getExpenses,
  createExpense,
  deleteExpense,
  approveExpense,
  getInsuranceClaims,
  verifyClaim,
  settleClaim,
} from "../controllers/accountantController";

const router = Router();

// All accountant routes require authentication and accountant/hospital_admin role
router.use(protect, restrictTo("accountant", "hospital_admin", "super_admin"), scopeToHospital);

router.get("/dashboard", getAccountantDashboard);

// Expense routes
router.route("/expenses").get(getExpenses).post(createExpense);
router.route("/expenses/:id").delete(deleteExpense);
router.patch("/expenses/:id/approve", approveExpense);

// Insurance claims routes
router.get("/claims", getInsuranceClaims);
router.post("/claims/:id/verify", verifyClaim);
router.post("/claims/:id/settle", settleClaim);

export default router;
