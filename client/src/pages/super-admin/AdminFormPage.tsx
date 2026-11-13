import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserPlus, ShieldCheck, Copy, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAdmin, useCreateAdmin, useUpdateAdmin } from "../../features/admins";
import { FormSection } from "../../components/ui/FormSection";
import { InputField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { api, getApiErrorMessage } from "../../lib/api";
import { isValidEmail } from "../../lib/validation";

const ADMIN_LIMITS = {
  NAME: 100,
  EMAIL: 100,
  PHONE: 10,
  EMPLOYEE_ID: 50,
  TITLE: 100,
} as const;

const NAME_REGEX = /^[a-zA-Z\s\.\-']+$/;
const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9\-_]+$/;
const TITLE_REGEX = /^[a-zA-Z0-9\s\.\-/'&]+$/;

export function AdminFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: admin } = useAdmin(id);
  const createAdmin = useCreateAdmin();
  const updateAdmin = useUpdateAdmin(id ?? "");

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "admin",
    title: "System Administrator",
    phone: "",
    employeeId: "",
    avatarUrl: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string; employeeId?: string } | null>(null);

  // Auto-generate next sequential Unique Administrator ID on create
  useEffect(() => {
    if (!isEdit) {
      api
        .get<{ status: string; data: { nextId: string } }>("/admins/next-id")
        .then((res) => {
          if (res.data?.data?.nextId) {
            setForm((f) => ({ ...f, employeeId: res.data.data.nextId }));
          }
        })
        .catch(() => {
          setForm((f) => ({ ...f, employeeId: "ADM-001" }));
        });
    }
  }, [isEdit]);

  useEffect(() => {
    if (admin) {
      setForm({
        name: admin.name || "",
        email: admin.email || "",
        role: admin.role || "admin",
        title: admin.title || "System Administrator",
        phone: admin.phone || "",
        employeeId: admin.employeeId || "",
        avatarUrl: admin.avatarUrl ?? "",
      });
    }
  }, [admin]);

  const validateField = (
    field: "name" | "email" | "phone" | "employeeId" | "title" | "avatarUrl",
    value: string
  ): string | undefined => {
    const valStr = value || "";
    const trimmed = valStr.trim();

    if (field === "name") {
      if (!trimmed) {
        return "Full Name is required";
      }
      if (valStr.length > ADMIN_LIMITS.NAME) {
        return `Full Name cannot exceed ${ADMIN_LIMITS.NAME} characters`;
      }
      if (trimmed.length < 2 || !NAME_REGEX.test(trimmed)) {
        return "Full Name should contain only letters, dots, hyphens, and spaces";
      }
      return undefined;
    }

    if (field === "email") {
      if (!trimmed) {
        return "Email Address is required";
      }
      if (valStr.length > ADMIN_LIMITS.EMAIL) {
        return `Email Address cannot exceed ${ADMIN_LIMITS.EMAIL} characters`;
      }
      if (!isValidEmail(trimmed)) {
        return "Please enter a valid email address";
      }
      return undefined;
    }

    if (field === "phone") {
      if (!trimmed) {
        return "Contact Number is required";
      }
      const digitsOnly = valStr.replace(/\D/g, "");
      if (/[^\d]/.test(valStr)) {
        return "Contact Number should accept 10 digits only";
      }
      if (digitsOnly.length !== 10) {
        return "Please enter a valid 10-digit contact number";
      }
      if (/^(\d)\1{9}$/.test(digitsOnly)) {
        return "Please enter a valid 10-digit contact number";
      }
      return undefined;
    }

    if (field === "employeeId") {
      if (!trimmed) {
        return "Admin Unique ID is required";
      }
      if (valStr.length > ADMIN_LIMITS.EMPLOYEE_ID) {
        return `Admin ID cannot exceed ${ADMIN_LIMITS.EMPLOYEE_ID} characters`;
      }
      if (trimmed.length < 2 || !EMPLOYEE_ID_REGEX.test(trimmed)) {
        return "Admin ID must contain only letters, numbers, hyphens, and underscores";
      }
      return undefined;
    }

    if (field === "title") {
      if (!trimmed) {
        return "Display Title is required";
      }
      if (valStr.length > ADMIN_LIMITS.TITLE) {
        return `Display Title cannot exceed ${ADMIN_LIMITS.TITLE} characters`;
      }
      if (trimmed.length < 2 || !TITLE_REGEX.test(trimmed)) {
        return "Display Title contains invalid characters";
      }
      return undefined;
    }

    if (field === "avatarUrl") {
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      const validImageExts = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
      const isImg =
        lower.startsWith("data:image/") ||
        validImageExts.some((ext) => lower.endsWith(ext) || lower.includes(ext + "?") || lower.includes("/image/upload/"));
      if (!isImg) {
        return "Profile photo must be a valid image file (PNG, JPG, WEBP, or SVG)";
      }
      return undefined;
    }

    return undefined;
  };

  const handleBlur = (field: "name" | "email" | "phone" | "employeeId" | "title") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setError(err);
      toast.error(err, { id: `admin-${field}-error` });
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
    const avatarErr = validateField("avatarUrl", form.avatarUrl);

    const errors = {
      name: nameErr,
      email: emailErr,
      phone: phoneErr,
      employeeId: employeeIdErr,
      title: titleErr,
      avatarUrl: avatarErr,
    };

    setFieldErrors(errors);
    setTouched({
      name: true,
      email: true,
      phone: true,
      employeeId: true,
      title: true,
    });

    const firstErr = nameErr || emailErr || phoneErr || employeeIdErr || titleErr || avatarErr;
    if (firstErr) {
      setError(firstErr);
      toast.error(firstErr, { id: "admin-submit-invalid" });
      return;
    }

    try {
      if (isEdit) {
        await updateAdmin.mutateAsync(form);
        toast.success("Administrator updated successfully");
        navigate("/super-admin/admins");
      } else {
        const result = await createAdmin.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: "admin",
          hospital: null,
          title: form.title.trim(),
          phone: form.phone.trim(),
          employeeId: form.employeeId.trim().toUpperCase(),
          avatarUrl: form.avatarUrl,
        });
        setCreated({
          email: result.admin.email,
          tempPassword: result.tempPassword,
          employeeId: (result.admin as any).employeeId || form.employeeId,
        });
      }
    } catch (err) {
      const errMsg = getApiErrorMessage(err);
      setError(errMsg || "Could not save administrator");
      toast.error(errMsg || "Could not save administrator", { id: "admin-submit-error" });
    }
  }

  const isSaving = createAdmin.isPending || updateAdmin.isPending;

  if (created) {
    return (
      <div className="w-full space-y-6">
        <div className="mx-auto max-w-xl pt-6">
          <Card className="border border-emerald-200 shadow-md">
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </span>
          </div>
          <h2 className="text-center text-xl font-bold text-slate-900">Administrator Created</h2>
          <p className="mt-1 text-center text-xs text-slate-500">
            Independent administrator created successfully with system access privileges.
          </p>

          <div className="mt-5 space-y-3 rounded-lg bg-emerald-50/50 border border-emerald-100 p-4 text-xs sm:text-sm">
            {created.employeeId && (
              <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                <span className="text-slate-500 font-medium">Administrator ID</span>
                <span className="font-mono font-bold text-emerald-900">{created.employeeId}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1 border-b border-emerald-100">
              <span className="text-slate-500 font-medium">Email Address</span>
              <span className="font-medium text-slate-800">{created.email}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 font-medium">Temporary Password</span>
              <span className="flex items-center gap-2 font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-emerald-200">
                {created.tempPassword}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(created.tempPassword);
                    toast.success("Password copied to clipboard");
                  }}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  title="Copy password"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-center text-amber-700 bg-amber-50 rounded p-2 border border-amber-200">
            Share these credentials securely. The administrator should change their temporary password upon initial sign-in.
          </p>

          <Button variant="primary" className="mt-5 w-full justify-center" onClick={() => navigate("/super-admin/admins")}>
            View Administrator Roster
          </Button>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Link to="/super-admin/admins" className="hover:text-emerald-700 transition-colors">
              Administrators
            </Link>{" "}
            / {isEdit ? "Edit Profile" : "Add Admin"}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {isEdit ? "Edit Administrator Profile" : "Add System Administrator"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Create an independent administrator with unique identification and system privileges.
          </p>
        </div>
        {form.employeeId && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold self-start sm:self-auto">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>ID: {form.employeeId}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection icon={UserPlus} title="Administrator Identity">
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
              if (!err && error?.includes("Full Name")) setError(null);
            }}
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Dr. Arthur Vance"
          />

          <InputField
            label="Administrator Unique ID (Auto-Generated)"
            required
            maxLength={ADMIN_LIMITS.EMPLOYEE_ID}
            showCharCount
            value={form.employeeId}
            error={fieldErrors.employeeId}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setForm({ ...form, employeeId: val });
              const err = validateField("employeeId", val);
              setFieldErrors((prev) => ({ ...prev, employeeId: err }));
              if (!err && error?.includes("Admin ID")) setError(null);
            }}
            onBlur={() => handleBlur("employeeId")}
            placeholder="e.g. ADM-001"
            hint="System-wide unique ID sequence for administrative identity."
          />

          <InputField
            label="Official Email Address"
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
              if (!err && error?.includes("Email")) setError(null);
            }}
            onBlur={() => handleBlur("email")}
            placeholder="admin@preethihospital.com"
          />

          <InputField
            label="Contact Mobile (10 Digits)"
            type="tel"
            required
            maxLength={ADMIN_LIMITS.PHONE}
            showCharCount
            value={form.phone}
            error={fieldErrors.phone}
            onChange={(e) => {
              const cleanDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
              setForm({ ...form, phone: cleanDigits });
              const err = validateField("phone", cleanDigits);
              setFieldErrors((prev) => ({ ...prev, phone: err }));
              if (!err && error?.includes("Contact")) setError(null);
            }}
            onBlur={() => handleBlur("phone")}
            placeholder="e.g. 9876543210"
          />

          <InputField
            label="Job / Display Title"
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
              if (!err && error?.includes("Title")) setError(null);
            }}
            onBlur={() => handleBlur("title")}
            placeholder="e.g. Operations Director / Administrator"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">System Role & Authority</label>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-bold text-emerald-950">System Administrator</span>
              <span className="ml-auto rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">
                Independent Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Administrators hold operational permissions without being restricted to a single hospital entity.
            </p>
          </div>

          <div className="sm:col-span-2 pt-2">
            <FileUpload
              label="Administrator Avatar Photo (Optional)"
              folder="admin-avatars"
              value={form.avatarUrl}
              onChange={(url) => {
                setForm({ ...form, avatarUrl: url });
                setFieldErrors((prev) => ({ ...prev, avatarUrl: undefined }));
              }}
              hint="PNG, JPEG, WEBP, or SVG up to 2MB"
              maxSizeMB={2}
              error={fieldErrors.avatarUrl}
              onError={(err) => setFieldErrors((prev) => ({ ...prev, avatarUrl: err || undefined }))}
            />
          </div>
        </FormSection>

        <div className="flex justify-end gap-3 pt-2">
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