import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useConsultationWorkspace,
  useSaveVitals,
  useSaveClinicalNotes,
  useCompleteConsultation,
  useRecommendAdmission,
  useCreateRadiologyOrder,
  useCreatePrescription,
  useCreateLabOrder,
  useStartConsultation,
} from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { InputField, TextareaField, SelectField } from "../../components/ui/Field";
import {
  User,
  Heart,
  Pill,
  FlaskConical,
  Scan,
  FileText,
  CalendarDays,
  Plus,
  Trash2,
  Printer,
  History,
  CheckCircle,
  FileCheck,
  AlertTriangle,
  FolderOpen,
} from "lucide-react";
import toast from "react-hot-toast";

type TabType = "overview" | "history" | "vitals" | "prescription" | "lab" | "radiology" | "documents" | "timeline";

const COMMON_LAB_TESTS = [
  "CBC (Complete Blood Count)",
  "Lipid Profile",
  "LFT (Liver Function Tests)",
  "RFT (Renal Function Tests)",
  "HbA1c (Glycated Haemoglobin)",
  "Thyroid Profile (TSH, T3, T4)",
];

export function ConsultationWorkspacePage() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: workspaceData, isLoading, isError, refetch } = useConsultationWorkspace(appointmentId || "");
  const saveVitalsMutation = useSaveVitals();
  const saveNotesMutation = useSaveClinicalNotes();
  const completeMutation = useCompleteConsultation();
  const admitMutation = useRecommendAdmission();
  const radiologyMutation = useCreateRadiologyOrder();
  const prescriptionMutation = useCreatePrescription();
  const labMutation = useCreateLabOrder();
  const startConsultationMutation = useStartConsultation();

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Vitals form state
  const [temperature, setTemperature] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [pulseRate, setPulseRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [weight, setWeight] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");

  // Notes form state
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [advice, setAdvice] = useState("");

  // Prescription form state
  const [prescriptionMeds, setPrescriptionMeds] = useState<any[]>([
    { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
  ]);

  // Lab form state
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([]);
  const [labPriority, setLabPriority] = useState("Routine");

  // Radiology form state
  const [radioType, setRadioType] = useState("X-ray");
  const [radioPriority, setRadioPriority] = useState("Routine");
  const [radioNotes, setRadioNotes] = useState("");

  // Admission form state
  const [admitWard, setAdmitWard] = useState("General Ward");
  const [admitDiagnosis, setAdmitDiagnosis] = useState("");
  const [admitNotes, setAdmitNotes] = useState("");

  // Populate form states once loaded
  const hasPopulated = useRef(false);
  if (workspaceData && !hasPopulated.current) {
    const appt = workspaceData.appointment;
    setTemperature(appt.vitals?.temperature || "");
    setBloodPressure(appt.vitals?.bloodPressure || "");
    setPulseRate(appt.vitals?.pulseRate || "");
    setRespiratoryRate(appt.vitals?.respiratoryRate || "");
    setOxygenSaturation(appt.vitals?.oxygenSaturation || "");
    setWeight(appt.vitals?.weight || "");
    setChiefComplaint(appt.chiefComplaint || "");

    setDiagnosis(appt.diagnosis || "");
    setSymptoms(appt.symptoms || "");
    setClinicalNotes(appt.clinicalNotes || "");
    setTreatmentPlan(appt.treatmentPlan || "");
    setAdvice(appt.advice || "");
    hasPopulated.current = true;
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  if (isError || !workspaceData) {
    return (
      <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-red-200 bg-red-50">
        <AlertTriangle className="mb-2 h-10 w-10 text-red-400" />
        <h3 className="text-sm font-semibold text-red-600">Failed to load consultation workspace</h3>
        <button onClick={() => refetch()} className="mt-4 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">
          Retry
        </button>
      </Card>
    );
  }

  const { appointment, queueItem, prescriptions, labOrders, radiologyOrders, admissions } = workspaceData;
  const patient = appointment.patient as any;

  const handleStartConsultation = async () => {
    try {
      await startConsultationMutation.mutateAsync(appointment._id);
      toast.success("Consultation session started!");
      refetch();
    } catch {
      toast.error("Failed to start consultation");
    }
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveVitalsMutation.mutateAsync({
        appointmentId: appointment._id,
        vitals: { temperature, bloodPressure, pulseRate, respiratoryRate, oxygenSaturation, weight },
        chiefComplaint,
      });
      toast.success("Vitals saved successfully");
    } catch {
      toast.error("Failed to save vitals");
    }
  };

  const handleSaveClinicalNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveNotesMutation.mutateAsync({
        appointmentId: appointment._id,
        diagnosis,
        symptoms,
        clinicalNotes,
        treatmentPlan,
        advice,
      });
      toast.success("Clinical notes updated successfully");
    } catch {
      toast.error("Failed to update clinical notes");
    }
  };

  const handleCompleteConsultation = async () => {
    if (!diagnosis) {
      toast.error("Please enter a diagnosis before completing consultation");
      return;
    }
    try {
      await completeMutation.mutateAsync(appointment._id);
      toast.success("Consultation completed successfully!");
      navigate("/doctor");
    } catch {
      toast.error("Failed to complete consultation");
    }
  };

  const handleAddMed = () => {
    setPrescriptionMeds([...prescriptionMeds, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  };

  const handleRemoveMed = (index: number) => {
    setPrescriptionMeds(prescriptionMeds.filter((_, idx) => idx !== index));
  };

  const handleMedChange = (index: number, field: string, val: string) => {
    const updated = prescriptionMeds.map((m, idx) => (idx === index ? { ...m, [field]: val } : m));
    setPrescriptionMeds(updated);
  };

  const handleGeneratePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prescriptionMeds.some((m) => !m.name.trim())) {
      toast.error("Please enter medicine names");
      return;
    }
    try {
      await prescriptionMutation.mutateAsync({
        patientId: patient._id,
        diagnosis: diagnosis || "Consultation visit",
        medicines: prescriptionMeds,
        notes: advice,
      });
      toast.success("Prescription generated!");
      refetch();
    } catch {
      toast.error("Failed to generate prescription");
    }
  };

  const toggleLabTest = (test: string) => {
    if (selectedLabTests.includes(test)) {
      setSelectedLabTests(selectedLabTests.filter((t) => t !== test));
    } else {
      setSelectedLabTests([...selectedLabTests, test]);
    }
  };

  const handleOrderLabs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLabTests.length === 0) {
      toast.error("Please select at least one lab test");
      return;
    }
    try {
      await labMutation.mutateAsync({
        patientId: patient._id,
        tests: selectedLabTests,
        priority: labPriority,
      });
      toast.success("Laboratory test orders submitted!");
      setSelectedLabTests([]);
      refetch();
    } catch {
      toast.error("Failed to submit laboratory tests");
    }
  };

  const handleOrderRadiology = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await radiologyMutation.mutateAsync({
        appointmentId: appointment._id,
        patientId: patient._id,
        type: radioType,
        priority: radioPriority,
        notes: radioNotes,
      });
      toast.success("Radiology imaging request submitted!");
      setRadioNotes("");
      refetch();
    } catch {
      toast.error("Failed to request radiology");
    }
  };

  const handleRecommendAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await admitMutation.mutateAsync({
        appointmentId: appointment._id,
        suggestedWard: admitWard,
        diagnosis: admitDiagnosis || diagnosis || "Clinical Admission Needed",
        notes: admitNotes,
      });
      toast.success("Admission recommendation sent to receptionist!");
      setAdmitNotes("");
      refetch();
    } catch {
      toast.error("Failed to recommend admission");
    }
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;
    if (content) {
      document.body.innerHTML = content;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Consultation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">Consultation Workspace</h1>
            <Badge tone={appointment.status === "completed" ? "success" : appointment.status === "in_consultation" ? "warning" : "info"}>
              {appointment.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Attending Patient: <span className="font-semibold text-slate-700">{patient.name}</span> (UHID: {patient.uhid})
          </p>
        </div>

        <div className="flex gap-2">
          {appointment.status === "checked_in" && (
            <Button variant="primary" onClick={handleStartConsultation} disabled={startConsultationMutation.isPending}>
              Start Consultation
            </Button>
          )}

          {appointment.status === "in_consultation" && (
            <Button variant="primary" onClick={handleCompleteConsultation} disabled={completeMutation.isPending}>
              Complete Consultation
            </Button>
          )}

          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Patient quick details */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <User className="h-4 w-4 text-navy-700" /> Patient Details
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Name</span>
                <span className="font-semibold text-slate-800">{patient.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Age / Gender</span>
                <span className="font-semibold text-slate-800">{patient.age} Yrs / {patient.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Contact</span>
                <span className="font-semibold text-slate-800">{patient.phone || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Blood Group</span>
                <span className="font-semibold text-slate-800">{patient.bloodGroup || "—"}</span>
              </div>
              {patient.allergies && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-medium">
                  ⚠️ Allergies: {patient.allergies}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-red-500" /> Current Vitals
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded">
                <span className="text-slate-400 block">Blood Pressure</span>
                <span className="font-bold text-slate-700">{bloodPressure || "—"}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <span className="text-slate-400 block">Temperature</span>
                <span className="font-bold text-slate-700">{temperature || "—"}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <span className="text-slate-400 block">Pulse Rate</span>
                <span className="font-bold text-slate-700">{pulseRate || "—"}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <span className="text-slate-400 block">Oxygen Sat. (SpO2)</span>
                <span className="font-bold text-slate-700">{oxygenSaturation || "—"}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column: Workspace Tabs & Details */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs navigation */}
          <div className="flex bg-slate-100 p-1 rounded-lg w-full overflow-x-auto gap-1">
            {([
              { key: "overview",     label: "Overview",     icon: <User className="h-3.5 w-3.5" /> },
              { key: "history",      label: "History",      icon: <History className="h-3.5 w-3.5" /> },
              { key: "vitals",       label: "Vitals Form",  icon: <Heart className="h-3.5 w-3.5" /> },
              { key: "prescription", label: "Prescribe",    icon: <Pill className="h-3.5 w-3.5" /> },
              { key: "lab",          label: "Labs",         icon: <FlaskConical className="h-3.5 w-3.5" /> },
              { key: "radiology",    label: "Radiology",    icon: <Scan className="h-3.5 w-3.5" /> },
              { key: "documents",    label: "Recommend Admission", icon: <FileText className="h-3.5 w-3.5" /> },
              { key: "timeline",     label: "Timeline",     icon: <CalendarDays className="h-3.5 w-3.5" /> },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === t.key ? "bg-navy-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleSaveClinicalNotes} className="md:col-span-2 space-y-4">
                <Card className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Clinical Assessment Notes</h3>
                  <InputField label="Chief Complaint" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="Why is the patient here?" />
                  <InputField label="Diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Essential Hypertension" required />
                  <TextareaField label="Symptoms" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Enter details of symptoms..." rows={2} />
                  <TextareaField label="Clinical Notes" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Attending doctor notes..." rows={3} />
                  <TextareaField label="Treatment Plan" value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} placeholder="Enter next plan..." rows={2} />
                  <TextareaField label="Advice / Follow-up notes" value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Enter instructions for patient..." rows={2} />
                  
                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" disabled={saveNotesMutation.isPending}>
                      {saveNotesMutation.isPending ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </Card>
              </form>
            </div>
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === "history" && (
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
                <History className="h-4 w-4" /> Full Past Medical History Logs
              </h3>
              {patient.medicalHistory?.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">No past medical history logs found.</p>
              ) : (
                <div className="space-y-4">
                  {patient.medicalHistory.map((item: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-slate-200 pl-4 py-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-navy-700 bg-navy-50 px-2 py-0.5 rounded">{item.visitType || "Consultation"}</span>
                        <span>{new Date(item.date).toLocaleDateString("en-IN")}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 mt-1">Dr. {item.doctorName}</p>
                      <p className="text-xs text-slate-600 mt-1"><span className="font-semibold">Diagnosis:</span> {item.diagnosis}</p>
                      <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{item.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 3: VITALS FORM */}
          {activeTab === "vitals" && (
            <form onSubmit={handleSaveVitals} className="space-y-4">
              <Card className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Record Patient Vitals</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <InputField label="Temperature (°F)" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="e.g. 98.6" />
                  <InputField label="BP (mmHg)" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} placeholder="e.g. 120/80" />
                  <InputField label="Pulse Rate (bpm)" value={pulseRate} onChange={(e) => setPulseRate(e.target.value)} placeholder="e.g. 72" />
                  <InputField label="Respiratory Rate (/min)" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} placeholder="e.g. 16" />
                  <InputField label="Oxygen Saturation (%)" value={oxygenSaturation} onChange={(e) => setOxygenSaturation(e.target.value)} placeholder="e.g. 98" />
                  <InputField label="Weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 68" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" disabled={saveVitalsMutation.isPending}>
                    {saveVitalsMutation.isPending ? "Saving..." : "Save Vitals"}
                  </Button>
                </div>
              </Card>
            </form>
          )}

          {/* TAB 4: PRESCRIBE */}
          {activeTab === "prescription" && (
            <div className="space-y-6">
              <form onSubmit={handleGeneratePrescription} className="space-y-4">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-bold text-slate-800">Issue Medication</h3>
                    <button type="button" onClick={handleAddMed} className="text-xs font-semibold text-navy-700 hover:text-navy-800 flex items-center gap-0.5">
                      <Plus className="h-3 w-3" /> Add Med
                    </button>
                  </div>

                  <div className="space-y-3">
                    {prescriptionMeds.map((med, index) => (
                      <div key={index} className="flex flex-wrap gap-2 items-end border-b border-slate-100 pb-3">
                        <div className="flex-1 min-w-[200px]">
                          <InputField label={index === 0 ? "Medicine Name" : ""} value={med.name} onChange={(e) => handleMedChange(index, "name", e.target.value)} placeholder="e.g. Amoxicillin 500mg" required />
                        </div>
                        <div className="w-24">
                          <InputField label={index === 0 ? "Dosage" : ""} value={med.dosage} onChange={(e) => handleMedChange(index, "dosage", e.target.value)} placeholder="e.g. 1 tab" />
                        </div>
                        <div className="w-32">
                          <InputField label={index === 0 ? "Frequency" : ""} value={med.frequency} onChange={(e) => handleMedChange(index, "frequency", e.target.value)} placeholder="e.g. Once daily" />
                        </div>
                        <div className="w-24">
                          <InputField label={index === 0 ? "Duration" : ""} value={med.duration} onChange={(e) => handleMedChange(index, "duration", e.target.value)} placeholder="e.g. 5 days" />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                          <InputField label={index === 0 ? "Instructions" : ""} value={med.instructions} onChange={(e) => handleMedChange(index, "instructions", e.target.value)} placeholder="e.g. After meals" />
                        </div>
                        {prescriptionMeds.length > 1 && (
                          <button type="button" onClick={() => handleRemoveMed(index)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    {prescriptions?.length > 0 && (
                      <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold">
                        <Printer className="h-4 w-4" /> Print Rx
                      </button>
                    )}
                    <Button type="submit" variant="primary" disabled={prescriptionMutation.isPending}>
                      {prescriptionMutation.isPending ? "Generating..." : "Generate Prescription"}
                    </Button>
                  </div>
                </Card>
              </form>

              {/* Printable Prescription Template (Hidden on screen, shown in ref) */}
              <div className="hidden">
                <div ref={printRef} className="p-10 max-w-2xl mx-auto space-y-6 text-slate-800">
                  <div className="text-center border-b pb-4">
                    <h1 className="text-2xl font-bold uppercase tracking-wide">Hospital Medical Center</h1>
                    <p className="text-xs text-slate-500">OPD Department · Printable Rx Slip</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p><span className="font-semibold text-slate-500">Patient:</span> {patient.name}</p>
                      <p><span className="font-semibold text-slate-500">Age/Gender:</span> {patient.age} Yrs / {patient.gender}</p>
                      <p><span className="font-semibold text-slate-500">UHID:</span> {patient.uhid}</p>
                    </div>
                    <div className="text-right">
                      <p><span className="font-semibold text-slate-500">Dr:</span> Dr. {(appointment.doctor as any)?.name}</p>
                      <p><span className="font-semibold text-slate-500">Date:</span> {new Date().toLocaleDateString("en-IN")}</p>
                    </div>
                  </div>
                  <div className="border-t border-b py-4">
                    <p className="font-bold text-sm mb-2">Rx (Medications Issued):</p>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Medication</th>
                          <th className="py-2">Dosage</th>
                          <th className="py-2">Frequency</th>
                          <th className="py-2">Duration</th>
                          <th className="py-2">Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptionMeds.map((med, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2 font-medium">{med.name}</td>
                            <td className="py-2">{med.dosage}</td>
                            <td className="py-2">{med.frequency}</td>
                            <td className="py-2">{med.duration}</td>
                            <td className="py-2 text-slate-500">{med.instructions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-slate-500 pt-10 text-center">
                    This is an electronically generated document. No signature required.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LAB TEST ORDERS */}
          {activeTab === "lab" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <form onSubmit={handleOrderLabs} className="md:col-span-1">
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Order Laboratory Tests</h3>
                  <div className="space-y-2">
                    {COMMON_LAB_TESTS.map((test) => (
                      <label key={test} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLabTests.includes(test)}
                          onChange={() => toggleLabTest(test)}
                          className="rounded border-slate-350 text-navy-700 focus:ring-navy-500"
                        />
                        {test}
                      </label>
                    ))}
                  </div>

                  <SelectField label="Priority" value={labPriority} onChange={(e) => setLabPriority(e.target.value)}>
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="STAT">STAT / Emergency</option>
                  </SelectField>

                  <Button type="submit" variant="primary" disabled={labMutation.isPending}>
                    Submit Labs Order
                  </Button>
                </Card>
              </form>

              <div className="md:col-span-2">
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Today's Lab Orders</h3>
                  {labOrders.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No lab requests submitted for this patient session.</p>
                  ) : (
                    <div className="space-y-3">
                      {labOrders.map((o) => (
                        <div key={o._id} className="border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              {o.tests.map((t, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">Order Date: {new Date(o.date).toLocaleDateString("en-IN")}</span>
                          </div>
                          <Badge tone={o.status === "completed" ? "success" : o.status === "rejected" ? "danger" : "neutral"}>
                            {o.status.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* TAB 6: RADIOLOGY */}
          {activeTab === "radiology" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <form onSubmit={handleOrderRadiology} className="md:col-span-1">
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Order Radiology Study</h3>
                  <SelectField label="Modality Type" value={radioType} onChange={(e) => setRadioType(e.target.value)}>
                    <option value="X-ray">X-Ray</option>
                    <option value="CT">CT Scan</option>
                    <option value="MRI">MRI</option>
                    <option value="Ultrasound">Ultrasound</option>
                  </SelectField>

                  <SelectField label="Priority" value={radioPriority} onChange={(e) => setRadioPriority(e.target.value)}>
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="STAT">STAT / Emergency</option>
                  </SelectField>

                  <TextareaField label="Clinical Notes / Indications" value={radioNotes} onChange={(e) => setRadioNotes(e.target.value)} placeholder="e.g. Suspected fracture right forearm" rows={2} />

                  <Button type="submit" variant="primary" disabled={radiologyMutation.isPending}>
                    Submit Request
                  </Button>
                </Card>
              </form>

              <div className="md:col-span-2">
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Requested Imaging Studies</h3>
                  {radiologyOrders.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No radiology orders requested during this session.</p>
                  ) : (
                    <div className="space-y-3">
                      {radiologyOrders.map((o) => (
                        <div key={o._id} className="border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 text-sm">{o.type}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Indications: {o.notes || "—"}</span>
                          </div>
                          <Badge tone={o.status === "completed" ? "success" : o.status === "cancelled" ? "danger" : "neutral"}>
                            {o.status.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* TAB 7: RECOMMEND ADMISSION */}
          {activeTab === "documents" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <form onSubmit={handleRecommendAdmission} className="md:col-span-1">
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-1">
                    <FileText className="h-4 w-4" /> Recommend IP Admission
                  </h3>
                  <SelectField label="Suggested Ward Category" value={admitWard} onChange={(e) => setAdmitWard(e.target.value)}>
                    <option value="General Ward">General Ward</option>
                    <option value="ICU">ICU</option>
                    <option value="Semi-Private Room">Semi-Private Room</option>
                    <option value="Private Suite">Private Deluxe Suite</option>
                  </SelectField>

                  <InputField label="Admission Diagnosis" value={admitDiagnosis} onChange={(e) => setAdmitDiagnosis(e.target.value)} placeholder="Reason for admission request" />
                  <TextareaField label="Additional Remarks" value={admitNotes} onChange={(e) => setAdmitNotes(e.target.value)} placeholder="Special instructions for ward management..." rows={3} />

                  <Button type="submit" variant="primary" disabled={admitMutation.isPending}>
                    Recommend Admission
                  </Button>
                </Card>
              </form>

              <div className="md:col-span-2">
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Active Inpatient Status</h3>
                  {admissions.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-dashed rounded-xl text-center text-xs text-slate-400">
                      Patient is currently treated as an outpatient (OP). No IP admission records.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {admissions.map((adm) => (
                        <div key={adm._id} className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs bg-slate-50">
                          <div className="flex justify-between items-center border-b pb-2">
                            <span className="font-bold text-navy-700">IP No: {adm.admissionNumber}</span>
                            <Badge tone={adm.status === "admitted" ? "warning" : "success"}>
                              {adm.status.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-slate-600">
                            <p><span className="font-medium text-slate-800">Ward:</span> {adm.ward}</p>
                            <p><span className="font-medium text-slate-800">Room / Bed:</span> Room {adm.room?.roomNumber || "Allocated"} / Bed {adm.bed?.bedNumber || "Allocated"}</p>
                            <p><span className="font-medium text-slate-800">Date:</span> {new Date(adm.admissionDate).toLocaleDateString("en-IN")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* TAB 8: TIMELINE */}
          {activeTab === "timeline" && (
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Consultation Journey Timeline</h3>
              <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6">
                {[
                  { label: "Registered", isCompleted: true, date: "Registration Completed" },
                  { label: "Token Generated", isCompleted: !!queueItem, date: queueItem ? `Token: ${queueItem.tokenNumber}` : "Pending" },
                  { label: "Checked-in", isCompleted: !!queueItem && ["called", "completed"].includes(queueItem.status), date: queueItem?.status === "called" ? "Called to Cabin" : queueItem?.status === "completed" ? "Fulfillment Finished" : "Waiting" },
                  { label: "Consultation Started", isCompleted: ["in_consultation", "completed"].includes(appointment.status), date: appointment.status === "in_consultation" ? "Consulting..." : appointment.status === "completed" ? "Completed" : "Pending" },
                  { label: "Prescription Generated", isCompleted: prescriptions.length > 0, date: prescriptions.length > 0 ? "Rx Slip Issued" : "No prescription issued" },
                  { label: "Lab Ordered", isCompleted: labOrders.length > 0, date: labOrders.length > 0 ? `${labOrders.length} Lab requests sent` : "No lab test requested" },
                  { label: "Admission Recommended", isCompleted: admissions.length > 0 || (admitMutation.isSuccess), date: admissions.length > 0 ? "IP Slip Generated" : "OP treatment" },
                  { label: "Admission Completed", isCompleted: admissions.some(a => a.status === "admitted"), date: admissions.some(a => a.status === "admitted") ? "Patient Admitted to IP Ward" : "OP treatment" },
                  { label: "Discharged", isCompleted: admissions.some(a => a.status === "discharged"), date: admissions.some(a => a.status === "discharged") ? "Discharged" : "Active Treatment" },
                ].map((step, idx) => (
                  <div key={idx} className="relative">
                    <span className={`absolute -left-[31px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border bg-white ${
                      step.isCompleted ? "border-emerald-500 text-emerald-500" : "border-slate-300 text-slate-350"
                    }`}>
                      {step.isCompleted ? <CheckCircle className="h-4.5 w-4.5 fill-emerald-50 text-emerald-600" /> : <div className="h-1.5 w-1.5 bg-slate-300 rounded-full" />}
                    </span>
                    <div>
                      <h4 className={`text-xs font-bold ${step.isCompleted ? "text-slate-800" : "text-slate-400"}`}>{step.label}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{step.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
