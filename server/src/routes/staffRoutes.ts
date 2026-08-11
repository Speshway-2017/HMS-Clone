import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import { listStaff, getTopStaff, createStaff, getStaffMember, updateStaff, deleteStaff, getStaffProfileMe, getNextEmployeeId } from "../controllers/staffController";

const router = Router();

router.get("/me", protect, restrictTo("nurse"), getStaffProfileMe);

router.use(protect, restrictTo("hospital_admin", "receptionist", "accountant", "pharmacist", "laboratory", "nurse"), scopeToHospital);

router.get("/next-employee-id", getNextEmployeeId);
router.get("/top", getTopStaff);
router.route("/").get(listStaff).post(createStaff);
router.route("/:id").get(getStaffMember).patch(updateStaff).delete(deleteStaff);

export default router;
