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
router.use(protect, restrictTo("hospital_admin", "receptionist", "nurse", "doctor"), scopeToHospital);

router.route("/")
  .get(listBeds)
  .post(restrictTo("hospital_admin"), createBed);

router.route("/:id")
  .get(getBed)
  .patch(restrictTo("hospital_admin"), updateBed)
  .delete(restrictTo("hospital_admin"), deleteBed);

export default router;
