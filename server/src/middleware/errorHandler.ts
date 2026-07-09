import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { AppError } from "../utils/AppError";
import { isProduction } from "../config/env";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ status: "error", message: err.message });
  }

  if (err instanceof MulterError) {
    return res.status(400).json({ status: "error", message: err.message });
  }

  if (err instanceof ZodError) {
    const message = err.issues.map((issue) => issue.message).join(", ");
    return res.status(400).json({ status: "error", message });
  }

  if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
    return res.status(409).json({ status: "error", message: "A record with these details already exists." });
  }

  if (err && typeof err === "object" && (err as { name?: string }).name === "ValidationError") {
    return res.status(400).json({ status: "error", message: (err as Error).message });
  }

  console.error(err);
  return res.status(500).json({
    status: "error",
    message: "Something went wrong.",
    ...(isProduction ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  });
}
