import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { User, UserDocument } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/token";
import { logAudit } from "../utils/auditLogger";
import { Hospital } from "../models/Hospital";
import { Patient } from "../models/Patient";
import { Staff } from "../models/Staff";
import { sendEmail } from "../services/emailService";

const loginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  // Section 1: Account & Security (Mandatory)
  name: z.string().min(2, "Full Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),

  // Section 2: Demographics & Contact (Mandatory)
  phone: z.string().min(5, "Phone Number is required"),
  age: z.coerce.number({ invalid_type_error: "Age is required" }).min(0, "Age must be valid").max(120, "Age must be valid"),
  gender: z.string().min(1, "Gender is required"),
  bloodGroup: z.string().min(1, "Blood Group is required"),
  address: z.string().min(3, "Residential Address is required"),

  // Section 3: Emergency Contact (Mandatory)
  emergencyContact: z.object({
    name: z.string().min(1, "Emergency Contact Name is required"),
    phone: z.string().min(1, "Emergency Contact Phone is required"),
    relation: z.string().min(1, "Emergency Contact Relationship is required"),
  }),

  // Section 4: Allergies & Insurance Details (Optional)
  allergies: z.string().optional().default(""),
  insuranceProvider: z.string().optional().default(""),
  insurancePolicyNumber: z.string().optional().default(""),
});

