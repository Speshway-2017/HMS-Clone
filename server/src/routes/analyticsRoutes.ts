import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { getGlobalAnalytics } from "../controllers/analyticsController";

const router = Router();

router.use(protect, restrictTo("super_admin"));
router.get("/global", getGlobalAnalytics);

export default router;
