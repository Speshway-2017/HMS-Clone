import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CalendarPlus } from "lucide-react";
import { useCreateAppointment } from "../../features/appointments";
import { usePatients } from "../../features/patients";
import { useDoctors } from "../../features/doctors";
import { useDepartments } from "../../features/departments";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

const TYPES = ["Consultation", "Follow-up", "Tele-Health", "Emergency", "Procedure"];

export function AppointmentFormPage() {
  const navigate = useNavigate();
  const { data: patients } = usePatients({ page: 1 });
  const { data: doctors } = useDoctors({ page: 1 });
  const { data: departments } = useDepartments();
  const createAppointment = useCreateAppointment();

  const [form, setForm] = useState({
    patient: "",
    doctor: "",
    department: "",
    date: "",
    time: "",
    type: TYPES[0],
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createAppointment.mutateAsync({ ...form, department: form.department || null });
      navigate("/admin/appointments");
    } catch {
      setError("Could not schedule appointment. Check the form and try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/admin/appointments" className="hover:text-navy-700">
            Appointments
          </Link>{" "}
          &gt; Schedule Appointment
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Schedule Appointment</h1>
        <p className="text-sm text-slate-500">Book a new patient appointment with a doctor.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={CalendarPlus} title="Appointment Details">
          <SelectField label="Patient" required value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })}>
            <option value="">Select Patient</option>
            {patients?.data.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Doctor" required value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })}>
            <option value="">Select Doctor</option>
            {doctors?.data.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            <option value="">Select Department</option>
            {departments?.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </SelectField>
          <InputField label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <InputField label="Time" type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <div className="sm:col-span-2">
            <TextareaField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/appointments")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={createAppointment.isPending}>
            {createAppointment.isPending ? "Scheduling..." : "Schedule Appointment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
