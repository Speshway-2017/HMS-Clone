import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { listBranches, createBranch, getBranch, updateBranch, deleteBranch } from "../controllers/branchController";

const router = Router();

router.use(protect);

router.route("/")
  .get(listBranches)
  .post(restrictTo("super_admin", "hospital_admin"), createBranch);

router.route("/:id")
  .get(getBranch)
  .patch(restrictTo("super_admin", "hospital_admin"), updateBranch)
  .delete(restrictTo("super_admin"), deleteBranch);

export default router;
