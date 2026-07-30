import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserPlus, GraduationCap, ShieldCheck, Copy } from "lucide-react";
import { useDoctor, useCreateDoctor, useUpdateDoctor } from "../../features/doctors";
import { useDepartments } from "../../features/departments";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function DoctorFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data } = useDoctor(id);
  const { data: departments } = useDepartments();
  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor(id ?? "");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    photoUrl: "",
    bio: "",
    department: "",
    specialization: "",
    qualification: "",
    licenseNo: "",
    status: "on_duty" as "on_duty" | "on_leave" | "off_duty",
    rating: 0,
    opExpiryLimit: 10,
  });
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    if (data?.doctor) {
      const doctor = data.doctor;
      setForm({
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        photoUrl: doctor.photoUrl,
        bio: doctor.bio,
        department: typeof doctor.department === "object" && doctor.department ? doctor.department._id : "",
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        licenseNo: doctor.licenseNo,
        status: doctor.status,
        rating: doctor.rating,
        opExpiryLimit: doctor.opExpiryLimit ?? 10,
      });
    }
  }, [data]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { ...form, department: form.department || null };
    try {
      if (isEdit) {
        await updateDoctor.mutateAsync(payload);
        navigate("/admin/doctors");
      } else {
        const result = await createDoctor.mutateAsync(payload);
        if (result.tempPassword) {
          setCreated({ email: form.email, tempPassword: result.tempPassword });
        } else {
          navigate("/admin/doctors");
        }
      }
    } catch {
      setError("Could not save doctor. Check the form and try again.");
    }
  }

  const isSaving = createDoctor.isPending || updateDoctor.isPending;

  // ── Credential reveal screen (shown once after creation) ─────────────────────
  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </span>
          </div>
          <h2 className="text-center text-lg font-semibold text-slate-800">Doctor Account Created</h2>
          <p className="mt-1 text-center text-sm text-slate-500">
            Share these temporary credentials with the doctor securely — the password is shown only once.
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
          </div>
          <p className="mt-3 text-center text-xs text-amber-600">
            ⚠️ The doctor should change this password after first login via Settings.
          </p>
          <Button
            variant="primary"
            className="mt-6 w-full justify-center"
            onClick={() => navigate("/admin/doctors")}
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
          <Link to="/admin/doctors" className="hover:text-navy-700">
            Doctors
          </Link>{" "}
          &gt; {isEdit ? "Edit Doctor" : "Add New Doctor"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Doctor" : "Registration Portal"}</h1>
        <p className="text-sm text-slate-500">
          {isEdit
            ? "Update the doctor's profile and credentials."
            : "Fill in the details below. A login account with a temporary password will be created automatically using the email address provided."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={UserPlus} title="Personal Information">
          <InputField label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sarah J. Montgomery" />
          <InputField
            label="Email Address (used for login)"
            type="email"
            required={!isEdit}
            disabled={isEdit}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="sarah.m@medicenter.com"
          />
          <InputField label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
          <SelectField label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
            <option value="on_duty">On Duty</option>
            <option value="on_leave">On Leave</option>
            <option value="off_duty">Off Duty</option>
          </SelectField>
          <div className="sm:col-span-2">
            <TextareaField label="Bio / Statement" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Brief professional summary..." rows={3} />
          </div>
          <div className="sm:col-span-2">
            <FileUpload label="Photo" folder="doctor-photos" value={form.photoUrl} onChange={(url) => setForm({ ...form, photoUrl: url })} />
          </div>
        </FormSection>

        <FormSection icon={GraduationCap} title="Professional Credentials">
          <SelectField label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            <option value="">Select Department</option>
            {departments?.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </SelectField>
          <InputField label="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Cardiology" />
          <InputField label="Qualification" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. MD, FACC, PhD" />
          <InputField label="License No." value={form.licenseNo} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} placeholder="e.g. MED-2024-001" />
          <InputField
            label="Patient Satisfaction Rating (0-100)"
            type="number"
            min={0}
            max={100}
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
          />
          <InputField
            label="OP Consultation Expiry Limit (Days)"
            type="number"
            min={0}
            value={form.opExpiryLimit}
            onChange={(e) => setForm({ ...form, opExpiryLimit: Number(e.target.value) })}
          />
        </FormSection>

        {!isEdit && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <strong>Note:</strong> A dashboard login account will be automatically created for this doctor using the email address above. A temporary password will be shown after submission.
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/doctors")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Doctor" : "Create Doctor & Account"}
          </Button>
        </div>
      </form>
    </div>
  );
}

