import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserPlus, ShieldCheck, Copy, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAdmin, useCreateAdmin, useUpdateAdmin } from "../../features/admins";
import { useHospitals } from "../../features/hospitals";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { api, getApiErrorMessage } from "../../lib/api";
import { isValidEmail, isValidPhone } from "../../lib/validation";

const ADMIN_LIMITS = {
  NAME: 100,
  EMAIL: 100,
  PHONE: 10,
  EMPLOYEE_ID: 50,
  TITLE: 100,
} as const;

// Patterns
const NAME_REGEX = /^[a-zA-Z\s\.\-']+$/;
const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9\-_]+$/;
const TITLE_REGEX = /^[a-zA-Z0-9\s\.\-/'&]+$/;

export function AdminFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: admin } = useAdmin(id);
  const { data: hospitalsData } = useHospitals({ page: 1 });
  const createAdmin = useCreateAdmin();
  const updateAdmin = useUpdateAdmin(id ?? "");

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "hospital_admin" as const,
    hospital: "",
    title: "",
    phone: "",
    employeeId: "",
    avatarUrl: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    if (admin) {
      setForm({
        name: admin.name || "",
        email: admin.email || "",
        role: "hospital_admin",
        hospital: typeof admin.hospital === "object" && admin.hospital ? admin.hospital._id : "",
        title: admin.title || "",
        phone: admin.phone || "",
        employeeId: admin.employeeId || "",
        avatarUrl: admin.avatarUrl ?? "",
      });
    }
  }, [admin]);

  const validateField = (
    field: "name" | "email" | "phone" | "employeeId" | "title" | "hospital" | "avatarUrl",
    value: string
  ): string | undefined => {
    const valStr = value || "";
    const trimmed = valStr.trim();

    if (field === "name") {
      if (!trimmed) {
        return "Full Name is required. Please fill out this field";
      }
      if (valStr.length > ADMIN_LIMITS.NAME) {
        return `Full Name cannot exceed ${ADMIN_LIMITS.NAME} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !NAME_REGEX.test(trimmed)) {
        return "Full Name should contain only letters, dots, hyphens, and spaces. Please enter valid data";
      }
      return undefined;
    }

    if (field === "email") {
      if (!trimmed) {
        return "Email Address is required. Please fill out this field";
      }
      if (valStr.length > ADMIN_LIMITS.EMAIL) {
        return `Email Address cannot exceed ${ADMIN_LIMITS.EMAIL} characters. Please enter valid data`;
      }
      if (!isValidEmail(trimmed)) {
        return "Please enter a valid email address. Please enter valid data";
      }
      return undefined;
    }

    if (field === "phone") {
      if (!trimmed) {
        return "Contact Number is required. Please fill out this field";
      }
      const digitsOnly = valStr.replace(/\D/g, "");
      if (/[^\d]/.test(valStr)) {
        return "Invalid contact number. Contact Number should accept 10 digits only. Please enter valid data";
      }
      if (digitsOnly.length > ADMIN_LIMITS.PHONE) {
        return `Contact Number cannot exceed ${ADMIN_LIMITS.PHONE} digits. Please enter valid data`;
      }
      if (digitsOnly.length < 10) {
        return "Invalid contact number. Contact Number should accept 10 digits only. Please enter valid data";
      }
      if (!isValidPhone(valStr)) {
        return "Please enter a valid 10-digit contact number. Please enter valid data";
      }
      return undefined;
    }

    if (field === "employeeId") {
      if (!trimmed) {
        return "Employee ID is required. Please fill out this field";
      }
      if (valStr.length > ADMIN_LIMITS.EMPLOYEE_ID) {
        return `Employee ID cannot exceed ${ADMIN_LIMITS.EMPLOYEE_ID} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !EMPLOYEE_ID_REGEX.test(trimmed)) {
        return "Employee ID must contain only letters, numbers, hyphens, and underscores. Please enter valid data";
      }
      return undefined;
    }

    if (field === "title") {
      if (!trimmed) {
        return "Display Title is required. Please fill out this field";
      }
      if (valStr.length > ADMIN_LIMITS.TITLE) {
        return `Display Title cannot exceed ${ADMIN_LIMITS.TITLE} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !TITLE_REGEX.test(trimmed)) {
        return "Display Title contains invalid characters. Please enter valid data";
      }
      return undefined;
    }

    if (field === "hospital") {
      if (!trimmed) {
        return "Please select an assigned hospital. Please fill out this field";
      }
      return undefined;
    }

    if (field === "avatarUrl") {
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      const isImage =
        lower.startsWith("data:image/") ||
        lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".svg");
      if (!isImage) {
        return "The uploaded file is invalid or unsupported, and the invalid file is not accepted.";
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentLen: number,
    limit: number,
    label: string,
    isPhone = false
  ) => {
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
    if (allowedNavKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    if (isPhone && !/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const msg = "Invalid contact number. Contact Number should accept 10 digits only. Please enter valid data";
      setError("Please enter valid data");
      toast.error(msg, { id: `${label}-digit-only` });
      return;
    }

    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = isPhone
        ? `${label} cannot exceed ${limit} digits. Please enter valid data`
        : `${label} cannot exceed ${limit} characters. Please enter valid data`;
      setError("Please enter valid data");
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handleBlur = (field: "name" | "email" | "phone" | "employeeId" | "title" | "hospital") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setError("Please enter valid data");
      toast.error(err, { id: `admin-${field}-error` });
    }
  };

  const handleHospitalChange = async (selectedHospitalId: string) => {
    setForm((prev) => ({ ...prev, hospital: selectedHospitalId }));
    const hospErr = validateField("hospital", selectedHospitalId);
    setFieldErrors((prev) => ({ ...prev, hospital: hospErr }));

    if (!isEdit && selectedHospitalId) {
      try {
        const res = await api.get("/staff/next-employee-id", {
          params: { role: "hospital_admin", hospital: selectedHospitalId },
        });
        const nextId = res.data.data?.employeeId;
        if (nextId) {
          setForm((prev) => ({ ...prev, hospital: selectedHospitalId, employeeId: nextId }));
          setFieldErrors((prev) => ({ ...prev, employeeId: undefined }));
        }
      } catch (e) {
        // Fallback
      }
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const nameErr = validateField("name", form.name);
    const emailErr = validateField("email", form.email);
    const phoneErr = validateField("phone", form.phone);
    const employeeIdErr = validateField("employeeId", form.employeeId);
    const titleErr = validateField("title", form.title);
    const hospitalErr = validateField("hospital", form.hospital);
    const avatarErr = validateField("avatarUrl", form.avatarUrl);

    const errors = {
      name: nameErr,
      email: emailErr,
      phone: phoneErr,
      employeeId: employeeIdErr,
      title: titleErr,
      hospital: hospitalErr,
      avatarUrl: avatarErr,
    };

    setFieldErrors(errors);
    setTouched({
      name: true,
      email: true,
      phone: true,
      employeeId: true,
      title: true,
      hospital: true,
      avatarUrl: true,
    });

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      setError("Please enter valid data");
      toast.error("Please enter valid data", { id: "admin-submit-invalid" });
      return;
    }

    try {
      if (isEdit) {
        await updateAdmin.mutateAsync(form);
        toast.success("Administrator updated successfully");
        navigate("/super-admin/admins");
      } else {
        const result = await createAdmin.mutateAsync(form);
        setCreated({ email: result.admin.email, tempPassword: result.tempPassword });
      }
    } catch (err) {
      const errMsg = getApiErrorMessage(err);
      setError(errMsg || "Please enter valid data");
      toast.error(errMsg || "Please enter valid data", { id: "admin-submit-error" });
    }
  }

  const isSaving = createAdmin.isPending || updateAdmin.isPending;

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </span>
          </div>
          <h2 className="text-center text-lg font-semibold text-slate-800">Administrator Created</h2>
          <p className="mt-1 text-center text-sm text-slate-500">
            Share these temporary credentials securely — this password is shown only once.
          </p>
          <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-800">{created.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Temporary Password</span>
              <span className="flex items-center gap-2 font-mono font-medium text-slate-800">
                {created.tempPassword}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(created.tempPassword);
                    toast.success("Copied to clipboard");
                  }}
                  className="text-slate-400 hover:text-navy-700"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </span>
            </div>
          </div>
          <Button variant="primary" className="mt-6 w-full justify-center" onClick={() => navigate("/super-admin/admins")}>
            Done
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/super-admin/admins" className="hover:text-navy-700">
            Admins
          </Link>{" "}
          &gt; {isEdit ? "Edit Administrator" : "New Administrator"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Administrator" : "Create New Administrator"}</h1>
        <p className="text-sm text-slate-500">Provide the administrative profile details and assign system access privileges.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection icon={UserPlus} title="Personal Information">
          <InputField
            label="Full Name"
            required
            maxLength={ADMIN_LIMITS.NAME}
            showCharCount
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, name: val });
              const err = validateField("name", val);
              setFieldErrors((prev) => ({ ...prev, name: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, form.name.length, ADMIN_LIMITS.NAME, "Full Name")}
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Johnathan Smith"
          />

          <InputField
            label="Email Address"
            type="email"
            required
            maxLength={ADMIN_LIMITS.EMAIL}
            showCharCount
            value={form.email}
            error={fieldErrors.email}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, email: val });
              const err = validateField("email", val);
              setFieldErrors((prev) => ({ ...prev, email: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, form.email.length, ADMIN_LIMITS.EMAIL, "Email Address")}
            onBlur={() => handleBlur("email")}
            placeholder="jsmith@hms-enterprise.com"
          />

          <InputField
            label="Contact Number"
            type="tel"
            required
            maxLength={ADMIN_LIMITS.PHONE}
            showCharCount
            value={form.phone}
            error={fieldErrors.phone}
            onChange={(e) => {
              const cleanDigits = e.target.value.replace(/\D/g, "");
              setForm({ ...form, phone: cleanDigits });
              const err = validateField("phone", cleanDigits);
              setFieldErrors((prev) => ({ ...prev, phone: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, form.phone.length, ADMIN_LIMITS.PHONE, "Contact Number", true)}
            onBlur={() => handleBlur("phone")}
            placeholder="e.g. 9876543210"
          />

          <InputField
            label="Employee ID (Auto-Generated)"
            required
            maxLength={ADMIN_LIMITS.EMPLOYEE_ID}
            showCharCount
            value={form.employeeId}
            error={fieldErrors.employeeId}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, employeeId: val });
              const err = validateField("employeeId", val);
              setFieldErrors((prev) => ({ ...prev, employeeId: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, form.employeeId.length, ADMIN_LIMITS.EMPLOYEE_ID, "Employee ID")}
            onBlur={() => handleBlur("employeeId")}
            placeholder={form.hospital ? "Auto-generating Employee ID..." : "Select assigned hospital below to generate ID"}
            hint={form.hospital ? "Auto-generated unique ID for assigned hospital" : "Select an assigned hospital below to auto-generate Employee ID"}
          />

          <div className="sm:col-span-2">
            <FileUpload
              label="Profile Photo"
              folder="admin-avatars"
              value={form.avatarUrl}
              onChange={(url) => {
                setForm({ ...form, avatarUrl: url });
                setFieldErrors((prev) => ({ ...prev, avatarUrl: undefined }));
              }}
              hint="PNG, JPEG, WEBP, SVG up to 2MB"
              maxSizeMB={2}
              error={fieldErrors.avatarUrl}
              onError={(err) => setFieldErrors((prev) => ({ ...prev, avatarUrl: err || undefined }))}
            />
          </div>
        </FormSection>

        <FormSection icon={ShieldCheck} title="Role & Scope of Access">
          {/* Role is fixed to Hospital Admin — Super Admin can only create Hospital Admins */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">System Role</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
              <ShieldCheck className="h-4 w-4 text-navy-700" />
              <span className="text-sm font-semibold text-navy-700">Hospital Admin</span>
              <span className="ml-auto rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-600">Fixed</span>
            </div>
            <p className="text-xs text-slate-400">Super Admins can only create Hospital Administrator accounts.</p>
          </div>

          <SelectField
            label="Assigned Hospital"
            required
            value={form.hospital}
            error={fieldErrors.hospital}
            onChange={(e) => handleHospitalChange(e.target.value)}
            onBlur={() => handleBlur("hospital")}
          >
            <option value="">Select Hospital</option>
            {hospitalsData?.data.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name}
              </option>
            ))}
          </SelectField>

          <InputField
            label="Display Title"
            required
            maxLength={ADMIN_LIMITS.TITLE}
            showCharCount
            value={form.title}
            error={fieldErrors.title}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, title: val });
              const err = validateField("title", val);
              setFieldErrors((prev) => ({ ...prev, title: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, form.title.length, ADMIN_LIMITS.TITLE, "Display Title")}
            onBlur={() => handleBlur("title")}
            placeholder="e.g. Clinical Lead"
          />
        </FormSection>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/super-admin/admins")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Create Administrator"}
          </Button>
        </div>
      </form>
    </div>
  );
}
