import { Router } from "express";
import {
  getDailyAttendance,
  markSingleAttendance,
  bulkMarkAttendance,
  getMonthlyAttendanceSummary,
  getAttendanceHistory,
  correctAttendance,
  getCorrectionReasons,
} from "../controllers/attendanceController";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";

const router = Router();

router.use(protect);
router.use(scopeToHospital);

router.get("/daily", restrictTo("hospital_admin", "super_admin", "accountant"), getDailyAttendance);
router.get("/monthly-summary", restrictTo("hospital_admin", "super_admin", "accountant"), getMonthlyAttendanceSummary);
router.get("/history", restrictTo("hospital_admin", "super_admin", "accountant"), getAttendanceHistory);
router.get("/correction-reasons", restrictTo("hospital_admin", "super_admin"), getCorrectionReasons);

router.post("/mark", restrictTo("hospital_admin", "super_admin"), markSingleAttendance);
router.post("/bulk", restrictTo("hospital_admin", "super_admin"), bulkMarkAttendance);

// Manual Correction — Admin only
router.patch("/:id/correct", restrictTo("hospital_admin", "super_admin"), correctAttendance);

export default router;
