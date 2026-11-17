import { FormEvent, useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { 
  UserCircle, 
  Briefcase, 
  ShieldCheck, 
  Copy, 
  AlertCircle, 
  RefreshCw, 
  Building2, 
  UserCheck, 
  CheckCircle2,
  Users
} from "lucide-react";
import toast from "react-hot-toast";
import { useStaffMember, useCreateStaff, useUpdateStaff } from "../../features/staff";
import { useRoles } from "../../features/roles";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { isValidEmail, isValidPhone } from "../../lib/validation";
import { useBranchContext } from "../../context/BranchContext";

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

function getRoleDisplay(role: string, customRoles?: { role: string; label: string }[]): { label: string; code: string } {
  const matched = customRoles?.find((r) => r.role.toLowerCase() === (role || "").toLowerCase());
  const clean = (role || "").toLowerCase().trim();
  let label = matched?.label || "";
  let code = "STF";

  if (clean.includes("doc")) {
    label = label || "Doctor";
    code = "DOC";
  } else if (clean.includes("staf") || clean === "staff" || clean.includes("clinical")) {
    label = label || "Clinical Staff";
    code = "STF";
  } else if (clean.includes("nur")) {
    label = label || "Nurse";
    code = "NUR";
  } else if (clean.includes("recep") || clean.includes("front")) {
    label = label || "Receptionist";
    code = "REC";
  } else if (clean.includes("pharm")) {
    label = label || "Pharmacist";
    code = "PHM";
  } else if (clean.includes("lab")) {
    label = label || "Lab Technician";
    code = "LAB";
  } else if (clean.includes("radio") || clean.includes("scan")) {
    label = label || "Radiologist";
    code = "RAD";
  } else if (clean.includes("account") || clean.includes("bill")) {
    label = label || "Accountant";
    code = "ACC";
  } else if (clean.includes("admin")) {
    label = label || "Hospital Admin";
    code = "ADM";
  } else if (clean.includes("super")) {
    label = label || "Super Admin";
    code = "SUP";
  } else {
    label = label || role || "Staff";
    code = clean.substring(0, 3).toUpperCase() || "STF";
  }

  return { label, code };
}

export function StaffFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: staff } = useStaffMember(id);
  const { data: roles } = useRoles();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff(id ?? "");
  const { isAllBranches, branches } = useBranchContext();

  // Hospital Admins are strictly disallowed from creating/assigning Super Admin, Hospital Admin, or Patient roles
  const assignableRoles = (roles || []).filter(
    (r) => !["super_admin", "admin", "hospital_admin", "patient"].includes(r.role.toLowerCase())
  );

  const [selectedBranchId, setSelectedBranchId] = useState("");

  const [form, setForm] = useState({
    name: "",
    gender: "Male",
    email: "",
    phone: "",
    photoUrl: "",
    role: "staff",
    employeeId: "",
    dateOfJoining: new Date().toISOString().split("T")[0],
    qualifications: "",
    dutyStatus: "on_duty" as "on_duty" | "late" | "off_duty" | "on_leave",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; email: string; tempPassword: string; role: string } | null>(null);
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  // Fetch or regenerate composite Unique Staff ID based on Hospital ID, Role, and Person Name
  const fetchNextId = useCallback((roleVal?: string, nameVal?: string) => {
    if (isEdit) return;
    const activeRole = roleVal || form.role || "staff";
    const activeName = nameVal !== undefined ? nameVal : form.name;
    setIsGeneratingId(true);

    api.get("/staff/next-employee-id", {
      params: {
        role: activeRole,
        name: activeName || undefined,
      },
    })
      .then((res) => {
        const nextId = res.data.data?.employeeId;
        if (nextId) {
          setForm((prev) => ({ ...prev, employeeId: nextId }));
          setFieldErrors((prev) => ({ ...prev, employeeId: undefined }));
        }
      })
      .catch(() => {
        const roleInfo = getRoleDisplay(activeRole, roles);
        const fallbackId = `HOSP-001-${roleInfo.code}-001`;
        setForm((prev) => ({ ...prev, employeeId: fallbackId }));
      })
      .finally(() => setIsGeneratingId(false));
  }, [isEdit, form.role, form.name, roles]);

  // Synchronize form role with available assignable roles from superadmin matrix
  useEffect(() => {
    if (!isEdit && assignableRoles && assignableRoles.length > 0) {
      const currentRoleExists = assignableRoles.some((r) => r.role === form.role);
      if (!currentRoleExists) {
        const preferredRole = assignableRoles.find((r) => r.role === "staff")?.role || assignableRoles[0]?.role;
        if (preferredRole) {
          setForm((prev) => ({ ...prev, role: preferredRole }));
          fetchNextId(preferredRole, form.name);
        }
      }
    }
  }, [assignableRoles, isEdit]);

  useEffect(() => {
    if (!isEdit && !form.employeeId) {
      fetchNextId();
    }
  }, [isEdit]);

  // Debounced ID re-generation when staff name changes
  useEffect(() => {
    if (isEdit || !form.name.trim()) return;
    const timer = setTimeout(() => {
      if (form.name.trim().length >= 2) {
        fetchNextId(form.role, form.name);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.name, form.role, isEdit]);

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.name || "",
        gender: (staff as any).gender || "Male",
        email: staff.email || "",
        phone: staff.phone || "",
        photoUrl: staff.photoUrl || "",
        role: staff.role || "nurse",
        employeeId: staff.employeeId || "",
        dateOfJoining: staff.dateOfJoining
          ? new Date(staff.dateOfJoining).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
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
      if (["super_admin", "admin", "hospital_admin", "patient"].includes(trimmed.toLowerCase())) {
        return "Hospital administrators are not permitted to assign this role. Please select a valid clinical or support staff role.";
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
      return;
    }

    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      setError("Please enter valid data");
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field as any, (form as any)[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) setError("Please enter valid data");
  };

  const handleRoleChange = async (selectedRole: string) => {
    setForm((prev) => ({ ...prev, role: selectedRole }));
    const roleErr = validateField("role", selectedRole);
    setFieldErrors((prev) => ({ ...prev, role: roleErr }));
    fetchNextId(selectedRole, form.name);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isEdit && isAllBranches && !selectedBranchId) {
      setError("Please select the branch this staff member belongs to.");
      return;
    }

    const errors: Record<string, string | undefined> = {
      name: validateField("name", form.name),
      gender: validateField("gender", form.gender),
      email: validateField("email", form.email),
      phone: validateField("phone", form.phone),
      role: validateField("role", form.role),
      employeeId: validateField("employeeId", form.employeeId),
      qualifications: validateField("qualifications", form.qualifications),
      photoUrl: validateField("photoUrl", form.photoUrl),
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

    const payload: any = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      employeeId: form.employeeId.trim(),
      qualifications: form.qualifications.trim(),
      shift: "General",
      dateOfJoining: form.dateOfJoining || undefined,
      dutyStatus: form.dutyStatus || "on_duty",
    };

    if (!isEdit && isAllBranches && selectedBranchId) {
      payload.branch = selectedBranchId;
    }

    try {
      if (isEdit) {
        await updateStaff.mutateAsync(payload);
        toast.success("Staff profile updated successfully!");
        navigate("/admin/staff");
      } else {
        const result = await createStaff.mutateAsync(payload);
        toast.success("Staff member onboarded successfully!");
        if (result.tempPassword) {
          setCreated({
            name: form.name,
            email: form.email,
            tempPassword: result.tempPassword,
            role: form.role,
          });
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

  // Credential reveal modal
  if (created) {
    return (
      <div className="mx-auto max-w-lg pt-8">
        <Card className="p-6 border border-emerald-200 bg-white shadow-md">
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-700">
              <ShieldCheck className="h-8 w-8" />
            </span>
          </div>
          <h2 className="text-center text-xl font-bold text-slate-900">Staff Account Created</h2>
          <p className="mt-1.5 text-center text-xs text-slate-500">
            Login credentials have been securely generated and emailed to <strong>{created.email}</strong>. Share these temporary login credentials with <strong>{created.name}</strong> securely if needed. Password is shown only once.
          </p>
          <div className="mt-5 space-y-3 rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold">Employee ID (Unique ID)</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {form.employeeId}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold">Assigned Role</span>
              <span className="font-bold text-slate-800 capitalize">{created.role?.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold">Login Username / Email</span>
              <span className="font-bold text-slate-800">{created.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Temporary Password</span>
              <span className="flex items-center gap-2 font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                {created.tempPassword}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(created.tempPassword);
                    toast.success("Password copied to clipboard!");
                  }}
                  className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                  title="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </span>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
            ⚠️ The employee must change their temporary password upon first login in Account Settings.
          </p>
          <Button
            variant="primary"
            className="mt-6 w-full justify-center font-bold"
            onClick={() => navigate("/admin/staff")}
          >
            Done & Return to Staff Directory
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Breadcrumb & Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
          <Link to="/admin/staff" className="hover:text-emerald-700 transition-colors">
            Staff Directory
          </Link>
          <span>&gt;</span>
          <span className="text-emerald-800">{isEdit ? "Edit Profile" : "Onboard Healthcare Personnel"}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isEdit ? "Edit Staff Member" : "Staff Onboarding Portal"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? "Update staff member profile, role designations, and operational department assignment."
                : "Register clinical, administrative, and operations personnel with an auto-generated composite Unique ID."}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 w-fit">
            <Users className="h-3.5 w-3.5 text-emerald-700" />
            <span>Personnel Management</span>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Personal & Contact Details (Full Width) */}
        <FormSection icon={UserCircle} title="Personnel Personal Information">
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
            placeholder="e.g. Ananya Rao"
            hint="Initials will be embedded into the Unique ID (e.g. AR01)"
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
            label="Work Email Address"
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
            placeholder="e.g. ananya.rao@preethifertility.com"
            hint="Staff portal login username"
          />

          <InputField
            label="Mobile Phone Number"
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
            hint="10-digit primary mobile contact"
          />

          <div className="sm:col-span-2">
            <FileUpload
              label="Staff Identification Photo"
              folder="staff-photos"
              value={form.photoUrl}
              onChange={(url) => {
                setForm({ ...form, photoUrl: url });
                setFieldErrors((prev) => ({ ...prev, photoUrl: undefined }));
              }}
              maxSizeMB={2}
              hint="PNG, JPEG, WEBP up to 2MB"
              error={fieldErrors.photoUrl}
              onError={(err) => setFieldErrors((prev) => ({ ...prev, photoUrl: err || undefined }))}
            />
          </div>
        </FormSection>

        {/* Section 2: Role & Employment Details (Full Width) */}
        <FormSection icon={Briefcase} title="Role & Employment Details">
          <SelectField
            label="Staff Role / Designation *"
            required
            value={form.role}
            error={fieldErrors.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            onBlur={() => handleBlur("role")}
          >
            {assignableRoles && assignableRoles.length > 0 ? (
              assignableRoles.map((r) => (
                <option key={r._id || r.role} value={r.role}>
                  {r.label}
                </option>
              ))
            ) : (
              <option value="staff">Clinical Staff</option>
            )}
          </SelectField>

          <InputField
            label="Unique Employee ID"
            required
            maxLength={STAFF_LIMITS.EMPLOYEE_ID}
            showCharCount
            value={form.employeeId}
            error={fieldErrors.employeeId}
            rightElement={
              !isEdit ? (
                <button
                  type="button"
                  onClick={() => fetchNextId(form.role, form.name)}
                  disabled={isGeneratingId}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  title="Re-generate unique staff ID"
                >
                  <RefreshCw className={`h-3 w-3 ${isGeneratingId ? "animate-spin" : ""}`} />
                  <span>Re-generate</span>
                </button>
              ) : undefined
            }
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, employeeId: val });
              const err = validateField("employeeId", val);
              setFieldErrors((prev) => ({ ...prev, employeeId: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "employeeId", form.employeeId.length, STAFF_LIMITS.EMPLOYEE_ID, "Employee ID")}
            onBlur={() => handleBlur("employeeId")}
            placeholder="Auto-generating Staff ID..."
            hint="Format: <Hospital>-<Role>-<Initials><Seq>"
          />

          <InputField
            label="Date of Joining"
            type="date"
            value={form.dateOfJoining}
            onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
            hint="Official hospital employment commencement date"
          />

          {!isEdit && isAllBranches && (
            <SelectField
              label="Assigned Facility Branch *"
              required
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              <option value="">Select Branch...</option>
              {branches?.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </SelectField>
          )}

          <div className={!isEdit && isAllBranches ? "sm:col-span-2" : ""}>
            <InputField
              label="Qualifications & Certifications"
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
              onKeyDown={(e) => handleKeyGuard(e, "qualifications", form.qualifications.length, STAFF_LIMITS.QUALIFICATIONS, "Qualifications")}
              onBlur={() => handleBlur("qualifications")}
              placeholder="e.g. B.Sc Nursing, Certified Phlebotomist"
              hint="Medical degrees, certifications"
            />
          </div>
        </FormSection>

        {!isEdit && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 flex items-start gap-3 shadow-2xs">
            <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-emerald-900 block">Automated Security & Access Provisioning:</strong>
              A staff portal login account will be generated automatically for this personnel using the provided email address. Temporary credentials will be emailed to them directly and revealed upon saving.
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/staff")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving} className="font-bold shadow-sm">
            {isSaving ? "Saving..." : isEdit ? "Save Personnel Profile" : "Onboard Staff & Issue ID"}
          </Button>
        </div>
      </form>
    </div>
  );
}
