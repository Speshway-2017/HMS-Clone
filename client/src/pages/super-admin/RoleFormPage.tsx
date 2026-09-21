import { FormEvent, useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useCreateRole, useUpdateRole, useRoles } from "../../features/roles";
import { useAuth } from "../../context/AuthContext";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

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

  const handlePermissionToggle = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate role key format (lowercase and underscores only)
    const roleKeyClean = form.role.trim().toLowerCase().replace(/\s+/g, "_");
    if (!isEdit && !/^[a-z_]+$/.test(roleKeyClean)) {
      setError("Role key must contain only lowercase letters and underscores (e.g. ward_nurse).");
      return;
    }

    try {
      if (isEdit) {
        await updateRole.mutateAsync({
          label: form.label.trim(),
          description: form.description.trim(),
          permissions: selectedPermissions,
        });
      } else {
        await createRole.mutateAsync({
          role: roleKeyClean,
          label: form.label.trim(),
          description: form.description.trim(),
          permissions: selectedPermissions,
        });
      }
      navigate(`${basePath}/roles`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Could not save role. Check the form and try again.";
      setError(msg);
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={ShieldAlert} title="Role Details">
          <InputField
            label="Role Label (Display Name)"
            required
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. Ward Nurse"
          />
          <InputField
            label="Role Key (System Identifier)"
            required
            disabled={isEdit}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="e.g. ward_nurse (lowercase and underscores)"
          />
          <div className="sm:col-span-2">
            <TextareaField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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

        {error && <p className="text-sm text-red-600">{error}</p>}

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
