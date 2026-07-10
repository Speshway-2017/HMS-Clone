import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listDepartments,
  createDepartment,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentMetrics,
} from "../controllers/departmentController";

const router = Router();

router.use(protect, restrictTo("super_admin", "hospital_admin", "receptionist"), scopeToHospital);

router.route("/").get(listDepartments).post(createDepartment);
router.get("/:id/metrics", getDepartmentMetrics);
router.route("/:id").get(getDepartment).patch(updateDepartment).delete(deleteDepartment);

export default router;
