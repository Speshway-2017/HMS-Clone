import { Request, Response, NextFunction } from "express";
import mongoSanitize from "express-mongo-sanitize";

// Sanitize MongoDB operators ($gt, $ne, $where, etc.)
export const sanitizeNoSql = mongoSanitize({
  replaceWith: "_",
});

// Basic XSS string sanitizer for string inputs
export function sanitizeXss(req: Request, _res: Response, next: NextFunction) {
  const sanitizeValue = (val: any): any => {
    if (typeof val === "string") {
      return val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      Object.keys(val).forEach((key) => {
        val[key] = sanitizeValue(val[key]);
      });
    } else if (Array.isArray(val)) {
      return val.map(sanitizeValue);
    }
    return val;
  };

  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);

  next();
}
