import { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  Lock,
  KeyRound,
  Building,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  Clock,
  Stethoscope,
  CalendarCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useChangePassword, useUpdateProfile } from "../../features/auth";
import { useAuth } from "../../context/AuthContext";
import { useMyHospital, useUpdateMyHospital } from "../../features/hospitals";
import { FileUpload } from "../../components/ui/FileUpload";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { InputField } from "../../components/ui/Field";
import toast from "react-hot-toast";

// ─── Sub-components ───────────────────────────────────────────────────────────

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  required,
  maxLength = 64,
  showCharCount = true,
  onKeyDown,
  onPaste,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
  required?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}) {
  const [show, setShow] = useState(false);
  const cleanLabel = (label || "").replace(/[\s\*\^]+$/, "").trim();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold uppercase text-slate-600">
          {cleanLabel}
          {required && <span className="text-rose-500"> *</span>}
        </label>
        {showCharCount && maxLength !== undefined && (
          <span className="text-[11px] font-mono text-slate-400">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          maxLength={maxLength}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-lg border px-4 py-2.5 pr-11 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs outline-none transition focus:ring-2 ${error
              ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100"
              : "border-slate-200 bg-white hover:border-slate-300 focus:border-emerald-600 focus:ring-emerald-100"
            }`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs font-medium text-rose-600 flex items-center gap-1.5" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs transition-all">
      <div className="mb-6 flex items-start gap-4 pb-4 border-b border-slate-100">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/80 shadow-2xs">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

// ─── Main Restyled Settings Page ─────────────────────────────────────────

const NAME_REGEX = /^[a-zA-Z\s.,'-]+$/;

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { data: hospital } = useMyHospital({
    enabled: user?.role === "hospital_admin" || user?.role === "admin" || user?.role === "super_admin",
  });
  const { mutate: changePassword, isPending: isChangingPassword } = useChangePassword();
  const updateProfileMutation = useUpdateProfile();

  // Profile form state
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [profileFormError, setProfileFormError] = useState<string | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string | undefined>>({});
  const [passwordFormError, setPasswordFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.name || "");
      setEmail(user.email || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  const validateName = (val: string): string | undefined => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      return "Full Display Name is required. Please fill out this field.";
    }
    if (val.length > 100) {
      return "Full Display Name cannot exceed 100 characters.";
    }
    if (
      trimmed.length < 2 ||
      !/[a-zA-Z]/.test(trimmed) ||
      !NAME_REGEX.test(trimmed) ||
      /<script|javascript:|<[^>]*>/i.test(trimmed)
    ) {
      return "Full Display Name contains invalid characters. Please enter a valid name.";
    }
    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentLen: number,
    limit: number,
    label: string,
    setErrorFn?: (msg: string | undefined) => void
  ) => {
    const allowedNavKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (allowedNavKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = `${label} cannot exceed ${limit} characters.`;
      if (setErrorFn) setErrorFn(msg);
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handlePasteGuard = (
    e: React.ClipboardEvent<HTMLInputElement>,
    currentLen: number,
    limit: number,
    label: string,
    setErrorFn?: (msg: string | undefined) => void
  ) => {
    const pasted = e.clipboardData.getData("text") || "";
    const input = e.currentTarget;
    const selectionLen = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    const projectedLen = currentLen - selectionLen + pasted.length;

    if (projectedLen > limit) {
      e.preventDefault();
      const allowedLen = Math.max(0, limit - (currentLen - selectionLen));
      const truncatedPaste = pasted.slice(0, allowedLen);
      document.execCommand("insertText", false, truncatedPaste);
      const msg = `${label} cannot exceed ${limit} characters.`;
      if (setErrorFn) setErrorFn(msg);
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const passwordsMatch = newPassword !== "" && newPassword === confirmPassword;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFormError(null);
    const err = validateName(fullName);
    if (err) {
      setNameError(err);
      setProfileFormError(err);
      toast.error(err, { id: "profile-name-error" });
      return;
    }
    updateProfileMutation.mutate(
      { name: fullName.trim(), avatarUrl: avatarUrl },
      {
        onSuccess: () => {
          refreshUser();
          toast.success("Profile details updated successfully!");
          setProfileFormError(null);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || "Failed to update profile.";
          setProfileFormError(msg);
          toast.error(msg);
        },
      }
    );
  };

  const handleAvatarChange = async (url: string) => {
    setAvatarUrl(url);
    setAvatarError(null);
    updateProfileMutation.mutate(
      { avatarUrl: url },
      {
        onSuccess: () => {
          refreshUser();
          if (url) {
            toast.success("Profile photo updated successfully!");
          } else {
            toast.success("Profile photo removed successfully!");
          }
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || "Failed to save profile photo.";
          setAvatarError(msg);
          toast.error(msg);
        },
      }
    );
  };

  const validatePassword = (field: "newPassword" | "confirmPassword", val: string): string | undefined => {
    const trimmed = (val || "").trim();
    if (field === "newPassword") {
      if (!trimmed) {
        return "New Password is required. Please fill out this field.";
      }
      if (val.length > 64) {
        return "New Password cannot exceed 64 characters.";
      }
      if (trimmed.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*])/.test(trimmed)) {
        return "Password must be at least 8 characters with letters and numbers/symbols.";
      }
      return undefined;
    }

    if (field === "confirmPassword") {
      if (!trimmed) {
        return "Confirm New Password is required. Please fill out this field.";
      }
      if (val.length > 64) {
        return "Confirm New Password cannot exceed 64 characters.";
      }
      if (newPassword && val !== newPassword) {
        return "Passwords do not match.";
      }
      return undefined;
    }
    return undefined;
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFormError(null);

    const newPassErr = validatePassword("newPassword", newPassword);
    const confirmPassErr = validatePassword("confirmPassword", confirmPassword);

    const errs = {
      newPassword: newPassErr,
      confirmPassword: confirmPassErr,
    };
    setPasswordErrors(errs);

    const firstErr = Object.values(errs).find(Boolean);
    if (firstErr) {
      setPasswordFormError(firstErr);
      toast.error(firstErr);
      return;
    }

    changePassword(
      { newPassword, confirmPassword },
      {
        onSuccess: () => {
          toast.success("Password changed successfully!");
          setNewPassword("");
          setConfirmPassword("");
          setPasswordErrors({});
          setPasswordFormError(null);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || "Failed to change password.";
          setPasswordFormError(msg);
          toast.error(msg);
        },
      }
    );
  };

  const isSuperAdmin = user?.role === "super_admin";
  const isHospitalAdmin = user?.role === "hospital_admin" || user?.role === "admin" || isSuperAdmin;

  return (
    <div className="space-y-6 w-full pb-16 font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal profile, security credentials, and hospital facility configurations.
          </p>
        </div>
        <div>
          <Badge tone="success">
            {user?.role ? user.role.replace("_", " ").toUpperCase() + " CONSOLE" : "HOSPITAL ADMIN CONSOLE"}
          </Badge>
        </div>
      </div>

      {/* ── Profile Summary Header Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-1">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <div className="relative group shrink-0">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-emerald-600/20 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => handleAvatarChange("")}
                  className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                  title="Remove Profile Photo"
                  aria-label="Remove profile photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white font-bold text-2xl shadow-sm ring-2 ring-emerald-600/20 shrink-0">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{user?.name ?? "User"}</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Account
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 capitalize">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  Role: {user?.role?.replace("_", " ") ?? "Hospital Admin"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 border border-sky-200">
                  <KeyRound className="h-3.5 w-3.5 text-sky-600" />
                  Admin ID: <span className="font-mono font-bold text-sky-900">{user?.employeeId || "ADM-001"}</span>
                </span>
                {hospital?.name && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                    <Building className="h-3.5 w-3.5 text-emerald-700" />
                    {hospital.name} {hospital.code ? `(${hospital.code})` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 self-start sm:self-auto">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100/70 text-emerald-800">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Encrypted Enterprise Portal</p>
              <p className="text-[11px] text-slate-500">HIPAA & AES-256 compliant audit security</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1: Personal Information (Admin Display Name & Avatar Editable; Email & ID Read-Only) ── */}
      <Section
        title="Personal Information"
        subtitle="Your basic personal profile details and account avatar (Email and Unique ID are system locked)."
        icon={<User className="h-5 w-5" />}
      >
        <form onSubmit={handleSaveProfile} noValidate className="space-y-5">
          {(profileFormError || nameError || avatarError) && (
            <div
              role="alert"
              className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-semibold flex flex-col gap-1.5"
            >
              {nameError && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{nameError}</span>
                </div>
              )}
              {avatarError && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{avatarError}</span>
                </div>
              )}
              {!nameError && !avatarError && profileFormError && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{profileFormError}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InputField
              label="Full Display Name *"
              name="name"
              id="fullDisplayName"
              required
              maxLength={100}
              showCharCount
              value={fullName}
              error={nameError}
              onChange={(e) => {
                const val = e.target.value;
                setFullName(val);
                const err = validateName(val);
                setNameError(err);
                if (err) setProfileFormError(err);
                else if (profileFormError === nameError) setProfileFormError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, fullName.length, 100, "Full Display Name", setNameError)}
              onPaste={(e) => handlePasteGuard(e, fullName.length, 100, "Full Display Name", setNameError)}
              onBlur={() => {
                const err = validateName(fullName);
                setNameError(err);
                if (err) {
                  setProfileFormError(err);
                  toast.error(err, { id: "profile-name-error" });
                }
              }}
              placeholder="e.g. Admin-HYD"
            />

            <div>
              <InputField
                label="Email Address (ReadOnly)"
                type="email"
                disabled
                value={email}
                readOnly
                className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
              />
              <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Tied to authorized account authentication
              </p>
            </div>

            <div>
              <InputField
                label="Admin Unique ID (ReadOnly)"
                disabled
                readOnly
                value={user?.employeeId || "ADM-001"}
                className="bg-slate-50 text-slate-700 font-mono font-medium cursor-not-allowed border-slate-200"
              />
              <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Valid for direct sign-in authentication
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <FileUpload
              label="Upload Profile Avatar"
              folder="staff-photos"
              value={avatarUrl}
              onChange={handleAvatarChange}
              hint="PNG, JPG or WEBP (Max 2MB)"
              maxSizeMB={2}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              error={avatarError}
              onError={(err) => {
                setAvatarError(err || null);
                if (err) setProfileFormError(err);
              }}
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {updateProfileMutation.isPending ? "Saving..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Section 2: Security & Password ── */}
      <Section
        title="Security & Password"
        subtitle="Ensure your account is protected with a strong, secure password."
        icon={<KeyRound className="h-5 w-5" />}
      >
        <form onSubmit={handleChangePassword} className="space-y-5" noValidate>
          {passwordFormError && (
            <div
              role="alert"
              className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-semibold flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{passwordFormError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <PasswordInput
              id="newPassword"
              label="New Password *"
              required
              value={newPassword}
              maxLength={64}
              showCharCount
              error={passwordErrors.newPassword}
              onChange={(val) => {
                setNewPassword(val);
                const err = validatePassword("newPassword", val);
                setPasswordErrors((prev) => ({ ...prev, newPassword: err }));
                if (err) setPasswordFormError(err);
                else if (passwordFormError === passwordErrors.newPassword) setPasswordFormError(null);
              }}
              onKeyDown={(e) =>
                handleKeyGuard(e, newPassword.length, 64, "New Password", (err) =>
                  setPasswordErrors((p) => ({ ...p, newPassword: err || undefined }))
                )
              }
              onPaste={(e) =>
                handlePasteGuard(e, newPassword.length, 64, "New Password", (err) =>
                  setPasswordErrors((p) => ({ ...p, newPassword: err || undefined }))
                )
              }
              placeholder="Enter your new strong password"
              autoComplete="new-password"
            />

            <div>
              <PasswordInput
                id="confirmPassword"
                label="Confirm New Password *"
                required
                value={confirmPassword}
                maxLength={64}
                showCharCount
                error={passwordErrors.confirmPassword}
                onChange={(val) => {
                  setConfirmPassword(val);
                  const err = validatePassword("confirmPassword", val);
                  setPasswordErrors((prev) => ({ ...prev, confirmPassword: err }));
                  if (err) setPasswordFormError(err);
                  else if (passwordFormError === passwordErrors.confirmPassword) setPasswordFormError(null);
                }}
                onKeyDown={(e) =>
                  handleKeyGuard(e, confirmPassword.length, 64, "Confirm New Password", (err) =>
                    setPasswordErrors((p) => ({ ...p, confirmPassword: err || undefined }))
                  )
                }
                onPaste={(e) =>
                  handlePasteGuard(e, confirmPassword.length, 64, "Confirm New Password", (err) =>
                    setPasswordErrors((p) => ({ ...p, confirmPassword: err || undefined }))
                  )
                }
                placeholder="Re-enter your new password"
                autoComplete="new-password"
              />
              {confirmPassword && (
                <p
                  className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${passwordsMatch ? "text-emerald-600" : "text-rose-500"
                    }`}
                >
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5" /> Passwords do not match
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Lock className="h-3.5 w-3.5 text-slate-400" /> Must be at least 8 characters with letters and
              numbers/symbols. Encrypted end-to-end with bcrypt.
            </p>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer self-end sm:self-auto"
            >
              <ShieldCheck className="h-4 w-4" />
              {isChangingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Section 3: OP Consultation Expiry Limit (Revisit Validity) ── */}
      {isHospitalAdmin && <OpConsultationExpiryCard />}

      {/* ── Section 4: Hospital Facility & Organization Profile (Super Admin Only) ── */}
      {isSuperAdmin && <HospitalSettingsCard />}
    </div>
  );
}

