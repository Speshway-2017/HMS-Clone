import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { listReports, exportReport } from "../controllers/reportController";

const router = Router();

router.use(protect, restrictTo("super_admin"));
router.get("/", listReports);
router.get("/export/:type", exportReport);

export default router;
