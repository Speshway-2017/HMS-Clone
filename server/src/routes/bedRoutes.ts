import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listBeds,
  getBed,
  createBed,
  updateBed,
  deleteBed
} from "../controllers/bedController";

const router = Router();

// Secure all routes
router.use(protect, restrictTo("super_admin", "hospital_admin", "receptionist", "nurse", "doctor"), scopeToHospital);

router.route("/")
  .get(listBeds)
  .post(restrictTo("super_admin", "hospital_admin"), createBed);

router.route("/:id")
  .get(getBed)
  .patch(restrictTo("super_admin", "hospital_admin", "receptionist", "nurse"), updateBed)
  .put(restrictTo("super_admin", "hospital_admin", "receptionist", "nurse"), updateBed)
  .delete(restrictTo("super_admin", "hospital_admin"), deleteBed);

export default router;
