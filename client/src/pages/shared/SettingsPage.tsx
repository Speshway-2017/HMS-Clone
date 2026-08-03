import { useState, useEffect } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, CheckCircle2, XCircle, Lock, Building2, Mail, Clock } from "lucide-react";
import { useChangePassword, useUpdateProfile } from "../../features/auth";
import { useAuth } from "../../context/AuthContext";
import { useMyHospital, useUpdateMyHospital } from "../../features/hospitals";
import { FileUpload } from "../../components/ui/FileUpload";
import { Badge } from "../../components/ui/Badge";

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
      <label htmlFor={id} className="text-xs font-bold text-slate-700 uppercase tracking-wide">
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
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-xs font-semibold text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-100"
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

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { mutate, isPending } = useChangePassword();
  const updateProfileMutation = useUpdateProfile();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const passwordsMatch = newPassword !== "" && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  }

  async function handleAvatarChange(url: string) {
    updateProfileMutation.mutate(
      { avatarUrl: url },
      {
        onSuccess: () => {
          refreshUser();
          showToast("success", "Profile photo updated successfully!");
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "Failed to save profile image.";
          showToast("error", msg);
        },
      }
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (passwordsMismatch) {
      showToast("error", "Passwords do not match.");
      return;
    }

    mutate(
      { newPassword, confirmPassword },
      {
        onSuccess: () => {
          showToast("success", "Password changed successfully!");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "Something went wrong. Please try again.";
          showToast("error", msg);
        },
      },
    );
  }

  const isHospitalAdmin = user?.role === "hospital_admin";

  return (
    <div className="w-full space-y-6">
      {/* ── Page Header ── */}
      <div className="border-b pb-4 border-slate-200 flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System & Account Settings</h1>
        <p className="text-xs font-semibold text-slate-500">
          Manage your personal profile credentials, security settings, and hospital operational preferences.
        </p>
      </div>

      {/* ── Profile Header Card ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-20 w-20 rounded-2xl object-cover ring-4 ring-navy-100 shadow-md shrink-0"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-navy-100 text-navy-800 ring-4 ring-navy-50 shadow-md shrink-0 font-black text-2xl">
                {user?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900">{user?.name}</h2>
                <Badge tone="info">{(user?.role || "user").replace("_", " ").toUpperCase()}</Badge>
              </div>
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {user?.email}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                User Reference ID: {user?.id || "REF-ADMIN"}
              </p>
            </div>
          </div>

          <div className="w-full md:w-72 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 shrink-0">
            <FileUpload
              label="Update Profile Photo"
              folder={user?.role === "doctor" ? "doctor-photos" : "staff-photos"}
              value={user?.avatarUrl || ""}
              onChange={handleAvatarChange}
              hint="PNG, JPG or WEBP up to 2MB"
            />
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Full-Width Grid ── */}
      <div className={`grid grid-cols-1 ${isHospitalAdmin ? "lg:grid-cols-2" : ""} gap-6`}>
        
        {/* ── Column 1: Password & Security ── */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b pb-4 border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700 border border-navy-100">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Security & Password Management</h3>
                <p className="text-xs font-semibold text-slate-400">Update account authentication credentials.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <PasswordInput
                id="newPassword"
                label="New Security Password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter new strong password"
                autoComplete="new-password"
              />

              <div>
                <PasswordInput
                  id="confirmPassword"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter new password to verify"
                  autoComplete="new-password"
                />
                {confirmPassword && (
                  <p
                    className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${
                      passwordsMatch ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Passwords match
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" /> Passwords do not match
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Encrypted authentication credential
                </p>
                <button
                  id="btn-change-password"
                  type="submit"
                  disabled={isPending || !newPassword || !confirmPassword || passwordsMismatch}
                  className="flex items-center gap-2 rounded-xl bg-navy-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-navy-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Save New Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Column 2: Hospital Settings (If Hospital Admin) ── */}
        {isHospitalAdmin && (
          <div className="space-y-6">
            <HospitalSettingsCard />
          </div>
        )}

      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 text-xs font-extrabold shadow-xl transition-all animate-in slide-in-from-bottom-4 ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" />
          )}
          {toast.message}
        </div>
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
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  const showLocalToast = (type: "success" | "error", message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4000);
  };

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
      showLocalToast("success", "Hospital settings updated successfully!");
    } catch (err: any) {
      showLocalToast("error", err?.response?.data?.message || err?.message || "Failed to update hospital settings.");
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-center">
        <span className="text-slate-500 text-xs font-semibold">Loading hospital configuration...</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 relative">
      <div className="flex items-center gap-3 border-b pb-4 border-slate-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-800">Hospital Profile & Policy Rules</h3>
          <p className="text-xs font-semibold text-slate-400">Configure organization identity, branding, and consultation limits.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Hospital Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-100"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Hospital Code (ReadOnly)</label>
            <input
              type="text"
              value={hospital?.code || ""}
              disabled
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-mono font-bold text-slate-500 cursor-not-allowed outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Contact Phone</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-100"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Hospital Physical Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 100 Health Avenue, Suite 400"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-100"
          />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Hospital Branding Logo</label>
          <FileUpload
            label="Hospital Logo"
            folder="hospital-logos"
            value={logoUrl}
            onChange={setLogoUrl}
          />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-indigo-600" /> OP Consultation Free Revisit Expiry (Days)
          </label>
          <p className="text-xs text-slate-400 font-medium">
            Specify the number of days a completed OP consultation remains valid for free revisits. After this limit, consultation fees apply again.
          </p>
          <input
            type="number"
            min="1"
            max="180"
            value={opExpiryLimit}
            onChange={(e) => setOpExpiryLimit(Number(e.target.value))}
            className="w-full sm:w-1/2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-800 outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-100"
            required
          />
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 rounded-xl bg-navy-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-navy-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Hospital Configuration"}
          </button>
        </div>
      </form>

      {toastMsg && (
        <div
          role="alert"
          className={`absolute bottom-4 right-4 z-55 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-lg transition-all animate-in slide-in-from-bottom-2 ${
            toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toastMsg.message}
        </div>
      )}
    </div>
  );
}
