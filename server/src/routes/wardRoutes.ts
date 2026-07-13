import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listWards,
  createWard,
  updateWard,
  deleteWard
} from "../controllers/wardController";

const router = Router();

// Secure all routes
router.use(protect, restrictTo("hospital_admin", "receptionist"), scopeToHospital);

router.route("/")
  .get(listWards)
  .post(restrictTo("hospital_admin"), createWard);

router.route("/:id")
  .patch(restrictTo("hospital_admin"), updateWard)
  .delete(restrictTo("hospital_admin"), deleteWard);

export default router;
