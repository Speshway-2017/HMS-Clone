import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "../models/User";
import { Patient } from "../models/Patient";
import { RefreshToken } from "../models/RefreshToken";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { logAudit } from "../utils/auditLogger";

/**
 * Permanently deletes / deactivates the authenticated user's account
 * in compliance with Google Play Store Data Safety & Privacy Policies.
 */
export const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError("Authentication required to delete account.", 401);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  // If patient, deactivate patient record
  const patient = await Patient.findOne({ user: userId });
  if (patient) {
    patient.isActive = false;
    await patient.save();
  }

  // Invalidate all active refresh tokens and sessions
  await RefreshToken.deleteMany({ user: userId });

  // Anonymize credentials to permanently prevent any further authentication
  const anonymizedSuffix = crypto.randomBytes(6).toString("hex");
  user.status = "inactive";
  user.email = `deleted_${userId.toString().slice(-6)}_${anonymizedSuffix}@deleted.local`;
  user.passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  user.avatarUrl = "";
  await user.save();

  // Log compliance audit entry
  try {
    await logAudit({
      req,
      action: "DELETE_ACCOUNT",
      entity: "User",
      entityId: user._id.toString(),
      details: {
        reason: "User self-service account deletion completed in compliance with Google Play & GDPR data safety standards.",
      },
    });
  } catch (_) {
    // Non-blocking audit log
  }

  res.status(200).json({
    status: "success",
    message: "Your account credentials and personal login access have been permanently deleted.",
  });
});
