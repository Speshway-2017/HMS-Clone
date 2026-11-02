import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserCircle, Briefcase, ShieldCheck, Copy, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useStaffMember, useCreateStaff, useUpdateStaff } from "../../features/staff";
import { useDepartments } from "../../features/departments";
import { useRoles } from "../../features/roles";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { isValidEmail, isValidPhone } from "../../lib/validation";

const STAFF_LIMITS = {
  NAME: 100,
  EMAIL: 100,
  PHONE: 10,
  EMPLOYEE_ID: 50,
  QUALIFICATIONS: 100,
} as const;

// Patterns
const NAME_REGEX = /^[a-zA-Z\s\.\-']+$/;
const QUALIFICATIONS_REGEX = /^[a-zA-Z0-9\s\.\-/'&,()]+$/;
const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9\-_]+$/;

function getRolePrefix(role: string): string {
  const clean = (role || "").toLowerCase().trim();
  if (clean.includes("doc")) return "DOC";
  if (clean.includes("nur")) return "NUR";
  if (clean.includes("recep")) return "REC";
  if (clean.includes("lab")) return "LAB";
  if (clean.includes("radio")) return "RAD";
  if (clean.includes("account")) return "ACC";
  if (clean.includes("pharm")) return "PHA";
  if (clean.includes("admin")) return "ADM";
  return clean.substring(0, 3).toUpperCase() || "EMP";
}

export function StaffFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: staff } = useStaffMember(id);
  const { data: departments } = useDepartments();
  const { data: roles } = useRoles();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff(id ?? "");

  const [form, setForm] = useState({
    name: "",
    gender: "Male",
    email: "",
    phone: "",
    photoUrl: "",
    role: "",
    employeeId: "",
    department: "",
    qualifications: "",
    dutyStatus: "on_duty" as "on_duty" | "late" | "off_duty" | "on_leave",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; email: string; tempPassword: string; role: string } | null>(null);

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.name || "",
        gender: (staff as any).gender || "Male",
        email: staff.email || "",
        phone: staff.phone || "",
        photoUrl: staff.photoUrl || "",
        role: staff.role || "",
        employeeId: staff.employeeId || "",
        department: typeof staff.department === "object" && staff.department ? staff.department._id : "",
        qualifications: staff.qualifications || "",
        dutyStatus: staff.dutyStatus || "on_duty",
      });
      setFieldErrors({});
    }
  }, [staff]);

  const validateField = (
    field:
      | "name"
      | "gender"
      | "email"
      | "phone"
      | "role"
      | "employeeId"
      | "qualifications"
      | "photoUrl",
    value: any
  ): string | undefined => {
    const valStr = typeof value === "string" ? value : String(value ?? "");
    const trimmed = valStr.trim();

    if (field === "name") {
      if (!trimmed) {
        return "Full Name is required. Please fill out this field";
      }
      if (valStr.length > STAFF_LIMITS.NAME) {
        return `Full Name cannot exceed ${STAFF_LIMITS.NAME} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !NAME_REGEX.test(trimmed)) {
        return "Full Name should contain only letters, dots, hyphens, and spaces. Please enter valid data";
      }
      return undefined;
    }

    if (field === "gender") {
      if (!trimmed) {
        return "Please select a gender. Please fill out this field";
      }
      return undefined;
    }

    if (field === "email") {
      if (!isEdit && !trimmed) {
        return "Email Address is required. Please fill out this field";
      }
      if (valStr.length > STAFF_LIMITS.EMAIL) {
        return `Email Address cannot exceed ${STAFF_LIMITS.EMAIL} characters. Please enter valid data`;
      }
      if (trimmed && !isValidEmail(trimmed)) {
        return "Please enter a valid email address. Please enter valid data";
      }
      return undefined;
    }

    if (field === "phone") {
      if (!trimmed) {
        return "Phone Number is required. Please fill out this field";
      }
      const digitsOnly = valStr.replace(/\D/g, "");
      if (/[^\d]/.test(valStr)) {
        return "Invalid phone number. Phone Number should accept 10 digits only. Please enter valid data";
      }
      if (digitsOnly.length > STAFF_LIMITS.PHONE) {
        return `Phone Number cannot exceed ${STAFF_LIMITS.PHONE} digits. Please enter valid data`;
      }
      if (digitsOnly.length < 10) {
        return "Invalid phone number. Phone Number should accept 10 digits only. Please enter valid data";
      }
      if (!isValidPhone(valStr)) {
        return "Please enter a valid 10-digit phone number. Please enter valid data";
      }
      return undefined;
    }

    if (field === "role") {
      if (!trimmed) {
        return "Role / Designation is required. Please fill out this field";
      }
      return undefined;
    }

    if (field === "employeeId") {
      if (!trimmed) {
        return "Employee ID is required. Please fill out this field";
      }
      if (valStr.length > STAFF_LIMITS.EMPLOYEE_ID) {
        return `Employee ID cannot exceed ${STAFF_LIMITS.EMPLOYEE_ID} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !EMPLOYEE_ID_REGEX.test(trimmed)) {
        return "Employee ID must contain only letters, numbers, hyphens, and underscores. Please enter valid data";
      }
      return undefined;
    }

    if (field === "qualifications") {
      if (!trimmed) {
        if (valStr.length > 0) return "Please enter valid data";
        return undefined;
      }
      if (valStr.length > STAFF_LIMITS.QUALIFICATIONS) {
        return `Qualifications / Certifications cannot exceed ${STAFF_LIMITS.QUALIFICATIONS} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !QUALIFICATIONS_REGEX.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) {
        return "Qualifications / Certifications contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (field === "photoUrl") {
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
        return "The uploaded file is invalid or unsupported, and only image files are accepted.";
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: string,
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
      const msg = "Invalid phone number. Phone Number should accept 10 digits only. Please enter valid data";
      setError("Please enter valid data");
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
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
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handleBlur = (
    field:
      | "name"
      | "gender"
      | "email"
      | "phone"
      | "role"
      | "employeeId"
      | "qualifications"
  ) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setError("Please enter valid data");
      toast.error(err, { id: `staff-${field}-error` });
    }
  };

  const handleRoleChange = async (selectedRole: string) => {
    setForm((prev) => ({ ...prev, role: selectedRole }));
    const roleErr = validateField("role", selectedRole);
    setFieldErrors((prev) => ({ ...prev, role: roleErr }));

    if (selectedRole) {
      try {
        const res = await api.get("/staff/next-employee-id", { params: { role: selectedRole } });
        const nextId = res.data.data?.employeeId;
        if (nextId) {
          setForm((prev) => ({ ...prev, role: selectedRole, employeeId: nextId }));
          setFieldErrors((prev) => ({ ...prev, employeeId: undefined }));
        }
      } catch {
        const prefix = getRolePrefix(selectedRole);
        const year = new Date().getFullYear();
        const fallbackId = `${prefix}-${year}-0001`;
        setForm((prev) => ({ ...prev, role: selectedRole, employeeId: fallbackId }));
        setFieldErrors((prev) => ({ ...prev, employeeId: undefined }));
      }
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const nameErr = validateField("name", form.name);
    const genderErr = validateField("gender", form.gender);
    const emailErr = validateField("email", form.email);
    const phoneErr = validateField("phone", form.phone);
    const roleErr = validateField("role", form.role);
    const employeeIdErr = validateField("employeeId", form.employeeId);
    const qualErr = validateField("qualifications", form.qualifications);
    const photoErr = validateField("photoUrl", form.photoUrl);

    const errors: Record<string, string | undefined> = {
      name: nameErr,
      gender: genderErr,
      email: emailErr,
      phone: phoneErr,
      role: roleErr,
      employeeId: employeeIdErr,
      qualifications: qualErr,
      photoUrl: photoErr,
    };

    setFieldErrors(errors);
    setTouched({
      name: true,
      gender: true,
      email: true,
      phone: true,
      role: true,
      employeeId: true,
      qualifications: true,
      photoUrl: true,
    });

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      const firstError = Object.values(errors).find(Boolean);
      setError("Please enter valid data");
      toast.error(firstError || "Please enter valid data", { id: "staff-form-invalid" });
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role.trim(),
      employeeId: form.employeeId.trim(),
      qualifications: form.qualifications.trim(),
      department: form.department || null,
    };

    try {
      if (isEdit) {
        await updateStaff.mutateAsync(payload);
        toast.success("Staff member updated successfully!");
        navigate("/admin/staff");
      } else {
        const result = await createStaff.mutateAsync(payload);
        toast.success("Staff member created successfully!");
        if (result.tempPassword) {
          setCreated({ name: form.name, email: form.email, tempPassword: result.tempPassword, role: form.role });
        } else {
          navigate("/admin/staff");
        }
      }
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message || err?.message || "Could not save staff member. Check the form and try again.";
      setError("Please enter valid data");
      toast.error(serverMsg, { id: "staff-submit-error" });
    }
  }

  const isSaving = createStaff.isPending || updateStaff.isPending;

  // ── Credential reveal screen ──────────────────────────────────────────────────
  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </span>
          </div>
          <h2 className="text-center text-lg font-semibold text-slate-800">
            Staff Account Created
          </h2>
          <p className="mt-1 text-center text-sm text-slate-500">
            Share these temporary credentials with <strong>{created.name}</strong> securely — the password is shown only once.
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
                  onClick={() => {
                    navigator.clipboard.writeText(created.tempPassword);
                    toast.success("Password copied to clipboard!");
                  }}
                  className="text-slate-400 hover:text-navy-700"
                  title="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Role</span>
              <span className="font-medium text-slate-800 capitalize">
                {roles?.find((r) => r.role === created.role)?.label || created.role || "Receptionist"}
              </span>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-amber-600">
            ⚠️ Staff should change this password after first login via the Settings page.
          </p>
          <Button
            variant="primary"
            className="mt-6 w-full justify-center"
            onClick={() => navigate("/admin/staff")}
          >
            Done
          </Button>
        </Card>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/admin/staff" className="hover:text-navy-700">
            Staff
          </Link>{" "}
          &gt; {isEdit ? "Edit Staff" : "Add New Staff"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEdit ? "Edit Staff Member" : "Staff Onboarding"}
        </h1>
        <p className="text-sm text-slate-500">
          {isEdit
            ? "Update the staff member's profile and operational details."
            : `Fill in the details below. A login account for the selected role (${form.role ? (roles?.find(r => r.role === form.role)?.label || form.role) : "staff"}) will be automatically created with a temporary password.`}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection icon={UserCircle} title="Personal Information">
          <InputField
            label="Full Name"
            required
            maxLength={STAFF_LIMITS.NAME}
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
            onKeyDown={(e) => handleKeyGuard(e, "name", form.name.length, STAFF_LIMITS.NAME, "Full Name")}
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Sarah Jenkins"
          />
          <SelectField
            label="Gender *"
            required
            value={form.gender}
            error={fieldErrors.gender}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, gender: val });
              const err = validateField("gender", val);
              setFieldErrors((prev) => ({ ...prev, gender: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onBlur={() => handleBlur("gender")}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </SelectField>
          <InputField
            label="Email Address (used for login)"
            type="email"
            required={!isEdit}
            disabled={isEdit}
            maxLength={STAFF_LIMITS.EMAIL}
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
            onKeyDown={(e) => handleKeyGuard(e, "email", form.email.length, STAFF_LIMITS.EMAIL, "Email Address")}
            onBlur={() => handleBlur("email")}
            placeholder="sarah.j@medipro.com"
          />
          <InputField
            label="Phone Number"
            type="tel"
            required
            maxLength={STAFF_LIMITS.PHONE}
            showCharCount
            value={form.phone}
            error={fieldErrors.phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, STAFF_LIMITS.PHONE);
              setForm({ ...form, phone: val });
              const err = validateField("phone", val);
              setFieldErrors((prev) => ({ ...prev, phone: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "phone", form.phone.length, STAFF_LIMITS.PHONE, "Phone Number", true)}
            onBlur={() => handleBlur("phone")}
            placeholder="e.g. 9876543210"
          />
          <div className="sm:col-span-2">
            <FileUpload
              label="Photo"
              folder="staff-photos"
              value={form.photoUrl}
              onChange={(url) => {
                setForm({ ...form, photoUrl: url });
                setFieldErrors((prev) => ({ ...prev, photoUrl: undefined }));
              }}
              maxSizeMB={2}
              hint="PNG, JPEG, WEBP, SVG up to 2MB"
              error={fieldErrors.photoUrl}
              onError={(err) => setFieldErrors((prev) => ({ ...prev, photoUrl: err || undefined }))}
            />
          </div>
        </FormSection>

        <FormSection icon={Briefcase} title="Professional Details">
          <SelectField
            label="Role / Designation *"
            required
            value={form.role}
            error={fieldErrors.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            onBlur={() => handleBlur("role")}
          >
            <option value="">Select Role</option>
            {roles?.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
          </SelectField>
          <InputField
            label="Employee ID (Auto-Generated)"
            required
            maxLength={STAFF_LIMITS.EMPLOYEE_ID}
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
            onKeyDown={(e) => handleKeyGuard(e, "employeeId", form.employeeId.length, STAFF_LIMITS.EMPLOYEE_ID, "Employee ID")}
            onBlur={() => handleBlur("employeeId")}
            placeholder={form.role ? "Auto-generating unique Employee ID..." : "Select a role to auto-generate ID"}
            hint={form.role ? `Unique auto-generated ID formatted for hospital & branch` : "Selecting a role above automatically generates a unique role-prefixed Employee ID"}
          />
          <SelectField
            label="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          >
            <option value="">Select Department</option>
            {departments?.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Duty Status"
            value={form.dutyStatus}
            onChange={(e) => setForm({ ...form, dutyStatus: e.target.value as typeof form.dutyStatus })}
          >
            <option value="on_duty">On Duty</option>
            <option value="late">Late</option>
            <option value="off_duty">Off Duty</option>
            <option value="on_leave">On Leave</option>
          </SelectField>
          <div className="sm:col-span-2">
            <InputField
              label="Qualifications / Certifications"
              maxLength={STAFF_LIMITS.QUALIFICATIONS}
              showCharCount
              value={form.qualifications}
              error={fieldErrors.qualifications}
              onChange={(e) => {
                const val = e.target.value;
                setForm({ ...form, qualifications: val });
                const err = validateField("qualifications", val);
                setFieldErrors((prev) => ({ ...prev, qualifications: err }));
                if (!err && error === "Please enter valid data") setError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "qualifications", form.qualifications.length, STAFF_LIMITS.QUALIFICATIONS, "Qualifications / Certifications")}
              onBlur={() => handleBlur("qualifications")}
              placeholder="e.g. Registered Nurse (RN), BLS Certified"
            />
          </div>
        </FormSection>

        {!isEdit && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <strong>Note:</strong> A login account for the selected role ({form.role ? (roles?.find(r => r.role === form.role)?.label || form.role) : "staff"}) will be automatically created using the email address above. A temporary password will be shown after submission.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/staff")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Create Staff & Account"}
          </Button>
        </div>
      </form>
    </div>
  );
}
