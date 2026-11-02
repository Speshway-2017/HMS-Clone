import { FormEvent, useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ShieldAlert, ShieldCheck, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateRole, useUpdateRole, useRoles } from "../../features/roles";
import { useAuth } from "../../context/AuthContext";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

const ROLE_LIMITS = {
  LABEL: 50,
  KEY: 50,
  DESCRIPTION: 500,
} as const;

// Role Label: starts with letter, allows letters, numbers, spaces, dots, hyphens, slashes, apostrophes, ampersands (min 2 chars)
const ROLE_LABEL_REGEX = /^[a-zA-Z][a-zA-Z0-9\s\.\-/'&]*$/;

// Role Key: lowercase characters, numbers, and underscores only
const ROLE_KEY_REGEX = /^[a-z0-9_]+$/;

const AVAILABLE_PERMISSIONS = [
  "Manage Staff",
  "View Hospital Analytics",
  "Manage Departments",
  "Inventory Control",
  "Billing Operations",
  "Payroll Processing",
  "Insurance Claims",
  "Financial Reports",
  "Patient Consultation",
  "Electronic Prescriptions",
  "Clinical Notes",
  "IP/OP Management",
  "Patient Registration",
  "Appointment Scheduling",
  "Visitor Log",
  "Billing Intake",
];

export function RoleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const { data: roles } = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole(id ?? "");

  const [form, setForm] = useState({
    role: "",
    label: "",
    description: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const basePath = user?.role === "super_admin" ? "/super-admin" : "/admin";

  useEffect(() => {
    if (isEdit && roles) {
      const existingRole = roles.find((r) => r._id === id);
      if (existingRole) {
        setForm({
          role: existingRole.role,
          label: existingRole.label,
          description: existingRole.description || "",
        });
        setSelectedPermissions(existingRole.permissions || []);
      }
    }
  }, [isEdit, roles, id]);

  const validateField = (
    field: "label" | "role" | "description",
    value: string
  ): string | undefined => {
    const valStr = value || "";
    const trimmed = valStr.trim();

    if (field === "label") {
      if (!trimmed) {
        return "Role Label is required. Please fill out this field";
      }
      if (valStr.length > ROLE_LIMITS.LABEL) {
        return `Role Label cannot exceed ${ROLE_LIMITS.LABEL} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !ROLE_LABEL_REGEX.test(trimmed)) {
        return "Role Label contains invalid characters. Please enter valid data";
      }
      return undefined;
    }

    if (field === "role") {
      if (!isEdit) {
        if (!trimmed) {
          return "Role Key is required. Please fill out this field";
        }
        if (valStr.length > ROLE_LIMITS.KEY) {
          return `Role Key cannot exceed ${ROLE_LIMITS.KEY} characters. Please enter valid data`;
        }
        if (trimmed.length < 2 || !ROLE_KEY_REGEX.test(trimmed)) {
          return "Role Key must contain only lowercase characters and underscores";
        }
      }
      return undefined;
    }

    if (field === "description") {
      if (valStr.length > ROLE_LIMITS.DESCRIPTION) {
        return `Description cannot exceed ${ROLE_LIMITS.DESCRIPTION} characters. Please enter valid data`;
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    currentLen: number,
    limit: number,
    label: string
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

    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = `${label} cannot exceed ${limit} characters. Please enter valid data`;
      setError(msg);
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handleBlur = (field: "label" | "role" | "description") => {
    const err = validateField(field, form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setError(err);
      toast.error(err, { id: `role-${field}-error` });
    }
  };

  const handlePermissionToggle = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const labelErr = validateField("label", form.label);
    const roleErr = validateField("role", form.role);
    const descErr = validateField("description", form.description);

    const errors = {
      label: labelErr,
      role: roleErr,
      description: descErr,
    };

    setFieldErrors(errors);

    if (labelErr || roleErr || descErr) {
      const activeErr = labelErr || roleErr || descErr;
      setError(activeErr || "Please enter valid data");
      toast.error(activeErr || "Please enter valid data", { id: "role-submit-error" });
      return;
    }

    try {
      if (isEdit) {
        await updateRole.mutateAsync({
          label: form.label.trim(),
          description: form.description.trim(),
          permissions: selectedPermissions,
        });
        toast.success("Role updated successfully!");
      } else {
        await createRole.mutateAsync({
          role: form.role.trim(),
          label: form.label.trim(),
          description: form.description.trim(),
          permissions: selectedPermissions,
        });
        toast.success("Role added successfully!");
      }
      navigate(`${basePath}/roles`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Could not save role. Check the form and try again.";
      setError(msg);
      toast.error(msg);
    }
  }

  const isSaving = createRole.isPending || updateRole.isPending;

  return (
    <div className="w-full space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to={`${basePath}/roles`} className="hover:text-navy-700">
            Roles &amp; Permissions
          </Link>{" "}
          &gt; {isEdit ? "Edit Role" : "Add New Role"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Custom Role" : "Create Custom Role"}</h1>
        <p className="text-sm text-slate-500">
          {isEdit
            ? "Modify the display name, description, or assigned permissions for this custom role."
            : "Define a new job role and assign corresponding system permissions."}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection icon={ShieldAlert} title="Role Details">
          <InputField
            label="Role Label (Display Name)"
            required
            maxLength={ROLE_LIMITS.LABEL}
            showCharCount
            value={form.label}
            error={fieldErrors.label}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, label: val });
              const err = validateField("label", val);
              setFieldErrors((prev) => ({ ...prev, label: err }));
              if (!err && error) setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, form.label.length, ROLE_LIMITS.LABEL, "Role Label")}
            onBlur={() => handleBlur("label")}
            placeholder="e.g. Ward Nurse"
          />

          <InputField
            label="Role Key (System Identifier)"
            required
            disabled={isEdit}
            maxLength={ROLE_LIMITS.KEY}
            showCharCount
            value={form.role}
            error={fieldErrors.role}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, role: val });
              const err = validateField("role", val);
              setFieldErrors((prev) => ({ ...prev, role: err }));
              if (!err && error) setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, form.role.length, ROLE_LIMITS.KEY, "Role Key")}
            onBlur={() => handleBlur("role")}
            placeholder="e.g. ward_nurse_123 (lowercase, numbers, and underscores)"
          />

          <div className="sm:col-span-2">
            <TextareaField
              label="Description"
              maxLength={ROLE_LIMITS.DESCRIPTION}
              showCharCount
              value={form.description}
              error={fieldErrors.description}
              onChange={(e) => {
                const val = e.target.value;
                setForm({ ...form, description: val });
                const err = validateField("description", val);
                setFieldErrors((prev) => ({ ...prev, description: err }));
                if (!err && error) setError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, form.description.length, ROLE_LIMITS.DESCRIPTION, "Description")}
              onBlur={() => handleBlur("description")}
              placeholder="Describe the responsibilities and scope of this role..."
              rows={3}
            />
          </div>
        </FormSection>

        <FormSection icon={ShieldCheck} title="Assign Permissions">
          <div className="sm:col-span-2">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Core Permissions
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const checked = selectedPermissions.includes(perm);
                return (
                  <label
                    key={perm}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50 ${
                      checked ? "border-navy-500 bg-navy-50/20" : "border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handlePermissionToggle(perm)}
                      className="accent-navy-700 mt-1 h-4 w-4 shrink-0 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-700">{perm}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </FormSection>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`${basePath}/roles`)}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Create Role"}
          </Button>
        </div>
      </form>
    </div>
  );
}
