import { Router } from "express";
import { protect } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import { getConsultationReports } from "../controllers/laboratoryController";

const router = Router();

router.use(protect, scopeToHospital);
router.get("/:consultationId/reports", getConsultationReports);

export default router;
