import { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

const ALLOWED_FOLDERS = new Set(["hospital-logos", "hospital-licenses", "admin-avatars"]);

export const uploadFile = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("No file provided.", 400);
  }

  const folder = typeof req.body.folder === "string" && ALLOWED_FOLDERS.has(req.body.folder) ? req.body.folder : "misc";

  const result = await new Promise<{ secure_url: string; public_id: string; resource_type: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `hms/${folder}`, resource_type: "auto" },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }
        resolve(uploadResult);
      },
    );
    stream.end(req.file!.buffer);
  });

  res.status(201).json({
    status: "success",
    data: { url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type },
  });
});
