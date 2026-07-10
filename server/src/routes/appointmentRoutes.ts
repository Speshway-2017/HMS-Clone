import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listAppointments,
  createAppointment,
  getAppointment,
  updateAppointment,
  deleteAppointment,
} from "../controllers/appointmentController";

const router = Router();

router.use(protect, restrictTo("hospital_admin", "receptionist"), scopeToHospital);

router.route("/").get(listAppointments).post(createAppointment);
router.route("/:id").get(getAppointment).patch(updateAppointment).delete(deleteAppointment);

export default router;
