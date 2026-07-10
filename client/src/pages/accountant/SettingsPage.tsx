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
  FileText
} from "lucide-react";
import { useChangePassword } from "../../features/auth";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { InputField } from "../../components/ui/Field";

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

export function AccountantSettingsPage() {
  const { user } = useAuth();
  const { mutate: changePassword, isPending: passwordPending } = useChangePassword();

  const [activeTab, setActiveTab] = useState<"security" | "tax" | "payment" | "invoice">("security");

  // Security (Change Password) State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const passwordsMatch = newPassword !== "" && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  // Tax Settings State
  const [taxRate, setTaxRate] = useState(5);
  const [serviceFee, setServiceFee] = useState(150);

  // Payment Channels State
  const [channels, setChannels] = useState({
    upi: true,
    card: true,
    cash: true,
  });

  // Invoice Layout State
  const [headerText, setHeaderText] = useState("Sunrise General Hospital & Research Center");
  const [footerText, setFooterText] = useState("Terms: Invoice amounts must be paid within 15 days of issue.");

  // Toast notifier helper
  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  }

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
      showToast("error", "Passwords do not match.");
      return;
    }

    changePassword(
      { newPassword, confirmPassword },
      {
        onSuccess: () => {
          showToast("success", "Password changed successfully!");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Something went wrong. Please try again.";
          showToast("error", msg);
        },
      }
    );
  };

  const handleSaveTax = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("hms_settings_tax", JSON.stringify({ taxRate, serviceFee }));
    showToast("success", "Tax configurations saved!");
  };

  const handleSaveChannels = () => {
    localStorage.setItem("hms_settings_channels", JSON.stringify(channels));
    showToast("success", "Payment channels updated!");
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("hms_settings_invoice", JSON.stringify({ headerText, footerText }));
    showToast("success", "Invoice templates updated!");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Accountant Settings</h1>
        <p className="text-sm text-slate-500">Configure financial profiles, taxes, active payment methods, and invoice parameters.</p>
      </div>

      {/* Profile Card Summary */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-700 ring-4 ring-navy-50">
            <span className="text-xl font-bold">
              {user?.name?.charAt(0).toUpperCase() ?? "A"}
            </span>
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-navy-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-navy-700">
              Accountant
            </span>
          </div>
        </div>
      </Card>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("security")}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold uppercase transition-all ${
            activeTab === "security" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Security
        </button>
        <button
          onClick={() => setActiveTab("tax")}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold uppercase transition-all ${
            activeTab === "tax" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Tax Settings
        </button>
        <button
          onClick={() => setActiveTab("payment")}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold uppercase transition-all ${
            activeTab === "payment" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Payment Channels
        </button>
        <button
          onClick={() => setActiveTab("invoice")}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold uppercase transition-all ${
            activeTab === "invoice" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Invoice Details
        </button>
      </div>

      {/* Tab: Security */}
      {activeTab === "security" && (
        <Card>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Change Password</h2>
              <p className="text-xs text-slate-500">Update security parameters for your staff account.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <PasswordInput
              id="newPassword"
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Enter your new password"
              autoComplete="new-password"
            />
            <PasswordInput
              id="confirmPassword"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
            />
            {confirmPassword && (
              <p className={`text-xs ${passwordsMatch ? "text-emerald-600 font-semibold" : "text-red-500"}`}>
                {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={passwordPending || !newPassword || !confirmPassword || passwordsMismatch}
              >
                {passwordPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab: Tax & service fees */}
      {activeTab === "tax" && (
        <Card>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Tax Configurations</h2>
              <p className="text-xs text-slate-500">Define standard tax rates and base service fees applied to new invoices.</p>
            </div>
          </div>

          <form onSubmit={handleSaveTax} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Standard GST / Tax Rate (%)"
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                min="0"
                max="100"
                required
              />
              <InputField
                label="Base Registration Service Fee (₹)"
                type="number"
                value={serviceFee}
                onChange={(e) => setServiceFee(Number(e.target.value))}
                required
              />
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button variant="primary" type="submit">
                Save Tax Parameters
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab: Payment methods toggling */}
      {activeTab === "payment" && (
        <Card>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Active Payment Channels</h2>
              <p className="text-xs text-slate-500">Enable or disable standard channels available for billing collections.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition cursor-pointer">
              <div>
                <span className="font-semibold text-slate-850 text-sm">UPI Payment Gateways</span>
                <span className="block text-xs text-slate-450">Google Pay, PhonePe, Paytm QR scanning.</span>
              </div>
              <input
                type="checkbox"
                checked={channels.upi}
                onChange={(e) => setChannels({ ...channels, upi: e.target.checked })}
                className="h-4 w-4 text-navy-700"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition cursor-pointer">
              <div>
                <span className="font-semibold text-slate-850 text-sm">Credit & Debit Cards</span>
                <span className="block text-xs text-slate-450">Visa, MasterCard, RuPay bank card terminals.</span>
              </div>
              <input
                type="checkbox"
                checked={channels.card}
                onChange={(e) => setChannels({ ...channels, card: e.target.checked })}
                className="h-4 w-4 text-navy-700"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition cursor-pointer">
              <div>
                <span className="font-semibold text-slate-850 text-sm">Physical Cash Counters</span>
                <span className="block text-xs text-slate-450">Physical counter deposit, currency verification.</span>
              </div>
              <input
                type="checkbox"
                checked={channels.cash}
                onChange={(e) => setChannels({ ...channels, cash: e.target.checked })}
                className="h-4 w-4 text-navy-700"
              />
            </label>

            <div className="flex justify-end border-t pt-4">
              <Button variant="primary" onClick={handleSaveChannels}>
                Save Payment Channels
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Invoice layouts */}
      {activeTab === "invoice" && (
        <Card>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Invoice Template Settings</h2>
              <p className="text-xs text-slate-500">Configure textual layouts shown on generated billing prints.</p>
            </div>
          </div>

          <form onSubmit={handleSaveInvoice} className="space-y-4">
            <InputField
              label="Invoice Header Brand Name"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice Footer Disclaimer / Disclaimer Details</label>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 min-h-[80px]"
                required
              />
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button variant="primary" type="submit">
                Save Invoice Layout
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Toast Alert */}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold shadow-xl transition-all animate-in slide-in-from-bottom-4 ${
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
    </div>
  );
}
