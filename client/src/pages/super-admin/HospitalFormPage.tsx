import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Building2, Phone, FileBadge, AlertCircle, Sparkles, UserCheck, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useHospital, useCreateHospital, useUpdateHospital, useUnassignedHospitalAdmins } from "../../features/hospitals";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { MAX_LENGTHS, isValidEmail } from "../../lib/validation";

export function HospitalFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data } = useHospital(id);
  const { data: adminsList, isLoading: isLoadingAdmins } = useUnassignedHospitalAdmins(id);
  const createHospital = useCreateHospital();
  const updateHospital = useUpdateHospital(id ?? "");

  const [form, setForm] = useState<{
    name: string;
    code: string;
    address: string;
    contactEmail: string;
    contactPhone: string;
    primaryAdminId: string;
    logoUrl: string;
    licenseUrl: string;
  }>({
    name: "",
    code: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    primaryAdminId: "",
    logoUrl: "",
    licenseUrl: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    code?: string;
    contactPhone?: string;
    contactEmail?: string;
    logoUrl?: string;
    licenseUrl?: string;
    address?: string;
    primaryAdminId?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    code?: boolean;
    address?: boolean;
    contactPhone?: boolean;
    contactEmail?: boolean;
  }>({});

  // Auto-generate next sequential Hospital ID on create
  useEffect(() => {
    if (!isEdit) {
      api
        .get<{ status: string; data: { nextId: string } }>("/hospitals/next-id")
        .then((res) => {
          if (res.data?.data?.nextId) {
            setForm((f) => ({ ...f, code: res.data.data.nextId }));
          }
        })
        .catch(() => {
          setForm((f) => ({ ...f, code: "HOSP-001" }));
        });
    }
  }, [isEdit]);

  useEffect(() => {
    if (data?.hospital) {
      setForm({
        name: data.hospital.name,
        code: data.hospital.code,
        address: data.hospital.address ?? "",
        contactEmail: data.hospital.contactEmail ?? "",
        contactPhone: data.hospital.contactPhone ?? "",
        primaryAdminId: data.stats?.primaryAdmin?._id ?? "",
        logoUrl: data.hospital.logoUrl ?? "",
        licenseUrl: data.hospital.licenseUrl ?? "",
      });
    }
  }, [data]);

  const validateField = (
    field: "name" | "code" | "address" | "contactPhone" | "contactEmail" | "logoUrl" | "licenseUrl",
    value: any
  ): string | undefined => {
    const rawVal = typeof value === "string" ? value : value !== undefined && value !== null ? String(value) : "";
    const trimmed = rawVal.trim();

    if (field === "name") {
      if (!trimmed) {
        return "Hospital Name is required";
      }
      if (rawVal.length > MAX_LENGTHS.NAME) {
        return `Hospital Name cannot exceed ${MAX_LENGTHS.NAME} characters`;
      }
      if (trimmed.length < 2) {
        return "Hospital Name must be at least 2 characters";
      }
      if (!/^[a-zA-Z0-9][a-zA-Z0-9\s.,\-_/'&()]*$/.test(trimmed)) {
        return "Hospital Name contains invalid characters";
      }
      return undefined;
    }

    if (field === "code") {
      if (!trimmed) {
        return "Hospital Unique ID is required";
      }
      if (rawVal.length > MAX_LENGTHS.CODE) {
        return `Hospital ID cannot exceed ${MAX_LENGTHS.CODE} characters`;
      }
      if (trimmed.length < 2) {
        return "Hospital ID must be at least 2 characters";
      }
      if (!/^[A-Za-z0-9\-_]+$/.test(trimmed)) {
        return "Hospital ID must contain only letters, numbers, hyphens, and underscores";
      }
      return undefined;
    }

    if (field === "address") {
      if (!trimmed) return undefined;
      if (rawVal.length > MAX_LENGTHS.ADDRESS) {
        return `Address cannot exceed ${MAX_LENGTHS.ADDRESS} characters`;
      }
      if (/<script|javascript:|data:/i.test(trimmed) || !/^[a-zA-Z0-9\s,.\-#/'()]+$/.test(trimmed)) {
        return "Address contains invalid characters";
      }
      return undefined;
    }

    if (field === "contactPhone") {
      if (!trimmed) return undefined;
      const digitsOnly = trimmed.replace(/\D/g, "");
      if (/[^\d]/.test(trimmed)) {
        return "Contact phone should accept 10 digits only";
      }
      if (digitsOnly.length !== 10) {
        return "Please enter a valid 10-digit phone number";
      }
      if (/^(\d)\1{9}$/.test(digitsOnly)) {
        return "Please enter a valid 10-digit phone number";
      }
      return undefined;
    }

    if (field === "contactEmail") {
      if (!trimmed) return undefined;
      if (value.length > MAX_LENGTHS.EMAIL) {
        return `Email cannot exceed ${MAX_LENGTHS.EMAIL} characters`;
      }
      if (!isValidEmail(trimmed)) {
        return "Please enter a valid email address";
      }
      return undefined;
    }

    if (field === "licenseUrl") {
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      if (!lower.endsWith(".pdf") && !lower.includes(".pdf?")) {
        return "Only PDF files are accepted for licenses";
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
        return "Hospital Logo accepts only PNG, JPEG, WEBP, or SVG images";
      }
      return undefined;
    }

    return undefined;
  };

  const handleBlur = (field: "name" | "code" | "address" | "contactPhone" | "contactEmail") => {
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
      address: true,
      contactPhone: true,
      contactEmail: true,
    });

    const nameErr = validateField("name", form.name);
    const codeErr = validateField("code", form.code);
    const addressErr = validateField("address", form.address);
    const phoneErr = validateField("contactPhone", form.contactPhone);
    const emailErr = validateField("contactEmail", form.contactEmail);
    const logoErr = fieldErrors.logoUrl || (form.logoUrl ? validateField("logoUrl", form.logoUrl) : undefined);
    const licenseErr = fieldErrors.licenseUrl || (form.licenseUrl ? validateField("licenseUrl", form.licenseUrl) : undefined);

    const newFieldErrors = {
      name: nameErr,
      code: codeErr,
      address: addressErr,
      contactPhone: phoneErr,
      contactEmail: emailErr,
      logoUrl: logoErr,
      licenseUrl: licenseErr,
    };
    setFieldErrors(newFieldErrors);

    const firstError = nameErr || codeErr || addressErr || phoneErr || emailErr || logoErr || licenseErr;

    if (firstError) {
      setError(firstError);
      toast.error(firstError, { id: "hospital-submit-error" });
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim(),
        contactEmail: form.contactEmail.trim().toLowerCase(),
        contactPhone: form.contactPhone.trim(),
        primaryAdminId: form.primaryAdminId || undefined,
        logoUrl: form.logoUrl,
        licenseUrl: form.licenseUrl,
      };

      if (isEdit) {
        await updateHospital.mutateAsync(payload);
        toast.success("Hospital updated successfully!");
      } else {
        await createHospital.mutateAsync(payload);
        toast.success("Hospital created and administrator assigned successfully!");
      }
      navigate("/super-admin/hospitals");
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not save hospital. Please verify the information entered.";
      setError(serverMsg);
      toast.error(serverMsg, { id: "hospital-submit-error" });
    }
  }

  const isSaving = createHospital.isPending || updateHospital.isPending;

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Link to="/super-admin/hospitals" className="hover:text-emerald-700 transition-colors">
              Hospitals Registry
            </Link>{" "}
            / {isEdit ? "Edit Facility" : "Add Facility"}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {isEdit ? "Edit Hospital Facility" : "Add Independent Hospital"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Add and manage hospitals directly under Super Admin supervision with automated Unique IDs and administrator assignment.
          </p>
        </div>
        {form.code && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold self-start sm:self-auto">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>ID: {form.code}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Basic Facility Info & Administrator Assignment */}
        <FormSection icon={Building2} title="Facility Identity & Administration">
          <InputField
            label="Hospital Name"
            required
            maxLength={MAX_LENGTHS.NAME}
            showCharCount
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => {
              const val = e.target.value;
              setForm((p) => ({ ...p, name: val }));
              const err = validateField("name", val);
              setFieldErrors((p) => ({ ...p, name: err }));
              if (!err && error?.includes("Hospital Name")) setError(null);
            }}
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Preethi Multi-Specialty Hospital"
          />

          <InputField
            label="Hospital Unique ID (Auto-Generated)"
            required
            maxLength={MAX_LENGTHS.CODE}
            showCharCount
            value={form.code}
            error={fieldErrors.code}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setForm((p) => ({ ...p, code: val }));
              const err = validateField("code", val);
              setFieldErrors((p) => ({ ...p, code: err }));
              if (!err && error?.includes("Hospital ID")) setError(null);
            }}
            onBlur={() => handleBlur("code")}
            placeholder="e.g. HOSP-001"
            hint="System-wide institutional code used for generating all staff and doctor credentials."
          />

          {/* Administrator Assignment */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-emerald-700" />
                Assign Hospital Administrator
              </label>
              <Link
                to="/super-admin/admins/new"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                <Plus className="h-3 w-3" /> Create New Admin
              </Link>
            </div>
            <SelectField
              label=""
              value={form.primaryAdminId}
              error={fieldErrors.primaryAdminId}
              onChange={(e) => {
                setForm((p) => ({ ...p, primaryAdminId: e.target.value }));
                setFieldErrors((p) => ({ ...p, primaryAdminId: undefined }));
              }}
              hint="Designate an administrator to manage this hospital's day-to-day operations, clinical departments, and staff."
            >
              <option value="">Select an Administrator (Optional / Assign Later)</option>
              {isLoadingAdmins ? (
                <option value="" disabled>Loading available administrators...</option>
              ) : adminsList && adminsList.length > 0 ? (
                adminsList.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.employeeId ? `${a.employeeId} • ` : ""}{a.email})
                  </option>
                ))
              ) : (
                <option value="" disabled>No administrators available. Click "Create New Admin" above to register one.</option>
              )}
            </SelectField>
          </div>

          <InputField
            label="Full Address / Location"
            maxLength={MAX_LENGTHS.ADDRESS}
            showCharCount
            value={form.address}
            error={fieldErrors.address}
            onChange={(e) => {
              const val = e.target.value;
              setForm((p) => ({ ...p, address: val }));
              const err = validateField("address", val);
              setFieldErrors((p) => ({ ...p, address: err }));
              if (!err && error?.includes("Address")) setError(null);
            }}
            onBlur={() => handleBlur("address")}
            placeholder="Street address, City, State, PIN"
          />
        </FormSection>

        {/* Contact Info */}
        <FormSection icon={Phone} title="Institutional Contact Channels">
          <InputField
            label="Official Contact Email"
            type="email"
            maxLength={MAX_LENGTHS.EMAIL}
            showCharCount
            value={form.contactEmail}
            error={fieldErrors.contactEmail}
            onChange={(e) => {
              const val = e.target.value;
              setForm((p) => ({ ...p, contactEmail: val }));
              const err = validateField("contactEmail", val);
              setFieldErrors((p) => ({ ...p, contactEmail: err }));
              if (!err && error?.includes("email")) setError(null);
            }}
            onBlur={() => handleBlur("contactEmail")}
            placeholder="contact@hospital.com"
          />

          <InputField
            label="Official Contact Phone"
            type="tel"
            maxLength={MAX_LENGTHS.PHONE}
            showCharCount
            value={form.contactPhone}
            error={fieldErrors.contactPhone}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
              setForm((p) => ({ ...p, contactPhone: digitsOnly }));
              const err = validateField("contactPhone", digitsOnly);
              setFieldErrors((p) => ({ ...p, contactPhone: err }));
              if (!err && error?.includes("phone")) setError(null);
            }}
            onBlur={() => handleBlur("contactPhone")}
            placeholder="10-digit mobile or landline"
          />
        </FormSection>

        {/* Logo and Documentation */}
        <FormSection icon={FileBadge} title="Brand & Institutional Credentials">
          <div className="space-y-4">
            <FileUpload
              label="Hospital Brand Logo"
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
              hint="PNG, JPEG, WEBP, or SVG up to 2MB. Displayed across patient portals and public websites."
            />

            {form.logoUrl && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                <img
                  src={form.logoUrl}
                  alt="Logo preview"
                  className="h-12 w-12 rounded-full object-cover border border-emerald-300 shadow-xs"
                />
                <div>
                  <div className="text-xs font-semibold text-emerald-950">Active Logo Configured</div>
                  <div className="text-[11px] text-emerald-700 font-mono truncate max-w-sm">{form.logoUrl}</div>
                </div>
              </div>
            )}
          </div>

          <FileUpload
            label="Facility License & Accreditation Documents (PDF)"
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
            hint="PDF documents only (max 5MB). Clinical registration or regulatory certification."
          />
        </FormSection>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate("/super-admin/hospitals")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Update Hospital" : "Add Hospital"}
          </Button>
        </div>
      </form>
    </div>
  );
}