import { Router } from "express";
import { protect } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import { getReportById, downloadReport, getPatientReports } from "../controllers/laboratoryController";

const router = Router();

router.use(protect, scopeToHospital);

router.get("/", getPatientReports);
router.get("/:reportId", getReportById);
router.get("/:reportId/download", downloadReport);

export default router;
