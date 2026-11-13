import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import { getGlobalAnalytics, getHospitalAnalytics } from "../controllers/analyticsController";

const router = Router();

router.get("/global", protect, restrictTo("super_admin"), getGlobalAnalytics);
router.get("/hospital", protect, restrictTo("hospital_admin", "admin", "super_admin"), scopeToHospital, getHospitalAnalytics);

export default router;
