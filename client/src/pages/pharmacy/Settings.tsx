import { useState, useEffect } from "react";
import { Settings, KeyRound, Lock, Save, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { InputField, TextareaField } from "../../components/ui/Field";
import { useChangePassword } from "../../features/auth";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

function Section({ title, subtitle, icon, children }: {
  title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-5 flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
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
  onBlur,
  error,
  placeholder,
  autoComplete,
  maxLength = 64,
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const input = e.currentTarget;
    const selLength = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    if (input.value.length >= maxLength && selLength === 0) {
      e.preventDefault();
      toast.error(`${label.replace(/\*/g, "").trim()} exceeds the maximum allowed length.`);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold uppercase text-slate-400">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <span className={`text-[11px] font-mono ${value.length > maxLength ? "text-red-600 font-bold" : "text-slate-400"}`}>
          {value.length}/{maxLength}
        </span>
      </div>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          maxLength={maxLength}
          onKeyDown={handleKeyDown}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-lg border px-4 py-2.5 pr-11 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition focus:ring-2 ${
            error
              ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100"
              : "border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-200"
          }`}
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
      {error && (
        <p className="text-xs font-medium text-rose-500 mt-0.5">{error}</p>
      )}
    </div>
  );
}

// ----------------- Validation Functions -----------------
const validatePharmacyName = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) {
    return "Please fill out this field";
  }
  if (trimmed.length < 2) {
    return "Pharmacy Name must be at least 2 characters. Please enter valid data";
  }
  if (trimmed.length > 100) {
    return "Pharmacy Name cannot exceed 100 characters. Please enter valid data";
  }
  if (!/^[a-zA-Z0-9\s\.\-/'&,()%+]+$/.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "Pharmacy Name contains invalid data. Please enter valid data";
  }
  return null;
};

const validateLicenseNumber = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) {
    return "Please fill out this field";
  }
  if (trimmed.length < 3) {
    return "License Number must be at least 3 characters. Please enter valid data";
  }
  if (trimmed.length > 50) {
    return "License Number cannot exceed 50 characters. Please enter valid data";
  }
  if (!/^[A-Za-z0-9\-\/\s]+$/.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "License Number contains invalid data. Please enter valid data";
  }
  return null;
};

const validateContactPhone = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) {
    return "Please fill out this field";
  }
  if (trimmed.length > 15) {
    return "Contact Phone cannot exceed 15 characters. Please enter valid data";
  }
  if (!/^[0-9+\-\s()]+$/.test(trimmed)) {
    return "Contact Phone contains invalid data. Please enter valid data";
  }
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15 || /^(\d)\1{6,}$/.test(digitsOnly)) {
    return "Contact Phone contains invalid data. Please enter valid data";
  }
  return null;
};

const validateTaxRate = (val: any): string | null => {
  if (val === "" || val === undefined || val === null) {
    return "Please fill out this field";
  }
  const num = Number(val);
  if (isNaN(num)) {
    return "Please enter a valid tax rate";
  }
  if (num < 0 || num > 100) {
    return "Taxes / GST Rate must be between 0 and 100%. Please enter valid data";
  }
  return null;
};

const validateInvoicePrefix = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) {
    return "Please fill out this field";
  }
  if (trimmed.length < 2) {
    return "Invoice ID Prefix must be at least 2 characters. Please enter valid data";
  }
  if (trimmed.length > 20) {
    return "Invoice ID Prefix cannot exceed 20 characters. Please enter valid data";
  }
  if (!/^[A-Za-z0-9\-_]+$/.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed)) {
    return "Invoice ID Prefix contains invalid data. Please enter valid data";
  }
  return null;
};

const validateTerms = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) return null; // optional
  if (trimmed.length > 500) {
    return "Receipt Terms & Conditions cannot exceed 500 characters. Please enter valid data";
  }
  if (/<script\b|javascript:/i.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed)) {
    return "Receipt Terms & Conditions contains invalid data. Please enter valid data";
  }
  return null;
};

const validateNewPassword = (val: string): string | null => {
  if (!val) {
    return "Please fill out this field";
  }
  if (val.length > 64) {
    return "New Password exceeds the maximum allowed length.";
  }
  if (val.length < 8) {
    return "Password must be at least 8 characters with letters and numbers/symbols. Please enter valid data";
  }
  if (!/(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*])/.test(val)) {
    return "Password must contain at least one letter and one number or symbol. Please enter valid data";
  }
  return null;
};

const validateConfirmPassword = (val: string, newPw: string): string | null => {
  if (!val) {
    return "Please fill out this field";
  }
  if (val.length > 64) {
    return "Confirm New Password exceeds the maximum allowed length.";
  }
  if (val !== newPw) {
    return "Passwords do not match. Please enter valid data";
  }
  return null;
};

export function PharmacySettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "security">("general");

  const [pharmacyName, setPharmacyName] = useState("Sunrise General Hospital Pharmacy");
  const [phone, setPhone] = useState("+1-555-0100");
  const [licenseNumber, setLicenseNumber] = useState("PH-2024-99882");
  const [taxRate, setTaxRate] = useState<number | string>(12);
  const [invoicePrefix, setInvoicePrefix] = useState("PH-INV");
  const [terms, setTerms] = useState("Medicines once sold cannot be returned without doctor's modified prescription slip.");

  // General errors
  const [generalErrors, setGeneralErrors] = useState<Record<string, string | null>>({});

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string | null>>({});

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

  const handleTextKeyDown = (maxLen: number, fieldLabel: string) => (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const input = e.currentTarget;
    const selLength = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    if (input.value.length >= maxLen && selLength === 0) {
      e.preventDefault();
      toast.error(`${fieldLabel} cannot exceed ${maxLen} characters. Please enter valid data`);
    }
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) return;
    if (!/[\d+\-\s()]/.test(e.key)) {
      e.preventDefault();
      return;
    }
    const input = e.currentTarget;
    const selLength = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    if (input.value.length >= 15 && selLength === 0) {
      e.preventDefault();
      toast.error("Contact Phone cannot exceed 15 characters. Please enter valid data");
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validatePharmacyName(pharmacyName);
    const licErr = validateLicenseNumber(licenseNumber);
    const phoneErr = validateContactPhone(phone);
    const taxErr = validateTaxRate(taxRate);
    const prefixErr = validateInvoicePrefix(invoicePrefix);
    const termsErr = validateTerms(terms);

    setGeneralErrors({
      pharmacyName: nameErr,
      licenseNumber: licErr,
      phone: phoneErr,
      taxRate: taxErr,
      invoicePrefix: prefixErr,
      terms: termsErr,
    });

    const firstErr = nameErr || licErr || phoneErr || taxErr || prefixErr || termsErr;
    if (firstErr) {
      toast.error(firstErr);
      return;
    }

    localStorage.setItem("hms_pharmacy_name", pharmacyName.trim());
    localStorage.setItem("hms_pharmacy_phone", phone.trim());
    localStorage.setItem("hms_pharmacy_license", licenseNumber.trim());
    localStorage.setItem("hms_pharmacy_tax_rate", taxRate.toString());
    localStorage.setItem("hms_pharmacy_invoice_prefix", invoicePrefix.trim());
    localStorage.setItem("hms_pharmacy_terms", terms.trim());
    toast.success("Pharmacy Settings updated successfully!");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErr = validateNewPassword(newPassword);
    const confErr = validateConfirmPassword(confirmPassword, newPassword);

    setPasswordErrors({
      newPassword: newErr,
      confirmPassword: confErr,
    });

    if (newErr || confErr) {
      toast.error(newErr || confErr || "Please fix password errors.");
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
      setPasswordErrors({});
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
              <p className="text-sm text-emerald-200">{user?.email}</p>
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
                ? "border-emerald-700 text-emerald-700 font-semibold"
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
          <Section title="General & Tax Configuration" subtitle="Pharmacy retail identity, tax rate, and contact phone details." icon={<Settings className="h-5 w-5 text-emerald-700" />}>
            <form onSubmit={handleSaveConfig} noValidate className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Pharmacy Name"
                  required
                  value={pharmacyName}
                  maxLength={100}
                  showCharCount
                  charCount={pharmacyName.length}
                  minCharCount={2}
                  error={generalErrors.pharmacyName}
                  onKeyDown={handleTextKeyDown(100, "Pharmacy Name")}
                  onChange={(e) => {
                    setPharmacyName(e.target.value);
                    if (generalErrors.pharmacyName) {
                      setGeneralErrors((prev) => ({ ...prev, pharmacyName: null }));
                    }
                  }}
                  onBlur={() => {
                    const err = validatePharmacyName(pharmacyName);
                    setGeneralErrors((prev) => ({ ...prev, pharmacyName: err }));
                  }}
                />

                <InputField
                  label="License Number"
                  required
                  value={licenseNumber}
                  maxLength={50}
                  showCharCount
                  charCount={licenseNumber.length}
                  minCharCount={3}
                  error={generalErrors.licenseNumber}
                  onKeyDown={handleTextKeyDown(50, "License Number")}
                  onChange={(e) => {
                    setLicenseNumber(e.target.value);
                    if (generalErrors.licenseNumber) {
                      setGeneralErrors((prev) => ({ ...prev, licenseNumber: null }));
                    }
                  }}
                  onBlur={() => {
                    const err = validateLicenseNumber(licenseNumber);
                    setGeneralErrors((prev) => ({ ...prev, licenseNumber: err }));
                  }}
                />

                <InputField
                  label="Contact Phone"
                  required
                  value={phone}
                  maxLength={15}
                  showCharCount
                  charCount={phone.length}
                  error={generalErrors.phone}
                  onKeyDown={handlePhoneKeyDown}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (generalErrors.phone) {
                      setGeneralErrors((prev) => ({ ...prev, phone: null }));
                    }
                  }}
                  onBlur={() => {
                    const err = validateContactPhone(phone);
                    setGeneralErrors((prev) => ({ ...prev, phone: err }));
                  }}
                />

                <InputField
                  label="Taxes / GST Rate (%)"
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={taxRate}
                  error={generalErrors.taxRate}
                  onKeyDown={(e) => {
                    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                  }}
                  onChange={(e) => {
                    setTaxRate(e.target.value === "" ? "" as any : Number(e.target.value));
                    if (generalErrors.taxRate) {
                      setGeneralErrors((prev) => ({ ...prev, taxRate: null }));
                    }
                  }}
                  onBlur={() => {
                    const err = validateTaxRate(taxRate);
                    setGeneralErrors((prev) => ({ ...prev, taxRate: err }));
                  }}
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="sm:w-1/2">
                  <InputField
                    label="Invoice ID Prefix"
                    required
                    value={invoicePrefix}
                    maxLength={20}
                    showCharCount
                    charCount={invoicePrefix.length}
                    minCharCount={2}
                    error={generalErrors.invoicePrefix}
                    onKeyDown={handleTextKeyDown(20, "Invoice ID Prefix")}
                    onChange={(e) => {
                      setInvoicePrefix(e.target.value);
                      if (generalErrors.invoicePrefix) {
                        setGeneralErrors((prev) => ({ ...prev, invoicePrefix: null }));
                      }
                    }}
                    onBlur={() => {
                      const err = validateInvoicePrefix(invoicePrefix);
                      setGeneralErrors((prev) => ({ ...prev, invoicePrefix: err }));
                    }}
                  />
                </div>

                <TextareaField
                  label="Receipt Terms & Conditions"
                  rows={3}
                  value={terms}
                  maxLength={500}
                  showCharCount
                  charCount={terms.length}
                  error={generalErrors.terms}
                  onKeyDown={handleTextKeyDown(500, "Receipt Terms & Conditions")}
                  onChange={(e) => {
                    setTerms(e.target.value);
                    if (generalErrors.terms) {
                      setGeneralErrors((prev) => ({ ...prev, terms: null }));
                    }
                  }}
                  onBlur={() => {
                    const err = validateTerms(terms);
                    setGeneralErrors((prev) => ({ ...prev, terms: err }));
                  }}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
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
          <Section title="Change Password" subtitle="Set a strong new password for your pharmacy user account." icon={<KeyRound className="h-5 w-5 text-emerald-700" />}>
            <form onSubmit={handlePasswordSubmit} className="space-y-5" noValidate>
              <PasswordInput
                id="pharmacy-new-password"
                label="New Password"
                required
                value={newPassword}
                maxLength={64}
                error={passwordErrors.newPassword}
                onChange={(v) => {
                  setNewPassword(v);
                  if (passwordErrors.newPassword) {
                    setPasswordErrors((prev) => ({ ...prev, newPassword: null }));
                  }
                }}
                onBlur={() => {
                  const err = validateNewPassword(newPassword);
                  setPasswordErrors((prev) => ({ ...prev, newPassword: err }));
                }}
                placeholder="Enter your new strong password"
                autoComplete="new-password"
              />

              <PasswordInput
                id="pharmacy-confirm-password"
                label="Confirm New Password"
                required
                value={confirmPassword}
                maxLength={64}
                error={passwordErrors.confirmPassword}
                onChange={(v) => {
                  setConfirmPassword(v);
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors((prev) => ({ ...prev, confirmPassword: null }));
                  }
                }}
                onBlur={() => {
                  const err = validateConfirmPassword(confirmPassword, newPassword);
                  setPasswordErrors((prev) => ({ ...prev, confirmPassword: err }));
                }}
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
                  className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
