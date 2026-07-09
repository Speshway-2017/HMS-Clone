import { Router } from "express";
import { login, logout, getMe, changePassword } from "../controllers/authController";
import { protect } from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.patch("/change-password", protect, changePassword);

export default router;
