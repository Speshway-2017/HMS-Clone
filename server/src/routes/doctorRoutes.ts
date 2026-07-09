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
} from "../controllers/doctorController";

const router = Router();

router.use(protect, restrictTo("hospital_admin"), scopeToHospital);

router.route("/").get(listDoctors).post(createDoctor);
router.get("/:id/performance", getDoctorPerformance);
router.route("/:id").get(getDoctor).patch(updateDoctor).delete(deleteDoctor);

export default router;
