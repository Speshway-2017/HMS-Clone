import { Router } from "express";
import { login, refresh, logout, getMe, changePassword } from "../controllers/authController";
import { protect } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.patch("/change-password", protect, authLimiter, changePassword);

export default router;
