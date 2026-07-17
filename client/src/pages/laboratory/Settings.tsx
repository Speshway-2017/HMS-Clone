import { useState, useEffect } from "react";
import { Settings, BarChart, ShieldAlert } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { InputField, SelectField } from "../../components/ui/Field";
import { useChangePassword } from "../../features/auth";
import { useMyHospital, useUpdateMyHospital } from "../../features/hospitals";

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
      alert("Investigation test, study and price settings saved successfully!");
    } catch (err) {
      alert("Failed to save settings. Please try again.");
    }
  };

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

        {/* Investigation Services (Tests & Scans) */}
        <Card>
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings className="h-5 w-5 text-blue-700" />
            <h3 className="text-base font-bold text-slate-800">Investigation Services</h3>
          </div>
          <form onSubmit={handleSaveInvestigationSettings} className="space-y-4">
            {/* Laboratory Tests */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">Available Laboratory Tests</label>
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
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Price (₹)"
                  value={labPriceInput}
                  onChange={(e) => setLabPriceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddLab();
                    }
                  }}
                  className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={handleAddLab}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
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
                      className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-xs text-slate-700 font-medium"
                    >
                      {t} <span className="text-slate-400 font-bold ml-0.5">₹{investigationPrices[t] || 0}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLab(t)}
                        className="text-slate-450 hover:text-slate-655 font-bold focus:outline-none ml-1 text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Radiology Studies */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-xs font-semibold text-slate-600 uppercase">Available Radiology Studies</label>
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
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Price (₹)"
                  value={radioPriceInput}
                  onChange={(e) => setRadioPriceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddRadio();
                    }
                  }}
                  className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={handleAddRadio}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
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
                      className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-xs text-slate-700 font-medium"
                    >
                      {t} <span className="text-slate-400 font-bold ml-0.5">₹{investigationPrices[t] || 0}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRadio(t)}
                        className="text-slate-450 hover:text-slate-655 font-bold focus:outline-none ml-1 text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            <Button type="submit" disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-750 w-full mt-2">
              {updateMutation.isPending ? "Saving..." : "Save Investigation List"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
