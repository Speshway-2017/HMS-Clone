import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Building2, Phone, UserCog, FileBadge, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useHospital, useCreateHospital, useUpdateHospital, useUnassignedHospitalAdmins } from "../../features/hospitals";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { MAX_LENGTHS, isValidPhone, isValidEmail } from "../../lib/validation";

export function HospitalFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data } = useHospital(id);
  const { data: unassignedAdmins, isLoading: isLoadingAdmins } = useUnassignedHospitalAdmins();
  const createHospital = useCreateHospital();
  const updateHospital = useUpdateHospital(id ?? "");

  const [form, setForm] = useState({
    name: "",
    code: "",
    bedCapacity: 0,
    address: "",
    contactEmail: "",
    contactPhone: "",
    logoUrl: "",
    licenseUrl: "",
    primaryAdminId: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    code?: string;
    contactPhone?: string;
    contactEmail?: string;
    primaryAdminId?: string;
    logoUrl?: string;
    licenseUrl?: string;
    bedCapacity?: string;
    address?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    code?: boolean;
    contactPhone?: boolean;
    contactEmail?: boolean;
    primaryAdminId?: boolean;
  }>({});

  useEffect(() => {
    if (data?.hospital) {
      setForm((f) => ({
        ...f,
        name: data.hospital.name,
        code: data.hospital.code,
        bedCapacity: data.hospital.bedCapacity,
        address: data.hospital.address,
        contactEmail: data.hospital.contactEmail,
        contactPhone: data.hospital.contactPhone,
        logoUrl: data.hospital.logoUrl ?? "",
        licenseUrl: data.hospital.licenseUrl ?? "",
      }));
    }
  }, [data]);

  const validateField = (
    field: "name" | "code" | "contactPhone" | "contactEmail" | "primaryAdminId" | "logoUrl" | "licenseUrl",
    value: string
  ): string | undefined => {
    const trimmed = (value || "").trim();

    if (field === "name") {
      if (!trimmed) {
        return "Please enter valid data";
      }
      if (trimmed.length < 2) {
        return "Please enter valid data";
      }
      if (value.length > MAX_LENGTHS.NAME) {
        return `Hospital Name cannot exceed ${MAX_LENGTHS.NAME} characters. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "code") {
      if (!trimmed) {
        return "Please enter valid data";
      }
      if (trimmed.length < 2) {
        return "Please enter valid data";
      }
      if (value.length > MAX_LENGTHS.CODE) {
        return `Hospital Code cannot exceed ${MAX_LENGTHS.CODE} characters. Please enter valid data`;
      }
      if (!/^[A-Za-z0-9\-_]+$/.test(trimmed)) {
        return "Hospital Code must contain only letters, numbers, hyphens, and underscores. Please enter valid data";
      }
      return undefined;
    }

    if (field === "contactPhone") {
      if (!trimmed) return undefined;
      const digitsOnly = trimmed.replace(/\D/g, "");
      if (/[^\d]/.test(trimmed)) {
        return "Invalid phone number. Primary Phone should accept 10 digits only. Please enter valid data";
      }
      if (digitsOnly.length > 10) {
        return "Primary Phone cannot exceed 10 digits. Please enter valid data";
      }
      if (digitsOnly.length < 10) {
        return "Invalid phone number. Please enter a valid 10-digit phone number. Please enter valid data";
      }
      if (/^(\d)\1{9}$/.test(digitsOnly)) {
        return "Please enter a valid 10-digit phone number. Please enter valid data";
      }
      return undefined;
    }

    if (field === "contactEmail") {
      if (!trimmed) return undefined;
      if (value.length > MAX_LENGTHS.EMAIL) {
        return `Email cannot exceed ${MAX_LENGTHS.EMAIL} characters. Please enter valid data`;
      }
      if (!isValidEmail(trimmed)) {
        return "Please enter a valid email address. Please enter valid data";
      }
      return undefined;
    }

    if (field === "primaryAdminId") {
      if (!trimmed) return undefined;
      const isEligible = Boolean(
        unassignedAdmins &&
        unassignedAdmins.length > 0 &&
        unassignedAdmins.some((a) => a._id === trimmed)
      );
      if (!isEligible) {
        return "Selected administrator is invalid or ineligible. Please enter valid data";
      }
      return undefined;
    }

    if (field === "licenseUrl") {
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      if (!lower.endsWith(".pdf") && !lower.includes(".pdf?")) {
        return "Only PDF files should be accepted. Remaining files are not accepted.";
      }
      return undefined;
    }

    if (field === "logoUrl") {
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      const validImageExts = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
      const isImg =
        lower.startsWith("data:image/") ||
        validImageExts.some((ext) => lower.endsWith(ext) || lower.includes(ext + "?") || lower.includes("/image/upload/"));
      if (!isImg) {
        return "Unsupported file format. Hospital Logo accepts only PNG, JPEG, WEBP, or SVG images";
      }
      return undefined;
    }

    return undefined;
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedNavKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (
      !hasSelection &&
      form.name.length >= MAX_LENGTHS.NAME &&
      !allowedNavKeys.includes(e.key) &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      const limitMsg = `Hospital Name cannot exceed ${MAX_LENGTHS.NAME} characters`;
      setFieldErrors((prev) => ({ ...prev, name: limitMsg }));
      setError(limitMsg);
      toast.error(limitMsg, { id: "hospital-name-limit" });
    }
  };

  const handleNameChange = async (newName: string) => {
    const err = validateField("name", newName);
    setFieldErrors((prev) => ({ ...prev, name: err }));
    if (err) {
      setError(err);
      if (newName.length > MAX_LENGTHS.NAME) {
        toast.error(`Hospital Name cannot exceed ${MAX_LENGTHS.NAME} characters`, { id: "hospital-name-limit" });
      }
    } else if (
      error === "Hospital Name is required" ||
      error?.includes("Hospital Name cannot exceed") ||
      error?.includes("Hospital Name must be")
    ) {
      setError(null);
    }

    setForm((prev) => {
      const updated = { ...prev, name: newName };
      if (!isEdit && newName.trim()) {
        const clean = newName.trim().replace(/[^a-zA-Z0-9\s]/g, "");
        const firstWord = clean.split(/\s+/)[0]?.toUpperCase()?.slice(0, 6) || "HOSP";
        const baseCode = firstWord.length >= 3 ? firstWord : "HOSP";
        updated.code = `${baseCode}-01`;
      }
      return updated;
    });

    if (!isEdit && newName.trim().length >= 2 && newName.trim().length <= MAX_LENGTHS.NAME) {
      try {
        const res = await api.get("/hospitals/generate-code", { params: { name: newName } });
        if (res.data?.data?.code) {
          setForm((prev) => ({ ...prev, code: res.data.data.code }));
        }
      } catch (e) {
        // Fallback to local code
      }
    }
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedNavKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];

    // Block non-digits
    if (!allowedNavKeys.includes(e.key) && !e.ctrlKey && !e.metaKey && !/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const msg = "Invalid phone number. Primary Phone should accept 10 digits only";
      setFieldErrors((prev) => ({ ...prev, contactPhone: msg }));
      setError(msg);
      toast.error(msg, { id: "primary-phone-digits-only" });
      return;
    }

    // Block typing exceeding 10 digits
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (
      /^[0-9]$/.test(e.key) &&
      !hasSelection &&
      form.contactPhone.length >= 10
    ) {
      e.preventDefault();
      const msg = "Primary Phone cannot exceed 10 digits";
      setFieldErrors((prev) => ({ ...prev, contactPhone: msg }));
      setError(msg);
      toast.error(msg, { id: "primary-phone-limit" });
    }
  };

  const handlePhoneChange = (newPhone: string) => {
    const digitsOnly = newPhone.replace(/\D/g, "");
    let phoneToSet = digitsOnly;
    let limitErr: string | undefined;

    if (digitsOnly.length > 10) {
      phoneToSet = digitsOnly.slice(0, 10);
      limitErr = "Primary Phone cannot exceed 10 digits";
    }

    setForm((prev) => ({ ...prev, contactPhone: phoneToSet }));

    const err = limitErr || validateField("contactPhone", phoneToSet);
    setFieldErrors((prev) => ({ ...prev, contactPhone: err }));
    if (err) {
      setError(err);
      if (limitErr) {
        toast.error(limitErr, { id: "primary-phone-limit" });
      }
    } else if (
      error?.includes("Primary Phone") ||
      error?.includes("phone number") ||
      error?.includes("Phone number")
    ) {
      setError(null);
    }
  };

  const handleEmailChange = (newEmail: string) => {
    setForm((prev) => ({ ...prev, contactEmail: newEmail }));
    const err = validateField("contactEmail", newEmail);
    setFieldErrors((prev) => ({ ...prev, contactEmail: err }));
    if (err) {
      setError(err);
    } else if (
      error === "Please enter a valid email address" ||
      error?.includes("Email cannot exceed")
    ) {
      setError(null);
    }
  };

  const handleAdminChange = (adminId: string) => {
    setForm((prev) => ({ ...prev, primaryAdminId: adminId }));
    const err = validateField("primaryAdminId", adminId);
    setFieldErrors((prev) => ({ ...prev, primaryAdminId: err }));
    if (err) {
      setError(err);
      toast.error(err, { id: "hospital-admin-error" });
    } else if (error?.includes("administrator") || error?.includes("admin")) {
      setError(null);
    }
  };

  const handleBlur = (field: "name" | "code" | "contactPhone" | "contactEmail" | "primaryAdminId") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setError(err);
      toast.error(err, { id: `hospital-${field}-error` });
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    setTouched({
      name: true,
      code: true,
      contactPhone: true,
      contactEmail: true,
      primaryAdminId: true,
    });

    const nameErr = validateField("name", form.name);
    const codeErr = validateField("code", form.code);
    const phoneErr = validateField("contactPhone", form.contactPhone);
    const emailErr = validateField("contactEmail", form.contactEmail);
    const adminErr = validateField("primaryAdminId", form.primaryAdminId);
    const logoErr = fieldErrors.logoUrl || (form.logoUrl ? validateField("logoUrl", form.logoUrl) : undefined);
    const licenseErr = fieldErrors.licenseUrl || (form.licenseUrl ? validateField("licenseUrl", form.licenseUrl) : undefined);

    let bedErr: string | undefined;
    if (form.bedCapacity < 0) {
      bedErr = "Total Bed Capacity cannot be negative";
    }

    let addressErr: string | undefined;
    if (form.address && form.address.length > MAX_LENGTHS.ADDRESS) {
      addressErr = `Address cannot exceed ${MAX_LENGTHS.ADDRESS} characters`;
    }

    const newFieldErrors = {
      name: nameErr,
      code: codeErr,
      contactPhone: phoneErr,
      contactEmail: emailErr,
      primaryAdminId: adminErr,
      logoUrl: logoErr,
      licenseUrl: licenseErr,
      bedCapacity: bedErr,
      address: addressErr,
    };
    setFieldErrors(newFieldErrors);

    const firstError =
      nameErr ||
      codeErr ||
      phoneErr ||
      emailErr ||
      adminErr ||
      bedErr ||
      addressErr ||
      logoErr ||
      licenseErr;

    if (firstError) {
      setError("Please enter valid data");
      toast.error(firstError.includes("exceed") ? firstError : "Please enter valid data", {
        id: "hospital-submit-error",
      });
      return;
    }

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim(),
        contactEmail: form.contactEmail.trim().toLowerCase(),
        contactPhone: form.contactPhone.trim(),
      };

      if (isEdit) {
        await updateHospital.mutateAsync(payload);
        toast.success("Hospital updated successfully!");
      } else {
        await createHospital.mutateAsync(payload);
        toast.success("Hospital created successfully!");
      }
      navigate("/super-admin/hospitals");
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not save hospital. Please enter valid data";
      setError("Please enter valid data");
      toast.error(serverMsg, { id: "hospital-submit-error" });
    }
  }

  const isSaving = createHospital.isPending || updateHospital.isPending;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/super-admin/hospitals" className="hover:text-navy-700">
            Hospitals
          </Link>{" "}
          &gt; {isEdit ? "Edit Hospital" : "Add New Hospital"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Hospital" : "Onboard New Hospital"}</h1>
        <p className="text-sm text-slate-500">Register a new facility into the HMS unified network.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection icon={Building2} title="Basic Information">
          <InputField
            label="Hospital Name"
            required
            maxLength={MAX_LENGTHS.NAME}
            showCharCount
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={handleNameKeyDown}
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Speshway Hospitals"
          />
          <InputField
            label="Hospital Code (Auto-Generated)"
            required
            maxLength={MAX_LENGTHS.CODE}
            showCharCount
            value={form.code}
            error={fieldErrors.code}
            onChange={(e) => {
              setForm({ ...form, code: e.target.value });
              const err = validateField("code", e.target.value);
              setFieldErrors((prev) => ({ ...prev, code: err }));
              if (err) setError(err);
            }}
            onBlur={() => handleBlur("code")}
            placeholder={form.name ? "Auto-generating code..." : "e.g. SPESH-01"}
            hint={!isEdit ? "Automatically derived from Hospital Name" : undefined}
          />
          <InputField
            label="Total Bed Capacity"
            type="number"
            min={0}
            value={form.bedCapacity}
            error={fieldErrors.bedCapacity}
            onChange={(e) => {
              const val = Number(e.target.value);
              setForm({ ...form, bedCapacity: val });
              if (val < 0) {
                setFieldErrors((prev) => ({ ...prev, bedCapacity: "Total Bed Capacity cannot be negative" }));
              } else {
                setFieldErrors((prev) => ({ ...prev, bedCapacity: undefined }));
              }
            }}
          />
          <InputField
            label="Address"
            maxLength={MAX_LENGTHS.ADDRESS}
            showCharCount
            value={form.address}
            error={fieldErrors.address}
            onChange={(e) => {
              setForm({ ...form, address: e.target.value });
              if (e.target.value.length > MAX_LENGTHS.ADDRESS) {
                setFieldErrors((prev) => ({ ...prev, address: `Address cannot exceed ${MAX_LENGTHS.ADDRESS} characters` }));
              } else {
                setFieldErrors((prev) => ({ ...prev, address: undefined }));
              }
            }}
            placeholder="Street, city, state"
          />
        </FormSection>

        <FormSection icon={Phone} title="Contact">
          <InputField
            label="Contact Email"
            type="email"
            maxLength={MAX_LENGTHS.EMAIL}
            showCharCount
            value={form.contactEmail}
            error={fieldErrors.contactEmail}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={() => handleBlur("contactEmail")}
            placeholder="contact@hospital.com"
          />
          <InputField
            label="Primary Phone"
            type="tel"
            maxLength={MAX_LENGTHS.PHONE}
            showCharCount
            value={form.contactPhone}
            error={fieldErrors.contactPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onKeyDown={handlePhoneKeyDown}
            onBlur={() => handleBlur("contactPhone")}
            placeholder="e.g. 9876543210"
          />
        </FormSection>

        <FormSection icon={UserCog} title="Assignment">
          <SelectField
            label="Primary Admin"
            value={form.primaryAdminId}
            error={fieldErrors.primaryAdminId}
            onChange={(e) => handleAdminChange(e.target.value)}
            onBlur={() => handleBlur("primaryAdminId")}
            hint="Must be an active hospital_admin user with no hospital assigned yet."
          >
            <option value="">Select an administrator (Optional)</option>
            {isLoadingAdmins ? (
              <option value="" disabled>Loading eligible administrators...</option>
            ) : unassignedAdmins && unassignedAdmins.length > 0 ? (
              unassignedAdmins.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.email})
                </option>
              ))
            ) : (
              <option value="" disabled>
                No eligible unassigned administrators available
              </option>
            )}
          </SelectField>
        </FormSection>

        <FormSection icon={FileBadge} title="Documents">
          <FileUpload
            label="Hospital Logo"
            folder="hospital-logos"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            maxSizeMB={2}
            value={form.logoUrl}
            error={fieldErrors.logoUrl}
            onChange={(url) => {
              setForm((prev) => ({ ...prev, logoUrl: url }));
              setFieldErrors((prev) => ({ ...prev, logoUrl: undefined }));
              if (error?.includes("Logo")) setError(null);
            }}
            onError={(err) => {
              setFieldErrors((prev) => ({ ...prev, logoUrl: err || undefined }));
              if (err) setError(err);
              else if (error?.includes("Logo")) setError(null);
            }}
            hint="PNG, JPEG, WEBP, SVG up to 2MB"
          />
          <FileUpload
            label="License Credentials"
            folder="hospital-licenses"
            accept=".pdf,application/pdf"
            maxSizeMB={5}
            value={form.licenseUrl}
            error={fieldErrors.licenseUrl}
            onChange={(url) => {
              setForm((prev) => ({ ...prev, licenseUrl: url }));
              setFieldErrors((prev) => ({ ...prev, licenseUrl: undefined }));
              if (error?.includes("License") || error?.includes("PDF")) setError(null);
            }}
            onError={(err) => {
              setFieldErrors((prev) => ({ ...prev, licenseUrl: err || undefined }));
              if (err) setError(err);
              else if (error?.includes("License") || error?.includes("PDF")) setError(null);
            }}
            hint="PDF files only (max 5MB)"
          />
        </FormSection>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/super-admin/hospitals")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Hospital" : "Create Hospital"}
          </Button>
        </div>
      </form>
    </div>
  );
}
