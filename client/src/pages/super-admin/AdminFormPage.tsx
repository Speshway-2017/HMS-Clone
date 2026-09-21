import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserPlus, ShieldCheck, Copy } from "lucide-react";
import { useAdmin, useCreateAdmin, useUpdateAdmin } from "../../features/admins";
import { useHospitals } from "../../features/hospitals";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";

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
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    if (admin) {
      setForm({
        name: admin.name,
        email: admin.email,
        role: "hospital_admin",
        hospital: typeof admin.hospital === "object" && admin.hospital ? admin.hospital._id : "",
        title: admin.title,
        phone: admin.phone,
        employeeId: admin.employeeId,
        avatarUrl: admin.avatarUrl ?? "",
      });
    }
  }, [admin]);

  const handleHospitalChange = async (selectedHospitalId: string) => {
    setForm((prev) => ({ ...prev, hospital: selectedHospitalId }));
    if (!isEdit && selectedHospitalId) {
      try {
        const res = await api.get("/staff/next-employee-id", {
          params: { role: "hospital_admin", hospital: selectedHospitalId },
        });
        const nextId = res.data.data?.employeeId;
        if (nextId) {
          setForm((prev) => ({ ...prev, hospital: selectedHospitalId, employeeId: nextId }));
        }
      } catch (e) {
        // Fallback
      }
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit) {
        await updateAdmin.mutateAsync(form);
        navigate("/super-admin/admins");
      } else {
        const result = await createAdmin.mutateAsync(form);
        setCreated({ email: result.admin.email, tempPassword: result.tempPassword });
      }
    } catch {
      setError("Could not save administrator. Check the form and try again.");
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
                <button onClick={() => navigator.clipboard.writeText(created.tempPassword)} className="text-slate-400 hover:text-navy-700">
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={UserPlus} title="Personal Information">
          <InputField label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Johnathan Smith" />
          <InputField
            label="Email Address"
            type="email"
            required
            disabled={isEdit}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jsmith@hms-enterprise.com"
          />
          <InputField label="Contact Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
          <InputField
            label="Employee ID (Auto-Generated)"
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            placeholder={form.hospital ? "Auto-generating Employee ID..." : "Select assigned hospital below to generate ID"}
            hint={form.hospital ? "Auto-generated unique ID for assigned hospital" : "Select an assigned hospital below to auto-generate Employee ID"}
          />
          <div className="sm:col-span-2">
            <FileUpload label="Profile Photo" folder="admin-avatars" value={form.avatarUrl} onChange={(url) => setForm({ ...form, avatarUrl: url })} />
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
          <SelectField label="Assigned Hospital" required value={form.hospital} onChange={(e) => handleHospitalChange(e.target.value)}>
            <option value="">Select Hospital</option>
            {hospitalsData?.data.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name}
              </option>
            ))}
          </SelectField>
          <InputField label="Display Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Clinical Lead" />
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

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
