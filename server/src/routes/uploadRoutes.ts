import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { uploadFile } from "../controllers/uploadController";

const router = Router();

const handleMulterOptional = (req: any, res: any, next: any) => {
  upload.single("file")(req, res, (err) => {
    if (err && req.headers["content-type"]?.includes("application/json")) {
      return next();
    }
    if (err) return next(err);
    next();
  });
};

router.use(protect, restrictTo("super_admin", "hospital_admin", "doctor", "receptionist", "accountant", "pharmacist", "laboratory", "nurse", "patient"));
router.post("/", handleMulterOptional, uploadFile);
router.use(protect, restrictTo("super_admin", "hospital_admin", "doctor", "receptionist", "accountant", "pharmacist", "laboratory", "nurse", "patient"));
router.post("/", upload.single("file"), uploadFile);

export default router;
