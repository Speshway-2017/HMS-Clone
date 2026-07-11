import { useState, useEffect } from "react";
import { Settings, ShieldAlert, Key, Receipt, FileText, CheckCircle } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { InputField } from "../../components/ui/Field";
import { useChangePassword } from "../../features/auth";

export function PharmacySettings() {
  const [pharmacyName, setPharmacyName] = useState("Sunrise General Hospital Pharmacy");
  const [phone, setPhone] = useState("+1-555-0100");
  const [licenseNumber, setLicenseNumber] = useState("PH-2024-99882");
  const [taxRate, setTaxRate] = useState(12);
  const [invoicePrefix, setInvoicePrefix] = useState("PH-INV");
  const [terms, setTerms] = useState("Medicines once sold cannot be returned without doctor's modified prescription slip.");

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState("");

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
    alert("Pharmacy Settings updated successfully!");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess(false);

    if (newPassword !== confirmPassword) {
      setPassError("Passwords do not match.");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        newPassword,
        confirmPassword,
      });
      setPassSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPassError(err.response?.data?.message || "Failed to change password.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pharmacy Settings</h1>
        <p className="text-sm text-slate-500">Configure pharmacy retail rates, taxes, invoice setups, and user credentials.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Settings className="h-5 w-5 text-navy-700" /> General & Tax Configuration
            </h3>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Pharmacy Name"
                  required
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                />
                <InputField
                  label="License Number"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
                <InputField
                  label="Contact Phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <InputField
                  label="Taxes / GST Rate (%)"
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1">
                  <Receipt className="h-4 w-4" /> Invoice & Term Parameters
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  <InputField
                    label="Invoice ID Prefix"
                    required
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Receipt Terms & Conditions
                    </label>
                    <textarea
                      rows={3}
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button type="submit">Save General Settings</Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Change Password Card */}
        <div>
          <Card>
            <h3 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Key className="h-5 w-5 text-navy-700" /> Change Account Password
            </h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <InputField
                label="New Password"
                type={showPass ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <InputField
                label="Confirm New Password"
                type={showPass ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <div className="flex items-center gap-1.5 text-xs text-slate-550">
                <input
                  type="checkbox"
                  id="show-passwords"
                  checked={showPass}
                  onChange={(e) => setShowPass(e.target.checked)}
                />
                <label htmlFor="show-passwords">Show Passwords</label>
              </div>

              {passError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-xs flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Password updated successfully.</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
              >
                {changePasswordMutation.isPending ? "Saving..." : "Update Password"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
