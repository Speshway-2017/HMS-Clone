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

  const [form, setForm] = useState<{
    name: string;
    code: string;
    bedCapacity: number | string;
    address: string;
    contactEmail: string;
    contactPhone: string;
    logoUrl: string;
    licenseUrl: string;
    primaryAdminId: string;
  }>({
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
    bedCapacity?: boolean;
    address?: boolean;
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
    field: "name" | "code" | "bedCapacity" | "address" | "contactPhone" | "contactEmail" | "primaryAdminId" | "logoUrl" | "licenseUrl",
    value: any
  ): string | undefined => {
    const rawVal = typeof value === "string" ? value : value !== undefined && value !== null ? String(value) : "";
    const trimmed = rawVal.trim();

    if (field === "name") {
      if (!trimmed) {
        return "Please fill out this field";
      }
      if (rawVal.length > MAX_LENGTHS.NAME) {
        return `Hospital Name cannot exceed ${MAX_LENGTHS.NAME} characters. Please enter valid data`;
      }
      if (trimmed.length < 2) {
        return "Hospital Name must be at least 2 characters. Please enter valid data";
      }
      if (!/^[a-zA-Z0-9][a-zA-Z0-9\s.,\-_/'&()]*$/.test(trimmed)) {
        return "Hospital Name contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (field === "code") {
      if (!trimmed) {
        return "Please fill out this field";
      }
      if (rawVal.length > MAX_LENGTHS.CODE) {
        return `Hospital Code cannot exceed ${MAX_LENGTHS.CODE} characters. Please enter valid data`;
      }
      if (trimmed.length < 2) {
        return "Hospital Code must be at least 2 characters. Please enter valid data";
      }
      if (!/^[A-Za-z0-9\-_]+$/.test(trimmed)) {
        return "Hospital Code must contain only letters, numbers, hyphens, and underscores. Please enter valid data";
      }
      return undefined;
    }

    if (field === "bedCapacity") {
      if (value === "" || value === null || value === undefined || (typeof value === "string" && !value.trim())) {
        return undefined; // Optional: data should be saved without this field
      }
      const strVal = String(value).trim();
      if (!/^-?\d+(\.\d+)?$/.test(strVal)) {
        return "Please enter valid data";
      }
      if (strVal.includes(".")) {
        return "Total Bed Capacity must be a whole number. Please enter valid data";
      }
      const num = Number(strVal);
      if (isNaN(num)) {
        return "Please enter valid data";
      }
      if (num < 0) {
        return "Total Bed Capacity cannot be negative. Please enter valid data";
      }
      if (num > 100000 || strVal.length > 6) {
        return "Total Bed Capacity cannot exceed 100,000. Please enter valid data";
      }
      return undefined;
    }

    if (field === "address") {
      if (!trimmed) {
        return undefined; // Optional: data should be saved without this field
      }
      if (rawVal.length > MAX_LENGTHS.ADDRESS) {
        return `Address cannot exceed ${MAX_LENGTHS.ADDRESS} characters. Please enter valid data`;
      }
      if (/<script|javascript:|data:/i.test(trimmed) || !/^[a-zA-Z0-9\s,.\-#/'()]+$/.test(trimmed)) {
        return "Address contains invalid data. Please enter valid data";
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
      const limitMsg = `Hospital Name cannot exceed ${MAX_LENGTHS.NAME} characters. Please enter valid data`;
      setFieldErrors((prev) => ({ ...prev, name: limitMsg }));
      setError(limitMsg);
      toast.error(limitMsg, { id: "hospital-name-limit" });
    }
  };

  const handleNameChange = async (newName: string) => {
    let cleanName = newName;
    let limitErr: string | undefined;
    if (newName.length > MAX_LENGTHS.NAME) {
      cleanName = newName.slice(0, MAX_LENGTHS.NAME);
      limitErr = `Hospital Name cannot exceed ${MAX_LENGTHS.NAME} characters. Please enter valid data`;
    }

    const err = limitErr || validateField("name", cleanName);
    setFieldErrors((prev) => ({ ...prev, name: err }));
    if (err) {
      setError(err);
      if (limitErr) {
        toast.error(limitErr, { id: "hospital-name-limit" });
      }
    } else if (
      error?.includes("Hospital Name") ||
      error === "Please fill out this field" ||
      error === "Please enter valid data"
    ) {
      setError(null);
    }

    setForm((prev) => {
      const updated = { ...prev, name: cleanName };
      if (!isEdit && cleanName.trim()) {
        const clean = cleanName.trim().replace(/[^a-zA-Z0-9\s]/g, "");
        const firstWord = clean.split(/\s+/)[0]?.toUpperCase()?.slice(0, 6) || "HOSP";
        const baseCode = firstWord.length >= 3 ? firstWord : "HOSP";
        updated.code = `${baseCode}-01`;
      }
      return updated;
    });

    if (!isEdit && cleanName.trim().length >= 2 && cleanName.trim().length <= MAX_LENGTHS.NAME) {
      try {
        const res = await api.get("/hospitals/generate-code", { params: { name: cleanName } });
        if (res.data?.data?.code) {
          setForm((prev) => ({ ...prev, code: res.data.data.code }));
        }
      } catch (e) {
        // Fallback to local code
      }
    }
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      form.code.length >= MAX_LENGTHS.CODE &&
      !allowedNavKeys.includes(e.key) &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      const limitMsg = `Hospital Code cannot exceed ${MAX_LENGTHS.CODE} characters. Please enter valid data`;
      setFieldErrors((prev) => ({ ...prev, code: limitMsg }));
      setError(limitMsg);
      toast.error(limitMsg, { id: "hospital-code-limit" });
    }
  };

  const handleCodeChange = (newCode: string) => {
    let cleanCode = newCode;
    let limitErr: string | undefined;
    if (newCode.length > MAX_LENGTHS.CODE) {
      cleanCode = newCode.slice(0, MAX_LENGTHS.CODE);
      limitErr = `Hospital Code cannot exceed ${MAX_LENGTHS.CODE} characters. Please enter valid data`;
    }

    setForm((prev) => ({ ...prev, code: cleanCode }));
    const err = limitErr || validateField("code", cleanCode);
    setFieldErrors((prev) => ({ ...prev, code: err }));
    if (err) {
      setError(err);
      if (limitErr) {
        toast.error(limitErr, { id: "hospital-code-limit" });
      }
    } else if (
      error?.includes("Hospital Code") ||
      error === "Please fill out this field" ||
      error === "Please enter valid data"
    ) {
      setError(null);
    }
  };

  const handleBedCapacityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    if (["-", "e", "E", "+"].includes(e.key)) {
      e.preventDefault();
      const msg = "Total Bed Capacity cannot be negative. Please enter valid data";
      setFieldErrors((prev) => ({ ...prev, bedCapacity: msg }));
      setError(msg);
      toast.error(msg, { id: "bed-capacity-invalid" });
      return;
    }
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (
      !hasSelection &&
      String(form.bedCapacity).length >= 6 &&
      /^[0-9]$/.test(e.key) &&
      !allowedNavKeys.includes(e.key) &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      e.preventDefault();
      const limitMsg = "Total Bed Capacity cannot exceed 100,000. Please enter valid data";
      setFieldErrors((prev) => ({ ...prev, bedCapacity: limitMsg }));
      setError(limitMsg);
      toast.error(limitMsg, { id: "bed-capacity-limit" });
    }
  };

  const handleBedCapacityChange = (newVal: string) => {
    setForm((prev) => ({ ...prev, bedCapacity: newVal }));
    const err = validateField("bedCapacity", newVal);
    setFieldErrors((prev) => ({ ...prev, bedCapacity: err }));
    if (err) {
      setError(err);
    } else if (error?.includes("Bed Capacity") || error?.includes("bed capacity") || error === "Please enter valid data") {
      setError(null);
    }
  };

  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      form.address.length >= MAX_LENGTHS.ADDRESS &&
      !allowedNavKeys.includes(e.key) &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      const limitMsg = `Address cannot exceed ${MAX_LENGTHS.ADDRESS} characters. Please enter valid data`;
      setFieldErrors((prev) => ({ ...prev, address: limitMsg }));
      setError(limitMsg);
      toast.error(limitMsg, { id: "hospital-address-limit" });
    }
  };

  const handleAddressChange = (newAddress: string) => {
    let cleanAddress = newAddress;
    let limitErr: string | undefined;
    if (newAddress.length > MAX_LENGTHS.ADDRESS) {
      cleanAddress = newAddress.slice(0, MAX_LENGTHS.ADDRESS);
      limitErr = `Address cannot exceed ${MAX_LENGTHS.ADDRESS} characters. Please enter valid data`;
    }

    setForm((prev) => ({ ...prev, address: cleanAddress }));
    const err = limitErr || validateField("address", cleanAddress);
    setFieldErrors((prev) => ({ ...prev, address: err }));
    if (err) {
      setError(err);
      if (limitErr) {
        toast.error(limitErr, { id: "hospital-address-limit" });
      }
    } else if (error?.includes("Address") || error?.includes("address") || error === "Please enter valid data") {
      setError(null);
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

  const handleBlur = (
    field: "name" | "code" | "bedCapacity" | "address" | "contactPhone" | "contactEmail" | "primaryAdminId"
  ) => {
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
      bedCapacity: true,
      address: true,
      contactPhone: true,
      contactEmail: true,
      primaryAdminId: true,
    });

    const nameErr = validateField("name", form.name);
    const codeErr = validateField("code", form.code);
    const bedErr = validateField("bedCapacity", form.bedCapacity);
    const addressErr = validateField("address", form.address);
    const phoneErr = validateField("contactPhone", form.contactPhone);
    const emailErr = validateField("contactEmail", form.contactEmail);
    const adminErr = validateField("primaryAdminId", form.primaryAdminId);
    const logoErr = fieldErrors.logoUrl || (form.logoUrl ? validateField("logoUrl", form.logoUrl) : undefined);
    const licenseErr = fieldErrors.licenseUrl || (form.licenseUrl ? validateField("licenseUrl", form.licenseUrl) : undefined);

    const newFieldErrors = {
      name: nameErr,
      code: codeErr,
      bedCapacity: bedErr,
      address: addressErr,
      contactPhone: phoneErr,
      contactEmail: emailErr,
      primaryAdminId: adminErr,
      logoUrl: logoErr,
      licenseUrl: licenseErr,
    };
    setFieldErrors(newFieldErrors);

    const firstError =
      nameErr ||
      codeErr ||
      bedErr ||
      addressErr ||
      phoneErr ||
      emailErr ||
      adminErr ||
      logoErr ||
      licenseErr;

    if (firstError) {
      setError(firstError);
      toast.error(firstError, {
        id: "hospital-submit-error",
      });
      return;
    }

    try {
      const parsedBed =
        form.bedCapacity === "" || form.bedCapacity === null || form.bedCapacity === undefined
          ? 0
          : Number(form.bedCapacity);

      const payload = {
        ...form,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        bedCapacity: isNaN(parsedBed) ? 0 : parsedBed,
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
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={handleCodeKeyDown}
            onBlur={() => handleBlur("code")}
            placeholder={form.name ? "Auto-generating code..." : "e.g. SPESH-01"}
            hint={!isEdit ? "Automatically derived from Hospital Name" : undefined}
          />
          <InputField
            label="Total Bed Capacity"
            type="number"
            min={0}
            max={100000}
            value={form.bedCapacity}
            error={fieldErrors.bedCapacity}
            onChange={(e) => handleBedCapacityChange(e.target.value)}
            onKeyDown={handleBedCapacityKeyDown}
            onBlur={() => handleBlur("bedCapacity")}
            placeholder="0"
          />
          <InputField
            label="Address"
            maxLength={MAX_LENGTHS.ADDRESS}
            showCharCount
            value={form.address}
            error={fieldErrors.address}
            onChange={(e) => handleAddressChange(e.target.value)}
            onKeyDown={handleAddressKeyDown}
            onBlur={() => handleBlur("address")}
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
