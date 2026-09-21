import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePatients } from "../../features/patients";
import { useCreateCertificate } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { InputField, TextareaField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { FileText, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export function NewCertificatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPatientId = searchParams.get("patientId") || "";

  const { data: patientData, isLoading: isPatientsLoading } = usePatients({ page: 1 });
  const createCertificateMutation = useCreateCertificate();

  const [patientId, setPatientId] = useState(defaultPatientId);
  const [diagnosis, setDiagnosis] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
    }
  }, [defaultPatientId]);

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
    if (!duration.trim()) {
      toast.error("Please specify a duration (e.g. 5 days)");
      return;
    }

    try {
      await createCertificateMutation.mutateAsync({
        patientId,
        diagnosis,
        duration,
        notes,
      });
      toast.success("Medical certificate issued successfully");
      navigate("/doctor"); // Navigate back to doctor home
    } catch (err) {
      toast.error("Failed to issue medical certificate");
    }
  };

  const patients = patientData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Issue Medical Certificate</h1>
          <p className="text-sm text-slate-500">Generate a digital medical certificate for fitness or leave.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 border-b pb-2">Certificate Information</h3>

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
            label="Diagnosis / Reason for Medical Leave"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Acute Viral Gastroenteritis, Post-op Recovery"
            required
          />

          <InputField
            label="Recommended Leave Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 5 Days (from July 14, 2026 to July 18, 2026)"
            required
          />

          <TextareaField
            label="Additional Notes / Rest Advice"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Rest advised. Avoid strenuous activities."
            rows={3}
          />
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={createCertificateMutation.isPending}>
            {createCertificateMutation.isPending ? "Generating..." : "Generate Certificate"}
          </Button>
        </div>
      </form>
    </div>
  );
}
