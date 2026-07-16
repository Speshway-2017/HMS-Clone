import { useState, useEffect } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, CheckCircle2, XCircle, Lock } from "lucide-react";
import { useChangePassword } from "../../features/auth";
import { useAuth } from "../../context/AuthContext";
import { useMyHospital, useUpdateMyHospital } from "../../features/hospitals";

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
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user } = useAuth();
  const { mutate, isPending } = useChangePassword();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const passwordsMatch = newPassword !== "" && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
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

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account preferences</p>
      </div>

      {/* ── Profile card (read-only info) ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-16 w-16 rounded-full object-cover ring-4 ring-navy-100"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-100 text-navy-700 ring-4 ring-navy-50">
              <span className="text-2xl font-bold">
                {user?.name?.charAt(0).toUpperCase() ?? "?"}
              </span>
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-slate-800">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-medium capitalize text-navy-700">
              {user?.role?.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* ── Change password card ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100">
            <KeyRound className="h-5 w-5 text-navy-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Change Password</h2>
            <p className="text-xs text-slate-500">Set a new password for your account.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <PasswordInput
            id="newPassword"
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Enter your new password"
            autoComplete="new-password"
          />

          <div>
            <PasswordInput
              id="confirmPassword"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
            />
            {confirmPassword && (
              <p
                className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                  passwordsMatch ? "text-emerald-600" : "text-red-500"
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

          <div className="flex items-center justify-between pt-2">
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Your password is encrypted end-to-end
            </p>
            <button
              id="btn-change-password"
              type="submit"
              disabled={isPending || !newPassword || !confirmPassword}
              className="flex items-center gap-2 rounded-xl bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium shadow-xl transition-all animate-in slide-in-from-bottom-4 ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
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

      {user?.role === "hospital_admin" && (
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
  const [opExpiryLimit, setOpExpiryLimit] = useState(10);
  const [availableLabTests, setAvailableLabTests] = useState<string[]>([]);
  const [labInput, setLabInput] = useState("");
  const [availableRadiologyTests, setAvailableRadiologyTests] = useState<string[]>([]);
  const [radioInput, setRadioInput] = useState("");
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (hospital) {
      setName(hospital.name || "");
      setAddress(hospital.address || "");
      setContactEmail(hospital.contactEmail || "");
      setContactPhone(hospital.contactPhone || "");
      setOpExpiryLimit(hospital.opExpiryLimit ?? 10);
      setAvailableLabTests((hospital as any).availableLabTests || []);
      setAvailableRadiologyTests((hospital as any).availableRadiologyTests || []);
    }
  }, [hospital]);

  const showLocalToast = (type: "success" | "error", message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleAddLab = () => {
    const trimmed = labInput.trim();
    if (trimmed && !availableLabTests.includes(trimmed)) {
      setAvailableLabTests([...availableLabTests, trimmed]);
      setLabInput("");
    }
  };

  const handleRemoveLab = (testToRemove: string) => {
    setAvailableLabTests(availableLabTests.filter((t) => t !== testToRemove));
  };

  const handleAddRadio = () => {
    const trimmed = radioInput.trim();
    if (trimmed && !availableRadiologyTests.includes(trimmed)) {
      setAvailableRadiologyTests([...availableRadiologyTests, trimmed]);
      setRadioInput("");
    }
  };

  const handleRemoveRadio = (testToRemove: string) => {
    setAvailableRadiologyTests(availableRadiologyTests.filter((t) => t !== testToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        name,
        address,
        contactEmail,
        contactPhone,
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
        <span className="text-slate-500 text-sm">Loading hospital settings...</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100">
          <ShieldCheck className="h-5 w-5 text-navy-700" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Hospital Settings</h2>
          <p className="text-xs text-slate-550">Configure global hospital rules and policies.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Hospital Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Hospital Code (ReadOnly)</label>
            <input
              type="text"
              value={hospital?.code || ""}
              disabled
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 cursor-not-allowed outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Contact Phone</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4">
          <label className="text-sm font-semibold text-slate-850">OP Consultation Expiry Limit (Days)</label>
          <p className="text-xs text-slate-400">Specify the number of days a completed OP consultation remains valid for free revisits. After this period, patients will be charged consultation fees again.</p>
          <input
            type="number"
            min="1"
            max="180"
            value={opExpiryLimit}
            onChange={(e) => setOpExpiryLimit(Number(e.target.value))}
            className="w-full sm:w-1/3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
            required
          />
        </div>

        {/* Laboratory Tests Configuration */}
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
          <label className="text-sm font-semibold text-slate-850">Available Laboratory Tests</label>
          <p className="text-xs text-slate-400">Configure the list of lab tests that doctors can prescribe to patients.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Thyroid Profile"
              value={labInput}
              onChange={(e) => setLabInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddLab();
                }
              }}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
            />
            <button
              type="button"
              onClick={handleAddLab}
              className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {availableLabTests.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No lab tests configured yet.</span>
            ) : (
              availableLabTests.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs text-slate-700 font-medium"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveLab(t)}
                    className="text-slate-450 hover:text-slate-650 font-bold focus:outline-none ml-1 text-sm leading-none"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Radiology Studies Configuration */}
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
          <label className="text-sm font-semibold text-slate-850">Available Radiology Studies</label>
          <p className="text-xs text-slate-400">Configure the types of radiology scans or studies available for prescription.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Chest X-Ray"
              value={radioInput}
              onChange={(e) => setRadioInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRadio();
                }
              }}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
            />
            <button
              type="button"
              onClick={handleAddRadio}
              className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {availableRadiologyTests.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No radiology scan modalities configured yet.</span>
            ) : (
              availableRadiologyTests.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs text-slate-700 font-medium"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveRadio(t)}
                    className="text-slate-450 hover:text-slate-650 font-bold focus:outline-none ml-1 text-sm leading-none"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-xl bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 animate-all"
          >
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      {toastMsg && (
        <div
          role="alert"
          className={`absolute bottom-4 right-4 z-55 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-lg transition-all animate-in slide-in-from-bottom-2 ${
            toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toastMsg.message}
        </div>
      )}
    </div>
  );
}
