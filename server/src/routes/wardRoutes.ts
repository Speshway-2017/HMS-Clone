import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listWards,
  getWard,
  createWard,
  updateWard,
  deleteWard,
  getWardTypes
} from "../controllers/wardController";

const router = Router();

// Secure all routes
router.use(protect, restrictTo("hospital_admin", "receptionist", "nurse", "doctor"), scopeToHospital);

router.get("/types", getWardTypes);

router.route("/")
  .get(listWards)
  .post(restrictTo("hospital_admin"), createWard);

router.route("/:id")
  .get(getWard)
  .patch(restrictTo("hospital_admin"), updateWard)
  .delete(restrictTo("hospital_admin"), deleteWard);

export default router;
