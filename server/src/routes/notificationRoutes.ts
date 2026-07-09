import { Router } from "express";
import { protect } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import { getNotifications } from "../controllers/notificationController";

const router = Router();

router.get("/", protect, scopeToHospital, getNotifications);

export default router;
