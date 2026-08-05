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
  getAvailableSlots,
} from "../controllers/appointmentController";

const router = Router();

router.use(protect, restrictTo("hospital_admin", "doctor", "receptionist", "accountant", "pharmacist", "laboratory", "nurse", "patient"), scopeToHospital);

router.get("/:id/invoice", getInvoiceByAppointmentId);

/**
 * GET /appointments/available-slots?doctorId=&date=
 * Single source of truth for booked slot data.
 * Accessible by both patient and receptionist roles.
 * Frontend must NEVER use cached data — always fetch fresh.
 */
router.get("/available-slots", restrictTo("hospital_admin", "receptionist", "patient"), getAvailableSlots);

router.route("/")
  .get(listAppointments)
  .post(restrictTo("hospital_admin", "receptionist", "patient"), createAppointment);

router.route("/:id")
  .get(getAppointment)
  .patch(restrictTo("hospital_admin", "doctor", "receptionist", "patient"), updateAppointment)
  .delete(restrictTo("hospital_admin"), deleteAppointment);

export default router;

