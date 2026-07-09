import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { listAdmins, getAdmin, createAdmin, updateAdmin, deleteAdmin } from "../controllers/adminController";

const router = Router();

router.use(protect, restrictTo("super_admin"));

router.route("/").get(listAdmins).post(createAdmin);
router.route("/:id").get(getAdmin).patch(updateAdmin).delete(deleteAdmin);

export default router;
