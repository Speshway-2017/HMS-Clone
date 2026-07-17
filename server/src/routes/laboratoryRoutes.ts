import { Router } from "express";
import multer from "multer";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import { AppError } from "../utils/AppError";
import {
  getRequests,
  acceptRequest,
  rejectRequest,
  startProcessing,
  uploadReport,
  verifyReport,
  publishReport
} from "../controllers/laboratoryController";

const router = Router();

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      cb(new AppError("Unsupported file type. Upload PDF, PNG, JPEG, or JPG.", 400));
      return;
    }
    cb(null, true);
  }
});

router.use(protect, scopeToHospital);

router.get("/requests", restrictTo("laboratory", "hospital_admin"), getRequests);

router.use(restrictTo("laboratory"));

router.post("/:requestId/accept", acceptRequest);
router.post("/:requestId/reject", rejectRequest);
router.post("/:requestId/start-processing", startProcessing);
router.post("/:requestId/upload-report", uploader.any(), uploadReport);
router.post("/:requestId/verify", verifyReport);
router.post("/:requestId/publish", publishReport);

export default router;
