import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDoctorPatients, useCreatePrescription } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { InputField, TextareaField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Pill, Plus, Trash2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

interface MedicineInput {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export function NewPrescriptionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPatientId = searchParams.get("patientId") || "";

  const { data: patientData, isLoading: isPatientsLoading } = useDoctorPatients();
  const createPrescriptionMutation = useCreatePrescription();

  const [patientId, setPatientId] = useState(defaultPatientId);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<MedicineInput[]>([
    { name: "", dosage: "", frequency: "", duration: "" },
  ]);

  useEffect(() => {
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
    }
  }, [defaultPatientId]);

  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const handleRemoveMedicine = (idx: number) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleMedicineChange = (idx: number, field: keyof MedicineInput, val: string) => {
    const updated = medicines.map((m, i) => (i === idx ? { ...m, [field]: val } : m));
    setMedicines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (!diagnosis.trim()) {
      toast.error("Please enter a diagnosis");
      return;
    }
    if (medicines.some((m) => !m.name.trim() || !m.dosage.trim())) {
      toast.error("Please fill in medicine name and dosage");
      return;
    }

    try {
      await createPrescriptionMutation.mutateAsync({
        patientId,
        diagnosis,
        medicines,
        notes,
      });
      toast.success("Prescription created successfully");
      navigate("/doctor/prescriptions/pending");
    } catch (err) {
      toast.error("Failed to create prescription");
    }
  };

  const patients = patientData?.patients || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Prescription</h1>
          <p className="text-sm text-slate-500">Issue a new medical prescription for a patient.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 border-b pb-2">Patient & Diagnosis</h3>

          {isPatientsLoading ? (
            <div className="h-10 w-full bg-slate-100 animate-pulse rounded"></div>
          ) : (
            <SelectField
              label="Select Patient"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            >
              <option value="">-- Choose Patient --</option>
              {patients.map((p: any) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.uhid ? `UHID: ${p.uhid}` : `ID: ${p._id.slice(-6)}`})
                </option>
              ))}
            </SelectField>
          )}

          <InputField
            label="Diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Hypertension, Acute Tonsillitis"
            required
          />
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-base font-bold text-slate-800">Medicines (Rx)</h3>
            <button
              type="button"
              onClick={handleAddMedicine}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <Plus className="h-4 w-4" /> Add Medicine
            </button>
          </div>

          <div className="space-y-4">
            {medicines.map((med, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-3 items-end border-b md:border-b-0 pb-4 md:pb-0">
                <div className="flex-1">
                  <InputField
                    label={idx === 0 ? "Medicine Name" : ""}
                    value={med.name}
                    onChange={(e) => handleMedicineChange(idx, "name", e.target.value)}
                    placeholder="e.g. Paracetamol 650mg"
                    required
                  />
                </div>
                <div className="w-full md:w-32">
                  <InputField
                    label={idx === 0 ? "Dosage" : ""}
                    value={med.dosage}
                    onChange={(e) => handleMedicineChange(idx, "dosage", e.target.value)}
                    placeholder="e.g. 1 tablet"
                    required
                  />
                </div>
                <div className="w-full md:w-44">
                  <InputField
                    label={idx === 0 ? "Frequency" : ""}
                    value={med.frequency}
                    onChange={(e) => handleMedicineChange(idx, "frequency", e.target.value)}
                    placeholder="e.g. Thrice daily"
                    required
                  />
                </div>
                <div className="w-full md:w-32">
                  <InputField
                    label={idx === 0 ? "Duration" : ""}
                    value={med.duration}
                    onChange={(e) => handleMedicineChange(idx, "duration", e.target.value)}
                    placeholder="e.g. 5 days"
                    required
                  />
                </div>
                {medicines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicine(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 border-b pb-2">Notes</h3>
          <TextareaField
            label="Special Instructions / Diet / Advice"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add general dietary suggestions or instructions on when to consult next..."
            rows={3}
          />
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={createPrescriptionMutation.isPending}>
            {createPrescriptionMutation.isPending ? "Creating..." : "Save & Issue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
