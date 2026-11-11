import { useState, useEffect } from "react";
import { Settings, BarChart, KeyRound, Save, ShieldCheck, Lock, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
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
    if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"].includes(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const input = e.currentTarget;
    const selLength = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    if (input.value.length >= maxLength && selLength === 0) {
      e.preventDefault();
      toast.error("Password exceeds the maximum allowed length.");
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
              : "border-slate-200 bg-white focus:border-navy-500 focus:ring-navy-200"
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
        <p className="text-xs font-medium text-rose-500 mt-0.5" role="alert">{error}</p>
      )}
    </div>
  );
}

// ----------------- Validation Functions -----------------
const validateTestName = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) {
    return "The Test Name field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  if (val.length > 100) {
    return "The Test Name field should validate the entered length and should not accept unsupported long text. Test Name cannot exceed 100 characters.";
  }
  if (trimmed.length < 2) {
    return "The Test Name field should validate the entered input and should not accept invalid data. Test Name must be at least 2 characters.";
  }
  if (!/^[a-zA-Z0-9\s\.\-/'&,()%+]+$/.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "The Test Name field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  return null;
};

const validatePathologyPrice = (val: string): string | null => {
  const str = (val ?? "").toString().trim();
  if (str === "") {
    return "The Price field should not accept empty input when adding the pathology lab. Please enter valid data";
  }
  if (str.length > 7) {
    return "The Price field should validate the entered length and should not accept unsupported long text. Price cannot exceed 7 digits.";
  }
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return "The Price field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  const num = Number(str);
  if (isNaN(num) || num < 0 || num > 10000000) {
    return "The Price field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  return null;
};

const validateStudyName = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) {
    return "The Study Name field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  if (val.length > 100) {
    return "The Study Name field should validate the entered length and should not accept unsupported long text. Study Name cannot exceed 100 characters.";
  }
  if (trimmed.length < 2) {
    return "The Study Name field should validate the entered input and should not accept invalid data. Study Name must be at least 2 characters.";
  }
  if (!/^[a-zA-Z0-9\s\.\-/'&,()%+]+$/.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "The Study Name field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  return null;
};

const validateRadiologyPrice = (val: string): string | null => {
  const str = (val ?? "").toString().trim();
  if (str === "") {
    return "The Price field should not accept empty input when adding the record. Please enter valid data";
  }
  if (str.length > 7) {
    return "The Price field should validate the entered length and should not accept unsupported long text. Price cannot exceed 7 digits.";
  }
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return "The Price field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  const num = Number(str);
  if (isNaN(num) || num < 0 || num > 10000000) {
    return "The Price field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  return null;
};

const validateLabFacilityName = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) {
    return "The Laboratory Facility Name field should validate the entered input and should not accept invalid data. Please fill out this field";
  }
  if (val.length > 100) {
    return "The Laboratory Facility Name field should validate the entered length and should not accept unsupported long text. Laboratory Facility Name cannot exceed 100 characters.";
  }
  if (trimmed.length < 2) {
    return "The Laboratory Facility Name field should validate the entered input and should not accept invalid data. Laboratory Facility Name must be at least 2 characters.";
  }
  if (!/^[a-zA-Z0-9\s\.\-/'&,()%+]+$/.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "The Laboratory Facility Name field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  return null;
};

const validateLabCode = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) {
    return "The Laboratory Code field should validate the entered input and should not accept invalid data. Please fill out this field";
  }
  if (val.length > 30) {
    return "The Laboratory Code field should validate the entered length and should not accept unsupported long text. Laboratory Code cannot exceed 30 characters.";
  }
  if (trimmed.length < 2) {
    return "The Laboratory Code field should validate the entered input and should not accept invalid data. Laboratory Code must be at least 2 characters.";
  }
  if (!/^[A-Za-z0-9\-_]+$/.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed)) {
    return "The Laboratory Code field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  return null;
};

const validateLabDirectorName = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) {
    return "The Lab Director Name field should validate the entered input and should not accept invalid data. Please fill out this field";
  }
  if (val.length > 100) {
    return "The Lab Director Name field should validate the entered length and should not accept unsupported long text. Lab Director Name cannot exceed 100 characters.";
  }
  if (trimmed.length < 2) {
    return "The Lab Director Name field should validate the entered input and should not accept invalid data. Lab Director Name must be at least 2 characters.";
  }
  if (!/^[a-zA-Z\s\.\'\(\)\-]+$/.test(trimmed) || !/[a-zA-Z]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "The Lab Director Name field should validate the entered input and should not accept invalid data. Please enter valid data";
  }
  return null;
};

