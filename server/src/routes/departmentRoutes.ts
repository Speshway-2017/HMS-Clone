import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listDepartments,
  getNextDepartmentCode,
  createDepartment,
  getDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
  getDepartmentMetrics,
} from "../controllers/departmentController";

const router = Router();

router.use(protect);

// Auto-generated unique department code
router.get("/next-code", scopeToHospital, getNextDepartmentCode);

// Read-only department listing accessible to all authenticated roles (patient, doctor, receptionist, admin)
router.get("/", scopeToHospital, listDepartments);
router.get("/:id", scopeToHospital, getDepartment);
router.get("/:id/metrics", scopeToHospital, getDepartmentMetrics);

// Status toggle (enable/disable) is accessible to both super_admin and hospital_admin
router.patch("/:id/toggle-status", restrictTo("super_admin", "hospital_admin"), scopeToHospital, toggleDepartmentStatus);

// Department creation, updates, and deletion are strictly restricted to super_admin
router.use(restrictTo("super_admin"), scopeToHospital);
router.post("/", createDepartment);
router.route("/:id").patch(updateDepartment).delete(deleteDepartment);

export default router;
