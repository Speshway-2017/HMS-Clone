import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserCircle, Briefcase, ShieldCheck, Copy } from "lucide-react";
import { useStaffMember, useCreateStaff, useUpdateStaff } from "../../features/staff";
import { useDepartments } from "../../features/departments";
import { useRoles } from "../../features/roles";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

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
    email: "",
    phone: "",
    photoUrl: "",
    role: "",
    employeeId: "",
    department: "",
    qualifications: "",
    dutyStatus: "on_duty" as "on_duty" | "late" | "off_duty" | "on_leave",
  });
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        photoUrl: staff.photoUrl,
        role: staff.role,
        employeeId: staff.employeeId,
        department: typeof staff.department === "object" && staff.department ? staff.department._id : "",
        qualifications: staff.qualifications,
        dutyStatus: staff.dutyStatus,
      });
    }
  }, [staff]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { ...form, department: form.department || null };
      if (isEdit) {
        await updateStaff.mutateAsync(payload);
        navigate("/admin/staff");
      } else {
        const result = await createStaff.mutateAsync(payload);
        if (result.tempPassword) {
          setCreated({ name: form.name, email: form.email, tempPassword: result.tempPassword });
        } else {
          navigate("/admin/staff");
        }
      }
    } catch {
      setError("Could not save staff member. Check the form and try again.");
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
                  onClick={() => navigator.clipboard.writeText(created.tempPassword)}
                  className="text-slate-400 hover:text-navy-700"
                  title="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Role</span>
              <span className="font-medium text-slate-800 capitalize">Receptionist</span>
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
    <div className="mx-auto max-w-3xl space-y-6">
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
            : "Fill in the details below. A receptionist login account with a temporary password will be created automatically."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={UserCircle} title="Personal Information">
          <InputField
            label="Full Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Sarah Jenkins"
          />
          <InputField
            label="Email Address (used for login)"
            type="email"
            required={!isEdit}
            disabled={isEdit}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="sarah.j@medipro.com"
          />
          <InputField
            label="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
          <div className="sm:col-span-2">
            <FileUpload
              label="Photo"
              folder="staff-photos"
              value={form.photoUrl}
              onChange={(url) => setForm({ ...form, photoUrl: url })}
            />
          </div>
        </FormSection>

        <FormSection icon={Briefcase} title="Professional Details">
          <InputField
            label="Employee ID"
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            placeholder="EMP-2024-0892"
          />
          <SelectField
            label="Role / Designation"
            required
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="">Select Role</option>
            {roles?.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
          </SelectField>
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
              value={form.qualifications}
              onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
              placeholder="e.g. Registered Nurse (RN), BLS Certified"
            />
          </div>
        </FormSection>

        {!isEdit && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <strong>Note:</strong> A receptionist dashboard login account will be automatically created using the email address above. A temporary password will be shown after submission.
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

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



