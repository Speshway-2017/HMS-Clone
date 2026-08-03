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
  Smartphone,
  Globe,
  Mail
} from "lucide-react";
import { useChangePassword, useUpdateProfile } from "../../features/auth";
import { useAuth } from "../../context/AuthContext";
import { useMyHospital, useUpdateMyHospital } from "../../features/hospitals";
import { FileUpload } from "../../components/ui/FileUpload";
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
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-11 text-xs font-bold text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-200"
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

// ─── Main Restructured Settings Page ─────────────────────────────────────────

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { mutate: changePassword, isPending: isChangingPassword } = useChangePassword();
  const updateProfileMutation = useUpdateProfile();

  const [activeSection, setActiveSection] = useState<"profile" | "security" | "notifications" | "hospital">("profile");

  // Profile form state
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

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

  const passwordsMatch = newPassword !== "" && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(
      { name: fullName },
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-indigo-950 p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-extrabold text-emerald-300 border border-emerald-400/30">
              Account Control Center
            </span>
            <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-200 border border-indigo-400/30">
              Role: {user?.role?.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">System & Account Settings</h1>
          <p className="mt-1 text-xs text-indigo-200/80">
            Manage your personal credentials, profile picture, security controls, and notification preferences.
          </p>
        </div>
      </div>

      {/* Main Grid Layout: Left Nav + Right Section Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-start">
        {/* Navigation Sidebar Cards */}
        <div className="lg:col-span-1 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {[
            { id: "profile", label: "Profile & Identity", icon: User, desc: "Personal info & photo" },
            { id: "security", label: "Security & Credentials", icon: ShieldCheck, desc: "Password & authentication" },
            { id: "notifications", label: "Notifications & Alerts", icon: Bell, desc: "Email, SMS & WhatsApp" },
            ...(user?.role === "hospital_admin"
              ? [{ id: "hospital", label: "Hospital System Rules", icon: Building, desc: "Global clinic settings" }]
              : [])
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id as any)}
                className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-navy-800 text-white shadow-md font-extrabold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive ? "bg-white/15 text-white" : "bg-slate-100 text-navy-700"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className={`text-[10px] ${isActive ? "text-indigo-200" : "text-slate-400"}`}>{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* SECTION 1: PROFILE & IDENTITY */}
          {activeSection === "profile" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Profile & Identity</h3>
                  <p className="text-xs text-slate-500">Update your account avatar, display name, and personal information.</p>
                </div>
              </div>

              {/* Photo Upload Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-2xl bg-slate-50/80 p-5 border border-slate-200">
                <div className="flex items-center gap-4">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-16 w-16 rounded-2xl object-cover ring-4 ring-navy-100 shadow-md"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-800 text-white text-2xl font-black ring-4 ring-navy-100 shadow-md">
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">{user?.name}</h4>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-[10px] font-black uppercase text-emerald-800 border border-emerald-300">
                      {user?.role?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="w-full sm:w-64">
                  <FileUpload
                    label="Upload New Photo"
                    folder={user?.role === "doctor" ? "doctor-photos" : "staff-photos"}
                    value={user?.avatarUrl || ""}
                    onChange={handleAvatarChange}
                    hint="PNG, JPG or WEBP (Max 2MB)"
                  />
                </div>
              </div>

              {/* Account Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Full Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-navy-600 focus:ring-2 focus:ring-navy-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Email Address (Account Username)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-2 rounded-xl bg-navy-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-navy-900 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {updateProfileMutation.isPending ? "Saving Profile..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 2: SECURITY & CREDENTIALS */}
          {activeSection === "security" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Security & Credentials</h3>
                  <p className="text-xs text-slate-500">Update your account password and manage system authentication security.</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
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
                    <p className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${passwordsMatch ? "text-emerald-600" : "text-rose-600"}`}>
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Passwords match perfectly
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" /> Passwords do not match
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs font-medium text-slate-600 space-y-1">
                  <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-emerald-600" /> End-to-End Encryption
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Your password is hashed using bcrypt prior to database storage. Keep your login credentials confidential.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword || !newPassword || !confirmPassword || passwordsMismatch}
                    className="flex items-center gap-2 rounded-xl bg-navy-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-navy-900 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {isChangingPassword ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 3: NOTIFICATIONS & PREFERENCES */}
          {activeSection === "notifications" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Notifications & Alert Preferences</h3>
                  <p className="text-xs text-slate-500">Customize how and when you receive appointment, billing, and clinical notifications.</p>
                </div>
              </div>

              <form onSubmit={handleSavePreferences} className="space-y-4">
                <div className="space-y-3">
                  {[
                    { title: "Email Notifications & Reminders", desc: "Receive instant email receipts for appointment confirmations & billing invoices.", state: emailAlerts, setState: setEmailAlerts, icon: Mail },
                    { title: "SMS Phone Text Alerts", desc: "Get SMS alerts for upcoming doctor consultations and hospital queues.", state: smsAlerts, setState: setSmsAlerts, icon: Smartphone },
                    { title: "WhatsApp Appointment Reminders", desc: "Receive automated Google Meet video links and RX slips via WhatsApp.", state: whatsappAlerts, setState: setWhatsappAlerts, icon: Globe },
                    { title: "Dashboard Sound Notifications", desc: "Play audio alert chimes when new live notifications or messages arrive.", state: soundEnabled, setState: setSoundEnabled, icon: Bell }
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-navy-100 text-navy-700 shrink-0 mt-0.5">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                          <input
                            type="checkbox"
                            checked={item.state}
                            onChange={(e) => item.setState(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-navy-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-navy-900 transition-all cursor-pointer active:scale-95"
                  >
                    <Save className="h-4 w-4" /> Save Preferences
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 4: HOSPITAL SYSTEM RULES (HOSPITAL ADMIN ONLY) */}
          {activeSection === "hospital" && user?.role === "hospital_admin" && (
            <HospitalSettingsCard />
          )}
        </div>
      </div>
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-center">
        <span className="text-slate-500 text-xs font-bold">Loading hospital settings...</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <Building className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-800">Hospital Settings & Rules</h3>
          <p className="text-xs text-slate-500">Configure global hospital details, logo, and OP consultation validity policies.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Hospital Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-navy-600 focus:ring-2 focus:ring-navy-200"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Hospital Code (ReadOnly)</label>
            <input
              type="text"
              value={hospital?.code || ""}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-navy-600 focus:ring-2 focus:ring-navy-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Contact Phone</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-navy-600 focus:ring-2 focus:ring-navy-200"
            />
          </div>

          <div className="sm:col-span-2 border-t pt-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Hospital Logo</label>
            <FileUpload
              label="Hospital Logo"
              folder="hospital-logos"
              value={logoUrl}
              onChange={setLogoUrl}
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">OP Consultation Expiry Limit (Days)</label>
          <p className="text-xs text-slate-500">Number of days a completed OP consultation remains valid for free revisits.</p>
          <input
            type="number"
            min="1"
            max="180"
            value={opExpiryLimit}
            onChange={(e) => setOpExpiryLimit(Number(e.target.value))}
            className="w-full sm:w-1/3 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-navy-600 focus:ring-2 focus:ring-navy-200"
            required
          />
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-navy-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-navy-900 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving Hospital Settings..." : "Save Hospital Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
