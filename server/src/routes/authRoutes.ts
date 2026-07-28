import { Router } from "express";
import { login, register, refresh, logout, getMe, changePassword, updateProfile, forgotPassword, resetPassword } from "../controllers/authController";
import { protect } from "../middleware/auth";
import { authLimiter, forgotPasswordLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/login", authLimiter, login);
router.post("/register", authLimiter, register);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.patch("/change-password", protect, authLimiter, changePassword);
router.patch("/profile", protect, updateProfile);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