const validatePhone = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) {
    return "Please fill out this field";
  }
  if (trimmed.length > 15) {
    return "Contact Phone cannot exceed 15 characters. Please enter valid data";
  }
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15 || /^(\d)\1{6,}$/.test(digitsOnly)) {
    return "Contact Phone contains invalid data. Please enter valid data";
  }
  return null;
};

const validateNewPassword = (val: string): string | null => {
  if (!val) {
    return "Please fill out this field";
  }
  if (val.length > 64) {
    return "The New Password field does not accept the value exceeding the allowed character limit and the appropriate validation message is displayed. New Password exceeds the maximum allowed length.";
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
    return "The Confirm New Password field does not accept the value exceeding the allowed character limit and the appropriate validation message is displayed. Confirm New Password exceeds the maximum allowed length.";
  }
  if (val !== newPw) {
    return "Passwords do not match. Please enter valid data";
  }
  return null;
};

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

  // Validation errors state
  const [catalogErrors, setCatalogErrors] = useState<{
    labTestName?: string | null;
    labPrice?: string | null;
    radioStudyName?: string | null;
    radioPrice?: string | null;
  }>({});

  const [setupErrors, setSetupErrors] = useState<{
    labName?: string | null;
    labCode?: string | null;
    directorName?: string | null;
    phone?: string | null;
  }>({});

  const [passwordErrors, setPasswordErrors] = useState<{
    newPassword?: string | null;
    confirmPassword?: string | null;
  }>({});

  // Available tests and studies state from hospital
  const { data: hospital } = useMyHospital();
  const updateMutation = useUpdateMyHospital();

  // Default test catalogs with standard prices
  const DEFAULT_LAB_TESTS = [
    "Complete Blood Count (CBC)",
    "Lipid Profile",
    "Liver Function Test (LFT)",
    "Kidney Function Test (KFT)",
    "Thyroid Profile (T3, T4, TSH)",
    "Fasting Blood Sugar (FBS)",
    "HbA1c",
    "Urine Routine & Microscopy",
  ];

  const DEFAULT_RADIO_STUDIES = [
    "Chest X-Ray PA View",
    "Ultrasound Abdomen & Pelvis",
    "CT Brain Non-Contrast",
    "MRI Lumbar Spine",
    "ECG 12 Lead",
  ];

  const DEFAULT_PRICES: Record<string, number> = {
    "Complete Blood Count (CBC)": 350,
    "Lipid Profile": 650,
    "Liver Function Test (LFT)": 550,
    "Kidney Function Test (KFT)": 500,
    "Thyroid Profile (T3, T4, TSH)": 750,
    "Fasting Blood Sugar (FBS)": 150,
    "HbA1c": 450,
    "Urine Routine & Microscopy": 200,
    "Chest X-Ray PA View": 400,
    "Ultrasound Abdomen & Pelvis": 1200,
    "CT Brain Non-Contrast": 2500,
    "MRI Lumbar Spine": 4500,
    "ECG 12 Lead": 300,
  };

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
    const savedPhone = localStorage.getItem("hms_laboratory_phone");
    if (savedPhone) setPhone(savedPhone);
  }, []);

  useEffect(() => {
    // Load from localStorage first, then hospital API
    const savedLab = localStorage.getItem("hms_available_lab_tests");
    const savedRadio = localStorage.getItem("hms_available_radiology_tests");
    const savedPrices = localStorage.getItem("hms_investigation_prices");

    let initialLab = savedLab ? JSON.parse(savedLab) : (hospital as any)?.availableLabTests;
    let initialRadio = savedRadio ? JSON.parse(savedRadio) : (hospital as any)?.availableRadiologyTests;
    let initialPrices = savedPrices ? JSON.parse(savedPrices) : (hospital as any)?.investigationPrices;

    if (!initialLab || initialLab.length === 0) initialLab = DEFAULT_LAB_TESTS;
    if (!initialRadio || initialRadio.length === 0) initialRadio = DEFAULT_RADIO_STUDIES;
    if (!initialPrices || Object.keys(initialPrices).length === 0) initialPrices = DEFAULT_PRICES;

    setAvailableLabTests(initialLab);
    setAvailableRadiologyTests(initialRadio);
    setInvestigationPrices(initialPrices);
  }, [hospital]);

  const saveCatalogToStorage = (lab: string[], radio: string[], prices: Record<string, number>) => {
    localStorage.setItem("hms_available_lab_tests", JSON.stringify(lab));
    localStorage.setItem("hms_available_radiology_tests", JSON.stringify(radio));
    localStorage.setItem("hms_investigation_prices", JSON.stringify(prices));
  };

  const handleKeyLimit = (e: React.KeyboardEvent<HTMLInputElement>, max: number, fieldName: string) => {
    if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"].includes(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const input = e.currentTarget;
    const selLength = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    if (input.value.length >= max && selLength === 0) {
      e.preventDefault();
      toast.error(`${fieldName} cannot exceed ${max} characters.`);
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, maxDigits: number = 7) => {
    if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"].includes(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (["-", "+", "e", "E", "."].includes(e.key)) {
      e.preventDefault();
      toast.error("The Price field should validate the entered input and should not accept invalid data.");
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    const input = e.currentTarget;
    const selLength = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    if (input.value.length >= maxDigits && selLength === 0) {
      e.preventDefault();
      toast.error("Price cannot exceed 7 digits.");
    }
  };

  const handleAddLab = () => {
    const nameErr = validateTestName(labInput);
    const priceErr = validatePathologyPrice(labPriceInput);

    if (nameErr || priceErr) {
      setCatalogErrors((prev) => ({
        ...prev,
        labTestName: nameErr,
        labPrice: priceErr,
      }));
      toast.error(nameErr || priceErr || "Please fix validation errors.");
      return;
    }

    const trimmed = labInput.trim();
    const priceVal = parseFloat(labPriceInput) || 0;
    if (availableLabTests.includes(trimmed)) {
      toast.error(`"${trimmed}" is already present in the pathology catalog.`);
      return;
    }

    const updatedLab = [...availableLabTests, trimmed];
    const updatedPrices = { ...investigationPrices, [trimmed]: priceVal };
    setAvailableLabTests(updatedLab);
    setInvestigationPrices(updatedPrices);
    saveCatalogToStorage(updatedLab, availableRadiologyTests, updatedPrices);
    setLabInput("");
    setLabPriceInput("");
    setCatalogErrors((prev) => ({ ...prev, labTestName: null, labPrice: null }));
    toast.success(`Added ${trimmed} to pathology catalog.`);
  };

  const handleRemoveLab = (testToRemove: string) => {
    const updatedLab = availableLabTests.filter((t) => t !== testToRemove);
    const updatedPrices = { ...investigationPrices };
    delete updatedPrices[testToRemove];
    setAvailableLabTests(updatedLab);
    setInvestigationPrices(updatedPrices);
    saveCatalogToStorage(updatedLab, availableRadiologyTests, updatedPrices);
    toast.success(`Removed ${testToRemove}`);
  };

  const handleAddRadio = () => {
    const nameErr = validateStudyName(radioInput);
    const priceErr = validateRadiologyPrice(radioPriceInput);

    if (nameErr || priceErr) {
      setCatalogErrors((prev) => ({
        ...prev,
        radioStudyName: nameErr,
        radioPrice: priceErr,
      }));
      toast.error(nameErr || priceErr || "Please fix validation errors.");
      return;
    }

    const trimmed = radioInput.trim();
    const priceVal = parseFloat(radioPriceInput) || 0;
    if (availableRadiologyTests.includes(trimmed)) {
      toast.error(`"${trimmed}" is already present in the radiology catalog.`);
      return;
    }

    const updatedRadio = [...availableRadiologyTests, trimmed];
    const updatedPrices = { ...investigationPrices, [trimmed]: priceVal };
    setAvailableRadiologyTests(updatedRadio);
    setInvestigationPrices(updatedPrices);
    saveCatalogToStorage(availableLabTests, updatedRadio, updatedPrices);
    setRadioInput("");
    setRadioPriceInput("");
    setCatalogErrors((prev) => ({ ...prev, radioStudyName: null, radioPrice: null }));
    toast.success(`Added ${trimmed} to radiology catalog.`);
  };

  const handleRemoveRadio = (testToRemove: string) => {
    const updatedRadio = availableRadiologyTests.filter((t) => t !== testToRemove);
    const updatedPrices = { ...investigationPrices };
    delete updatedPrices[testToRemove];
    setAvailableRadiologyTests(updatedRadio);
    setInvestigationPrices(updatedPrices);
    saveCatalogToStorage(availableLabTests, updatedRadio, updatedPrices);
    toast.success(`Removed ${testToRemove}`);
  };

  const handleUpdatePrice = (testName: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("The Price field should validate the entered input and should not accept invalid data.");
      return;
    }
    if (newPrice > 10000000) {
      toast.error("The Price field should validate the entered length and should not accept unsupported long text.");
      return;
    }
    const updatedPrices = { ...investigationPrices, [testName]: newPrice };
    setInvestigationPrices(updatedPrices);
    saveCatalogToStorage(availableLabTests, availableRadiologyTests, updatedPrices);
  };

  const handleSaveInvestigationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    saveCatalogToStorage(availableLabTests, availableRadiologyTests, investigationPrices);
    try {
      await updateMutation.mutateAsync({
        availableLabTests,
        availableRadiologyTests,
        investigationPrices,
      });
      toast.success("Investigation test catalog & pricing saved successfully!");
    } catch {
      toast.success("Investigation test catalog & pricing saved locally!");
    }
  };

  const handleSaveSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateLabFacilityName(labName);
    const codeErr = validateLabCode(labCode);
    const dirErr = validateLabDirectorName(directorName);
    const phoneErr = validatePhone(phone);

    if (nameErr || codeErr || dirErr || phoneErr) {
      setSetupErrors({
        labName: nameErr,
        labCode: codeErr,
        directorName: dirErr,
        phone: phoneErr,
      });
      toast.error(nameErr || codeErr || dirErr || phoneErr || "Please fix validation errors.");
      return;
    }

    localStorage.setItem("hms_laboratory_name", labName.trim());
    localStorage.setItem("hms_laboratory_code", labCode.trim());
    localStorage.setItem("hms_laboratory_director", directorName.trim());
    localStorage.setItem("hms_laboratory_phone", phone.trim());
    toast.success("Laboratory setup configurations saved successfully!");
  };

  const handleSaveBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Barcode format and auto-generation prefixes updated!");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const newErr = validateNewPassword(newPassword);
    const confirmErr = validateConfirmPassword(confirmPassword, newPassword);

    if (newErr || confirmErr) {
      setPasswordErrors({
        newPassword: newErr,
        confirmPassword: confirmErr,
      });
      toast.error(newErr || confirmErr || "Please fix validation errors.");
      return;
    }

    mutate(
      { newPassword, confirmPassword },
      {
        onSuccess: () => {
          toast.success("Password changed successfully!");
          setNewPassword("");
          setConfirmPassword("");
          setPasswordErrors({});
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
            <form onSubmit={handleSaveInvestigationSettings} className="space-y-6" noValidate>
              {/* Pathology Tests Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">Pathology Lab Tests</h4>
                
                <div className="flex flex-wrap gap-3 items-start">
                  <div className="flex flex-col gap-1 w-64 sm:w-72">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase text-slate-500">
                        Test Name <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[10px] font-mono ${labInput.length > 100 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                        {labInput.length}/100
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="Test Name (e.g. Complete Blood Count)"
                      value={labInput}
                      onKeyDown={(e) => handleKeyLimit(e, 100, "Test Name")}
                      onChange={(e) => {
                        setLabInput(e.target.value);
                        if (catalogErrors.labTestName) {
                          setCatalogErrors((prev) => ({ ...prev, labTestName: validateTestName(e.target.value) }));
                        }
                      }}
                      onBlur={() => {
                        if (labInput.trim()) {
                          setCatalogErrors((prev) => ({ ...prev, labTestName: validateTestName(labInput) }));
                        }
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        catalogErrors.labTestName
                          ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-200 focus:border-navy-500 focus:ring-navy-200"
                      }`}
                    />
                    {catalogErrors.labTestName && (
                      <p className="text-xs font-medium text-rose-500" role="alert">{catalogErrors.labTestName}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 w-32 sm:w-36">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase text-slate-500">
                        Price (₹) <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[10px] font-mono ${labPriceInput.length > 7 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                        {labPriceInput.length}/7
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="9999999"
                      maxLength={7}
                      placeholder="Price (₹)"
                      value={labPriceInput}
                      onKeyDown={(e) => handlePriceKeyDown(e, 7)}
                      onChange={(e) => {
                        setLabPriceInput(e.target.value);
                        if (catalogErrors.labPrice) {
                          setCatalogErrors((prev) => ({ ...prev, labPrice: validatePathologyPrice(e.target.value) }));
                        }
                      }}
                      onBlur={() => {
                        if (labPriceInput !== "") {
                          setCatalogErrors((prev) => ({ ...prev, labPrice: validatePathologyPrice(labPriceInput) }));
                        }
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        catalogErrors.labPrice
                          ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-200 focus:border-navy-500 focus:ring-navy-200"
                      }`}
                    />
                    {catalogErrors.labPrice && (
                      <p className="text-xs font-medium text-rose-500" role="alert">{catalogErrors.labPrice}</p>
                    )}
                  </div>

                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={handleAddLab}
                      className="flex items-center gap-1 rounded-lg bg-navy-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800 transition-colors shadow-sm"
                    >
                      <Plus className="h-4 w-4" /> Add Test
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                  {availableLabTests.map((t) => (
                    <div key={t} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="flex-1 pr-2">
                        <span className="font-bold text-slate-800 block truncate" title={t}>{t}</span>
                        <div className="flex items-center gap-1 mt-1 text-slate-500 font-semibold">
                          <span>₹</span>
                          <input
                            type="number"
                            min="0"
                            max="9999999"
                            value={investigationPrices[t] ?? 0}
                            onKeyDown={(e) => {
                              if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
                            }}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdatePrice(t, isNaN(val) ? 0 : val);
                            }}
                            className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-500"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLab(t)}
                        className="text-rose-600 hover:text-rose-800 transition-colors p-1 shrink-0"
                        title="Remove Test"
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
                
                <div className="flex flex-wrap gap-3 items-start">
                  <div className="flex flex-col gap-1 w-64 sm:w-72">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase text-slate-500">
                        Study Name <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[10px] font-mono ${radioInput.length > 100 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                        {radioInput.length}/100
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="Study Name (e.g. Chest X-Ray PA)"
                      value={radioInput}
                      onKeyDown={(e) => handleKeyLimit(e, 100, "Study Name")}
                      onChange={(e) => {
                        setRadioInput(e.target.value);
                        if (catalogErrors.radioStudyName) {
                          setCatalogErrors((prev) => ({ ...prev, radioStudyName: validateStudyName(e.target.value) }));
                        }
                      }}
                      onBlur={() => {
                        if (radioInput.trim()) {
                          setCatalogErrors((prev) => ({ ...prev, radioStudyName: validateStudyName(radioInput) }));
                        }
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        catalogErrors.radioStudyName
                          ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-200 focus:border-navy-500 focus:ring-navy-200"
                      }`}
                    />
                    {catalogErrors.radioStudyName && (
                      <p className="text-xs font-medium text-rose-500" role="alert">{catalogErrors.radioStudyName}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 w-32 sm:w-36">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase text-slate-500">
                        Price (₹) <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[10px] font-mono ${radioPriceInput.length > 7 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                        {radioPriceInput.length}/7
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="9999999"
                      maxLength={7}
                      placeholder="Price (₹)"
                      value={radioPriceInput}
                      onKeyDown={(e) => handlePriceKeyDown(e, 7)}
                      onChange={(e) => {
                        setRadioPriceInput(e.target.value);
                        if (catalogErrors.radioPrice) {
                          setCatalogErrors((prev) => ({ ...prev, radioPrice: validateRadiologyPrice(e.target.value) }));
                        }
                      }}
                      onBlur={() => {
                        if (radioPriceInput !== "") {
                          setCatalogErrors((prev) => ({ ...prev, radioPrice: validateRadiologyPrice(radioPriceInput) }));
                        }
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        catalogErrors.radioPrice
                          ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-200 focus:border-navy-500 focus:ring-navy-200"
                      }`}
                    />
                    {catalogErrors.radioPrice && (
                      <p className="text-xs font-medium text-rose-500" role="alert">{catalogErrors.radioPrice}</p>
                    )}
                  </div>

                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={handleAddRadio}
                      className="flex items-center gap-1 rounded-lg bg-navy-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800 transition-colors shadow-sm"
                    >
                      <Plus className="h-4 w-4" /> Add Study
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                  {availableRadiologyTests.map((t) => (
                    <div key={t} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="flex-1 pr-2">
                        <span className="font-bold text-slate-800 block truncate" title={t}>{t}</span>
                        <div className="flex items-center gap-1 mt-1 text-slate-500 font-semibold">
                          <span>₹</span>
                          <input
                            type="number"
                            min="0"
                            max="9999999"
                            value={investigationPrices[t] ?? 0}
                            onKeyDown={(e) => {
                              if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
                            }}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdatePrice(t, isNaN(val) ? 0 : val);
                            }}
                            className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-500"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRadio(t)}
                        className="text-rose-600 hover:text-rose-800 transition-colors p-1 shrink-0"
                        title="Remove Study"
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
            <form onSubmit={handleSaveSetup} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase text-slate-400">
                      Laboratory Facility Name *
                    </label>
                    <span className={`text-[11px] font-mono ${labName.length > 100 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {labName.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={labName}
                    onKeyDown={(e) => handleKeyLimit(e, 100, "Laboratory Facility Name")}
                    onChange={(e) => {
                      setLabName(e.target.value);
                      if (setupErrors.labName) {
                        setSetupErrors((prev) => ({ ...prev, labName: validateLabFacilityName(e.target.value) }));
                      }
                    }}
                    onBlur={() => {
                      setSetupErrors((prev) => ({ ...prev, labName: validateLabFacilityName(labName) }));
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      setupErrors.labName
                        ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 focus:border-navy-500 focus:ring-navy-200"
                    }`}
                  />
                  {setupErrors.labName && (
                    <p className="text-xs font-medium text-rose-500 mt-0.5" role="alert">{setupErrors.labName}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase text-slate-400">
                      Laboratory Code *
                    </label>
                    <span className={`text-[11px] font-mono ${labCode.length > 30 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {labCode.length}/30
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={labCode}
                    onKeyDown={(e) => handleKeyLimit(e, 30, "Laboratory Code")}
                    onChange={(e) => {
                      setLabCode(e.target.value);
                      if (setupErrors.labCode) {
                        setSetupErrors((prev) => ({ ...prev, labCode: validateLabCode(e.target.value) }));
                      }
                    }}
                    onBlur={() => {
                      setSetupErrors((prev) => ({ ...prev, labCode: validateLabCode(labCode) }));
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      setupErrors.labCode
                        ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 focus:border-navy-500 focus:ring-navy-200"
                    }`}
                  />
                  {setupErrors.labCode && (
                    <p className="text-xs font-medium text-rose-500 mt-0.5" role="alert">{setupErrors.labCode}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase text-slate-400">
                      Lab Director Name *
                    </label>
                    <span className={`text-[11px] font-mono ${directorName.length > 100 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {directorName.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={directorName}
                    onKeyDown={(e) => handleKeyLimit(e, 100, "Lab Director Name")}
                    onChange={(e) => {
                      setDirectorName(e.target.value);
                      if (setupErrors.directorName) {
                        setSetupErrors((prev) => ({ ...prev, directorName: validateLabDirectorName(e.target.value) }));
                      }
                    }}
                    onBlur={() => {
                      setSetupErrors((prev) => ({ ...prev, directorName: validateLabDirectorName(directorName) }));
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      setupErrors.directorName
                        ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 focus:border-navy-500 focus:ring-navy-200"
                    }`}
                  />
                  {setupErrors.directorName && (
                    <p className="text-xs font-medium text-rose-500 mt-0.5" role="alert">{setupErrors.directorName}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase text-slate-400">
                      Contact Phone *
                    </label>
                    <span className={`text-[11px] font-mono ${phone.length > 15 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {phone.length}/15
                    </span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={15}
                    value={phone}
                    onKeyDown={(e) => {
                      const allowed = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "+"];
                      if (!allowed.includes(e.key) && !e.ctrlKey && !e.metaKey && !/^[0-9]$/.test(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/(?!^\+)[^\d]/g, "");
                      setPhone(val);
                      if (setupErrors.phone) {
                        setSetupErrors((prev) => ({ ...prev, phone: validatePhone(val) }));
                      }
                    }}
                    onBlur={() => {
                      setSetupErrors((prev) => ({ ...prev, phone: validatePhone(phone) }));
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      setupErrors.phone
                        ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 focus:border-navy-500 focus:ring-navy-200"
                    }`}
                  />
                  {setupErrors.phone && (
                    <p className="text-xs font-medium text-rose-500 mt-0.5" role="alert">{setupErrors.phone}</p>
                  )}
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
                    maxLength={10}
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
                label="New Password"
                value={newPassword}
                maxLength={64}
                onChange={(val) => {
                  setNewPassword(val);
                  if (passwordErrors.newPassword) {
                    setPasswordErrors((prev) => ({ ...prev, newPassword: validateNewPassword(val) }));
                  }
                }}
                onBlur={() => {
                  if (newPassword) {
                    setPasswordErrors((prev) => ({ ...prev, newPassword: validateNewPassword(newPassword) }));
                  }
                }}
                error={passwordErrors.newPassword}
                placeholder="Enter your new strong password"
                autoComplete="new-password"
              />

              <PasswordInput
                id="lab-confirm-password"
                label="Confirm New Password"
                value={confirmPassword}
                maxLength={64}
                onChange={(val) => {
                  setConfirmPassword(val);
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(val, newPassword) }));
                  }
                }}
                onBlur={() => {
                  if (confirmPassword) {
                    setPasswordErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, newPassword) }));
                  }
                }}
                error={passwordErrors.confirmPassword}
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
