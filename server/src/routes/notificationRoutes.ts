import { Router } from "express";
import { protect } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import { getNotifications, deleteNotification } from "../controllers/notificationController";

const router = Router();

router.get("/", protect, scopeToHospital, getNotifications);
router.delete("/:id", protect, scopeToHospital, deleteNotification);

export default router;
