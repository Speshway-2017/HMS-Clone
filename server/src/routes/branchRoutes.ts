import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { listBranches, createBranch, getBranch, updateBranch, deleteBranch } from "../controllers/branchController";

const router = Router();

router.use(protect);

router.route("/")
  .get(restrictTo("super_admin", "hospital_admin"), listBranches)
  .post(restrictTo("super_admin", "hospital_admin"), createBranch);

router.route("/:id")
  .get(restrictTo("super_admin", "hospital_admin"), getBranch)
  .patch(restrictTo("super_admin", "hospital_admin"), updateBranch)
  .delete(restrictTo("super_admin"), deleteBranch);

export default router;
