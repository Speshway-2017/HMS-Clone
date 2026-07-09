import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserCircle, Briefcase } from "lucide-react";
import { useStaffMember, useCreateStaff, useUpdateStaff } from "../../features/staff";
import { useDepartments } from "../../features/departments";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";

export function StaffFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: staff } = useStaffMember(id);
  const { data: departments } = useDepartments();
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
      } else {
        await createStaff.mutateAsync(payload);
      }
      navigate("/admin/staff");
    } catch {
      setError("Could not save staff member. Check the form and try again.");
    }
  }

  const isSaving = createStaff.isPending || updateStaff.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/admin/staff" className="hover:text-navy-700">
            Staff
          </Link>{" "}
          &gt; {isEdit ? "Edit Staff" : "Add New Staff"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Staff Member" : "Staff Onboarding"}</h1>
        <p className="text-sm text-slate-500">Ensure all legal documentation is verified before finalizing onboarding.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={UserCircle} title="Personal Information">
          <InputField label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sarah Jenkins" />
          <InputField label="Email Address" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="sarah.j@medipro.com" />
          <InputField label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
          <div className="sm:col-span-2">
            <FileUpload label="Photo" folder="staff-photos" value={form.photoUrl} onChange={(url) => setForm({ ...form, photoUrl: url })} />
          </div>
        </FormSection>

        <FormSection icon={Briefcase} title="Professional Details">
          <InputField label="Employee ID" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="EMP-2024-0892" />
          <InputField label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Senior Nurse" />
          <SelectField label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            <option value="">Select Department</option>
            {departments?.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Duty Status" value={form.dutyStatus} onChange={(e) => setForm({ ...form, dutyStatus: e.target.value as typeof form.dutyStatus })}>
            <option value="on_duty">On Duty</option>
            <option value="late">Late</option>
            <option value="off_duty">Off Duty</option>
            <option value="on_leave">On Leave</option>
          </SelectField>
          <div className="sm:col-span-2">
            <InputField label="Qualifications / Certifications" value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="e.g. Registered Nurse (RN), BLS Certified" />
          </div>
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/staff")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Create Staff"}
          </Button>
        </div>
      </form>
    </div>
  );
}
