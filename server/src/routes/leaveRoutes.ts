import { Router } from "express";
import {
  listLeaveRequests,
  applyLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
} from "../controllers/leaveController";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";

const router = Router();

router.use(protect);
router.use(scopeToHospital);

router.get("/", restrictTo("hospital_admin", "super_admin", "accountant"), listLeaveRequests);
router.post("/", restrictTo("hospital_admin", "super_admin"), applyLeave);

router.patch("/:id/approve", restrictTo("hospital_admin", "super_admin"), approveLeave);
router.patch("/:id/reject", restrictTo("hospital_admin", "super_admin"), rejectLeave);
router.patch("/:id/cancel", restrictTo("hospital_admin", "super_admin"), cancelLeave);

export default router;
