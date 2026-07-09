import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { listBranches, createBranch, getBranch, updateBranch, deleteBranch } from "../controllers/branchController";

const router = Router();

router.use(protect, restrictTo("super_admin"));

router.route("/").get(listBranches).post(createBranch);
router.route("/:id").get(getBranch).patch(updateBranch).delete(deleteBranch);

export default router;
