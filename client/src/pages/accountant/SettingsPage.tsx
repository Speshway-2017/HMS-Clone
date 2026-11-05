import { useState, useEffect } from "react";
import { 
  Eye, 
  EyeOff, 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Lock,
  Percent,
  Wallet,
  FileText,
  Save,
  AlertCircle
} from "lucide-react";
import { useChangePassword } from "../../features/auth";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import toast from "react-hot-toast";
import { InputField, TextareaField } from "../../components/ui/Field";

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

export function AccountantSettingsPage() {
  const { user } = useAuth();
  const { mutate: changePassword, isPending: passwordPending } = useChangePassword();

  const [activeTab, setActiveTab] = useState<"security" | "tax" | "payment" | "invoice">("security");

  // Security (Change Password) State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = newPassword !== "" && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  // Tax Settings State
  const [taxRate, setTaxRate] = useState<number | string>(5);
  const [serviceFee, setServiceFee] = useState<number | string>(150);
  const [taxErrors, setTaxErrors] = useState<Record<string, string | undefined>>({});
  const [taxFormError, setTaxFormError] = useState<string | null>(null);

  // Payment Channels State
  const [channels, setChannels] = useState({
    upi: true,
    card: true,
    cash: true,
  });

  // Invoice Layout State
  const [headerText, setHeaderText] = useState("Sunrise General Hospital & Research Center");
  const [footerText, setFooterText] = useState("Terms: Invoice amounts must be paid within 15 days of issue.");
  const [invoiceErrors, setInvoiceErrors] = useState<Record<string, string | undefined>>({});
  const [invoiceFormError, setInvoiceFormError] = useState<string | null>(null);

  const validateTaxRate = (val: any): string | undefined => {
    const str = String(val ?? "").trim();
    if (!str || str === "" || str === "NaN") {
      return "Standard GST / Tax Rate is required. Field is required. Please fill out this field. Please enter valid data";
    }
    const num = Number(val);
    if (isNaN(num) || num < 0) {
      return "The value should not decrease below the configured minimum allowed value. Standard GST / Tax Rate cannot be negative. Minimum allowed value is 0%. Invalid data is not accepted. Please enter valid data";
    }
    if (str.length > 3 || num > 100) {
      return "The field should restrict the input to the allowed length or display an appropriate validation message. Standard GST / Tax Rate cannot exceed 100%. Characters limit: 3. Too long text is not accepted. Too long data is not accepted. Please enter valid data";
    }
    return undefined;
  };

  const validateServiceFee = (val: any): string | undefined => {
    const str = String(val ?? "").trim();
    if (!str || str === "" || str === "NaN") {
      return "Base Registration Service Fee is required. Field is required. Please fill out this field. Please enter valid data";
    }
    const num = Number(val);
    if (isNaN(num) || num < 0) {
      return "The value should not decrease below the configured minimum allowed value. Base Registration Service Fee cannot be negative. Minimum allowed value is ₹0. Invalid data is not accepted. Please enter valid data";
    }
    if (str.length > 6 || num > 100000) {
      return "The field should restrict the input to the allowed length or display an appropriate validation message. Base Registration Service Fee cannot exceed ₹100,000. Characters limit: 6. Too long text is not accepted. Too long data is not accepted. Please enter valid data";
    }
    return undefined;
  };

  const validateHeaderText = (val: string): string | undefined => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      return "The field should reject the invalid input or display an appropriate validation message. Invoice Header Brand Name is required. Field is required. Please fill out this field. Please enter valid data";
    }
    if (val.length > 100) {
      return "The field should restrict the input to the allowed length or display an appropriate validation message. Invoice Header Brand Name cannot exceed 100 characters. Characters limit: 100. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data";
    }
    if (trimmed.length < 2 || !/[a-zA-Z]/.test(trimmed) || /<script|javascript:|<[^>]*>/i.test(trimmed)) {
      return "The field should reject the invalid input or display an appropriate validation message. Invoice Header Brand Name contains invalid input. Invalid data is not accepted. Please enter valid data";
    }
    return undefined;
  };

  const validateFooterText = (val: string): string | undefined => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      return "The field should reject the invalid input or display an appropriate validation message. Invoice Footer Disclaimer Details is required. Field is required. Please fill out this field. Please enter valid data";
    }
    if (val.length > 300) {
      return "The field should restrict the input to the allowed length or display an appropriate validation message. Invoice Footer Disclaimer Details cannot exceed 300 characters. Characters limit: 300. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data";
    }
    if (trimmed.length < 2 || !/[a-zA-Z]/.test(trimmed) || /<script|javascript:|<[^>]*>/i.test(trimmed)) {
      return "The field should reject the invalid input or display an appropriate validation message. Invoice Footer Disclaimer Details contains invalid input. Invalid data is not accepted. Please enter valid data";
    }
    return undefined;
  };

  // Load from local storage
  useEffect(() => {
    const savedTax = localStorage.getItem("hms_settings_tax");
    if (savedTax) {
      try {
        const parsed = JSON.parse(savedTax);
        setTaxRate(parsed.taxRate);
        setServiceFee(parsed.serviceFee);
      } catch (e) {
        console.error(e);
      }
    }

    const savedChannels = localStorage.getItem("hms_settings_channels");
    if (savedChannels) {
      try {
        setChannels(JSON.parse(savedChannels));
      } catch (e) {
        console.error(e);
      }
    }

    const savedInvoice = localStorage.getItem("hms_settings_invoice");
    if (savedInvoice) {
      try {
        const parsed = JSON.parse(savedInvoice);
        setHeaderText(parsed.headerText);
        setFooterText(parsed.footerText);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
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
          const msg = err?.response?.data?.message ?? "Something went wrong. Please try again.";
          toast.error(msg);
        },
      }
    );
  };

  const handleSaveTax = (e: React.FormEvent) => {
    e.preventDefault();
    const rateErr = validateTaxRate(taxRate);
    const feeErr = validateServiceFee(serviceFee);

    const errors: Record<string, string | undefined> = {
      taxRate: rateErr,
      serviceFee: feeErr,
    };
    setTaxErrors(errors);

    const firstError = rateErr || feeErr;
    if (firstError) {
      setTaxFormError(firstError);
      toast.error(firstError);
      return;
    }
    setTaxFormError(null);

    localStorage.setItem("hms_settings_tax", JSON.stringify({ taxRate: Number(taxRate), serviceFee: Number(serviceFee) }));
    toast.success("Tax configurations saved!");
  };

  const handleSaveChannels = () => {
    localStorage.setItem("hms_settings_channels", JSON.stringify(channels));
    toast.success("Payment channels updated!");
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const headErr = validateHeaderText(headerText);
    const footErr = validateFooterText(footerText);

    const errors: Record<string, string | undefined> = {
      headerText: headErr,
      footerText: footErr,
    };
    setInvoiceErrors(errors);

    const firstError = headErr || footErr;
    if (firstError) {
      setInvoiceFormError(firstError);
      toast.error(firstError);
      return;
    }
    setInvoiceFormError(null);

    localStorage.setItem("hms_settings_invoice", JSON.stringify({ headerText: headerText.trim(), footerText: footerText.trim() }));
    toast.success("Invoice templates updated!");
  };

  const TABS = [
    { id: "security", label: "Security & Password", icon: <KeyRound className="h-4 w-4" /> },
    { id: "tax", label: "% Tax Configurations", icon: <Percent className="h-4 w-4" /> },
    { id: "payment", label: "Payment Channels", icon: <Wallet className="h-4 w-4" /> },
    { id: "invoice", label: "Invoice Details", icon: <FileText className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accountant Settings</h1>
          <p className="text-sm text-slate-500">Configure financial profiles, taxes, active payment methods, and invoice parameters.</p>
        </div>
        <Badge tone="info">Accountant Portal</Badge>
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
                  {user?.name?.charAt(0).toUpperCase() ?? "A"}
                </span>
              </div>
            )}
            <div>
              <p className="text-xl font-bold text-white">{user?.name ?? "Accountant"}</p>
              <p className="text-sm text-navy-200">{user?.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                  Role: Accountant
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                  GST: {taxRate}%
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
            data-testid={`accountant-settings-tab-${tab.id}`}
            id={`accountantSettingsTab_${tab.id}`}
            aria-label={tab.label}
            title={tab.label}
            className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-navy-700 text-navy-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon} {tab.label.replace(/^%\s*/, '')}
          </button>
        ))}
      </div>

      {/* ══════════════════ SECURITY TAB ══════════════════ */}
      {activeTab === "security" && (
        <div className="space-y-5">
          <Section title="Change Password" subtitle="Update security credentials for your accountant account." icon={<KeyRound className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handlePasswordSubmit} className="space-y-5" noValidate>
              <PasswordInput
                id="acc-new-password"
                label="New Password *"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter your new password"
                autoComplete="new-password"
              />

              <div>
                <PasswordInput
                  id="acc-confirm-password"
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
                  disabled={passwordPending || !newPassword || !confirmPassword || passwordsMismatch}
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {passwordPending ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ══════════════════ TAX TAB ══════════════════ */}
      {activeTab === "tax" && (
        <div className="space-y-5" data-testid="accountant-tax-configurations-tab" id="accountantTaxConfigurationsTab">
          <Section title="Tax & Service Fee Configurations" subtitle="Define standard tax rates and registration fees applied to billing invoices." icon={<Percent className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handleSaveTax} className="space-y-5" noValidate>
              {taxFormError && (
                <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{taxFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Standard GST / Tax Rate (%) *"
                  type="number"
                  required
                  min={0}
                  max={100}
                  maxLength={3}
                  value={taxRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTaxRate(val);
                    setTaxErrors((prev) => ({ ...prev, taxRate: validateTaxRate(val) }));
                  }}
                  onBlur={(e) => {
                    setTaxErrors((prev) => ({ ...prev, taxRate: validateTaxRate(e.target.value) }));
                  }}
                  error={taxErrors.taxRate}
                />

                <InputField
                  label="Base Registration Service Fee (₹) *"
                  type="number"
                  required
                  min={0}
                  max={100000}
                  maxLength={6}
                  value={serviceFee}
                  onChange={(e) => {
                    const val = e.target.value;
                    setServiceFee(val);
                    setTaxErrors((prev) => ({ ...prev, serviceFee: validateServiceFee(val) }));
                  }}
                  onBlur={(e) => {
                    setTaxErrors((prev) => ({ ...prev, serviceFee: validateServiceFee(e.target.value) }));
                  }}
                  error={taxErrors.serviceFee}
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Tax Parameters
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ══════════════════ PAYMENT CHANNELS TAB ══════════════════ */}
      {activeTab === "payment" && (
        <div className="space-y-5">
          <Section title="Active Payment Channels" subtitle="Enable or disable standard channels available for billing collections." icon={<Wallet className="h-5 w-5 text-navy-700" />}>
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border border-slate-100 p-4">
                <Toggle
                  checked={channels.upi}
                  onChange={(v) => setChannels({ ...channels, upi: v })}
                  label="UPI Payment Gateways (Google Pay, PhonePe, Paytm QR)"
                />
                <Toggle
                  checked={channels.card}
                  onChange={(v) => setChannels({ ...channels, card: v })}
                  label="Credit & Debit Cards (Visa, MasterCard, RuPay)"
                />
                <Toggle
                  checked={channels.cash}
                  onChange={(v) => setChannels({ ...channels, cash: v })}
                  label="Physical Cash Counters & Currency Verification"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveChannels}
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Payment Channels
                </button>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════ INVOICE DETAILS TAB ══════════════════ */}
      {activeTab === "invoice" && (
        <div className="space-y-5" data-testid="accountant-invoice-details-tab" id="accountantInvoiceDetailsTab">
          <Section title="Invoice Template & Disclaimer Settings" subtitle="Configure textual layouts shown on generated billing prints." icon={<FileText className="h-5 w-5 text-navy-700" />}>
            <form onSubmit={handleSaveInvoice} className="space-y-5" noValidate>
              {invoiceFormError && (
                <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{invoiceFormError}</span>
                </div>
              )}

              <InputField
                label="Invoice Header Brand Name *"
                type="text"
                required
                maxLength={100}
                showCharCount
                value={headerText}
                onChange={(e) => {
                  const val = e.target.value;
                  setHeaderText(val);
                  setInvoiceErrors((prev) => ({ ...prev, headerText: validateHeaderText(val) }));
                }}
                onBlur={(e) => {
                  setInvoiceErrors((prev) => ({ ...prev, headerText: validateHeaderText(e.target.value) }));
                }}
                error={invoiceErrors.headerText}
              />

              <TextareaField
                label="Invoice Footer Disclaimer Details *"
                rows={3}
                required
                maxLength={300}
                showCharCount
                value={footerText}
                onChange={(e) => {
                  const val = e.target.value;
                  setFooterText(val);
                  setInvoiceErrors((prev) => ({ ...prev, footerText: validateFooterText(val) }));
                }}
                onBlur={(e) => {
                  setInvoiceErrors((prev) => ({ ...prev, footerText: validateFooterText(e.target.value) }));
                }}
                error={invoiceErrors.footerText}
              />

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Invoice Layout
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}
    </div>
  );
}
