import { Router } from "express";
import { login, register, checkPhone, refresh, logout, getMe, changePassword, forgotPassword, resetPassword, updateProfile } from "../controllers/authController";

import { login, register, refresh, logout, getMe, changePassword, updateProfile, forgotPassword, resetPassword } from "../controllers/authController";

import { checkPhone } from "../controllers/authController";

import { protect } from "../middleware/auth";
import { authLimiter, forgotPasswordLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/check-phone", checkPhone);
router.post("/login", authLimiter, login);
router.post("/register", authLimiter, register);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.patch("/change-password", protect, authLimiter, changePassword);
router.patch("/update-profile", protect, updateProfile);

router.patch("/profile", protect, updateProfile);

router.patch("/update-profile", protect, updateProfile);

router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
