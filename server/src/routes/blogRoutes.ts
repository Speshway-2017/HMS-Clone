import { Router } from "express";
import { getBlogs, getBlog, createBlog, updateBlog, deleteBlog } from "../controllers/blogController";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";

const router = Router();

router.get("/", scopeToHospital, getBlogs);
router.get("/:id", getBlog);

router.use(protect);
router.use(scopeToHospital);
router.use(restrictTo("super_admin", "hospital_admin"));

router.post("/", createBlog);
router.patch("/:id", updateBlog);
router.delete("/:id", deleteBlog);

export default router;
