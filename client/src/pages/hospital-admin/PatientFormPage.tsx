import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserPlus, ShieldCheck } from "lucide-react";
import { usePatient, useCreatePatient, useUpdatePatient } from "../../features/patients";
import { useDoctors } from "../../features/doctors";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

export function PatientFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: patient } = usePatient(id);
  const { data: doctorsData } = useDoctors({ page: 1 });
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient(id ?? "");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    age: 0,
    gender: "",
    bloodGroup: "",
    address: "",
    assignedDoctor: "",
    status: "opd" as "admitted" | "opd" | "discharged",
    allergies: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        age: patient.age ?? 0,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        address: patient.address,
        assignedDoctor: typeof patient.assignedDoctor === "object" && patient.assignedDoctor ? patient.assignedDoctor._id : "",
        status: patient.status,
        allergies: patient.allergies,
        insuranceProvider: patient.insuranceProvider,
        insurancePolicyNumber: patient.insurancePolicyNumber,
      });
    }
  }, [patient]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { ...form, assignedDoctor: form.assignedDoctor || null };
    try {
      if (isEdit) {
        await updatePatient.mutateAsync(payload);
      } else {
        await createPatient.mutateAsync(payload);
      }
      navigate("/admin/patients");
    } catch {
      setError("Could not save patient. Check the form and try again.");
    }
  }

  const isSaving = createPatient.isPending || updatePatient.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/admin/patients" className="hover:text-emerald-700">
            Patients
          </Link>{" "}
          &gt; {isEdit ? "Edit Patient" : "Add New Patient"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Patient" : "Register New Patient"}</h1>
        <p className="text-sm text-slate-500">Enter demographic, clinical, and insurance details.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={UserPlus} title="Patient Information">
          <InputField label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Eleanor Johnson" />
          <InputField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="eleanor.j@email.com" />
          <InputField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
          <InputField label="Age" type="number" min={0} value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} />
          <SelectField label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">Select</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
          </SelectField>
          <InputField label="Blood Group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} placeholder="e.g. O+" />
          <SelectField label="Assigned Doctor" value={form.assignedDoctor} onChange={(e) => setForm({ ...form, assignedDoctor: e.target.value })}>
            <option value="">Unassigned</option>
            {doctorsData?.data.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
            <option value="opd">OPD</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
          </SelectField>
          <div className="sm:col-span-2">
            <TextareaField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <TextareaField label="Allergies" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin" rows={2} />
          </div>
        </FormSection>

        <FormSection icon={ShieldCheck} title="Insurance">
          <InputField label="Insurance Provider" value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} placeholder="e.g. BlueShield PPO" />
          <InputField label="Policy Number" value={form.insurancePolicyNumber} onChange={(e) => setForm({ ...form, insurancePolicyNumber: e.target.value })} placeholder="#882" />
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/patients")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Create Patient"}
          </Button>
        </div>
      </form>
    </div>
  );
}
