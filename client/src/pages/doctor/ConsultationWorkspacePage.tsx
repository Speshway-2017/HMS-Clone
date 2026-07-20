import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  useUpdateConsultationDraft,
  useCompleteConsultationSession,
  useCancelConsultationSession,
  useConsultationDraft,
} from "../../features/doctorDashboard";
import { useInventory } from "../../features/inventory";
import { useMyHospital } from "../../features/hospitals";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
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

interface CombinedConsultationGroup {
  id: string;
  date: Date;
  dateFormatted: string;
  doctorName: string;
  department: string;
  consultation: {
    diagnosis: string;
    notes: string;
    status: string;
  } | null;
  prescriptions: {
    diagnosis: string;
    notes: string;
    status: string;
  }[];
  labs: {
    diagnosis: string;
    notes: string;
    status: string;
  }[];
  radiology: {
    diagnosis: string;
    notes: string;
    status: string;
  }[];
  certificates: {
    diagnosis: string;
    notes: string;
    status: string;
  }[];
  inpatientNotes: {
    diagnosis: string;
    notes: string;
    status: string;
  }[];
  others: any[];
}

function groupAndCombineHistory(historyList: any[]): CombinedConsultationGroup[] {
  if (!historyList || historyList.length === 0) return [];

  const map = new Map<string, CombinedConsultationGroup>();

  historyList.forEach((item) => {
    const dateVal = item.date ? new Date(item.date) : new Date();
    const dateStr = dateVal.toLocaleDateString("en-IN");
    const docName = String(item.doctorName || "Attending Doctor").trim();
    const key = `${dateStr}-${docName}`;

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        date: dateVal,
        dateFormatted: dateVal.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }),
        doctorName: docName,
        department: item.department || "",
        consultation: null,
        prescriptions: [],
        labs: [],
        radiology: [],
        certificates: [],
        inpatientNotes: [],
        others: []
      });
    }

    const group = map.get(key)!;
    if (!group.department && item.department) {
      group.department = item.department;
    }

    const vType = String(item.visitType).toLowerCase();

    const cleanItem = {
      diagnosis: item.diagnosis || "",
      notes: item.notes || "",
      status: item.status || "Completed"
    };

    if (vType.includes("consultation")) {
      group.consultation = cleanItem;
    } else if (vType.includes("prescription")) {
      group.prescriptions.push(cleanItem);
    } else if (vType.includes("lab")) {
      group.labs.push(cleanItem);
    } else if (vType.includes("radiology")) {
      group.radiology.push(cleanItem);
    } else if (vType.includes("certificate")) {
      group.certificates.push(cleanItem);
    } else if (vType.includes("inpatient") || vType.includes("rounds")) {
      group.inpatientNotes.push(cleanItem);
    } else {
      group.others.push(item);
    }
  });

  return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function ConsultationWorkspacePage() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
  const updateDraftMutation = useUpdateConsultationDraft();
  const completeDraftMutation = useCompleteConsultationSession();
  const cancelDraftMutation = useCancelConsultationSession();
  const { data: inventoryData } = useInventory({ category: "medicines" });
  const rawMeds = inventoryData?.data || [];

  const { data: hospitalData } = useMyHospital();

  const labTests = hospitalData?.availableLabTests && hospitalData.availableLabTests.length > 0
    ? hospitalData.availableLabTests
    : COMMON_LAB_TESTS;

  const radiologyTests = hospitalData?.availableRadiologyTests && hospitalData.availableRadiologyTests.length > 0
    ? hospitalData.availableRadiologyTests
    : ["X-ray", "CT Scan", "MRI", "Ultrasound"];

  const initialTab = (location.state as any)?.activeTab || "overview";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

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
    { 
      key: "init-med-0",
      name: "", 
      strength: "", 
      dosage: "", 
      frequency: "", 
      duration: "", 
      instructions: "",
      morning: false,
      afternoon: false,
      night: false
    },
  ]);

  // Success delivery tracking states
  const [successInfo, setSuccessInfo] = useState<{
    show: boolean;
    isCompleted: boolean;
    pdfUrl: string;
    downloadUrl: string;
  } | null>(null);

  // Lab form state
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([]);
  const [labPriority, setLabPriority] = useState("Routine");

  // Radiology form state
  const [selectedRadiologyStudies, setSelectedRadiologyStudies] = useState<string[]>([]);
  const [radioPriority, setRadioPriority] = useState("Routine");
  const [radioNotes, setRadioNotes] = useState("");

  const toggleRadiologyStudy = (study: string) => {
    setSelectedRadiologyStudies((prev) =>
      prev.includes(study) ? prev.filter((s) => s !== study) : [...prev, study]
    );
  };

  // Admission form state
  const [admitWard, setAdmitWard] = useState("General");
  const [admitDiagnosis, setAdmitDiagnosis] = useState("");
  const [admitNotes, setAdmitNotes] = useState("");
  const [admitPriority, setAdmitPriority] = useState("Routine");
  const [admitBedType, setAdmitBedType] = useState("General");
  const [admitExpectedStay, setAdmitExpectedStay] = useState("");
  const [admitReason, setAdmitReason] = useState("");
  const [admitSpecialInstructions, setAdmitSpecialInstructions] = useState("");

  // Auto-save states
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Populate form states once loaded from draft (or fallback to appointment)
  const hasPopulated = useRef(false);
  useEffect(() => {
    if (workspaceData && !hasPopulated.current) {
      const draft = workspaceData.draftSession;
      const appt = workspaceData.appointment;
      
      if (draft) {
        setTemperature(draft.vitals?.temperature || "");
        setBloodPressure(draft.vitals?.bloodPressure || "");
        setPulseRate(draft.vitals?.pulseRate || "");
        setRespiratoryRate(draft.vitals?.respiratoryRate || "");
        setOxygenSaturation(draft.vitals?.oxygenSaturation || "");
        setWeight(draft.vitals?.weight || "");
        setChiefComplaint(draft.chiefComplaint || "");
        
        setDiagnosis(draft.diagnosis || "");
        setSymptoms(draft.symptoms || "");
        setClinicalNotes(draft.clinicalNotes || "");
        setTreatmentPlan(draft.treatmentPlan || "");
        setAdvice(draft.advice || "");

        if (draft.prescriptions && draft.prescriptions.length > 0) {
          setPrescriptionMeds(draft.prescriptions.map((p: any, idx: number) => ({
            key: p._id || p.key || `draft-med-${idx}`,
            name: p.name || "",
            strength: p.strength || "",
            dosage: p.dosage || "",
            frequency: p.frequency || "",
            duration: p.duration || "",
            instructions: p.instructions || "",
            morning: !!p.morning,
            afternoon: !!p.afternoon,
            night: !!p.night,
          })));
        }

        if (draft.labOrders && draft.labOrders.length > 0) {
          setSelectedLabTests(draft.labOrders);
        }

        if (draft.radiologyOrders && draft.radiologyOrders.length > 0) {
          const restoredStudies = draft.radiologyOrders.map((r: any) => r.type).filter(Boolean);
          setSelectedRadiologyStudies(restoredStudies);
          const lastRad = draft.radiologyOrders[draft.radiologyOrders.length - 1];
          setRadioNotes(lastRad.notes || "");
          setRadioPriority(lastRad.priority || "Routine");
        }

        if (draft.admissionRecommendation) {
          const rec = draft.admissionRecommendation;
          setAdmitWard(rec.preferredWard || "General");
          setAdmitBedType(rec.preferredBedType || "General");
          setAdmitExpectedStay(rec.expectedStay || "");
          setAdmitDiagnosis(rec.primaryDiagnosis || "");
          setAdmitNotes(rec.clinicalNotes || "");
          setAdmitReason(rec.admissionReason || "");
          setAdmitSpecialInstructions(rec.specialInstructions || "");
        }
      } else {
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
      }
      hasPopulated.current = true;
    }
  }, [workspaceData]);

  // Auto-save logic
  useEffect(() => {
    if (!hasPopulated.current || !workspaceData?.draftSession?._id) return;
    
    const draftId = workspaceData.draftSession._id;
    
    // Construct update payload
    const updateData = {
      vitals: {
        temperature,
        bloodPressure,
        pulseRate,
        respiratoryRate,
        oxygenSaturation,
        weight,
      },
      chiefComplaint,
      diagnosis,
      symptoms,
      clinicalNotes,
      treatmentPlan,
      advice,
      prescriptions: prescriptionMeds.map(p => ({
        name: p.name,
        strength: p.strength,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        instructions: p.instructions,
        morning: !!p.morning,
        afternoon: !!p.afternoon,
        night: !!p.night,
      })),
      labOrders: selectedLabTests,
      radiologyOrders: selectedRadiologyStudies.map((study) => ({
        type: study,
        notes: radioNotes,
        priority: radioPriority,
      })),
      admissionRecommendation: {
        priority: admitPriority as any,
        preferredWard: admitWard,
        preferredBedType: admitBedType,
        expectedStay: admitExpectedStay,
        primaryDiagnosis: admitDiagnosis,
        clinicalNotes: admitNotes,
        admissionReason: admitReason,
        specialInstructions: admitSpecialInstructions,
        recommended: !!(admitDiagnosis || admitWard !== "General" || admitReason),
      }
    };

    const delayDebounceFn = setTimeout(async () => {
      try {
        setIsSavingDraft(true);
        await updateDraftMutation.mutateAsync({
          consultationId: draftId,
          updateData,
          appointmentId: appointmentId || "",
        });
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.error("Auto-save failed", err);
      } finally {
        setIsSavingDraft(false);
      }
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [
    temperature,
    bloodPressure,
    pulseRate,
    respiratoryRate,
    oxygenSaturation,
    weight,
    chiefComplaint,
    diagnosis,
    symptoms,
    clinicalNotes,
    treatmentPlan,
    advice,
    prescriptionMeds,
    selectedLabTests,
    selectedRadiologyStudies,
    radioNotes,
    radioPriority,
    admitWard,
    admitBedType,
    admitExpectedStay,
    admitDiagnosis,
    admitNotes,
    admitReason,
    admitSpecialInstructions,
  ]);

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

  const { appointment, queueItem, prescriptions, labOrders, radiologyOrders, admissions, admissionRequests = [] } = workspaceData;
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
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    try {
      await updateDraftMutation.mutateAsync({
        consultationId: workspaceData.draftSession._id,
        updateData: {
          vitals: { temperature, bloodPressure, pulseRate, respiratoryRate, oxygenSaturation, weight },
          chiefComplaint,
        },
        appointmentId: appointment._id,
      });
      toast.success("Vitals saved to draft successfully");
    } catch {
      toast.error("Failed to save vitals");
    }
  };

  const handleSaveClinicalNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    try {
      await updateDraftMutation.mutateAsync({
        consultationId: workspaceData.draftSession._id,
        updateData: {
          diagnosis,
          symptoms,
          clinicalNotes,
          treatmentPlan,
          advice,
        },
        appointmentId: appointment._id,
      });
      toast.success("Clinical notes saved to draft successfully");
    } catch {
      toast.error("Failed to update clinical notes");
    }
  };

  const handleCompleteConsultation = async () => {
    if (!diagnosis) {
      toast.error("Please enter a diagnosis before completing consultation");
      return;
    }
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    try {
      // 1. Bulk-save all active states
      const updateData = {
        vitals: {
          temperature,
          bloodPressure,
          pulseRate,
          respiratoryRate,
          oxygenSaturation,
          weight,
        },
        chiefComplaint,
        diagnosis,
        symptoms,
        clinicalNotes,
        treatmentPlan,
        advice,
        prescriptions: prescriptionMeds.map(p => ({
          name: p.name,
          strength: p.strength,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          instructions: p.instructions,
          morning: !!p.morning,
          afternoon: !!p.afternoon,
          night: !!p.night,
        })),
        labOrders: selectedLabTests,
        radiologyOrders: selectedRadiologyStudies.map((study) => ({
          type: study,
          notes: radioNotes,
          priority: radioPriority,
        })),
        admissionRecommendation: {
          priority: admitPriority as any,
          preferredWard: admitWard,
          preferredBedType: admitBedType,
          expectedStay: admitExpectedStay,
          primaryDiagnosis: admitDiagnosis,
          clinicalNotes: admitNotes,
          admissionReason: admitReason,
          specialInstructions: admitSpecialInstructions,
          recommended: !!(admitDiagnosis || admitWard !== "General" || admitReason),
        }
      };

      await updateDraftMutation.mutateAsync({
        consultationId: workspaceData.draftSession._id,
        updateData,
        appointmentId: appointment._id,
      });

      // 2. Complete consultation via transaction-backed backend action
      const res = await completeDraftMutation.mutateAsync({
        consultationId: workspaceData.draftSession._id,
        followUpDate: (appointment as any).followUpDate || null,
      });

      // 3. Propagate completed lab orders to lab dashboard
      if (selectedLabTests.length > 0) {
        try {
          const savedRequests = localStorage.getItem("hms_laboratory_requests") || "[]";
          const requests = JSON.parse(savedRequests);
          const newRequest = {
            _id: `LAB-${patient._id.slice(-4)}-${Date.now().toString().slice(-4)}`,
            patientId: patient._id,
            patientName: patient.name,
            patientAge: patient.age || 30,
            patientGender: patient.gender || "Male",
            orderedBy: (appointment.doctor as any)?.name || "Dr. Attending Physician",
            tests: selectedLabTests,
            priority: labPriority,
            date: new Date().toISOString().split("T")[0],
            status: "Pending Request",
            sampleId: "",
            sampleType: "Blood",
            results: []
          };
          requests.unshift(newRequest);
          localStorage.setItem("hms_laboratory_requests", JSON.stringify(requests));
        } catch (storageErr) {
          console.error("Failed to sync lab request to local storage", storageErr);
        }
      }

      // 4. Propagate completed radiology orders to radiology/lab dashboard
      if (selectedRadiologyStudies.length > 0) {
        try {
          const savedRequests = localStorage.getItem("hms_laboratory_requests") || "[]";
          const requests = JSON.parse(savedRequests);
          const newRequest = {
            _id: `RAD-${patient._id.slice(-4)}-${Date.now().toString().slice(-4)}`,
            patientId: patient._id,
            patientName: patient.name,
            patientAge: patient.age || 30,
            patientGender: patient.gender || "Male",
            orderedBy: (appointment.doctor as any)?.name || "Dr. Attending Physician",
            tests: selectedRadiologyStudies,
            priority: radioPriority,
            date: new Date().toISOString().split("T")[0],
            status: "Pending Request",
            sampleId: "",
            sampleType: "Imaging",
            results: []
          };
          requests.unshift(newRequest);
          localStorage.setItem("hms_laboratory_requests", JSON.stringify(requests));
        } catch (storageErr) {
          console.error("Failed to sync radiology request to local storage", storageErr);
        }
      }

      const rx = res.prescription as any;
      setSuccessInfo({
        show: true,
        isCompleted: true,
        pdfUrl: rx?.pdfUrl || "",
        downloadUrl: rx?.downloadUrl || "",
      });
      toast.success("Consultation completed and finalized successfully!");
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to complete consultation");
    }
  };

  const handleAddMed = () => {
    setPrescriptionMeds([
      {
        key: Math.random().toString(),
        name: "",
        strength: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
        morning: false,
        afternoon: false,
        night: false
      },
      ...prescriptionMeds
    ]);
  };

  const handleRemoveMed = (index: number) => {
    setPrescriptionMeds(prescriptionMeds.filter((_, idx) => idx !== index));
  };

  const handleMedChange = (index: number, field: string, val: string) => {
    const updated = prescriptionMeds.map((m, idx) => (idx === index ? { ...m, [field]: val } : m));
    setPrescriptionMeds(updated);
  };

  const handleCheckboxToggle = (index: number, time: "morning" | "afternoon" | "night") => {
    const updated = [...prescriptionMeds];
    updated[index][time] = !updated[index][time];
    
    // Combine the checked values into a comma-separated instructions string
    const selectedTimes = [];
    if (updated[index].morning) selectedTimes.push("Morning");
    if (updated[index].afternoon) selectedTimes.push("Afternoon");
    if (updated[index].night) selectedTimes.push("Night");
    
    updated[index].instructions = selectedTimes.join(", ");
    setPrescriptionMeds(updated);
  };

  const handleGeneratePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prescriptionMeds.some((m) => !m.name.trim())) {
      toast.error("Please enter medicine names");
      return;
    }
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    try {
      await updateDraftMutation.mutateAsync({
        consultationId: workspaceData.draftSession._id,
        updateData: {
          prescriptions: prescriptionMeds,
        },
        appointmentId: appointment._id,
      });
      toast.success("Prescription draft saved successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save prescription draft");
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
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    try {
      await updateDraftMutation.mutateAsync({
        consultationId: workspaceData.draftSession._id,
        updateData: {
          labOrders: selectedLabTests,
        },
        appointmentId: appointment._id,
      });
      toast.success("Laboratory test orders added to draft!");
    } catch {
      toast.error("Failed to save laboratory tests");
    }
  };

  const handleOrderRadiology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    if (selectedRadiologyStudies.length === 0) {
      toast.error("Please select at least one radiology study.");
      return;
    }
    try {
      await updateDraftMutation.mutateAsync({
        consultationId: workspaceData.draftSession._id,
        updateData: {
          radiologyOrders: selectedRadiologyStudies.map((study) => ({
            type: study,
            notes: radioNotes,
            priority: radioPriority,
          }))
        },
        appointmentId: appointment._id,
      });
      toast.success(`${selectedRadiologyStudies.length} radiology study/studies added to draft!`);
    } catch {
      toast.error("Failed to save radiology request");
    }
  };

  const handleRecommendAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    try {
      await updateDraftMutation.mutateAsync({
        consultationId: workspaceData.draftSession._id,
        updateData: {
          admissionRecommendation: {
            priority: admitPriority as any,
            preferredWard: admitWard,
            preferredBedType: admitBedType,
            expectedStay: admitExpectedStay,
            primaryDiagnosis: admitDiagnosis || diagnosis || "",
            clinicalNotes: admitNotes,
            admissionReason: admitReason || admitDiagnosis || diagnosis || "",
            specialInstructions: admitSpecialInstructions,
            recommended: true,
          }
        },
        appointmentId: appointment._id,
      });
      toast.success("Admission recommendation saved to draft!");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to recommend admission";
      toast.error(errMsg);
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
              {appointment.status === "in_consultation" ? "In Progress" : appointment.status === "completed" ? "Completed" : appointment.status.toUpperCase()}
            </Badge>
            {appointment.status === "in_consultation" && workspaceData?.draftSession && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {isSavingDraft ? "Saving..." : lastSavedTime ? `Draft saved at ${lastSavedTime}` : "Draft saved automatically"}
              </span>
            )}
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
            <Button variant="primary" onClick={handleCompleteConsultation} disabled={completeDraftMutation.isPending}>
              Complete Consultation
            </Button>
          )}

          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left column: Patient quick details */}
        <div className="xl:col-span-1 space-y-6">
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
        <div className="xl:col-span-3 space-y-6">
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
          {activeTab === "history" && (() => {
            const historyGroups = groupAndCombineHistory(patient.medicalHistory || []);
            return (
              <Card className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
                  <History className="h-4 w-4" /> Full Past Medical History Logs
                </h3>
                {historyGroups.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4">No past medical history logs found.</p>
                ) : (
                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                    {historyGroups.map((group, idx) => {
                      const isLatest = idx === 0;
                      return (
                        <div
                          key={group.id}
                          className={`rounded-xl border p-4.5 transition-all space-y-3.5 ${
                            isLatest
                              ? "border-emerald-300 bg-gradient-to-r from-emerald-50/30 via-slate-50 to-white shadow-sm ring-1 ring-emerald-250/30"
                              : "border-slate-200 bg-slate-50/20"
                          }`}
                        >
                          {/* Group Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 mb-1">
                            <div className="flex items-center gap-2">
                              {isLatest ? (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                                  Last Consultation
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-700">
                                  Previous Consultation
                                </span>
                              )}
                              <span className="text-xs font-bold text-slate-800">
                                {group.dateFormatted}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                              Consultant: <strong className="text-slate-700">Dr. {group.doctorName}</strong> {group.department && `(${group.department})`}
                            </span>
                          </div>

                          {/* Consultation Clinical Summary */}
                          {group.consultation && (
                            <div className="bg-white rounded-lg border border-slate-200/60 p-3 space-y-1.5 text-xs shadow-xs">
                              <div className="flex items-center gap-1.5 text-navy-700 font-bold border-b border-slate-100 pb-1 mb-1">
                                <FileText className="h-3.5 w-3.5" /> Clinical Examination Details
                              </div>
                              {group.consultation.diagnosis && (
                                <p className="text-slate-700"><span className="font-semibold text-slate-500">Diagnosis:</span> {group.consultation.diagnosis}</p>
                              )}
                              {group.consultation.notes && (
                                <div className="text-slate-600 whitespace-pre-wrap"><span className="font-semibold text-slate-500">Notes:</span> {group.consultation.notes}</div>
                              )}
                            </div>
                          )}

                          {/* Prescriptions issued */}
                          {group.prescriptions.length > 0 && (
                            <div className="bg-white rounded-lg border border-slate-200/60 p-3 space-y-1.5 text-xs shadow-xs">
                              <div className="flex items-center gap-1.5 text-indigo-700 font-bold border-b border-slate-100 pb-1 mb-1">
                                <Pill className="h-3.5 w-3.5" /> Prescriptions Issued
                              </div>
                              {group.prescriptions.map((item, i) => (
                                <div key={i} className="text-slate-650">
                                  {item.diagnosis && <p className="font-semibold text-slate-700">For: {item.diagnosis}</p>}
                                  <p className="whitespace-pre-wrap mt-0.5">{item.notes}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Laboratory investigations ordered */}
                          {group.labs.length > 0 && (
                            <div className="bg-white rounded-lg border border-slate-200/60 p-3 space-y-1.5 text-xs shadow-xs">
                              <div className="flex items-center gap-1.5 text-blue-700 font-bold border-b border-slate-100 pb-1 mb-1">
                                <FlaskConical className="h-3.5 w-3.5" /> Lab Investigations Ordered
                              </div>
                              {group.labs.map((item, i) => (
                                <div key={i} className="text-slate-650 text-[11px] leading-relaxed">
                                  {item.diagnosis && <p className="font-semibold text-slate-700">Diagnosis/Reason: {item.diagnosis}</p>}
                                  <p className="whitespace-pre-wrap mt-0.5">{item.notes}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Radiology scans ordered */}
                          {group.radiology.length > 0 && (
                            <div className="bg-white rounded-lg border border-slate-200/60 p-3 space-y-1.5 text-xs shadow-xs">
                              <div className="flex items-center gap-1.5 text-purple-700 font-bold border-b border-slate-100 pb-1 mb-1">
                                <Scan className="h-3.5 w-3.5" /> Radiology Studies Ordered
                              </div>
                              {group.radiology.map((item, i) => (
                                <div key={i} className="text-slate-650 text-[11px] leading-relaxed">
                                  {item.diagnosis && <p className="font-semibold text-slate-700">Study Request: {item.diagnosis}</p>}
                                  <p className="whitespace-pre-wrap mt-0.5">{item.notes}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Inpatient rounds notes */}
                          {group.inpatientNotes.length > 0 && (
                            <div className="bg-white rounded-lg border border-slate-200/60 p-3 space-y-1.5 text-xs shadow-xs">
                              <div className="flex items-center gap-1.5 text-amber-700 font-bold border-b border-slate-100 pb-1 mb-1">
                                <Heart className="h-3.5 w-3.5" /> Inpatient Rounds Notes
                              </div>
                              {group.inpatientNotes.map((item, i) => (
                                <div key={i} className="text-slate-650">
                                  {item.diagnosis && <p className="font-semibold text-slate-700">Diagnosis/Status: {item.diagnosis}</p>}
                                  <p className="whitespace-pre-wrap mt-0.5">{item.notes}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Certificates issued */}
                          {group.certificates.length > 0 && (
                            <div className="bg-white rounded-lg border border-slate-200/60 p-3 space-y-1.5 text-xs shadow-xs">
                              <div className="flex items-center gap-1.5 text-rose-700 font-bold border-b border-slate-100 pb-1 mb-1">
                                <FileCheck className="h-3.5 w-3.5" /> Medical Certificates Issued
                              </div>
                              {group.certificates.map((item, i) => (
                                <div key={i} className="text-slate-650">
                                  {item.diagnosis && <p className="font-semibold text-slate-700">Purpose/Diagnosis: {item.diagnosis}</p>}
                                  <p className="whitespace-pre-wrap mt-0.5">{item.notes}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Fallback if a group somehow has no specific visit types mapped */}
                          {!group.consultation &&
                            group.prescriptions.length === 0 &&
                            group.labs.length === 0 &&
                            group.radiology.length === 0 &&
                            group.inpatientNotes.length === 0 &&
                            group.certificates.length === 0 &&
                            group.others.length > 0 && (
                              <div className="space-y-2">
                                {group.others.map((item: any, i: number) => (
                                  <div key={i} className="border border-slate-150 rounded-lg p-2.5 bg-white space-y-1 text-xs">
                                    <p className="font-semibold text-slate-800">{item.visitType || "Medical Entry"}</p>
                                    {item.diagnosis && <p className="text-slate-600"><span className="font-semibold">Diagnosis:</span> {item.diagnosis}</p>}
                                    {item.notes && <p className="text-slate-500 italic">{item.notes}</p>}
                                  </div>
                                ))}
                              </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })()}

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

                  <div className="space-y-4">
                    {prescriptionMeds.map((med, index) => (
                      <div key={med.key || index} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 relative">
                        {/* Trash/Remove button at top right */}
                        {prescriptionMeds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMed(index)}
                            className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition"
                            title="Remove Medicine"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        {/* Row 1: Main Fields */}
                        <div className="flex flex-wrap gap-3 items-start pr-8">
                          <div className="flex-1 min-w-[200px]">
                            <InputField
                              label="Medicine Name"
                              value={med.name}
                              onChange={(e) => handleMedChange(index, "name", e.target.value)}
                              placeholder="e.g. Amoxicillin"
                              required
                              list={`med-datalist-${index}`}
                            />
                            <datalist id={`med-datalist-${index}`}>
                              {med.name.trim().length > 0 &&
                                rawMeds
                                  .filter((m: any) =>
                                    m.name.toLowerCase().includes(med.name.toLowerCase())
                                  )
                                  .map((m: any) => (
                                    <option key={m._id} value={m.name} />
                                  ))}
                            </datalist>
                          </div>
                          <div className="w-28 shrink-0">
                            <InputField
                              label="Strength"
                              value={med.strength || ""}
                              onChange={(e) => handleMedChange(index, "strength", e.target.value)}
                              placeholder="e.g. 500mg"
                            />
                          </div>
                          <div className="w-24 shrink-0">
                            <InputField
                              label="Dosage"
                              value={med.dosage}
                              onChange={(e) => handleMedChange(index, "dosage", e.target.value)}
                              placeholder="e.g. 1"
                            />
                          </div>
                          <div className="w-24 shrink-0">
                            <InputField
                              label="Frequency"
                              value={med.frequency}
                              onChange={(e) => handleMedChange(index, "frequency", e.target.value)}
                              placeholder="e.g. 3"
                            />
                          </div>
                          <div className="w-24 shrink-0">
                            <InputField
                              label="Duration"
                              value={med.duration}
                              onChange={(e) => handleMedChange(index, "duration", e.target.value)}
                              placeholder="e.g. 5"
                            />
                          </div>
                          <div className="w-24 shrink-0">
                            <InputField
                              label="Total Qty"
                              value={((parseFloat(med.dosage) || 0) * (parseFloat(med.frequency) || 0) * (parseFloat(med.duration) || 0)) || ""}
                              disabled
                              placeholder="Auto"
                            />
                          </div>
                        </div>

                        {/* Row 2: Instructions */}
                        <div className="border-t border-slate-200/60 pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Instructions (Time of Use):
                          </span>
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={!!med.morning}
                                onChange={() => handleCheckboxToggle(index, "morning")}
                                className="rounded text-navy-600 focus:ring-navy-500 h-4 w-4"
                              />
                              <span>Morning</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={!!med.afternoon}
                                onChange={() => handleCheckboxToggle(index, "afternoon")}
                                className="rounded text-navy-600 focus:ring-navy-500 h-4 w-4"
                              />
                              <span>Afternoon</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={!!med.night}
                                onChange={() => handleCheckboxToggle(index, "night")}
                                className="rounded text-navy-600 focus:ring-navy-500 h-4 w-4"
                              />
                              <span>Night</span>
                            </label>
                          </div>
                        </div>
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
                  <div className="text-center border-b pb-4 flex flex-col items-center gap-2 justify-center">
                    {hospitalData?.logoUrl && (
                      <img src={hospitalData.logoUrl} alt={hospitalData.name} className="h-14 object-contain" />
                    )}
                    <h1 className="text-2xl font-bold uppercase tracking-wide">{hospitalData?.name || "Hospital Medical Center"}</h1>
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
                          <th className="py-2">Total Qty</th>
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
                            <td className="py-2">{(parseFloat(med.dosage) || 0) * (parseFloat(med.frequency) || 0) * (parseFloat(med.duration) || 0) || "—"}</td>
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
                    {labTests.map((test: string) => (
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
                  {labOrders.length === 0 && (!workspaceData.draftSession?.labOrders || workspaceData.draftSession.labOrders.length === 0) ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No lab requests submitted for this patient session.</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Render Draft Labs Order */}
                      {workspaceData.draftSession?.labOrders && workspaceData.draftSession.labOrders.length > 0 && (
                        <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-3 flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {workspaceData.draftSession.labOrders.map((t, i) => (
                                <span key={i} className="px-2 py-0.5 bg-amber-100/70 rounded text-amber-800 font-medium">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">Status: Added to Draft</span>
                          </div>
                          <Badge tone="warning">DRAFT</Badge>
                        </div>
                      )}

                      {/* Render Finalized Lab Orders */}
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
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-bold text-slate-800">Order Imaging Studies</h3>
                    {selectedRadiologyStudies.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">
                          {selectedRadiologyStudies.length} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRadiologyStudies([])}
                          className="text-[10px] text-red-500 hover:underline"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Multi-select checkboxes — mirroring the Labs tab */}
                  <div className="space-y-2">
                    {radiologyTests.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No radiology studies configured.</p>
                    ) : (
                      radiologyTests.map((study: string) => (
                        <label key={study} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedRadiologyStudies.includes(study)}
                            onChange={() => toggleRadiologyStudy(study)}
                            className="rounded border-slate-350 text-navy-700 focus:ring-navy-500"
                          />
                          {study}
                        </label>
                      ))
                    )}
                  </div>

                  <SelectField label="Priority" value={radioPriority} onChange={(e) => setRadioPriority(e.target.value)}>
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="STAT">STAT / Emergency</option>
                  </SelectField>

                  <TextareaField label="Clinical Notes / Indications" value={radioNotes} onChange={(e) => setRadioNotes(e.target.value)} placeholder="e.g. Suspected fracture right forearm" rows={2} />

                  <Button type="submit" variant="primary" disabled={radiologyMutation.isPending || selectedRadiologyStudies.length === 0}>
                    Submit Request
                  </Button>
                </Card>
              </form>

              <div className="md:col-span-2">
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Requested Imaging Studies</h3>
                  {radiologyOrders.length === 0 && (!workspaceData.draftSession?.radiologyOrders || workspaceData.draftSession.radiologyOrders.length === 0) ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No radiology orders requested during this session.</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Render Draft Radiology Orders */}
                      {workspaceData.draftSession?.radiologyOrders && workspaceData.draftSession.radiologyOrders.length > 0 && (
                        workspaceData.draftSession.radiologyOrders.map((o, idx) => (
                          <div key={`draft-rad-${idx}`} className="border border-amber-250 bg-amber-50/30 rounded-xl p-3 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-semibold text-slate-800 text-sm">{o.type}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Indications: {o.notes || "—"}</span>
                            </div>
                            <Badge tone="warning">DRAFT</Badge>
                          </div>
                        ))
                      )}

                      {/* Render Finalized Radiology Orders */}
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Form on Left (spans 2 columns on xl screens) */}
              <form onSubmit={handleRecommendAdmission} className="xl:col-span-2">
                <Card className="p-6 space-y-6">
                  {/* Title & Accent */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Recommend IP Admission</h3>
                        <p className="text-xs text-slate-500">Initiate inpatient ward transfer and bed allocation request</p>
                      </div>
                    </div>
                  </div>

                  {/* Modern Patient Info Card */}
                  <div className="bg-gradient-to-r from-navy-50/50 to-blue-50/20 rounded-xl p-4 border border-navy-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-700 font-bold text-white text-sm shadow-sm">
                        {((appointment.patient as any)?.name || "P").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{(appointment.patient as any)?.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">UHID: <span className="font-mono font-semibold text-slate-700">{(appointment.patient as any)?.uhid}</span></p>
                      </div>
                    </div>
                    
                    <div className="hidden md:block h-8 w-px bg-slate-200"></div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-slate-650 flex-1 md:justify-end md:flex md:flex-row md:gap-x-8">
                      <div>
                        <span className="block text-[9px] text-slate-400 font-medium uppercase tracking-wider">Age / Gender</span>
                        <span className="font-semibold text-slate-700">{(appointment.patient as any)?.age} yrs / {(appointment.patient as any)?.gender}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-medium uppercase tracking-wider">OP Code</span>
                        <span className="font-semibold text-slate-750 font-mono">{appointment.referenceId}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-medium uppercase tracking-wider">Token Number</span>
                        <span className="font-semibold text-slate-750 font-mono">{queueItem?.tokenNumber || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <InputField
                        label="Primary Diagnosis (Mandatory)"
                        value={admitDiagnosis}
                        onChange={(e) => setAdmitDiagnosis(e.target.value)}
                        placeholder="Enter diagnostic confirmation..."
                        required
                      />
                    </div>

                    <div>
                      <SelectField
                        label="Admission Priority"
                        value={admitPriority}
                        onChange={(e) => setAdmitPriority(e.target.value)}
                      >
                        <option value="Routine">Routine</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Emergency">Emergency</option>
                      </SelectField>
                    </div>

                    <div>
                      <InputField
                        label="Expected Stay Duration"
                        value={admitExpectedStay}
                        onChange={(e) => setAdmitExpectedStay(e.target.value)}
                        placeholder="e.g. 3 Days, 1 Week"
                      />
                    </div>

                    <div>
                      <SelectField
                        label="Preferred Ward"
                        value={admitWard}
                        onChange={(e) => setAdmitWard(e.target.value)}
                      >
                        <option value="General">General</option>
                        <option value="Semi Private">Semi Private</option>
                        <option value="Private">Private</option>
                        <option value="ICU">ICU</option>
                      </SelectField>
                    </div>

                    <div>
                      <SelectField
                        label="Preferred Bed Type"
                        value={admitBedType}
                        onChange={(e) => setAdmitBedType(e.target.value)}
                      >
                        <option value="General">General</option>
                        <option value="Semi-Private">Semi-Private</option>
                        <option value="Private">Private</option>
                        <option value="ICU">ICU</option>
                      </SelectField>
                    </div>

                    <div className="md:col-span-2">
                      <InputField
                        label="Admission Reason"
                        value={admitReason}
                        onChange={(e) => setAdmitReason(e.target.value)}
                        placeholder="Clinical reason for ward admission"
                      />
                    </div>

                    <div>
                      <TextareaField
                        label="Clinical Notes / Diagnosis Remarks"
                        value={admitNotes}
                        onChange={(e) => setAdmitNotes(e.target.value)}
                        placeholder="Describe clinical symptoms and observations..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <TextareaField
                        label="Special Instructions"
                        value={admitSpecialInstructions}
                        onChange={(e) => setAdmitSpecialInstructions(e.target.value)}
                        placeholder="Nursing guidance, diet directives..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    <Button type="submit" variant="primary" className="px-6 py-2.5 shadow-md font-semibold" disabled={admitMutation.isPending}>
                      {admitMutation.isPending ? "Submitting..." : "Send Admission Request"}
                    </Button>
                  </div>
                </Card>
              </form>

              {/* Status Trackers on Right */}
              <div className="xl:col-span-1 space-y-6">
                {/* Admission Request Tracker */}
                <Card className="p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Admission Request Tracker</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Track request status from department desks</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[9px] font-semibold text-indigo-700 border border-indigo-150 shrink-0 w-fit">
                      Current IP workflow
                    </span>
                  </div>
                  
                  {admissionRequests.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-dashed rounded-xl text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                      <FolderOpen className="h-7 w-7 text-slate-350" />
                      <div>
                        <p className="font-semibold text-slate-500">No Admission Requests</p>
                        <p className="text-[10px] mt-0.5">Submit the form on the left to start a request.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {admissionRequests.map((req: any) => (
                        <div key={req._id} className="border border-slate-100 hover:border-slate-200 rounded-xl p-3.5 space-y-3 text-xs bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-indigo-700 font-mono tracking-wider">Req: {req.requestNumber}</span>
                            <Badge tone={
                              req.status === "Admitted" ? "success" :
                              req.status === "Approved" ? "success" :
                              req.status === "Rejected" ? "danger" :
                              "warning"
                            }>
                              {req.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-slate-600 border-t border-slate-100 pt-2.5">
                            <div>
                              <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Priority</span>
                              <span className={`font-semibold ${req.priority === "Emergency" ? "text-red-600" : req.priority === "Urgent" ? "text-amber-600" : "text-slate-700"}`}>
                                {req.priority}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Preferred Ward</span>
                              <span className="font-semibold text-slate-750">{req.preferredWard || "General"}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Stay Estimate</span>
                              <span className="font-semibold text-slate-750">{req.expectedStay || "N/A"}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Diagnosis</span>
                              <span className="font-semibold text-slate-750 truncate max-w-28 block">{req.primaryDiagnosis}</span>
                            </div>
                          </div>

                          {req.clinicalNotes && (
                            <div className="bg-white rounded-lg p-2.5 border border-slate-100 text-slate-600 text-[11px] italic leading-relaxed">
                              <span className="font-semibold not-italic block text-[9px] text-slate-400 uppercase tracking-wider mb-1">Clinical Remarks</span>
                              {req.clinicalNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Admission Registry */}
                <Card className="p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Inpatient Registry Record</h3>
                    <p className="text-xs text-slate-500 mt-1">Confirmed bed allocations and ward assignments</p>
                  </div>
                  {admissions.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-dashed rounded-xl text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <CheckCircle className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Outpatient Treatment (OP)</p>
                        <p className="text-[10px] mt-0.5 font-medium">Patient has no active inpatient registry record.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {admissions.map((adm) => (
                        <div key={adm._id} className="border border-indigo-100 rounded-xl p-3.5 space-y-3 text-xs bg-indigo-50/10 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-navy-700 tracking-wider font-mono">IP No: {adm.admissionNumber}</span>
                            <Badge tone={adm.status === "admitted" ? "warning" : "success"}>
                              {adm.status.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-slate-600 border-t border-slate-100 pt-2.5">
                            <div>
                              <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Allocated Ward</span>
                              <span className="font-semibold text-slate-850">{adm.ward}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Room / Bed</span>
                              <span className="font-semibold text-slate-850">Room {adm.room?.roomNumber || "N/A"} / Bed {adm.bed?.bedNumber || "N/A"}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Admission Date</span>
                              <span className="font-semibold text-slate-850">
                                {new Date(adm.admissionDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
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

      {successInfo && (
        <Modal
          title={successInfo.isCompleted ? "Consultation Completed Successfully" : "Prescription Generated"}
          isOpen={successInfo.show}
          onClose={() => {
            setSuccessInfo(null);
            if (successInfo.isCompleted) {
              navigate("/doctor");
            }
          }}
        >
          <div className="p-4 space-y-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                {successInfo.isCompleted ? "Workflow Completed!" : "Prescription Saved!"}
              </h3>
              <p className="text-sm text-slate-500">
                The digital workflow has processed all delivery pipelines successfully.
              </p>
            </div>

            {/* Checklist */}
            <div className="mx-auto max-w-xs text-left bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
              {successInfo.isCompleted && (
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className="text-green-600 font-bold">✓</span> Consultation Completed
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="text-green-600 font-bold">✓</span> Prescription Generated
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="text-green-600 font-bold">✓</span> Pharmacy Notified
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="text-green-600 font-bold">✓</span> Patient Notified
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
              <Button
                variant="primary"
                onClick={() => window.open(successInfo.pdfUrl || successInfo.downloadUrl, "_blank")}
                className="flex items-center gap-1 text-xs"
              >
                View Prescription
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.open(successInfo.downloadUrl, "_self")}
                className="flex items-center gap-1 text-xs"
              >
                Download PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const printWin = window.open(successInfo.pdfUrl || successInfo.downloadUrl, "_blank");
                  if (printWin) {
                    printWin.focus();
                    setTimeout(() => {
                      printWin.print();
                    }, 500);
                  }
                }}
                className="flex items-center gap-1 text-xs"
              >
                Print
              </Button>
            </div>
            
            <div className="border-t border-slate-100 pt-4">
              <Button
                variant={successInfo.isCompleted ? "primary" : "secondary"}
                onClick={() => {
                  setSuccessInfo(null);
                  if (successInfo.isCompleted) {
                    navigate("/doctor");
                  }
                }}
                className="w-full text-xs"
              >
                {successInfo.isCompleted ? "Back to Doctor Dashboard" : "Close"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
