import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { uploadFile } from "../controllers/uploadController";

const router = Router();

router.use(protect, restrictTo("super_admin", "hospital_admin", "doctor", "receptionist", "accountant", "pharmacist", "laboratory"));
router.post("/", upload.single("file"), uploadFile);

export default router;
