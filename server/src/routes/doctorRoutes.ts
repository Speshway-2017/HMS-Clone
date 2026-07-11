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
} from "../controllers/doctorController";

const router = Router();

// Allow logged in doctors to retrieve their own doctor profile
router.get("/me", protect, restrictTo("doctor"), getDoctorProfileMe);

router.use(protect, restrictTo("hospital_admin", "receptionist", "accountant", "pharmacist", "laboratory"), scopeToHospital);

router.route("/").get(listDoctors).post(createDoctor);
router.get("/:id/performance", getDoctorPerformance);
router.route("/:id").get(getDoctor).patch(updateDoctor).delete(deleteDoctor);

export default router;