function sanitizeUser(user: UserDocument) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    hospital: user.hospital,
    avatarUrl: user.avatarUrl,
    status: user.status,
    lastLogin: user.lastLogin,
  };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const register = catchAsync(async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    phone,
    age,
    gender,
    bloodGroup,
    address,
    allergies,
    insuranceProvider,
    insurancePolicyNumber,
    emergencyContact,
  } = registerSchema.parse(req.body);

  const emailClean = (email || "").trim().toLowerCase();
  const phoneClean = (phone || "").replace(/\D/g, "").slice(-10);

  // Check if a user account already exists by email or phone
  const userConds: any[] = [];
  if (emailClean) userConds.push({ email: { $regex: `^${emailClean.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
  if (phoneClean && phoneClean.length >= 7) userConds.push({ phone: { $regex: `${phoneClean}$` } });

  let user = await User.findOne({ $or: userConds.length > 0 ? userConds : [{ email: emailClean }] });
  const passwordHash = await bcrypt.hash(password, 10);

  if (user) {
    if (user.role !== "patient") {
      throw new AppError("An administrative user account already exists with this email or phone number.", 400);
    }
    // Patient account exists (e.g. created by receptionist or previous draft): update password and profile details
    user.passwordHash = passwordHash;
    if (name) user.name = name;
    if (emailClean) user.email = emailClean;
    if (phone) user.phone = phone;
    await user.save();
  } else {
    // Find the first active/existing hospital in the database
    const hospital = await Hospital.findOne();
    const hospitalId = hospital ? hospital._id : null;

    user = await User.create({
      name,
      email: emailClean,
      passwordHash,
      role: "patient",
      status: "active",
      phone,
      hospital: hospitalId,
    });
  }

  // Find hospital ID if user has no assigned hospital
  const hospital = await Hospital.findOne();
  const hospitalId = user.hospital || (hospital ? hospital._id : null);

  let createdPatient = null;
  if (hospitalId) {
    const existingPatientConds: any[] = [];
    if (emailClean) existingPatientConds.push({ email: { $regex: `^${emailClean.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
    if (phoneClean && phoneClean.length >= 7) existingPatientConds.push({ phone: { $regex: `${phoneClean}$` } });
    if (name) existingPatientConds.push({ name: { $regex: `^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
    if (user._id) existingPatientConds.push({ user: user._id });

    let existingPatientDoc = await Patient.findOne({ $or: existingPatientConds });

    if (existingPatientDoc) {
      // Reuse existing patient record registered by receptionist — DO NOT create a duplicate Patient document!
      existingPatientDoc.user = user._id;
      if (name) existingPatientDoc.name = name;
      if (emailClean) existingPatientDoc.email = emailClean;
      if (phone) existingPatientDoc.phone = phone;
      if (age) existingPatientDoc.age = age;
      if (gender) existingPatientDoc.gender = gender;
      if (bloodGroup) existingPatientDoc.bloodGroup = bloodGroup;
      if (address) existingPatientDoc.address = address;
      if (allergies) existingPatientDoc.allergies = allergies;
      if (insuranceProvider) existingPatientDoc.insuranceProvider = insuranceProvider;
      if (insurancePolicyNumber) existingPatientDoc.insurancePolicyNumber = insurancePolicyNumber;
      if (emergencyContact) existingPatientDoc.emergencyContact = emergencyContact;
      await existingPatientDoc.save();
      createdPatient = existingPatientDoc;
    } else {
      // Create new Patient record only if no existing record was found in MongoDB
      const generateDigits = (length: number): string => {
        let result = "";
        const characters = "0123456789";
        for (let i = 0; i < length; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      };
      const uhid = `UHID-${generateDigits(10)}`;
      const patientCode = `PAT-${generateDigits(6)}`;
      const qrCode = `HMS|${uhid}|${name}|${phone}`;

      createdPatient = await Patient.create({
        user: user._id,
        hospital: hospitalId,
        uhid,
        patientCode,
        qrCode,
        name,
        email: emailClean,
        phone,
        age: age || undefined,
        gender: gender || "",
        bloodGroup: bloodGroup || "",
        address: address || "",
        allergies: allergies || "",
        insuranceProvider: insuranceProvider || "",
        insurancePolicyNumber: insurancePolicyNumber || "",
        emergencyContact: emergencyContact || { name: "", phone: "", relation: "" },
        status: "opd",
        isActive: true,
      });
    }
  }

  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ id: user._id.toString(), role: user.role });

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });

  await logAudit({
    req,
    userId: user._id.toString(),
    userEmail: user.email,
    userRole: user.role,
    action: "USER_REGISTERED",
    entity: "User",
    entityId: user._id.toString(),
  });

  res.status(201).json({
    status: "success",
    data: {
      user: sanitizeUser(user),
      patient: createdPatient,
      token: accessToken,
      refreshToken: refreshToken,
    },
  });
});

export const checkPhone = catchAsync(async (req: Request, res: Response) => {
  const phone = req.query.phone;
  if (!phone || typeof phone !== "string") {
    throw new AppError("Phone number is required.", 400);
  }

  const phoneClean = phone.replace(/\D/g, "").slice(-10);
  if (phoneClean.length < 7) {
    return res.json({
      status: "success",
      exists: false,
    });
  }

  // Find a patient with this phone number
  const patient = await Patient.findOne({
    phone: { $regex: `${phoneClean}$` }
  });

  if (!patient) {
    return res.json({
      status: "success",
      exists: false,
    });
  }

  // Check if they already have a user account
  let hasPassword = false;
  if (patient.user) {
    const user = await User.findById(patient.user);
    if (user && user.passwordHash) {
      hasPassword = true;
    }
  }

  res.json({
    status: "success",
    exists: true,
    hasPassword,
    patient: {
      name: patient.name,
      email: patient.email,
      age: patient.age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      address: patient.address,
      allergies: patient.allergies,
      insuranceProvider: patient.insuranceProvider,
      insurancePolicyNumber: patient.insurancePolicyNumber,
      emergencyName: patient.emergencyContact?.name || "",
      emergencyPhone: patient.emergencyContact?.phone || "",
      emergencyRelation: patient.emergencyContact?.relation || "",
    }
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const input = (body.identifier || body.email || "").trim();
  const password = body.password;

  if (!input) {
    throw new AppError("Please enter your email address or phone number.", 400);
  }

  const cleanPhone = input.replace(/\D/g, "").slice(-10);
  const isEmail = input.includes("@");

  let query: any = {};
  if (isEmail) {
    query = { email: { $regex: `^${input.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } };
  } else if (cleanPhone && cleanPhone.length >= 7) {
    query = {
      $or: [
        { phone: { $regex: `${cleanPhone}$` } },
        { email: input.toLowerCase() }
      ]
    };
  } else {
    query = {
      $or: [
        { email: { $regex: `^${input.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } },
        { phone: input }
      ]
    };
  }

  const user = await User.findOne(query).select("+passwordHash");
  if (!user || !(await user.comparePassword(password))) {
    await logAudit({
      req,
      userEmail: input,
      action: "LOGIN_FAILED",
      entity: "User",
      details: { reason: "Invalid credentials" },
    });
    throw new AppError("Incorrect email/phone number or password.", 401);
  }
  if (user.status !== "active") {
    await logAudit({
      req,
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: "LOGIN_BLOCKED",
      entity: "User",
      details: { reason: "User account inactive" },
    });
    throw new AppError("This account has been deactivated.", 403);
  }

  user.lastLogin = new Date();
  await user.save();

  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ id: user._id.toString(), role: user.role });

  // Store refresh token in DB
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });

  await logAudit({
    req,
    userId: user._id.toString(),
    userEmail: user.email,
    userRole: user.role,
    action: "LOGIN_SUCCESS",
    entity: "User",
    entityId: user._id.toString(),
  });

  res.status(200).json({
    status: "success",
    data: {
      user: sanitizeUser(user),
      token: accessToken,
      refreshToken: refreshToken,
    },
  });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const incomingToken = req.body.refreshToken || req.headers["x-refresh-token"];
  if (!incomingToken || typeof incomingToken !== "string") {
    throw new AppError("Refresh token is required.", 401);
  }

  let payload;
  try {
    payload = verifyRefreshToken(incomingToken);
  } catch {
    throw new AppError("Invalid or expired refresh token. Please log in again.", 401);
  }

  const tokenHash = hashToken(incomingToken);
  const storedToken = await RefreshToken.findOne({
    user: payload.id,
    tokenHash,
    isRevoked: false,
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new AppError("Session expired or revoked. Please log in again.", 401);
  }

  // Revoke old refresh token (rotation)
  storedToken.isRevoked = true;
  await storedToken.save();

  const user = await User.findById(payload.id);
  if (!user || user.status !== "active") {
    throw new AppError("Account no longer exists or is inactive.", 401);
  }

  // Issue new access token + new refresh token
  const newAccessToken = signAccessToken({ id: user._id.toString(), role: user.role });
  const newRefreshToken = signRefreshToken({ id: user._id.toString(), role: user.role });
  const newHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash: newHash,
    expiresAt,
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });

  res.status(200).json({
    status: "success",
    data: {
      token: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const incomingToken = req.body?.refreshToken || req.headers["x-refresh-token"];
  if (incomingToken && typeof incomingToken === "string") {
    const tokenHash = hashToken(incomingToken);
    await RefreshToken.updateMany({ tokenHash }, { isRevoked: true });
  }

  if (req.user) {
    await RefreshToken.updateMany({ user: req.user._id }, { isRevoked: true });
    await logAudit({
      req,
      action: "LOGOUT",
      entity: "User",
      entityId: req.user._id.toString(),
    });
  }

  res.status(200).json({ status: "success", data: null });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  res.status(200).json({ status: "success", data: { user: sanitizeUser(req.user!) } });
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(1, "New password is required."),
  confirmPassword: z.string().min(1, "Please confirm your new password."),
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { newPassword, confirmPassword } = changePasswordSchema.parse(req.body);

  if (newPassword !== confirmPassword) {
    throw new AppError("New password and confirmation do not match.", 400);
  }

  const user = await User.findById(req.user!._id).select("+passwordHash");
  if (!user) throw new AppError("User not found.", 404);

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  // Invalidate previous refresh tokens on password change
  await RefreshToken.updateMany({ user: user._id }, { isRevoked: true });

  await logAudit({
    req,
    action: "CHANGE_PASSWORD",
    entity: "User",
    entityId: user._id.toString(),
  });

  res.status(200).json({ status: "success", data: { message: "Password changed successfully." } });
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const genericMessage = "If an account exists, a password reset link has been sent.";

  // Log request attempt
  await logAudit({
    req,
    userEmail: email,
    action: "FORGOT_PASSWORD_REQUESTED",
    entity: "User",
    details: { email },
  });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.status !== "active") {
    // Return success to prevent email enumeration attacks
    return res.status(200).json({ status: "success", message: genericMessage });
  }

  // Generate secure token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(resetToken);

  // Set token and expiration (15 minutes)
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  // Retrieve active hospital logo/branding from DB for the email template
  const hospital = await Hospital.findOne();
  const hospitalName = hospital?.name || "HMS Enterprise";
  const logoUrl = hospital?.logoUrl || "";

  // Build reset link (pointing to frontend page)
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

  // Build HTML Email
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset Request</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background-color: #0f172a; padding: 30px; text-align: center; color: #ffffff; }
        .header img { height: 48px; margin-bottom: 12px; border-radius: 8px; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 40px 30px; line-height: 1.6; }
        .content h2 { margin-top: 0; font-size: 18px; color: #0f172a; font-weight: 700; }
        .btn { display: inline-block; background-color: #1e3a8a; color: #ffffff !important; font-weight: 700; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-size: 14px; text-align: center; }
        .backup-link { word-break: break-all; font-family: monospace; font-size: 12px; background-color: #f1f5f9; padding: 10px; border-radius: 6px; border: 1px dashed #cbd5e1; }
        .footer { background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="${hospitalName}">` : ""}
          <h1>${hospitalName}</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password for your ${hospitalName} administrator/staff account.</p>
          <p>Click the button below to reset your security credentials. This link is valid for <strong>15 minutes</strong> and can only be used once:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste the following backup URL into your browser:</p>
          <p class="backup-link">${resetUrl}</p>
          <p style="margin-top: 30px; font-size: 11px; color: #94a3b8;">
            <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email or contact your Hospital System Administrator immediately.
          </p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} ${hospitalName}. Managed Clinical Network.
        </div>
      </div>
    </body>
    </html>
  `;

  // Send the email (handles developer simulated fallback mode natively)
  await sendEmail({
    to: user.email,
    subject: `Password Reset Request - ${hospitalName}`,
    body: `Hello ${user.name},\n\nYou requested to reset your password for ${hospitalName}. Please use this link to reset it:\n${resetUrl}\n\nThis link is valid for 15 minutes.\nIf you did not request this, please ignore this email.\n\nBest regards,\n${hospitalName} System`,
    html: emailHtml,
  });

  res.status(200).json({ status: "success", message: genericMessage });
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { token, password } = resetPasswordSchema.parse(req.body);

  const hashedToken = hashToken(token);

  // Search user with valid token and not expired
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    // Identify if the token is expired vs completely invalid
    const expiredUser = await User.findOne({ resetPasswordToken: hashedToken });
    if (expiredUser) {
      await logAudit({
        req,
        userId: expiredUser._id.toString(),
        userEmail: expiredUser.email,
        action: "EXPIRED_RESET_TOKEN_ATTEMPT",
        entity: "User",
        details: { tokenHash: hashedToken }
      });
      throw new AppError("The password reset token has expired. Please request a new one.", 400);
    }

    await logAudit({
      req,
      action: "INVALID_RESET_TOKEN_ATTEMPT",
      entity: "User",
      details: { tokenHash: hashedToken }
    });
    throw new AppError("Invalid password reset token.", 400);
  }

  // Password Strength Check: Must contain at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    throw new AppError("Password must contain at least one letter and one number.", 400);
  }

  // Hash new password using bcrypt
  const salt = await bcrypt.genSalt(12);
  user.passwordHash = await bcrypt.hash(password, salt);

  // Clear reset tokens
  user.resetPasswordToken = null;
  user.resetPasswordExpiresAt = null;
  await user.save();

  // Invalidate all active sessions (delete all refresh tokens)
  await RefreshToken.deleteMany({ user: user._id });

  // Log successful password reset
  await logAudit({
    req,
    userId: user._id.toString(),
    userEmail: user.email,
    userRole: user.role,
    action: "PASSWORD_RESET_SUCCESS",
    entity: "User",
    entityId: user._id.toString()
  });

  res.status(200).json({
    status: "success",
    message: "Your password has been successfully reset. You can now log in with your new credentials."
  });
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const { name, avatarUrl } = req.body;
  const user = await User.findById(req.user!._id);
  if (!user) throw new AppError("User not found.", 404);

  if (name) user.name = name;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  await user.save();

  // If this user is staff, sync the avatar to their staff photoUrl / name
  const staff = await Staff.findOne({ email: user.email });
  if (staff) {
    if (name) staff.name = name;
    if (avatarUrl !== undefined) staff.photoUrl = avatarUrl;
    await staff.save();
  }

  res.status(200).json({
    status: "success",
    data: { user: sanitizeUser(user) }
  });
});
