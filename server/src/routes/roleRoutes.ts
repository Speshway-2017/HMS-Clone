import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { listRoles } from "../controllers/roleController";

const router = Router();

router.use(protect, restrictTo("super_admin"));
router.get("/", listRoles);

export default router;
