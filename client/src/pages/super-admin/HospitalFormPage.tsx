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
    contactPhone?: string;
    contactEmail?: string;
    code?: string;
    primaryAdminId?: string;
    logoUrl?: string;
    licenseUrl?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
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
    field: "name" | "contactPhone" | "contactEmail" | "primaryAdminId" | "logoUrl" | "licenseUrl",
    value: string
  ): string | undefined => {
    const trimmed = (value || "").trim();

    if (field === "name") {
      if (!trimmed) {
        return "Hospital Name is required";
      }
      if (value.length > MAX_LENGTHS.NAME) {
        return `Hospital Name cannot exceed ${MAX_LENGTHS.NAME} characters`;
      }
      return undefined;
    }

    if (field === "contactPhone") {
      if (!trimmed) return undefined;
      const digitsOnly = trimmed.replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        return "Primary Phone must contain at least 10 digits";
      }
      if (digitsOnly.length > 15) {
        return "Primary Phone cannot exceed 15 digits";
      }
      if (!isValidPhone(trimmed)) {
        return "Please enter a valid 10-15 digit phone number";
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

    if (field === "primaryAdminId") {
      if (!trimmed) return undefined;
      if (unassignedAdmins && unassignedAdmins.length > 0) {
        const isEligible = unassignedAdmins.some((a) => a._id === trimmed);
        if (!isEligible) {
          return "Selected administrator is invalid or ineligible";
        }
      }
      return undefined;
    }

    if (field === "licenseUrl") {
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      if (!lower.endsWith(".pdf") && !lower.includes(".pdf?")) {
        return "License Credentials accepts only PDF files (.pdf)";
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

  const handleNameChange = async (newName: string) => {
    const err = validateField("name", newName);
    setFieldErrors((prev) => ({ ...prev, name: err }));
    if (err) {
      setError(err);
    } else if (error === "Hospital Name is required" || error?.includes("Hospital Name cannot exceed")) {
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

  const handlePhoneChange = (newPhone: string) => {
    setForm((prev) => ({ ...prev, contactPhone: newPhone }));
    const err = validateField("contactPhone", newPhone);
    setFieldErrors((prev) => ({ ...prev, contactPhone: err }));
    if (err) {
      setError(err);
    } else if (
      error?.includes("Primary Phone") ||
      error === "Please enter a valid 10-15 digit phone number" ||
      error?.includes("Phone number cannot exceed")
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
    } else if (error?.includes("administrator")) {
      setError(null);
    }
  };

  const handleBlur = (field: "name" | "contactPhone" | "contactEmail" | "primaryAdminId") => {
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
      contactPhone: true,
      contactEmail: true,
      primaryAdminId: true,
    });

    const nameErr = validateField("name", form.name);
    const phoneErr = validateField("contactPhone", form.contactPhone);
    const emailErr = validateField("contactEmail", form.contactEmail);
    const adminErr = validateField("primaryAdminId", form.primaryAdminId);
    const logoErr = fieldErrors.logoUrl || (form.logoUrl ? validateField("logoUrl", form.logoUrl) : undefined);
    const licenseErr = fieldErrors.licenseUrl || (form.licenseUrl ? validateField("licenseUrl", form.licenseUrl) : undefined);

    const newFieldErrors = {
      name: nameErr,
      contactPhone: phoneErr,
      contactEmail: emailErr,
      primaryAdminId: adminErr,
      logoUrl: logoErr,
      licenseUrl: licenseErr,
    };
    setFieldErrors(newFieldErrors);

    const firstError = nameErr || phoneErr || emailErr || adminErr || logoErr || licenseErr;
    if (firstError) {
      setError(firstError);
      toast.error(firstError, { id: "hospital-submit-error" });
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
        "Could not save hospital. Check the form and try again.";
      setError(serverMsg);
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
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Speshway Hospitals"
          />
          <InputField
            label="Hospital Code (Auto-Generated)"
            required
            maxLength={MAX_LENGTHS.CODE}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder={form.name ? "Auto-generating code..." : "e.g. SPESH-01"}
            hint={!isEdit ? "Automatically derived from Hospital Name" : undefined}
          />
          <InputField
            label="Total Bed Capacity"
            type="number"
            min={0}
            value={form.bedCapacity}
            onChange={(e) => setForm({ ...form, bedCapacity: Number(e.target.value) })}
          />
          <InputField
            label="Address"
            maxLength={MAX_LENGTHS.ADDRESS}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Street, city, state"
          />
        </FormSection>

        <FormSection icon={Phone} title="Contact">
          <InputField
            label="Contact Email"
            type="email"
            maxLength={MAX_LENGTHS.EMAIL}
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
            onBlur={() => handleBlur("contactPhone")}
            placeholder="+1 (555) 000-0000"
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
            accept="application/pdf"
            maxSizeMB={5}
            value={form.licenseUrl}
            error={fieldErrors.licenseUrl}
            onChange={(url) => {
              setForm((prev) => ({ ...prev, licenseUrl: url }));
              setFieldErrors((prev) => ({ ...prev, licenseUrl: undefined }));
              if (error?.includes("License")) setError(null);
            }}
            onError={(err) => {
              setFieldErrors((prev) => ({ ...prev, licenseUrl: err || undefined }));
              if (err) setError(err);
              else if (error?.includes("License")) setError(null);
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
