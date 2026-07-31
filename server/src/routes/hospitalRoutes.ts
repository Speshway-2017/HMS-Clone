import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listHospitals,
  createHospital,
  getHospital,
  updateHospital,
  deleteHospital,
  listUnassignedHospitalAdmins,
  getMyHospital,
  updateMyHospital,
  getPublicHospital,
  getPublicHospitalDepartments,
  getPublicHospitalDoctors,
  getPublicBookedSlots,
  createPublicAppointment,
  createPublicEnquiry,
  listHospitalEnquiries,
  updateEnquiryStatus,
} from "../controllers/hospitalController";

const router = Router();

// Public facing routes (patient website)
router.get("/public", getPublicHospital);
router.get("/public/departments", getPublicHospitalDepartments);
router.get("/public/doctors", getPublicHospitalDoctors);
router.get("/public/appointments/booked-slots", getPublicBookedSlots);
router.post("/public/appointments", createPublicAppointment);
router.post("/public/enquiries", createPublicEnquiry);

// Hospital Admin Enquiries endpoints
router.get("/enquiries", protect, restrictTo("hospital_admin"), scopeToHospital, listHospitalEnquiries);
router.patch("/enquiries/:id", protect, restrictTo("hospital_admin"), scopeToHospital, updateEnquiryStatus);

router.get("/me", protect, getMyHospital);
router.patch("/me", protect, restrictTo("hospital_admin", "laboratory"), updateMyHospital);

router.use(protect, restrictTo("super_admin"));

router.get("/unassigned-admins", listUnassignedHospitalAdmins);
router.route("/").get(listHospitals).post(createHospital);
router.route("/:id").get(getHospital).patch(updateHospital).delete(deleteHospital);

export default router;
