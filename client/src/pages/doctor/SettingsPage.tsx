import { useState, useEffect } from "react";
import {
  Eye, EyeOff, KeyRound, ShieldCheck, CheckCircle2, XCircle, Lock,
  User, Bell, Clock, Stethoscope, Phone, Mail, MapPin, Calendar,
  Moon, Sun, Globe, Save, AlertTriangle,
} from "lucide-react";
import { useChangePassword } from "../../features/auth";
import { useAuth } from "../../context/AuthContext";
import { useDoctorProfileMe, useUpdateDoctorProfileMe } from "../../features/doctors";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

// ─── Password Input Sub-component ─────────────────────────────────────────────

function PasswordInput({
  id, label, value, onChange, placeholder, autoComplete,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
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

// ─── Section Wrapper ───────────────────────────────────────────────────────────

function Section({ title, subtitle, icon, children }: {
  title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-5 flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100">
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

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

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

interface NotificationItem {
  key: "newAppointment" | "appointmentReminder" | "labResults" | "radiologyReports" | "emergencyAlerts" | "patientMessages" | "weeklyReport" | "systemUpdates";
  label: string;
  group: string;
}

const NOTIFICATION_ITEMS: NotificationItem[] = [
  { key: "newAppointment",      label: "New appointment booked",         group: "Appointments" },
  { key: "appointmentReminder", label: "Appointment reminder (1h before)",group: "Appointments" },
  { key: "labResults",          label: "Lab results ready",              group: "Clinical"     },
  { key: "radiologyReports",    label: "Radiology reports available",    group: "Clinical"     },
  { key: "emergencyAlerts",     label: "Emergency case alerts",          group: "Clinical"     },
  { key: "patientMessages",     label: "Patient messages",               group: "Messages"     },
  { key: "weeklyReport",        label: "Weekly performance report",      group: "Reports"      },
  { key: "systemUpdates",       label: "System updates & announcements", group: "System"       },
];

const TABS = [
  { id: "profile",       label: "Profile",        icon: <User className="h-4 w-4" /> },
  { id: "security",      label: "Security",       icon: <KeyRound className="h-4 w-4" /> },
  { id: "availability",  label: "Availability",   icon: <Clock className="h-4 w-4" /> },
  { id: "notifications", label: "Notifications",  icon: <Bell className="h-4 w-4" /> },
  { id: "preferences",   label: "Preferences",    icon: <Globe className="h-4 w-4" /> },
];

const WORKING_HOURS = [
  { day: "Monday",    from: "09:00", to: "17:00", active: true  },
  { day: "Tuesday",   from: "09:00", to: "17:00", active: true  },
  { day: "Wednesday", from: "09:00", to: "13:00", active: true  },
  { day: "Thursday",  from: "09:00", to: "17:00", active: true  },
  { day: "Friday",    from: "09:00", to: "17:00", active: true  },
  { day: "Saturday",  from: "10:00", to: "13:00", active: false },
  { day: "Sunday",    from: "—",     to: "—",     active: false },
];

export function DoctorSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { mutate, isPending } = useChangePassword();

  // Security tab state
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: doctorProfile } = useDoctorProfileMe();
  const updateProfileMutation = useUpdateDoctorProfileMe();

  // Profile tab state
  const [profileForm, setProfileForm] = useState({
    name:           user?.name ?? "",
    email:          user?.email ?? "",
    phone:          "",
    specialization: "",
    qualification:  "",
    licenseNo:      "",
    bio:            "",
    consultationFee:"500",
    languages:      "English, Hindi",
    opExpiryLimit:  10,
  });

  // Notification state
  const [notif, setNotif] = useState({
    newAppointment:   true,
    appointmentReminder: true,
    labResults:       true,
    radiologyReports: true,
    emergencyAlerts:  true,
    patientMessages:  false,
    weeklyReport:     true,
    systemUpdates:    false,
  });

  // Preference state
  const [prefs, setPrefs] = useState({
    darkMode:         false,
    compactView:      false,
    autoSaveNotes:    true,
    showPatientPhoto: true,
    defaultView:      "queue",
    language:         "en",
    dateFormat:       "DD/MM/YYYY",
    timeFormat:       "12h",
  });

  // Availability state
  const [hours, setHours] = useState(WORKING_HOURS);
  const [consultDuration, setConsultDuration] = useState("15");
  const [maxPatients, setMaxPatients] = useState(25);
  const [breakTime, setBreakTime] = useState("13:00");
  const [activeTab, setActiveTab] = useState("profile");

  const [monthlyAvailability, setMonthlyAvailability] = useState<any[]>([]);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideFrom, setOverrideFrom] = useState("09:00");
  const [overrideTo, setOverrideTo] = useState("17:00");
  const [overrideActive, setOverrideActive] = useState(true);

  const handleAddOverride = () => {
    if (!overrideDate) {
      showToast("error", "Please select a date.");
      return;
    }
    if (monthlyAvailability.some((ma) => ma.date === overrideDate)) {
      showToast("error", `Override for ${overrideDate} already exists. Please remove it first.`);
      return;
    }
    const newOverride = {
      date: overrideDate,
      from: overrideActive ? overrideFrom : "—",
      to: overrideActive ? overrideTo : "—",
      active: overrideActive
    };
    setMonthlyAvailability((prev) => [...prev, newOverride].sort((a, b) => a.date.localeCompare(b.date)));
    setOverrideDate("");
  };

  const handleRemoveOverride = (date: string) => {
    setMonthlyAvailability((prev) => prev.filter((ma) => ma.date !== date));
  };

  useEffect(() => {
    if (doctorProfile) {
      setProfileForm({
        name: doctorProfile.name || "",
        email: doctorProfile.email || "",
        phone: doctorProfile.phone || "",
        specialization: doctorProfile.specialization || "",
        qualification: doctorProfile.qualification || "",
        licenseNo: doctorProfile.licenseNo || "",
        bio: doctorProfile.bio || "",
        consultationFee: doctorProfile.consultationFee ? String(doctorProfile.consultationFee).replace(/[^0-9.]/g, "") : "500",
        languages: doctorProfile.languages || "English, Hindi",
        opExpiryLimit: doctorProfile.opExpiryLimit ?? 10,
      });
      if (doctorProfile.workingHours && doctorProfile.workingHours.length > 0) {
        setHours(doctorProfile.workingHours);
      }
      if (doctorProfile.consultationSettings) {
        setConsultDuration(String(doctorProfile.consultationSettings.slotDuration ?? "15"));
        setMaxPatients(doctorProfile.consultationSettings.maxPatients ?? 25);
        setBreakTime(doctorProfile.consultationSettings.breakTime ?? "13:00");
      }
      if (doctorProfile.monthlyAvailability) {
        setMonthlyAvailability(doctorProfile.monthlyAvailability);
      }
    }
  }, [doctorProfile]);

  // ─── Derived states ──────────────────────────────────────────────────────────
  const passwordsMatch   = newPassword !== "" && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        name: profileForm.name,
        phone: profileForm.phone,
        specialization: profileForm.specialization,
        qualification: profileForm.qualification,
        licenseNo: profileForm.licenseNo,
        bio: profileForm.bio,
        consultationFee: profileForm.consultationFee,
        languages: profileForm.languages,
        opExpiryLimit: Number(profileForm.opExpiryLimit),
      });
      await refreshUser();
      showToast("success", "Profile updated successfully!");
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || err?.message || "Failed to update profile.");
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        workingHours: hours,
        consultationSettings: {
          slotDuration: parseInt(consultDuration, 10),
          maxPatients: maxPatients,
          breakTime: breakTime,
        },
        monthlyAvailability,
      });
      showToast("success", "Schedule updated successfully!");
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || err?.message || "Failed to update schedule.");
    }
  };

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordsMismatch) { showToast("error", "Passwords do not match."); return; }
    if (!newPassword)      { showToast("error", "New password cannot be empty."); return; }
    mutate(
      { newPassword, confirmPassword },
      {
        onSuccess: () => {
          showToast("success", "Password changed successfully!");
          setNewPassword(""); setConfirmPassword("");
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? "Something went wrong. Please try again.";
          showToast("error", msg);
        },
      },
    );
  }

  function toggleDay(i: number) {
    setHours((prev) => prev.map((h, idx) => idx === i ? { ...h, active: !h.active } : h));
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">Manage your profile, security, availability and preferences.</p>
        </div>
        <Badge tone="info">Doctor Portal</Badge>
      </div>

      {/* ── Profile Summary Banner ── */}
      <Card className="p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-navy-700 to-navy-800 px-6 py-5">
          <div className="flex items-center gap-5">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name}
                className="h-16 w-16 rounded-full object-cover ring-4 ring-white/30" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30">
                <span className="text-2xl font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase() ?? "D"}
                </span>
              </div>
            )}
            <div>
              <p className="text-xl font-bold text-white">{user?.name ?? "Doctor"}</p>
              <p className="text-sm text-navy-200">{user?.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                  {profileForm.specialization}
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                  {profileForm.licenseNo}
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
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-navy-700 text-navy-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ PROFILE TAB ══════════════════ */}
      {activeTab === "profile" && (
        <div className="space-y-5">
          <Section title="Personal Information" subtitle="Your basic personal and contact details." icon={<User className="h-5 w-5 text-navy-700" />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { label: "Full Name",       key: "name",           icon: <User className="h-4 w-4" /> },
                { label: "Email Address",   key: "email",          icon: <Mail className="h-4 w-4" /> },
                { label: "Phone Number",    key: "phone",          icon: <Phone className="h-4 w-4" /> },
                { label: "Languages",       key: "languages",      icon: <Globe className="h-4 w-4" /> },
              ].map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                    {f.icon} {f.label}
                  </label>
                  <input
                    value={profileForm[f.key as keyof typeof profileForm]}
                    onChange={(e) => setProfileForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Professional Details" subtitle="Your medical credentials and specialization." icon={<Stethoscope className="h-5 w-5 text-navy-700" />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { label: "Specialization",    key: "specialization" },
                { label: "Qualification",     key: "qualification"  },
                { label: "License Number",    key: "licenseNo"      },
                { label: "Consultation Fee",  key: "consultationFee"},
                { label: "OP Consultation Expiry Limit (Days)", key: "opExpiryLimit"},
              ].map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">{f.label}</label>
                  <input
                    value={profileForm[f.key as keyof typeof profileForm]}
                    onChange={(e) => setProfileForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase text-slate-400">Professional Bio</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateProfileMutation.isPending ? "Saving..." : <><Save className="h-4 w-4" /> Save Profile</>}
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════ SECURITY TAB ══════════════════ */}
      {activeTab === "security" && (
        <div className="space-y-5">
          {/* Change Password */}
          <Section
            title="Change Password"
            subtitle="Set a strong new password for your account."
            icon={<KeyRound className="h-5 w-5 text-navy-700" />}
          >
            <form onSubmit={handleChangePassword} className="space-y-5" noValidate>
              <PasswordInput
                id="doc-new-password"
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter your new password"
                autoComplete="new-password"
              />

              <div>
                <PasswordInput
                  id="doc-confirm-password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                />
                {confirmPassword && (
                  <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${passwordsMatch ? "text-emerald-600" : "text-red-500"}`}>
                    {passwordsMatch
                      ? <><CheckCircle2 className="h-3.5 w-3.5" /> Passwords match</>
                      : <><XCircle className="h-3.5 w-3.5" /> Passwords do not match</>
                    }
                  </p>
                )}
              </div>

              {/* Password strength guide */}
              {newPassword && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Password requirements</p>
                  {[
                    { label: "At least 8 characters",     ok: newPassword.length >= 8      },
                    { label: "Contains a number",         ok: /\d/.test(newPassword)        },
                    { label: "Contains uppercase letter", ok: /[A-Z]/.test(newPassword)     },
                    { label: "Contains special character",ok: /[^A-Za-z0-9]/.test(newPassword) },
                  ].map((req) => (
                    <div key={req.label} className={`flex items-center gap-2 text-xs ${req.ok ? "text-emerald-600" : "text-slate-400"}`}>
                      {req.ok
                        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        : <XCircle className="h-3.5 w-3.5 shrink-0" />
                      }
                      {req.label}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock className="h-3.5 w-3.5" /> Encrypted end-to-end
                </p>
                <button
                  id="btn-doctor-change-password"
                  type="submit"
                  disabled={isPending || !newPassword || !confirmPassword || passwordsMismatch}
                  className="flex items-center gap-2 rounded-xl bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <><ShieldCheck className="h-4 w-4" /> Update Password</>
                  )}
                </button>
              </div>
            </form>
          </Section>

          {/* Security Info */}
          <Section
            title="Account Security"
            subtitle="Your account security information."
            icon={<ShieldCheck className="h-5 w-5 text-navy-700" />}
          >
            <div className="space-y-3">
              {[
                { label: "Account Role",     value: "Doctor",              color: "text-navy-700 bg-navy-100" },
                { label: "Account Status",   value: "Active",              color: "text-emerald-700 bg-emerald-100" },
                { label: "Hospital Access",  value: "Sunrise General",     color: "text-slate-700 bg-slate-100" },
                { label: "Last Login",       value: user?.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : "First session",                                       color: "text-slate-700 bg-slate-100" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                  <span className="text-sm font-medium text-slate-600">{row.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Never share your password with anyone. The system will never ask for your password via email or phone.
              </p>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════ AVAILABILITY TAB ══════════════════ */}
      {activeTab === "availability" && (
        <div className="space-y-5">
          <Section title="Working Hours" subtitle="Set your available consultation hours for each day." icon={<Clock className="h-5 w-5 text-navy-700" />}>
            <div className="space-y-3">
              {hours.map((h, i) => (
                <div key={h.day} className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${h.active ? "border-slate-200" : "border-slate-100 bg-slate-50 opacity-60"}`}>
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-semibold text-slate-700">{h.day}</p>
                  </div>
                  <div className="flex flex-1 items-center gap-3">
                    <input
                      type="time"
                      value={h.from === "—" ? "" : h.from}
                      disabled={!h.active}
                      onChange={(e) => setHours((prev) => prev.map((d, idx) => idx === i ? { ...d, from: e.target.value } : d))}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-navy-200"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="time"
                      value={h.to === "—" ? "" : h.to}
                      disabled={!h.active}
                      onChange={(e) => setHours((prev) => prev.map((d, idx) => idx === i ? { ...d, to: e.target.value } : d))}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-navy-200"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={h.active}
                      onChange={() => toggleDay(i)}
                      className="accent-navy-700 h-4 w-4"
                    />
                    <span className="text-xs text-slate-500">{h.active ? "Available" : "Off"}</span>
                  </label>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Monthly Date Overrides & Exceptions" subtitle="Add specific dates when you are on leave or have different hours." icon={<Calendar className="h-5 w-5 text-navy-700" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Date *</label>
                  <input
                    type="date"
                    value={overrideDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-navy-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">From</label>
                  <input
                    type="time"
                    value={overrideFrom}
                    disabled={!overrideActive}
                    onChange={(e) => setOverrideFrom(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-navy-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">To</label>
                  <input
                    type="time"
                    value={overrideTo}
                    disabled={!overrideActive}
                    onChange={(e) => setOverrideTo(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-navy-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-650">
                    <input
                      type="checkbox"
                      checked={overrideActive}
                      onChange={(e) => setOverrideActive(e.target.checked)}
                      className="accent-navy-700 h-4 w-4"
                    />
                    <span>Available</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOverride}
                    className="rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
                  >
                    Add Override
                  </button>
                </div>
              </div>

              {/* List of current overrides */}
              {monthlyAvailability.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-2">No monthly availability overrides set.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden bg-white">
                  {monthlyAvailability.map((ma, idx) => (
                    <div key={idx} className="flex justify-between items-center px-4 py-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{new Date(ma.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        <span className="ml-2 font-mono text-[10px] text-slate-400">({ma.date})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {ma.active ? (
                          <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-700">
                            Available: {ma.from} - {ma.to}
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 font-semibold text-rose-700">
                            On Leave / Off
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveOverride(ma.date)}
                          className="text-rose-600 hover:text-rose-800 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <Section title="Consultation Settings" subtitle="Configure appointment slot duration and break times." icon={<Calendar className="h-5 w-5 text-navy-700" />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase text-slate-400">Slot Duration (min)</label>
                <select
                  value={consultDuration}
                  onChange={(e) => setConsultDuration(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                >
                  {["10", "15", "20", "30", "45", "60"].map((d) => (
                    <option key={d} value={d}>{d} minutes</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase text-slate-400">Max Patients / Day</label>
                <input
                  type="number"
                  value={maxPatients}
                  onChange={(e) => setMaxPatients(parseInt(e.target.value) || 0)}
                  min={1}
                  max={60}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase text-slate-400">Break Time</label>
                <input
                  type="time"
                  value={breakTime}
                  onChange={(e) => setBreakTime(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateProfileMutation.isPending ? "Saving..." : <><Save className="h-4 w-4" /> Save Schedule</>}
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════ NOTIFICATIONS TAB ══════════════════ */}
      {activeTab === "notifications" && (
        <Section title="Notification Preferences" subtitle="Choose what notifications you want to receive." icon={<Bell className="h-5 w-5 text-navy-700" />}>
          <div className="space-y-1">
            {NOTIFICATION_ITEMS.reduce((acc, item) => {
              const last = acc[acc.length - 1];
              if (!last || last.group !== item.group) acc.push({ group: item.group, items: [item] });
              else last.items.push(item);
              return acc;
            }, [] as { group: string; items: { key: keyof typeof notif; label: string; group: string }[] }[]).map((g) => (
              <div key={g.group} className="mb-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{g.group}</p>
                <div className="space-y-3 rounded-lg border border-slate-100 p-4">
                  {g.items.map((item) => (
                    <Toggle
                      key={item.key}
                      checked={notif[item.key as keyof typeof notif]}
                      onChange={(v) => setNotif((n) => ({ ...n, [item.key]: v }))}
                      label={item.label}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors">
              <Save className="h-4 w-4" /> Save Preferences
            </button>
          </div>
        </Section>
      )}

      {/* ══════════════════ PREFERENCES TAB ══════════════════ */}
      {activeTab === "preferences" && (
        <div className="space-y-5">
          <Section title="Display & Interface" subtitle="Customize your dashboard appearance." icon={<Sun className="h-5 w-5 text-navy-700" />}>
            <div className="space-y-3 mb-4">
              <Toggle checked={prefs.darkMode} onChange={(v) => setPrefs((p) => ({ ...p, darkMode: v }))} label="Dark Mode" />
              <Toggle checked={prefs.compactView} onChange={(v) => setPrefs((p) => ({ ...p, compactView: v }))} label="Compact View (smaller cards)" />
              <Toggle checked={prefs.showPatientPhoto} onChange={(v) => setPrefs((p) => ({ ...p, showPatientPhoto: v }))} label="Show patient photos in queue" />
              <Toggle checked={prefs.autoSaveNotes} onChange={(v) => setPrefs((p) => ({ ...p, autoSaveNotes: v }))} label="Auto-save clinical notes" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Default OP View",  key: "defaultView",  options: ["queue", "calendar", "list"] },
                { label: "Date Format",      key: "dateFormat",   options: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] },
                { label: "Time Format",      key: "timeFormat",   options: ["12h", "24h"] },
              ].map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">{f.label}</label>
                  <select
                    value={prefs[f.key as keyof typeof prefs] as string}
                    onChange={(e) => setPrefs((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  >
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Language & Region" subtitle="Set your language and regional settings." icon={<Globe className="h-5 w-5 text-navy-700" />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase text-slate-400">Display Language</label>
                <select
                  value={prefs.language}
                  onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase text-slate-400">Clinic Location</label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">Sunrise General Hospital, Springfield</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors">
                <Save className="h-4 w-4" /> Save Preferences
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium shadow-xl transition-all ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success"
            ? <CheckCircle2 className="h-5 w-5 shrink-0" />
            : <XCircle className="h-5 w-5 shrink-0" />
          }
          {toast.message}
        </div>
      )}
    </div>
  );
}
