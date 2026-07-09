import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import { listStaff, getTopStaff, createStaff, getStaffMember, updateStaff, deleteStaff } from "../controllers/staffController";

const router = Router();

router.use(protect, restrictTo("hospital_admin"), scopeToHospital);

router.get("/top", getTopStaff);
router.route("/").get(listStaff).post(createStaff);
router.route("/:id").get(getStaffMember).patch(updateStaff).delete(deleteStaff);

export default router;
