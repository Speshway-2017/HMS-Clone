import multer from "multer";
import { AppError } from "../utils/AppError";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf"]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError("Unsupported file type. Upload a PNG, JPEG, WEBP, SVG, or PDF.", 400));
      return;
    }
    cb(null, true);
  },
});
