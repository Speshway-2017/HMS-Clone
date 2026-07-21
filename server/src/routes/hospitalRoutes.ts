import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
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
} from "../controllers/hospitalController";

const router = Router();

router.get("/public", getPublicHospital);
router.get("/me", protect, getMyHospital);
router.patch("/me", protect, restrictTo("hospital_admin", "laboratory"), updateMyHospital);

router.use(protect, restrictTo("super_admin"));

router.get("/unassigned-admins", listUnassignedHospitalAdmins);
router.route("/").get(listHospitals).post(createHospital);
router.route("/:id").get(getHospital).patch(updateHospital).delete(deleteHospital);

export default router;
