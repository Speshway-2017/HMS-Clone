import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Building2, Phone, UserCog, FileBadge } from "lucide-react";
import { useHospital, useCreateHospital, useUpdateHospital, useUnassignedHospitalAdmins } from "../../features/hospitals";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";

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
    logoUrl: "",
    licenseUrl: "",
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
        logoUrl: data.hospital.logoUrl ?? "",
        licenseUrl: data.hospital.licenseUrl ?? "",
      }));
    }
  }, [data]);

  const handleNameChange = async (newName: string) => {
    setForm((prev) => {
      const updated = { ...prev, name: newName };
      if (!isEdit && newName.trim()) {
        const clean = newName.trim().replace(/[^a-zA-Z0-9\s]/g, "");
        const firstWord = clean.split(/\s+/)[0]?.toUpperCase()?.slice(0, 6) || "HOSP";
        const baseCode = firstWord.length >= 3 ? firstWord : "HOSP";
        updated.code = `${baseCode}-01`;
      }
      return updated;
    });

    if (!isEdit && newName.trim().length >= 2) {
      try {
        const res = await api.get("/hospitals/generate-code", { params: { name: newName } });
        if (res.data?.data?.code) {
          setForm((prev) => ({ ...prev, code: res.data.data.code }));
        }
      } catch (e) {
        // Fallback to local code
      }
    }
  };

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
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Speshway Hospitals"
          />
          <InputField
            label="Hospital Code (Auto-Generated)"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder={form.name ? "Auto-generating code..." : "e.g. SPESH-01"}
            hint={!isEdit ? "Automatically derived from Hospital Name" : undefined}
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

        <FormSection icon={FileBadge} title="Documents">
          <FileUpload label="Hospital Logo" folder="hospital-logos" value={form.logoUrl} onChange={(url) => setForm({ ...form, logoUrl: url })} />
          <FileUpload
            label="License Credentials"
            folder="hospital-licenses"
            accept="application/pdf"
            value={form.licenseUrl}
            onChange={(url) => setForm({ ...form, licenseUrl: url })}
            hint="PDF only"
          />
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
