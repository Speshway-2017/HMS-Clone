import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listDoctors,
  createDoctor,
  getDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorPerformance,
  getDoctorProfileMe,
  updateDoctorProfileMe,
} from "../controllers/doctorController";

const router = Router();

// Allow logged in doctors to retrieve and update their own doctor profile
router.route("/me")
  .get(protect, restrictTo("doctor"), getDoctorProfileMe)
  .patch(protect, restrictTo("doctor"), updateDoctorProfileMe);

router.use(protect, restrictTo("hospital_admin", "receptionist", "accountant", "pharmacist", "laboratory"), scopeToHospital);

router.route("/").get(listDoctors).post(createDoctor);
router.get("/:id/performance", getDoctorPerformance);
router.route("/:id").get(getDoctor).patch(updateDoctor).delete(deleteDoctor);

export default router;
