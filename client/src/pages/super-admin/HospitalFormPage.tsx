import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Building2, Phone, UserCog } from "lucide-react";
import { useHospital, useCreateHospital, useUpdateHospital, useUnassignedHospitalAdmins } from "../../features/hospitals";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

export function HospitalFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data } = useHospital(id);
  const { data: unassignedAdmins } = useUnassignedHospitalAdmins();
  const createHospital = useCreateHospital();
  const updateHospital = useUpdateHospital(id ?? "");

  const [form, setForm] = useState({
    name: "",
    code: "",
    bedCapacity: 0,
    address: "",
    contactEmail: "",
    contactPhone: "",
    primaryAdminId: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.hospital) {
      setForm((f) => ({
        ...f,
        name: data.hospital.name,
        code: data.hospital.code,
        bedCapacity: data.hospital.bedCapacity,
        address: data.hospital.address,
        contactEmail: data.hospital.contactEmail,
        contactPhone: data.hospital.contactPhone,
      }));
    }
  }, [data]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit) {
        await updateHospital.mutateAsync(form);
      } else {
        await createHospital.mutateAsync(form);
      }
      navigate("/super-admin/hospitals");
    } catch {
      setError("Could not save hospital. Check the form and try again.");
    }
  }

  const isSaving = createHospital.isPending || updateHospital.isPending;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/super-admin/hospitals" className="hover:text-navy-700">
            Hospitals
          </Link>{" "}
          &gt; {isEdit ? "Edit Hospital" : "Add New Hospital"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Hospital" : "Onboard New Hospital"}</h1>
        <p className="text-sm text-slate-500">Register a new facility into the HMS unified network.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={Building2} title="Basic Information">
          <InputField
            label="Hospital Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Mayo Clinic Health"
          />
          <InputField
            label="Hospital Code"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="e.g. HOS-2024"
          />
          <InputField
            label="Total Bed Capacity"
            type="number"
            min={0}
            value={form.bedCapacity}
            onChange={(e) => setForm({ ...form, bedCapacity: Number(e.target.value) })}
          />
          <InputField
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Street, city, state"
          />
        </FormSection>

        <FormSection icon={Phone} title="Contact">
          <InputField
            label="Contact Email"
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            placeholder="contact@hospital.com"
          />
          <InputField
            label="Primary Phone"
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
        </FormSection>

        <FormSection icon={UserCog} title="Assignment">
          <SelectField
            label="Primary Admin"
            value={form.primaryAdminId}
            onChange={(e) => setForm({ ...form, primaryAdminId: e.target.value })}
            hint="Must be an existing hospital_admin user with no hospital assigned yet."
          >
            <option value="">Select an administrator</option>
            {unassignedAdmins?.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name} ({a.email})
              </option>
            ))}
          </SelectField>
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/super-admin/hospitals")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Hospital" : "Create Hospital"}
          </Button>
        </div>
      </form>
    </div>
  );
}
