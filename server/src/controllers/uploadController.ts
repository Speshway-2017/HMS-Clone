import { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { emitToHospital, broadcastGlobal } from "../config/socket";

const ALLOWED_FOLDERS = new Set(["hospital-logos", "hospital-licenses", "admin-avatars", "doctor-photos", "staff-photos", "blog-covers", "patient-photos"]);

export const uploadFile = catchAsync(async (req: Request, res: Response) => {
  const folder = typeof req.body.folder === "string" && ALLOWED_FOLDERS.has(req.body.folder) ? req.body.folder : "patient-photos";
  let result: { secure_url: string; public_id: string; resource_type: string };

  const rawFileStr = typeof req.body.file === "string" ? req.body.file : (typeof req.body.image === "string" ? req.body.image : null);

  if (rawFileStr && rawFileStr.startsWith("data:image")) {
    const uploadRes = await cloudinary.uploader.upload(rawFileStr, {
      folder: `hms/${folder}`,
      resource_type: "auto",
    });
    result = {
      secure_url: uploadRes.secure_url,
      public_id: uploadRes.public_id,
      resource_type: uploadRes.resource_type || "image",
    };
  } else if (req.file && req.file.buffer) {
    result = await new Promise<{ secure_url: string; public_id: string; resource_type: string }>((resolve, reject) => {
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
  } else {
    throw new AppError("No file or image data provided.", 400);
  }

  const uploadPayload = {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    folder,
    uploadedBy: req.user?._id || null,
    uploadedAt: new Date().toISOString()
  };

  const hospitalId = (req as any).hospitalFilter?.hospital || req.user?.hospital;
  if (hospitalId) {
    emitToHospital(hospitalId, "file_uploaded", uploadPayload);
  } else {
    broadcastGlobal("file_uploaded", uploadPayload);
  }

  res.status(201).json({
    status: "success",
    data: uploadPayload,
  });
});

