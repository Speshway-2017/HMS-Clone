import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePatients } from "../../features/patients";
import { useCreateLabOrder } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { FlaskConical, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

const COMMON_TESTS = [
  "CBC (Complete Blood Count)",
  "Lipid Profile",
  "LFT (Liver Function Tests)",
  "RFT (Renal Function Tests)",
  "HbA1c (Glycated Haemoglobin)",
  "Thyroid Profile (TSH, T3, T4)",
  "Troponin I (Cardiac Marker)",
  "CRP (C-Reactive Protein)",
  "Urine Routine & Microscopy",
  "Serum Electrolytes",
  "Blood Culture & Sensitivity",
];

export function NewLabOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPatientId = searchParams.get("patientId") || "";

  const { data: patientData, isLoading: isPatientsLoading } = usePatients({ page: 1 });
  const createLabOrderMutation = useCreateLabOrder();

  const [patientId, setPatientId] = useState(defaultPatientId);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [priority, setPriority] = useState("Routine");

  useEffect(() => {
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
    }
  }, [defaultPatientId]);

  const toggleTest = (test: string) => {
    if (selectedTests.includes(test)) {
      setSelectedTests(selectedTests.filter((t) => t !== test));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (selectedTests.length === 0) {
      toast.error("Please select at least one laboratory test");
      return;
    }

    try {
      await createLabOrderMutation.mutateAsync({
        patientId,
        tests: selectedTests,
        priority,
      });
      toast.success("Laboratory test order created successfully");
      navigate("/doctor/laboratory/pending");
    } catch (err) {
      toast.error("Failed to create laboratory order");
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
          <h1 className="text-2xl font-bold text-slate-900">Create Lab Order</h1>
          <p className="text-sm text-slate-500">Order new diagnostic laboratory investigations for a patient.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 border-b pb-2">Patient Details</h3>

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

          <SelectField
            label="Priority Level"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            required
          >
            <option value="Routine">Routine</option>
            <option value="Urgent">Urgent</option>
            <option value="STAT">STAT / Emergency</option>
          </SelectField>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 border-b pb-2">Select Diagnostic Investigations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {COMMON_TESTS.map((test) => {
              const isChecked = selectedTests.includes(test);
              return (
                <label
                  key={test}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-200 select-none ${
                    isChecked ? "border-emerald-700 bg-emerald-50 text-slate-900 font-medium" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleTest(test)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-navy-500"
                  />
                  <span className="text-sm">{test}</span>
                </label>
              );
            })}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={createLabOrderMutation.isPending}>
            {createLabOrderMutation.isPending ? "Submitting..." : "Submit Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
