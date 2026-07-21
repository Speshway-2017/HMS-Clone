import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 login/auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many authentication requests from this IP. Please try again after 15 minutes.",
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 file uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Upload rate limit exceeded. Please try again after a few minutes.",
  },
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // Max 300 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many requests. Please slow down.",
  },
});
