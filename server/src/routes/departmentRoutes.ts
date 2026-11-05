import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listDepartments,
  createDepartment,
  getDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
  getDepartmentMetrics,
} from "../controllers/departmentController";

const router = Router();

router.use(protect);

// Read-only department listing accessible to all authenticated roles (patient, doctor, receptionist, admin)
router.get("/", scopeToHospital, listDepartments);
router.get("/:id", scopeToHospital, getDepartment);
router.get("/:id/metrics", scopeToHospital, getDepartmentMetrics);

// Mutations restricted to administrators
router.use(restrictTo("super_admin", "hospital_admin"), scopeToHospital);
router.post("/", createDepartment);
router.patch("/:id/toggle-status", toggleDepartmentStatus);
router.route("/:id").patch(updateDepartment).delete(deleteDepartment);

export default router;
