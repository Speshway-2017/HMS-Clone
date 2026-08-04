import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { Info, MapPin } from "lucide-react";
import { useBranch, useCreateBranch, useUpdateBranch } from "../../features/branches";
import { useHospitals } from "../../features/hospitals";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

const CATEGORIES = ["General Hospital", "Specialty Clinic", "Diagnostic Center", "Emergency Care"];

export function BranchFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: branch } = useBranch(id);
  const { data: hospitalsData } = useHospitals({ page: 1, limit: 100 });
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch(id ?? "");

  const [form, setForm] = useState({
    name: "",
    hospital: searchParams.get("hospitalId") ?? "",
    category: CATEGORIES[0],
    street: "",
    city: "",
    state: "",
    zip: "",
    headName: "",
    totalStaff: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name,
        hospital: typeof branch.hospital === "object" ? branch.hospital._id : branch.hospital,
        category: branch.category,
        street: branch.street,
        city: branch.city,
        state: branch.state,
        zip: branch.zip,
        headName: branch.headName,
        totalStaff: branch.totalStaff,
      });
    }
  }, [branch]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit) {
        await updateBranch.mutateAsync(form);
      } else {
        await createBranch.mutateAsync(form);
      }
      navigate("/super-admin/branches");
    } catch {
      setError("Could not save branch. Check the form and try again.");
    }
  }

  const isSaving = createBranch.isPending || updateBranch.isPending;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/super-admin/branches" className="hover:text-navy-700">
            Branches
          </Link>{" "}
          &gt; {isEdit ? "Edit Branch" : "Add New Branch"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Branch" : "Add New Branch"}</h1>
        <p className="text-sm text-slate-500">Establish a new operational healthcare facility under the HMS enterprise network.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={Info} title="Basic Information">
          <InputField label="Branch Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Metro North Medical Center" />
          <SelectField label="Parent Hospital" required value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })}>
            <option value="">Select Parent Organization</option>
            {hospitalsData?.data.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name}
              </option>
            ))}
          </SelectField>
          {isEdit && branch && <InputField label="Branch ID" value={branch.branchId} disabled hint="System generated identifier." />}
          <SelectField label="Branch Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <InputField label="Branch Head" value={form.headName} onChange={(e) => setForm({ ...form, headName: e.target.value })} placeholder="e.g. Dr. Sarah Jenkins" />
          <InputField label="Total Staff" type="number" min={0} value={form.totalStaff} onChange={(e) => setForm({ ...form, totalStaff: Number(e.target.value) })} />
        </FormSection>

        <FormSection icon={MapPin} title="Location Details">
          <InputField label="Full Street Address" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="123 Medical Plaza" />
          <InputField label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <InputField label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <InputField label="ZIP Code" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/super-admin/branches")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Branch" : "Create Branch"}
          </Button>
        </div>
      </form>
    </div>
  );
}
