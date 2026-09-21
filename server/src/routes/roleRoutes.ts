import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { listRoles, createRole, updateRole, deleteRole } from "../controllers/roleController";

const router = Router();

router.use(protect, restrictTo("super_admin", "hospital_admin"));
router.get("/", listRoles);
router.post("/", createRole);
router.patch("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
