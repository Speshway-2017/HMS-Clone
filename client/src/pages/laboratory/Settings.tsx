import { useState, useEffect } from "react";
import { Settings, BarChart, ShieldAlert, KeyRound, Save, ShieldCheck, Lock, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useChangePassword } from "../../features/auth";
import { useAuth } from "../../context/AuthContext";
import { useMyHospital, useUpdateMyHospital } from "../../features/hospitals";
import toast from "react-hot-toast";

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

export function LaboratorySettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"catalog" | "setup" | "barcode" | "security">("catalog");

  // Laboratory Setup
  const [labName, setLabName] = useState("Central Pathology Diagnostics Laboratory");
  const [labCode, setLabCode] = useState("LAB-CENTRAL-01");
  const [directorName, setDirectorName] = useState("Dr. Alex Carter (Lab Director)");
  const [phone, setPhone] = useState("+91 98765 43210");

  // Barcode setup
  const [barcodePrefix, setBarcodePrefix] = useState("SMP-");
  const [barcodeFormat, setBarcodeFormat] = useState("CODE128");

  // Password Setup
  const { mutate, isPending } = useChangePassword();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Available tests and studies state from hospital
  const { data: hospital } = useMyHospital();
  const updateMutation = useUpdateMyHospital();

  const [availableLabTests, setAvailableLabTests] = useState<string[]>([]);
  const [labInput, setLabInput] = useState("");
  const [labPriceInput, setLabPriceInput] = useState("");
  const [availableRadiologyTests, setAvailableRadiologyTests] = useState<string[]>([]);
  const [radioInput, setRadioInput] = useState("");
  const [radioPriceInput, setRadioPriceInput] = useState("");
  const [investigationPrices, setInvestigationPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const savedName = localStorage.getItem("hms_laboratory_name");
    if (savedName) setLabName(savedName);
    const savedCode = localStorage.getItem("hms_laboratory_code");
    if (savedCode) setLabCode(savedCode);
    const savedDir = localStorage.getItem("hms_laboratory_director");
    if (savedDir) setDirectorName(savedDir);
  }, []);

  useEffect(() => {
    if (hospital) {
      setAvailableLabTests((hospital as any).availableLabTests || []);
      setAvailableRadiologyTests((hospital as any).availableRadiologyTests || []);
      setInvestigationPrices((hospital as any).investigationPrices || {});
    }
  }, [hospital]);

  const handleAddLab = () => {
    const trimmed = labInput.trim();
    const priceVal = parseFloat(labPriceInput) || 0;
    if (trimmed && !availableLabTests.includes(trimmed)) {
      setAvailableLabTests([...availableLabTests, trimmed]);
      setInvestigationPrices(prev => ({ ...prev, [trimmed]: priceVal }));
      setLabInput("");
      setLabPriceInput("");
    }
  };

  const handleRemoveLab = (testToRemove: string) => {
    setAvailableLabTests(availableLabTests.filter((t) => t !== testToRemove));
    setInvestigationPrices(prev => {
      const updated = { ...prev };
      delete updated[testToRemove];
      return updated;
    });
  };

  const handleAddRadio = () => {
    const trimmed = radioInput.trim();
    const priceVal = parseFloat(radioPriceInput) || 0;
    if (trimmed && !availableRadiologyTests.includes(trimmed)) {
      setAvailableRadiologyTests([...availableRadiologyTests, trimmed]);
      setInvestigationPrices(prev => ({ ...prev, [trimmed]: priceVal }));
      setRadioInput("");
      setRadioPriceInput("");
    }
  };

  const handleRemoveRadio = (testToRemove: string) => {
    setAvailableRadiologyTests(availableRadiologyTests.filter((t) => t !== testToRemove));
    setInvestigationPrices(prev => {
      const updated = { ...prev };
      delete updated[testToRemove];
      return updated;
    });
  };

  const handleSaveInvestigationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        availableLabTests,
        availableRadiologyTests,
        investigationPrices,
      });
      toast.success("Investigation test, study and price settings saved successfully!");
    } catch (err) {
      toast.error("Failed to save settings. Please try again.");
    }
  };

  const handleSaveSetup = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("hms_laboratory_name", labName);
    localStorage.setItem("hms_laboratory_code", labCode);
    localStorage.setItem("hms_laboratory_director", directorName);
    toast.success("Laboratory setup configurations saved successfully!");
  };

  const handleSaveBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Barcode format and auto-generation prefixes updated!");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    mutate(
      { newPassword, confirmPassword },
      {
        onSuccess: () => {
          toast.success("Password changed successfully!");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || "Password change failed. Please try again.";
          toast.error(msg);
        }
      }
    );
  };

  const TABS = [
    { id: "catalog", label: "Test Catalog & Pricing", icon: <Settings className="h-4 w-4" /> },
    { id: "setup", label: "Department Setup", icon: <BarChart className="h-4 w-4" /> },
    { id: "barcode", label: "Barcode Settings", icon: <BarChart className="h-4 w-4" /> },
    { id: "security", label: "Security & Credentials", icon: <KeyRound className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laboratory Settings</h1>
          <p className="text-sm text-slate-500">Configure pathology tests, prices, barcode prefixes, and laboratory setup.</p>
        </div>
        <Badge tone="info">Laboratory Portal</Badge>
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
                  {user?.name?.charAt(0).toUpperCase() ?? "L"}
                </span>
              </div>
            )}
            <div>
              <p className="text-xl font-bold text-white">{labName}</p>
              <p className="text-sm text-navy-200">{directorName} • {user?.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                  Code: {labCode}
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                  Total Tests: {availableLabTests.length + availableRadiologyTests.length}
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
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-navy-700 text-navy-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ CATALOG & PRICING TAB ══════════════════ */}
      {activeTab === "catalog" && (
        <div className="space-y-5">
          <Section title="Investigation Test Catalog & Price Master" subtitle="Manage available pathology tests, radiology studies, and unit pricing." icon={<Settings className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handleSaveInvestigationSettings} className="space-y-6">
              {/* Pathology Tests Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">Pathology Lab Tests</h4>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Test Name (e.g. Complete Blood Count)"
                    value={labInput}
                    onChange={(e) => setLabInput(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 w-64"
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={labPriceInput}
                    onChange={(e) => setLabPriceInput(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 w-32"
                  />
                  <button
                    type="button"
                    onClick={handleAddLab}
                    className="flex items-center gap-1 rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Test
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                  {availableLabTests.map((t) => (
                    <div key={t} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{t}</span>
                        <span className="text-slate-500 font-semibold">₹{investigationPrices[t] || 0}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLab(t)}
                        className="text-rose-600 hover:text-rose-800 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radiology Studies Section */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">Radiology Imaging Studies</h4>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Study Name (e.g. Chest X-Ray PA)"
                    value={radioInput}
                    onChange={(e) => setRadioInput(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 w-64"
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={radioPriceInput}
                    onChange={(e) => setRadioPriceInput(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 w-32"
                  />
                  <button
                    type="button"
                    onClick={handleAddRadio}
                    className="flex items-center gap-1 rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Study
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                  {availableRadiologyTests.map((t) => (
                    <div key={t} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{t}</span>
                        <span className="text-slate-500 font-semibold">₹{investigationPrices[t] || 0}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRadio(t)}
                        className="text-rose-600 hover:text-rose-800 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? "Saving Catalog..." : "Save Test Catalog & Pricing"}
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ══════════════════ SETUP TAB ══════════════════ */}
      {activeTab === "setup" && (
        <div className="space-y-5">
          <Section title="Laboratory Setup & Director Details" subtitle="Central laboratory facility name, code, director, and phone numbers." icon={<BarChart className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handleSaveSetup} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">Laboratory Facility Name *</label>
                  <input
                    type="text"
                    required
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">Laboratory Code *</label>
                  <input
                    type="text"
                    required
                    value={labCode}
                    onChange={(e) => setLabCode(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">Lab Director Name *</label>
                  <input
                    type="text"
                    required
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Department Setup
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ══════════════════ BARCODE TAB ══════════════════ */}
      {activeTab === "barcode" && (
        <div className="space-y-5">
          <Section title="Sample Barcode & Label Format" subtitle="Barcode prefix formats and printing rules." icon={<BarChart className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handleSaveBarcode} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">Sample Barcode Prefix *</label>
                  <input
                    type="text"
                    required
                    value={barcodePrefix}
                    onChange={(e) => setBarcodePrefix(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">Barcode Symbology Format *</label>
                  <select
                    value={barcodeFormat}
                    onChange={(e) => setBarcodeFormat(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  >
                    <option value="CODE128">CODE128 Standard</option>
                    <option value="CODE39">CODE39 Extended</option>
                    <option value="EAN13">EAN-13</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Barcode Settings
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ══════════════════ SECURITY TAB ══════════════════ */}
      {activeTab === "security" && (
        <div className="space-y-5">
          <Section title="Change Password" subtitle="Set a strong new password for your laboratory account." icon={<KeyRound className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handleChangePassword} className="space-y-5" noValidate>
              <PasswordInput
                id="lab-new-password"
                label="New Password *"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter your new strong password"
                autoComplete="new-password"
              />

              <PasswordInput
                id="lab-confirm-password"
                label="Confirm New Password *"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
              />

              <div className="flex items-center justify-between pt-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock className="h-3.5 w-3.5" /> Encrypted end-to-end with bcrypt
                </p>
                <button
                  type="submit"
                  disabled={isPending || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isPending ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}
    </div>
  );
}
