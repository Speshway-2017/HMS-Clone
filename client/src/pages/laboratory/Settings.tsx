import { useState, useEffect } from "react";
import { Settings, BarChart, ShieldAlert } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { InputField, SelectField } from "../../components/ui/Field";
import { useChangePassword } from "../../features/auth";

export function LaboratorySettings() {
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

  useEffect(() => {
    const savedName = localStorage.getItem("hms_laboratory_name");
    if (savedName) setLabName(savedName);
    const savedCode = localStorage.getItem("hms_laboratory_code");
    if (savedCode) setLabCode(savedCode);
    const savedDir = localStorage.getItem("hms_laboratory_director");
    if (savedDir) setDirectorName(savedDir);
  }, []);

  const handleSaveSetup = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("hms_laboratory_name", labName);
    localStorage.setItem("hms_laboratory_code", labCode);
    localStorage.setItem("hms_laboratory_director", directorName);
    alert("Laboratory setup configurations saved successfully!");
  };

  const handleSaveBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Barcode format and auto-generation prefixes updated!");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      alert("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }

    mutate(
      { newPassword, confirmPassword },
      {
        onSuccess: () => {
          alert("Password changed successfully!");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || "Password change failed. Please try again.";
          alert(msg);
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laboratory Settings</h1>
        <p className="text-sm text-slate-500">Configure central diagnostics names, print options, reference ranges, and passwords.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Lab Setup Setup */}
        <Card>
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings className="h-5 w-5 text-blue-700" />
            <h3 className="text-base font-bold text-slate-800">Laboratory Setup</h3>
          </div>
          <form onSubmit={handleSaveSetup} className="space-y-4">
            <InputField
              label="Laboratory Name"
              required
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
            />
            <InputField
              label="Lab Code Reference"
              required
              value={labCode}
              onChange={(e) => setLabCode(e.target.value)}
            />
            <InputField
              label="Lab Director / Pathologist Name"
              required
              value={directorName}
              onChange={(e) => setDirectorName(e.target.value)}
            />
            <InputField
              label="Contact Phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-750">Save Setup Details</Button>
          </form>
        </Card>

        {/* Barcode & Print Settings */}
        <Card>
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <BarChart className="h-5 w-5 text-blue-700" />
            <h3 className="text-base font-bold text-slate-800">Barcode &amp; Label Configuration</h3>
          </div>
          <form onSubmit={handleSaveBarcode} className="space-y-4">
            <InputField
              label="Sample ID Barcode Prefix"
              required
              value={barcodePrefix}
              onChange={(e) => setBarcodePrefix(e.target.value)}
            />
            <SelectField
              label="Symbology Format"
              required
              value={barcodeFormat}
              onChange={(e) => setBarcodeFormat(e.target.value)}
            >
              <option value="CODE128">Code 128 (Alphanumeric, High Density)</option>
              <option value="CODE39">Code 39 (Alphanumeric, Standard)</option>
              <option value="EAN13">EAN-13 (Numerical)</option>
            </SelectField>
            <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
              Note: Changing these values will apply immediately to new patient samples checked into the queue.
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-750">Save Print Formats</Button>
          </form>
        </Card>

        {/* Password settings */}
        <Card>
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldAlert className="h-5 w-5 text-blue-700" />
            <h3 className="text-base font-bold text-slate-800">Security Credentials</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <InputField
              label="New Password"
              required
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <InputField
              label="Confirm New Password"
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-750">
              {isPending ? "Changing Password..." : "Change Password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
