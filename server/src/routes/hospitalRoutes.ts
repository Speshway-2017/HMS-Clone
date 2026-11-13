import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listHospitals,
  createHospital,
  getHospitalCode,
  getHospital,
  updateHospital,
  deleteHospital,
  listUnassignedHospitalAdmins,
  getMyHospital,
  updateMyHospital,
  getPublicHospital,
  getPublicHospitalDepartments,
  getPublicHospitalDoctors,
  getPublicHospitalBranches,
  getPublicBookedSlots,
  createPublicAppointment,
  createPublicEnquiry,
  listHospitalEnquiries,
  updateEnquiryStatus,
  getNextHospitalId,
} from "../controllers/hospitalController";

const router = Router();

// Public facing routes (patient website)
router.get("/public", getPublicHospital);
router.get("/public/departments", getPublicHospitalDepartments);
router.get("/public/doctors", getPublicHospitalDoctors);
router.get("/public/branches", getPublicHospitalBranches);
router.get("/public/appointments/booked-slots", getPublicBookedSlots);
router.post("/public/appointments", createPublicAppointment);
router.post("/public/enquiries", createPublicEnquiry);

// Super Admin Website Enquiries endpoints (transferred from hospital_admin)
router.get("/enquiries", protect, restrictTo("super_admin"), listHospitalEnquiries);
router.patch("/enquiries/:id", protect, restrictTo("super_admin"), updateEnquiryStatus);

router.get("/me", protect, getMyHospital);
router.patch("/me", protect, restrictTo("super_admin"), updateMyHospital);

router.use(protect, restrictTo("super_admin"));

router.get("/generate-code", getHospitalCode);
router.get("/next-id", getNextHospitalId);
router.get("/unassigned-admins", listUnassignedHospitalAdmins);
router.route("/").get(listHospitals).post(createHospital);
router.route("/:id").get(getHospital).patch(updateHospital).delete(deleteHospital);

export default router;
