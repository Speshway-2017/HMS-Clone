import { useState, useEffect } from "react";
import { Settings, ShieldAlert, KeyRound, Receipt, FileText, CheckCircle2, Lock, Save, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useChangePassword } from "../../features/auth";
import { useAuth } from "../../context/AuthContext";
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

export function PharmacySettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "security">("general");

  const [pharmacyName, setPharmacyName] = useState("Sunrise General Hospital Pharmacy");
  const [phone, setPhone] = useState("+1-555-0100");
  const [licenseNumber, setLicenseNumber] = useState("PH-2024-99882");
  const [taxRate, setTaxRate] = useState(12);
  const [invoicePrefix, setInvoicePrefix] = useState("PH-INV");
  const [terms, setTerms] = useState("Medicines once sold cannot be returned without doctor's modified prescription slip.");

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePasswordMutation = useChangePassword();

  useEffect(() => {
    // Load local config
    const savedName = localStorage.getItem("hms_pharmacy_name");
    if (savedName) setPharmacyName(savedName);

    const savedPhone = localStorage.getItem("hms_pharmacy_phone");
    if (savedPhone) setPhone(savedPhone);

    const savedLic = localStorage.getItem("hms_pharmacy_license");
    if (savedLic) setLicenseNumber(savedLic);

    const savedTax = localStorage.getItem("hms_pharmacy_tax_rate");
    if (savedTax) setTaxRate(Number(savedTax));

    const savedPrefix = localStorage.getItem("hms_pharmacy_invoice_prefix");
    if (savedPrefix) setInvoicePrefix(savedPrefix);

    const savedTerms = localStorage.getItem("hms_pharmacy_terms");
    if (savedTerms) setTerms(savedTerms);
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("hms_pharmacy_name", pharmacyName);
    localStorage.setItem("hms_pharmacy_phone", phone);
    localStorage.setItem("hms_pharmacy_license", licenseNumber);
    localStorage.setItem("hms_pharmacy_tax_rate", taxRate.toString());
    localStorage.setItem("hms_pharmacy_invoice_prefix", invoicePrefix);
    localStorage.setItem("hms_pharmacy_terms", terms);
    toast.success("Pharmacy Settings updated successfully!");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        newPassword,
        confirmPassword,
      });
      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password.");
    }
  };

  const TABS = [
    { id: "general", label: "General & Tax Setup", icon: <Settings className="h-4 w-4" /> },
    { id: "security", label: "Security & Credentials", icon: <KeyRound className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy Settings</h1>
          <p className="text-sm text-slate-500">Configure pharmacy retail rates, taxes, invoice setups, and user credentials.</p>
        </div>
        <Badge tone="info">Pharmacist Portal</Badge>
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
                  {user?.name?.charAt(0).toUpperCase() ?? "P"}
                </span>
              </div>
            )}
            <div>
              <p className="text-xl font-bold text-white">{pharmacyName}</p>
              <p className="text-sm text-navy-200">{user?.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                  License: {licenseNumber}
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                  GST Rate: {taxRate}%
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

      {/* ══════════════════ GENERAL TAB ══════════════════ */}
      {activeTab === "general" && (
        <div className="space-y-5">
          <Section title="General & Tax Configuration" subtitle="Pharmacy retail identity, tax rate, and contact phone details." icon={<Settings className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">Pharmacy Name *</label>
                  <input
                    type="text"
                    required
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">License Number *</label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
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

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">Taxes / GST Rate (%) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">Invoice ID Prefix *</label>
                  <input
                    type="text"
                    required
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 sm:w-1/2"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">Receipt Terms & Conditions</label>
                  <textarea
                    rows={3}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
                >
                  <Save className="h-4 w-4" /> Save General Settings
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ══════════════════ SECURITY TAB ══════════════════ */}
      {activeTab === "security" && (
        <div className="space-y-5">
          <Section title="Change Password" subtitle="Set a strong new password for your pharmacy user account." icon={<KeyRound className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handlePasswordSubmit} className="space-y-5" noValidate>
              <PasswordInput
                id="pharmacy-new-password"
                label="New Password *"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter your new strong password"
                autoComplete="new-password"
              />

              <PasswordInput
                id="pharmacy-confirm-password"
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
                  disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}
    </div>
  );
}
