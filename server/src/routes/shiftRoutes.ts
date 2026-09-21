import { Router } from "express";
import {
  listShifts,
  createShift,
  updateShift,
  deleteShift,
  assignShift,
} from "../controllers/shiftController";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";

const router = Router();

router.use(protect);
router.use(scopeToHospital);

router.get("/", restrictTo("hospital_admin", "super_admin", "accountant", "receptionist"), listShifts);
router.post("/", restrictTo("hospital_admin", "super_admin"), createShift);
router.patch("/:id", restrictTo("hospital_admin", "super_admin"), updateShift);
router.delete("/:id", restrictTo("hospital_admin", "super_admin"), deleteShift);
router.post("/assign", restrictTo("hospital_admin", "super_admin"), assignShift);

export default router;
