import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Briefcase, ClipboardList, PlusCircle } from "lucide-react";
import { useDepartment, useCreateDepartment, useUpdateDepartment } from "../../features/departments";
import { useHospitals } from "../../features/hospitals";
import { useBranches } from "../../features/branches";
import { useAuth } from "../../context/AuthContext";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { DEPARTMENT_CATEGORIES } from "../../config/departmentTheme";
import { ROLE_HOME_PATH } from "../../types/auth";

const PRESET_SERVICES = ["Outpatient Care", "Emergency Services", "Diagnostic Imaging", "Intensive Care (ICU)", "Pediatric Wing"];

export function DepartmentFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const basePath = ROLE_HOME_PATH[user!.role];
  const { data: department } = useDepartment(id);
  const { data: hospitalsData } = useHospitals({ page: 1 }, { enabled: isSuperAdmin });
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment(id ?? "");

  const [form, setForm] = useState({
    name: "",
    hospital: "",
    branch: "",
    category: DEPARTMENT_CATEGORIES[0],
    description: "",
    headName: "",
    location: "",
    totalBeds: 0,
    occupiedBeds: 0,
    doctors: 0,
    nurses: 0,
    support: 0,
    services: [] as string[],
  });
  const [customService, setCustomService] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: branchesData } = useBranches({ hospitalId: form.hospital || undefined }, { enabled: isSuperAdmin });

  useEffect(() => {
    if (department) {
      setForm({
        name: department.name,
        hospital: typeof department.hospital === "object" ? department.hospital._id : department.hospital,
        branch: department.branch ?? "",
        category: department.category,
        description: department.description,
        headName: department.headName,
        location: department.location,
        totalBeds: department.totalBeds,
        occupiedBeds: department.occupiedBeds,
        doctors: department.doctors,
        nurses: department.nurses,
        support: department.support,
        services: department.services,
      });
    }
  }, [department]);

  function toggleService(service: string) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(service) ? f.services.filter((s) => s !== service) : [...f.services, service],
    }));
  }

  function addCustomService() {
    if (customService.trim()) {
      setForm((f) => ({ ...f, services: [...f.services, customService.trim()] }));
      setCustomService("");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { ...form, branch: form.branch || null };
    try {
      if (isEdit) {
        await updateDepartment.mutateAsync(payload);
      } else {
        await createDepartment.mutateAsync(payload);
      }
      navigate(`${basePath}/departments`);
    } catch {
      setError("Could not save department. Check the form and try again.");
    }
  }

  const isSaving = createDepartment.isPending || updateDepartment.isPending;
  const allServices = Array.from(new Set([...PRESET_SERVICES, ...form.services]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to={`${basePath}/departments`} className="hover:text-navy-700">
            Departments
          </Link>{" "}
          &gt; {isEdit ? "Edit Department" : "Add New Department"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Department" : "Register New Department"}</h1>
        <p className="text-sm text-slate-500">Configure operational identity and resource allocation for the medical unit.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={Briefcase} title="Department Identity">
          <InputField label="Department Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cardiology" />
          <SelectField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {DEPARTMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          {isSuperAdmin && (
            <>
              <SelectField label="Parent Hospital" required value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })}>
                <option value="">Select Hospital</option>
                {hospitalsData?.data.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Branch Location"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                disabled={!branchesData?.data.length}
              >
                <option value="">{branchesData?.data.length ? "Select Branch (optional)" : "No branches for this hospital"}</option>
                {branchesData?.data.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </SelectField>
            </>
          )}
          <InputField label="Location (Wing/Floor)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Wing B, Floor 4" />
        </FormSection>

        <FormSection icon={ClipboardList} title="Operational Details">
          <InputField label="Department Head" value={form.headName} onChange={(e) => setForm({ ...form, headName: e.target.value })} placeholder="Search by name" />
          <InputField label="Total Beds" type="number" min={0} value={form.totalBeds} onChange={(e) => setForm({ ...form, totalBeds: Number(e.target.value) })} />
          <InputField label="Occupied Beds" type="number" min={0} value={form.occupiedBeds} onChange={(e) => setForm({ ...form, occupiedBeds: Number(e.target.value) })} />
          <InputField label="Doctors" type="number" min={0} value={form.doctors} onChange={(e) => setForm({ ...form, doctors: Number(e.target.value) })} />
          <InputField label="Nurses" type="number" min={0} value={form.nurses} onChange={(e) => setForm({ ...form, nurses: Number(e.target.value) })} />
          <InputField label="Support Staff" type="number" min={0} value={form.support} onChange={(e) => setForm({ ...form, support: Number(e.target.value) })} />
        </FormSection>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Services &amp; Specializations</h2>
          <div className="flex flex-wrap gap-2">
            {allServices.map((service) => (
              <button
                type="button"
                key={service}
                onClick={() => toggleService(service)}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${
                  form.services.includes(service) ? "border-navy-700 bg-navy-700 text-white" : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                {service}
              </button>
            ))}
            <div className="flex items-center gap-1 rounded-full border border-dashed border-navy-300 px-3 py-2">
              <input
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                placeholder="Custom service"
                className="w-28 bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={addCustomService} className="text-navy-700">
                <PlusCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(`${basePath}/departments`)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Department" : "Create Department"}
          </Button>
        </div>
      </form>
    </div>
  );
}
