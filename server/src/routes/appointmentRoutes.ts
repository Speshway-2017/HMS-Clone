import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listAppointments,
  createAppointment,
  getAppointment,
  updateAppointment,
  deleteAppointment,
  getInvoiceByAppointmentId,
} from "../controllers/appointmentController";

const router = Router();

router.use(protect, restrictTo("hospital_admin", "doctor", "receptionist", "accountant", "pharmacist", "laboratory"), scopeToHospital);

router.get("/:id/invoice", getInvoiceByAppointmentId);

router.route("/")
  .get(listAppointments)
  .post(restrictTo("hospital_admin", "receptionist"), createAppointment);

router.route("/:id")
  .get(getAppointment)
  .patch(restrictTo("hospital_admin", "doctor", "receptionist"), updateAppointment)
  .delete(restrictTo("hospital_admin"), deleteAppointment);

export default router;
