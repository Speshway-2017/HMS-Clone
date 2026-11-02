import { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  Lock,
  KeyRound,
  Bell,
  Building,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase text-slate-400">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon, children }: {
  title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-5 flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2 ${
          checked ? "bg-navy-700" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Main Restructured Settings Page ─────────────────────────────────────────

const NAME_REGEX = /^[a-zA-Z\s\.\-']+$/;

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { mutate: changePassword, isPending: isChangingPassword } = useChangePassword();
  const updateProfileMutation = useUpdateProfile();

  const [activeSection, setActiveSection] = useState<"profile" | "security" | "notifications" | "hospital">("profile");

  // Profile form state
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification preferences state (persisted locally)
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem("setting_email_alerts") !== "false");
  const [smsAlerts, setSmsAlerts] = useState(() => localStorage.getItem("setting_sms_alerts") !== "false");
  const [whatsappAlerts, setWhatsappAlerts] = useState(() => localStorage.getItem("setting_whatsapp_alerts") !== "false");
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("setting_sound_enabled") !== "false");

  useEffect(() => {
    if (user) {
      setFullName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const validateName = (val: string): string | undefined => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      return "Full Display Name is required. Please fill out this field";
    }
    if (val.length > 100) {
      return "Full Display Name cannot exceed 100 characters. Please enter valid data";
    }
    if (trimmed.length < 2 || !NAME_REGEX.test(trimmed)) {
      return "Full Display Name contains invalid characters. Please enter valid data";
    }
    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentLen: number,
    limit: number,
    label: string
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
      const msg = `${label} cannot exceed ${limit} characters. Please enter valid data`;
      setNameError(msg);
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const passwordsMatch = newPassword !== "" && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateName(fullName);
    if (err) {
      setNameError(err);
      toast.error(err, { id: "profile-name-error" });
      return;
    }
    updateProfileMutation.mutate(
      { name: fullName.trim() },
      {
        onSuccess: () => {
          refreshUser();
          toast.success("Profile details updated successfully!");
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to update profile.");
        }
      }
    );
  };

  const handleAvatarChange = async (url: string) => {
    if (!url) return;
    setAvatarError(null);
    updateProfileMutation.mutate(
      { avatarUrl: url },
      {
        onSuccess: () => {
          refreshUser();
          toast.success("Profile photo updated successfully!");
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to save profile photo.");
        }
      }
    );
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordsMismatch) {
      toast.error("Passwords do not match.");
      return;
    }
    changePassword(
      { newPassword, confirmPassword },
      {
        onSuccess: () => {
          toast.success("Password changed successfully!");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to change password.");
        }
      }
    );
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("setting_email_alerts", String(emailAlerts));
    localStorage.setItem("setting_sms_alerts", String(smsAlerts));
    localStorage.setItem("setting_whatsapp_alerts", String(whatsappAlerts));
    localStorage.setItem("setting_sound_enabled", String(soundEnabled));
    toast.success("Notification preferences saved successfully!");
  };

  const TABS = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    { id: "security", label: "Security", icon: <KeyRound className="h-4 w-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    ...(user?.role === "hospital_admin"
      ? [{ id: "hospital", label: "Hospital Rules", icon: <Building className="h-4 w-4" /> }]
      : [])
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">Manage your profile, security, and system preferences.</p>
        </div>
        <Badge tone="info">{user?.role ? user.role.replace("_", " ").toUpperCase() + " PORTAL" : "SYSTEM PORTAL"}</Badge>
      </div>

      {/* ── Profile Summary Banner ── */}
      <Card className="p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-navy-700 to-navy-800 px-6 py-5">
          <div className="flex items-center gap-5">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-16 w-16 rounded-full object-cover ring-4 ring-white/30"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30">
                <span className="text-2xl font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </span>
              </div>
            )}
            <div>
              <p className="text-xl font-bold text-white">{user?.name ?? "User"}</p>
              <p className="text-sm text-navy-200">{user?.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white capitalize">
                  Role: {user?.role?.replace("_", " ") ?? "Staff"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeSection === tab.id
                ? "border-navy-700 text-navy-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ PROFILE TAB ══════════════════ */}
      {activeSection === "profile" && (
        <div className="space-y-5">
          <Section title="Personal Information" subtitle="Your basic personal and account identity details." icon={<User className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handleSaveProfile} noValidate className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Full Display Name"
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
                  }}
                  onKeyDown={(e) => handleKeyGuard(e, fullName.length, 100, "Full Display Name")}
                  onBlur={() => {
                    const err = validateName(fullName);
                    setNameError(err);
                    if (err) {
                      toast.error(err, { id: "profile-name-error" });
                    }
                  }}
                  placeholder="e.g. Johnathan Smith"
                />

                <InputField
                  label="Email Address (ReadOnly)"
                  type="email"
                  disabled
                  value={email}
                  readOnly
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <FileUpload
                  label="Upload Profile Avatar"
                  folder={user?.role === "doctor" ? "doctor-photos" : "staff-photos"}
                  value={user?.avatarUrl || ""}
                  onChange={handleAvatarChange}
                  hint="PNG, JPG or WEBP (Max 2MB)"
                  maxSizeMB={2}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  error={avatarError}
                  onError={(err) => setAvatarError(err || null)}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ══════════════════ SECURITY TAB ══════════════════ */}
      {activeSection === "security" && (
        <div className="space-y-5">
          <Section title="Change Password" subtitle="Set a strong new password for your account." icon={<KeyRound className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handleChangePassword} className="space-y-5" noValidate>
              <PasswordInput
                id="newPassword"
                label="New Password *"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter your new strong password"
                autoComplete="new-password"
              />

              <div>
                <PasswordInput
                  id="confirmPassword"
                  label="Confirm New Password *"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                />
                {confirmPassword && (
                  <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${passwordsMatch ? "text-emerald-600" : "text-red-500"}`}>
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

              <div className="flex items-center justify-between pt-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock className="h-3.5 w-3.5" /> Encrypted end-to-end with bcrypt
                </p>
                <button
                  type="submit"
                  disabled={isChangingPassword || !newPassword || !confirmPassword || passwordsMismatch}
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ══════════════════ NOTIFICATIONS TAB ══════════════════ */}
      {activeSection === "notifications" && (
        <div className="space-y-5">
          <Section title="Notification Preferences" subtitle="Customize your alert delivery channels." icon={<Bell className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div className="space-y-3 rounded-lg border border-slate-100 p-4">
                <Toggle checked={emailAlerts} onChange={setEmailAlerts} label="Email Notifications & Receipts" />
                <Toggle checked={smsAlerts} onChange={setSmsAlerts} label="SMS Phone Text Alerts" />
                <Toggle checked={whatsappAlerts} onChange={setWhatsappAlerts} label="WhatsApp Appointment Reminders" />
                <Toggle checked={soundEnabled} onChange={setSoundEnabled} label="Dashboard Sound Alerts & Chimes" />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Preferences
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ══════════════════ HOSPITAL RULES TAB (HOSPITAL ADMIN ONLY) ══════════════════ */}
      {activeSection === "hospital" && user?.role === "hospital_admin" && (
        <HospitalSettingsCard />
      )}
    </div>
  );
}

function HospitalSettingsCard() {
  const { data: hospital, isLoading } = useMyHospital();
  const updateMutation = useUpdateMyHospital();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [opExpiryLimit, setOpExpiryLimit] = useState(10);
  const [availableLabTests, setAvailableLabTests] = useState<string[]>([]);
  const [availableRadiologyTests, setAvailableRadiologyTests] = useState<string[]>([]);

  useEffect(() => {
    if (hospital) {
      setName(hospital.name || "");
      setAddress(hospital.address || "");
      setContactEmail(hospital.contactEmail || "");
      setContactPhone(hospital.contactPhone || "");
      setLogoUrl(hospital.logoUrl || "");
      setOpExpiryLimit(hospital.opExpiryLimit ?? 10);
      setAvailableLabTests((hospital as any).availableLabTests || []);
      setAvailableRadiologyTests((hospital as any).availableRadiologyTests || []);
    }
  }, [hospital]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        name,
        address,
        contactEmail,
        contactPhone,
        logoUrl,
        opExpiryLimit: Number(opExpiryLimit),
        availableLabTests,
        availableRadiologyTests,
      });
      toast.success("Hospital settings updated successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update hospital settings.");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="py-8 text-center text-xs font-semibold text-slate-400">Loading hospital settings...</div>
      </Card>
    );
  }

  return (
    <Section title="Hospital Settings & System Rules" subtitle="Configure global hospital information, branding, and consultation validity." icon={<Building className="h-5 w-5 text-navy-700" />}>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase text-slate-400">Hospital Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase text-slate-400">Hospital Code (ReadOnly)</label>
            <input
              type="text"
              value={hospital?.code || ""}
              disabled
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase text-slate-400">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase text-slate-400">Contact Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onKeyDown={(e) => {
                const allowed = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "+"];
                if (!allowed.includes(e.key) && !e.ctrlKey && !e.metaKey && !/^[0-9]$/.test(e.key)) e.preventDefault();
              }}
              onChange={(e) => setContactPhone(e.target.value.replace(/(?!^\+)[^\d]/g, ""))}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <FileUpload
            label="Hospital Branding Logo"
            folder="hospital-logos"
            value={logoUrl}
            onChange={setLogoUrl}
          />
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-1.5">
          <label className="text-xs font-semibold uppercase text-slate-400">OP Consultation Expiry Limit (Days)</label>
          <p className="text-xs text-slate-500">Number of days a completed OP consultation remains valid for free revisits.</p>
          <input
            type="number"
            min="1"
            max="180"
            value={opExpiryLimit}
            onChange={(e) => setOpExpiryLimit(Number(e.target.value))}
            className="w-full sm:w-1/3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
            required
          />
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Hospital Settings"}
          </button>
        </div>
      </form>
    </Section>
  );
}