// ─── Dedicated Component: OP Consultation Expiry Limit ────────────────────────

function OpConsultationExpiryCard() {
  const { data: hospital, isLoading } = useMyHospital();
  const updateMutation = useUpdateMyHospital();

  const [opExpiryLimit, setOpExpiryLimit] = useState<number | string>(10);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hospital?.opExpiryLimit !== undefined) {
      setOpExpiryLimit(hospital.opExpiryLimit);
    }
  }, [hospital]);

  const handleSaveOpLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const num = Number(opExpiryLimit);
    if (isNaN(num) || num < 1 || num > 180) {
      const msg = "OP Consultation Expiry Limit must be between 1 and 180 days.";
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        opExpiryLimit: num,
      });
      toast.success(`OP Consultation Expiry Limit updated to ${num} days!`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update OP consultation expiry limit.";
      setError(msg);
      toast.error(msg);
    }
  };

  const presetDays = [7, 10, 14, 21, 30];

  return (
    <Section
      title="OP Consultation Expiry Limit (Revisit Validity)"
      subtitle="Configure how many days an outpatient consultation slip remains active for free follow-ups and doctor revisits."
      icon={<Clock className="h-5 w-5" />}
    >
      <form onSubmit={handleSaveOpLimit} className="space-y-5" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-semibold flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Informative Guidance Banner */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <Stethoscope className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 leading-relaxed">
            <p className="font-bold mb-0.5">How OP Consultation Expiry Works:</p>
            <p className="text-emerald-800">
              When a patient registers for an OPD consultation, their visit record remains active for this duration. If the
              patient returns for a follow-up or test-review with the doctor within this time window, receptionists and
              nurses will see the active visit and free revisit eligibility without billing a duplicate consultation charge.
            </p>
          </div>
        </div>

        {/* Quick Presets Selection */}
        <div>
          <label className="text-xs font-semibold uppercase text-slate-600 block mb-2">
            Quick Select Common Presets:
          </label>
          <div className="flex flex-wrap gap-2">
            {presetDays.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setOpExpiryLimit(d);
                  setError(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition border ${Number(opExpiryLimit) === d
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
              >
                {d} Days {d === 10 ? "(Standard Default)" : d === 7 ? "(1 Week)" : d === 14 ? "(2 Weeks)" : d === 30 ? "(1 Month)" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Days Input */}
        <div className="max-w-xs">
          <InputField
            label="OP Consultation Expiry Limit (In Days) *"
            type="number"
            min={1}
            max={180}
            required
            value={opExpiryLimit}
            error={error || undefined}
            onChange={(e) => {
              setOpExpiryLimit(e.target.value);
              setError(null);
            }}
            hint="Allowed range: 1 to 180 days."
            placeholder="e.g. 10"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Currently Configured: <strong className="text-slate-800 font-mono">{opExpiryLimit || 10} Days</strong>
          </span>
          <button
            type="submit"
            disabled={updateMutation.isPending || isLoading}
            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving Limit..." : "Save OP Expiry Limit"}
          </button>
        </div>
      </form>
    </Section>
  );
}

// ─── Dedicated Component: Hospital Facility & Profile ────────────────────────

function HospitalSettingsCard() {
  const { data: hospital, isLoading } = useMyHospital();
  const updateMutation = useUpdateMyHospital();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [hospitalErrors, setHospitalErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (hospital) {
      setName(hospital.name || "");
      setAddress(hospital.address || "");
      setContactEmail(hospital.contactEmail || "");
      setContactPhone(hospital.contactPhone || "");
      setLogoUrl(hospital.logoUrl || "");
    }
  }, [hospital]);

  const validateHospitalField = (field: string, val: any): string | undefined => {
    const valStr = typeof val === "string" ? val : String(val ?? "");
    const trimmed = valStr.trim();

    if (field === "name") {
      if (!trimmed) {
        return "Hospital Name is required. Please fill out this field.";
      }
      if (valStr.length > 100) {
        return "Hospital Name cannot exceed 100 characters.";
      }
      if (trimmed.length < 2 || !/^[a-zA-Z0-9\s\.\-/'&,()]+$/.test(trimmed) || /<script|javascript:/i.test(trimmed)) {
        return "Hospital Name contains invalid characters. Please enter valid data.";
      }
      return undefined;
    }

    if (field === "address") {
      if (valStr.length > 250) {
        return "Hospital Address cannot exceed 250 characters.";
      }
      return undefined;
    }

    if (field === "contactEmail") {
      if (!trimmed) return undefined;
      if (valStr.length > 100) {
        return "Contact Email cannot exceed 100 characters.";
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
        return "Please enter a valid email address.";
      }
      return undefined;
    }

    if (field === "contactPhone") {
      if (!trimmed) return undefined;
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length !== 10) {
        return "Please enter a valid 10-digit phone number.";
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentLen: number,
    limit: number,
    label: string,
    setErrorFn?: (msg: string | undefined) => void
  ) => {
    const allowedNavKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (allowedNavKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = `${label} cannot exceed ${limit} characters.`;
      if (setErrorFn) setErrorFn(msg);
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handlePasteGuard = (
    e: React.ClipboardEvent<HTMLInputElement>,
    currentLen: number,
    limit: number,
    label: string,
    setErrorFn?: (msg: string | undefined) => void
  ) => {
    const pasted = e.clipboardData.getData("text") || "";
    const input = e.currentTarget;
    const selectionLen = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    const projectedLen = currentLen - selectionLen + pasted.length;

    if (projectedLen > limit) {
      e.preventDefault();
      const allowedLen = Math.max(0, limit - (currentLen - selectionLen));
      const truncatedPaste = pasted.slice(0, allowedLen);
      document.execCommand("insertText", false, truncatedPaste);
      const msg = `${label} cannot exceed ${limit} characters.`;
      if (setErrorFn) setErrorFn(msg);
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nameErr = validateHospitalField("name", name);
    const emailErr = validateHospitalField("contactEmail", contactEmail);
    const phoneErr = validateHospitalField("contactPhone", contactPhone);

    const errs: Record<string, string | undefined> = {
      name: nameErr,
      contactEmail: emailErr,
      contactPhone: phoneErr,
    };
    setHospitalErrors(errs);

    const firstErr = Object.values(errs).find(Boolean);
    if (firstErr) {
      setFormError(firstErr);
      toast.error(firstErr);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        name: name.trim(),
        address: address.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        logoUrl,
      });
      toast.success("Hospital facility details updated successfully!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update hospital settings.";
      setFormError(msg);
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-slate-200/90 bg-white p-8">
        <div className="py-8 text-center text-xs font-semibold text-slate-400">Loading hospital settings...</div>
      </Card>
    );
  }

  return (
    <Section
      title="Hospital Facility & Organization Profile"
      subtitle="Configure global hospital information, contact details, and branding logo."
      icon={<Building className="h-5 w-5" />}
    >
      <form onSubmit={handleSave} noValidate className="space-y-5">
        {formError && (
          <div
            role="alert"
            className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-semibold flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <InputField
            label="Hospital Name *"
            required
            maxLength={100}
            showCharCount
            value={name}
            error={hospitalErrors.name}
            onChange={(e) => {
              const val = e.target.value;
              setName(val);
              const err = validateHospitalField("name", val);
              setHospitalErrors((prev) => ({ ...prev, name: err }));
              if (err) setFormError(err);
              else if (formError === hospitalErrors.name) setFormError(null);
            }}
            onKeyDown={(e) =>
              handleKeyGuard(e, name.length, 100, "Hospital Name", (err) =>
                setHospitalErrors((p) => ({ ...p, name: err || undefined }))
              )
            }
            onPaste={(e) =>
              handlePasteGuard(e, name.length, 100, "Hospital Name", (err) =>
                setHospitalErrors((p) => ({ ...p, name: err || undefined }))
              )
            }
            onBlur={() => {
              const err = validateHospitalField("name", name);
              setHospitalErrors((prev) => ({ ...prev, name: err }));
              if (err) setFormError(err);
            }}
            placeholder="e.g. Preethi Fertility Centre"
          />

          <InputField
            label="Hospital Code (ReadOnly)"
            disabled
            readOnly
            value={hospital?.code || "HOSP-001"}
            className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
          />

          <InputField
            label="Hospital Address"
            maxLength={250}
            showCharCount
            value={address}
            error={hospitalErrors.address}
            onChange={(e) => {
              const val = e.target.value;
              setAddress(val);
              const err = validateHospitalField("address", val);
              setHospitalErrors((prev) => ({ ...prev, address: err }));
              if (err) setFormError(err);
              else if (formError === hospitalErrors.address) setFormError(null);
            }}
            placeholder="e.g. 120 Melur Main Road, Madurai"
          />

          <InputField
            label="Contact Email"
            type="email"
            maxLength={100}
            showCharCount
            value={contactEmail}
            error={hospitalErrors.contactEmail}
            onChange={(e) => {
              const val = e.target.value;
              setContactEmail(val);
              const err = validateHospitalField("contactEmail", val);
              setHospitalErrors((prev) => ({ ...prev, contactEmail: err }));
              if (err) setFormError(err);
              else if (formError === hospitalErrors.contactEmail) setFormError(null);
            }}
            onKeyDown={(e) =>
              handleKeyGuard(e, contactEmail.length, 100, "Contact Email", (err) =>
                setHospitalErrors((p) => ({ ...p, contactEmail: err || undefined }))
              )
            }
            onPaste={(e) =>
              handlePasteGuard(e, contactEmail.length, 100, "Contact Email", (err) =>
                setHospitalErrors((p) => ({ ...p, contactEmail: err || undefined }))
              )
            }
            onBlur={() => {
              const err = validateHospitalField("contactEmail", contactEmail);
              setHospitalErrors((prev) => ({ ...prev, contactEmail: err }));
              if (err) setFormError(err);
            }}
            placeholder="e.g. contact@preethifertility.com"
          />

          <InputField
            label="Contact Phone"
            type="tel"
            maxLength={10}
            showCharCount
            value={contactPhone}
            error={hospitalErrors.contactPhone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setContactPhone(val);
              const err = validateHospitalField("contactPhone", val);
              setHospitalErrors((prev) => ({ ...prev, contactPhone: err }));
              if (err) setFormError(err);
              else if (formError === hospitalErrors.contactPhone) setFormError(null);
            }}
            onKeyDown={(e) =>
              handleKeyGuard(e, contactPhone.length, 10, "Contact Phone", (err) =>
                setHospitalErrors((p) => ({ ...p, contactPhone: err || undefined }))
              )
            }
            onPaste={(e) =>
              handlePasteGuard(e, contactPhone.length, 10, "Contact Phone", (err) =>
                setHospitalErrors((p) => ({ ...p, contactPhone: err || undefined }))
              )
            }
            onBlur={() => {
              const err = validateHospitalField("contactPhone", contactPhone);
              setHospitalErrors((prev) => ({ ...prev, contactPhone: err }));
              if (err) setFormError(err);
            }}
            placeholder="e.g. 9876543210"
          />
        </div>

        <div className="border-t border-slate-100 pt-5">
          <FileUpload
            label="Hospital Branding Logo"
            folder="hospital-logos"
            value={logoUrl}
            onChange={setLogoUrl}
            maxSizeMB={2}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            error={hospitalErrors.logoUrl}
            onError={(err) => setHospitalErrors((prev) => ({ ...prev, logoUrl: err || undefined }))}
          />
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Hospital Details"}
          </button>
        </div>
      </form>
    </Section>
  );
}
