import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  Users,
  Activity,
  BedDouble,
  ClipboardList,
  Heart,
  TrendingUp,
  AlertCircle,
  Plus,
  PlusCircle,
  Bell,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  User,
  Thermometer,
  ShieldAlert,
  Save,
  Grid,
  Pill,
  Menu,
  X,
  FileText,
  Calendar,
  AlertTriangle,
  Loader2,
  Stethoscope,
  HeartPulse,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Info,
  CalendarDays,
  FileEdit,
  Volume2,
  VolumeX,
  LogOut,
  ArrowUpDown,
  SlidersHorizontal,
  Trash2,
  Filter,
  ArrowLeft,
  ChevronLeft,
  Eye,
  Lock
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { useAuth } from "../../context/AuthContext";
import { useStaffProfileMe } from "../../features/staff";
import {
  useNurseInpatients,
  useNurseInpatient,
  useSaveNurseVitals,
  useAddNurseNotes,
  useAdministerNurseMed,
  useSaveNurseNote,
  useUpdateNurseNote,
  useDeleteNurseNote,
  useSaveNurseBedsideChecks,
  useSaveNurseDischargePrep,
  useNurseBeds,
  useNurseWards,
  useNurseRooms
} from "../../features/nurse";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ShiftManagementWidget } from "../../components/nurse/ShiftManagementWidget";
import { ShiftHandoverModal } from "../../components/nurse/ShiftHandoverModal";
import { ShiftHistoryView } from "../../components/nurse/ShiftHistoryView";
import { PendingHandoverAcceptModal } from "../../components/nurse/PendingHandoverAcceptModal";

interface NurseDashboardProps {
  activeTab?: string;
}

export function NurseDashboard({ activeTab }: NurseDashboardProps) {
  const { user, logout } = useAuth();
  const { data: staff } = useStaffProfileMe();
  const navigate = useNavigate();

  // Queries (connecting directly to database)
  const { data: inpatients, isLoading: isInpatientsLoading } = useNurseInpatients();
  const { data: beds, isLoading: isBedsLoading } = useNurseBeds();
  const { data: wards, isLoading: isWardsLoading } = useNurseWards();
  const { data: rooms, isLoading: isRoomsLoading } = useNurseRooms();

  const currentInpatients = inpatients || [];

  // Active drawer overlay controller
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);

  // Shift Management Modals & Views States
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [pendingHandoverToAccept, setPendingHandoverToAccept] = useState<any>(null);

  // Real-time dynamic ticking date and time clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Profile menu dropdown toggle
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Search input query
  const [searchPatientQuery, setSearchPatientQuery] = useState("");

  // Target Patient Selection states for the forms
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  // State for active Patient Details view
  const [viewingPatientDetailsId, setViewingPatientDetailsId] = useState<string | null>(null);

  // Single Inpatient Detail query
  const { data: detailInpatient, isLoading: isDetailInpatientLoading } = useNurseInpatient(viewingPatientDetailsId || undefined);

  // Assigned Patients Module Filter/Sorting/Pagination states
  const [filterWard, setFilterWard] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterBed, setFilterBed] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Form states for Vitals Drawer
  const [vitalsTemp, setVitalsTemp] = useState("");
  const [vitalsBp, setVitalsBp] = useState("");
  const [vitalsPulse, setVitalsPulse] = useState("");
  const [vitalsResp, setVitalsResp] = useState("");
  const [vitalsO2, setVitalsO2] = useState("");
  const [vitalsWeight, setVitalsWeight] = useState("");
  const [vitalsHeight, setVitalsHeight] = useState("");
  const [vitalsBloodSugar, setVitalsBloodSugar] = useState("");
  const [vitalsObservationNotes, setVitalsObservationNotes] = useState("");
  const [vitalsPain, setVitalsPain] = useState("0");
  const [editingVitalId, setEditingVitalId] = useState<string | null>(null);
  const [vitalsSubmitting, setVitalsSubmitting] = useState(false);

  // Auto-calculated BMI state
  const [vitalsBmi, setVitalsBmi] = useState("");

  useEffect(() => {
    const w = parseFloat(vitalsWeight);
    const h = parseFloat(vitalsHeight);
    if (w > 0 && h > 0) {
      const heightInMeters = h / 100;
      const bmi = w / (heightInMeters * heightInMeters);
      setVitalsBmi(bmi.toFixed(1));
    } else {
      setVitalsBmi("");
    }
  }, [vitalsWeight, vitalsHeight]);

  // Form states for Notes / Care Logs Drawer
  const [notesCategory, setNotesCategory] = useState("Progress Note");
  const [notesText, setNotesText] = useState("");
  const [notesSubmitting, setNotesSubmitting] = useState(false);

  // Form states for Medication Administration Drawer
  const [selectedMedOrderId, setSelectedMedOrderId] = useState<string | null>(null);
  const [medAction, setMedAction] = useState<"Administered" | "Skipped" | "Rescheduled" | null>(null);
  const [medScheduledTime, setMedScheduledTime] = useState("");
  const [medRemarks, setMedRemarks] = useState("");
  const [medAdminTime, setMedAdminTime] = useState("");
  const [medSubmitting, setMedSubmitting] = useState(false);

  // Form states for Daily Nursing Notes Drawer
  const [noteObservationType, setNoteObservationType] = useState("Routine");
  const [notePainAssessment, setNotePainAssessment] = useState("0");
  const [noteMobility, setNoteMobility] = useState("");
  const [noteMentalStatus, setNoteMentalStatus] = useState("");
  const [noteSkinCondition, setNoteSkinCondition] = useState("");
  const [noteFluidIntake, setNoteFluidIntake] = useState("");
  const [noteOutput, setNoteOutput] = useState("");
  const [noteDiet, setNoteDiet] = useState("");
  const [noteWoundCare, setNoteWoundCare] = useState("");
  const [noteTreatmentProgress, setNoteTreatmentProgress] = useState("");
  const [noteAdditionalNotes, setNoteAdditionalNotes] = useState("");
  const [editingNurseNoteId, setEditingNurseNoteId] = useState<string | null>(null);
  const [nurseNoteSearchQuery, setNurseNoteSearchQuery] = useState("");
  const [nurseNoteFilterType, setNurseNoteFilterType] = useState("All");
  const [nurseNoteSubmitting, setNurseNoteSubmitting] = useState(false);

  // Code Blue alert states
  const [showCodeBlueInput, setShowCodeBlueInput] = useState(false);
  const [codeBlueRoom, setCodeBlueRoom] = useState("");

  // Bedside Care Plan Checklist states
  const [bedsideBedPosition, setBedsideBedPosition] = useState(false);
  const [bedsidePatientHygiene, setBedsidePatientHygiene] = useState(false);
  const [bedsideOralCare, setBedsideOralCare] = useState(false);
  const [bedsideBathGiven, setBedsideBathGiven] = useState(false);
  const [bedsideDressingChanged, setBedsideDressingChanged] = useState(false);
  const [bedsideIvLineChecked, setBedsideIvLineChecked] = useState(false);
  const [bedsideCatheterCare, setBedsideCatheterCare] = useState(false);
  const [bedsidePressureUlcerPrev, setBedsidePressureUlcerPrev] = useState(false);
  const [bedsideFallPrevention, setBedsideFallPrevention] = useState(false);
  const [bedsideMobilityAssist, setBedsideMobilityAssist] = useState(false);
  const [bedsideOxygenSupport, setBedsideOxygenSupport] = useState(false);
  const [bedsideNutrition, setBedsideNutrition] = useState(false);
  const [bedsideFluidIntake, setBedsideFluidIntake] = useState(false);
  const [bedsideOutputMonitoring, setBedsideOutputMonitoring] = useState(false);
  const [bedsideRemarks, setBedsideRemarks] = useState("");
  const [bedsideCompletionStatus, setBedsideCompletionStatus] = useState("Completed");
  const [bedsideSubmitting, setBedsideSubmitting] = useState(false);

  // Discharge Preparation Checklist states
  const [prepDoctorApproval, setPrepDoctorApproval] = useState(false);
  const [prepFinalVitals, setPrepFinalVitals] = useState(false);
  const [prepMedicationCompleted, setPrepMedicationCompleted] = useState(false);
  const [prepEducationCompleted, setPrepEducationCompleted] = useState(false);
  const [prepPendingNursingTasks, setPrepPendingNursingTasks] = useState(false);
  const [prepEquipmentReturned, setPrepEquipmentReturned] = useState(false);
  const [prepDocsReady, setPrepDocsReady] = useState(false);
  const [prepWheelchairRequired, setPrepWheelchairRequired] = useState(false);
  const [prepTransportRequired, setPrepTransportRequired] = useState(false);
  const [prepRemarks, setPrepRemarks] = useState("");
  const [prepStatus, setPrepStatus] = useState("Pending");
  const [prepSubmitting, setPrepSubmitting] = useState(false);

  // Shift Handover Checklist states
  const [handoverChecks, setHandoverChecks] = useState([
    { id: "hc-1", label: "Completed all medication records for shift", done: true },
    { id: "hc-2", label: "Recorded and updated all patient vitals in EMR", done: true },
    { id: "hc-3", label: "Administered and signed narcotics inventory audit", done: false },
    { id: "hc-4", label: "Cleaned and prepared bedside nursing carts", done: true },
    { id: "hc-5", label: "Walked and introduced night nurse to critical beds", done: false }
  ]);
  const [handoverSummary, setHandoverSummary] = useState("");
  const [handoverNurseSign, setHandoverNurseSign] = useState("");

  // Discharge Prep Checklist states
  const [dischargeChecks, setDischargeChecks] = useState([
    { id: "dc-1", label: "Physician discharge signed order verified", done: false },
    { id: "dc-2", label: "Discharge summary paperwork compiled in EMR", done: false },
    { id: "dc-3", label: "Take-home prescriptions filled and validated", done: false },
    { id: "dc-4", label: "Patient/Family take-home instruction briefing done", done: false },
    { id: "dc-5", label: "IV cannula and catheters removed", done: false },
    { id: "dc-6", label: "Billing clearance code received", done: false },
    { id: "dc-7", label: "Wheelchair transit booked to entrance", done: false }
  ]);

  // Mutations
  const saveVitalsMutation = useSaveNurseVitals(selectedPatientId);
  const addNotesMutation = useAddNurseNotes(selectedPatientId);
  const administerMedMutation = useAdministerNurseMed(selectedPatientId);
  const saveNurseNoteMutation = useSaveNurseNote(selectedPatientId);
  const updateNurseNoteMutation = useUpdateNurseNote(selectedPatientId);
  const deleteNurseNoteMutation = useDeleteNurseNote(selectedPatientId);
  const saveBedsideChecksMutation = useSaveNurseBedsideChecks(selectedPatientId);

  // Update digital clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pre-select first inpatient as default target for forms
  useEffect(() => {
    if (inpatients && inpatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(inpatients[0].patient?._id || inpatients[0]._id);
    }
  }, [inpatients, selectedPatientId]);

  // Reset form helper
  const resetVitalsForm = () => {
    setVitalsTemp("");
    setVitalsBp("");
    setVitalsPulse("");
    setVitalsResp("");
    setVitalsO2("");
    setVitalsWeight("");
    setVitalsHeight("");
    setVitalsBloodSugar("");
    setVitalsObservationNotes("");
    setVitalsPain("0");
    setEditingVitalId(null);
  };

  // Submit vitals check to database (supports Save & Update)
  const handleSubmitVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Please select a patient from the roster");
      return;
    }
    setVitalsSubmitting(true);

    try {
      await saveVitalsMutation.mutateAsync({
        vitalId: editingVitalId || undefined,
        temperature: vitalsTemp,
        bloodPressure: vitalsBp,
        pulseRate: vitalsPulse,
        respiratoryRate: vitalsResp,
        oxygenSaturation: vitalsO2,
        weight: vitalsWeight,
        height: vitalsHeight,
        bmi: vitalsBmi,
        painScore: vitalsPain,
        bloodSugar: vitalsBloodSugar,
        observationNotes: vitalsObservationNotes
      });
      toast.success(editingVitalId ? "Vitals successfully updated in database!" : "Vitals successfully saved to database!");
      resetVitalsForm();
      setActiveDrawer(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit vitals.");
    } finally {
      setVitalsSubmitting(false);
    }
  };

  // Submit progress note / care log to database
  const handleSubmitNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !notesText.trim()) {
      toast.error("Please fill note text and select a patient");
      return;
    }
    setNotesSubmitting(true);

    try {
      await addNotesMutation.mutateAsync({
        notes: `[${notesCategory}] ${notesText}`
      });
      toast.success("Nursing progress note added to patient timeline!");
      setNotesText("");
      setActiveDrawer(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save note.");
    } finally {
      setNotesSubmitting(false);
    }
  };

  // Reset Nursing Note Form Helper
  const resetNurseNoteForm = () => {
    setNoteObservationType("Routine");
    setNotePainAssessment("0");
    setNoteMobility("");
    setNoteMentalStatus("");
    setNoteSkinCondition("");
    setNoteFluidIntake("");
    setNoteOutput("");
    setNoteDiet("");
    setNoteWoundCare("");
    setNoteTreatmentProgress("");
    setNoteAdditionalNotes("");
    setEditingNurseNoteId(null);
  };

  // Submit Nursing Note (Save / Update)
  const handleSubmitNurseNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Please select a patient chart");
      return;
    }
    setNurseNoteSubmitting(true);

    const payload = {
      observationType: noteObservationType,
      painAssessment: notePainAssessment,
      mobility: noteMobility,
      mentalStatus: noteMentalStatus,
      skinCondition: noteSkinCondition,
      fluidIntake: noteFluidIntake,
      output: noteOutput,
      diet: noteDiet,
      woundCare: noteWoundCare,
      treatmentProgress: noteTreatmentProgress,
      additionalNotes: noteAdditionalNotes
    };

    try {
      if (editingNurseNoteId) {
        await updateNurseNoteMutation.mutateAsync({
          noteId: editingNurseNoteId,
          payload
        });
        toast.success("Nursing progress note successfully updated!");
      } else {
        await saveNurseNoteMutation.mutateAsync(payload);
        toast.success("Daily nursing note successfully logged!");
      }
      resetNurseNoteForm();
      setActiveDrawer(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save nursing note.");
    } finally {
      setNurseNoteSubmitting(false);
    }
  };

  // Populate form for Editing
  const handleEditNurseNoteClick = (note: any) => {
    setEditingNurseNoteId(note._id || note.id);
    setNoteObservationType(note.observationType || "Routine");
    setNotePainAssessment(note.painAssessment || "0");
    setNoteMobility(note.mobility || "");
    setNoteMentalStatus(note.mentalStatus || "");
    setNoteSkinCondition(note.skinCondition || "");
    setNoteFluidIntake(note.fluidIntake || "");
    setNoteOutput(note.output || "");
    setNoteDiet(note.diet || "");
    setNoteWoundCare(note.woundCare || "");
    setNoteTreatmentProgress(note.treatmentProgress || "");
    setNoteAdditionalNotes(note.additionalNotes || "");
    toast("Nursing note values loaded for editing.", { icon: "📝" });
  };

  const [deleteTargetNurseNoteId, setDeleteTargetNurseNoteId] = useState<string | null>(null);

  // Delete Nursing Note
  const handleDeleteNurseNoteClick = (noteId: string) => {
    setDeleteTargetNurseNoteId(noteId);
  };

  const confirmDeleteNurseNote = async () => {
    if (!deleteTargetNurseNoteId) return;
    try {
      await deleteNurseNoteMutation.mutateAsync(deleteTargetNurseNoteId);
      toast.success("Nursing note successfully deleted.");
      if (editingNurseNoteId === deleteTargetNurseNoteId) {
        resetNurseNoteForm();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete nursing note.");
    } finally {
      setDeleteTargetNurseNoteId(null);
    }
  };

  // Helper check for abnormal vitals limits
  const isVitalAbnormal = (field: string, val: string) => {
    if (!val) return false;
    const num = parseFloat(val);
    if (isNaN(num)) return false;

    switch (field) {
      case "temp":
        return num < 95 || num > 100.4;
      case "pulse":
        return num < 60 || num > 100;
      case "resp":
        return num < 12 || num > 20;
      case "spo2":
        return num < 95;
      case "bp":
        const parts = val.split("/");
        if (parts.length === 2) {
          const sys = parseFloat(parts[0]);
          const dia = parseFloat(parts[1]);
          if (!isNaN(sys) && !isNaN(dia)) {
            return sys > 140 || sys < 90 || dia > 90 || dia < 60;
          }
        }
        return false;
      case "sugar":
        return num < 70 || num > 140;
      default:
        return false;
    }
  };

  // Click edit vital log action
  const handleEditVitalClick = (v: any) => {
    setEditingVitalId(v._id || v.id);
    setVitalsTemp(v.temperature || "");
    setVitalsBp(v.bloodPressure || "");
    setVitalsPulse(v.pulseRate || "");
    setVitalsResp(v.respiratoryRate || "");
    setVitalsO2(v.oxygenSaturation || "");
    setVitalsWeight(v.weight || "");
    setVitalsHeight(v.height || "");
    setVitalsBloodSugar(v.bloodSugar || "");
    setVitalsObservationNotes(v.observationNotes || "");
    setVitalsPain(v.painScore || "0");
    toast("Vital record populated. Update fields above.", { icon: "📝" });
  };

  // Submit Medication Action (Administer, Skip, Reschedule)
  const handleMedicationActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedMedOrderId || !medAction) {
      toast.error("Please select a patient, medicine, and action.");
      return;
    }

    if ((medAction === "Skipped" || medAction === "Rescheduled") && !medRemarks.trim()) {
      toast.error(`Please provide remarks detailing why this medicine is being ${medAction.toLowerCase()}.`);
      return;
    }

    if (medAction === "Rescheduled" && !medScheduledTime.trim()) {
      toast.error("Please enter a new scheduled time.");
      return;
    }

    setMedSubmitting(true);
    try {
      await administerMedMutation.mutateAsync({
        medOrderId: selectedMedOrderId,
        action: medAction,
        scheduledTime: medAction === "Rescheduled" ? medScheduledTime : undefined,
        administrationTime: medAction === "Administered" ? (medAdminTime || undefined) : undefined,
        remarks: medRemarks
      });
      toast.success(`Medication dose successfully logged as: ${medAction}`);

      // Reset form states
      setSelectedMedOrderId(null);
      setMedAction(null);
      setMedRemarks("");
      setMedScheduledTime("");
      setMedAdminTime("");
    } catch (err: any) {
      toast.error(err.message || "Failed to log medication action.");
    } finally {
      setMedSubmitting(false);
    }
  };

  // Reset bedside form helper
  const resetBedsideForm = () => {
    setBedsideBedPosition(false);
    setBedsidePatientHygiene(false);
    setBedsideOralCare(false);
    setBedsideBathGiven(false);
    setBedsideDressingChanged(false);
    setBedsideIvLineChecked(false);
    setBedsideCatheterCare(false);
    setBedsidePressureUlcerPrev(false);
    setBedsideFallPrevention(false);
    setBedsideMobilityAssist(false);
    setBedsideOxygenSupport(false);
    setBedsideNutrition(false);
    setBedsideFluidIntake(false);
    setBedsideOutputMonitoring(false);
    setBedsideRemarks("");
    setBedsideCompletionStatus("Completed");
  };

  // Submit bedside checks to database timeline
  const handleSaveBedsideChecks = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Please select a patient chart");
      return;
    }
    setBedsideSubmitting(true);
    const loadingToastId = toast.loading("Saving bedside checklist...");

    try {
      await saveBedsideChecksMutation.mutateAsync({
        bedPosition: bedsideBedPosition,
        patientHygiene: bedsidePatientHygiene,
        oralCare: bedsideOralCare,
        bathGiven: bedsideBathGiven,
        dressingChanged: bedsideDressingChanged,
        ivLineChecked: bedsideIvLineChecked,
        catheterCare: bedsideCatheterCare,
        pressureUlcerPrevention: bedsidePressureUlcerPrev,
        fallPrevention: bedsideFallPrevention,
        mobilityAssistance: bedsideMobilityAssist,
        oxygenSupport: bedsideOxygenSupport,
        nutrition: bedsideNutrition,
        fluidIntake: bedsideFluidIntake,
        outputMonitoring: bedsideOutputMonitoring,
        remarks: bedsideRemarks,
        completionStatus: bedsideCompletionStatus
      });
      toast.success("Bedside care checks successfully recorded!", { id: loadingToastId });
      resetBedsideForm();
      setActiveDrawer(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to log bedside checklist.", { id: loadingToastId });
    } finally {
      setBedsideSubmitting(false);
    }
  };

  // Submit Shift Handover and save to database EMR
  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Please select a patient to log the handover briefing details");
      return;
    }
    if (!handoverNurseSign) {
      toast.error("Handover sign-off requires signature");
      return;
    }

    const loadingToastId = toast.loading("Syncing shift handover details...");
    try {
      const checksDone = handoverChecks.filter(h => h.done).map(h => h.label).join(", ");
      await addNotesMutation.mutateAsync({
        notes: `[Shift Handover Sync] Checklist completed: ${checksDone}. Outgoing brief: ${handoverSummary || "None"}. Outgoing Nurse Signature: ${handoverNurseSign}.`
      });
      toast.success("Shift handover briefing successfully logged in patient timeline!", { id: loadingToastId });
      setActiveDrawer(null);
      setHandoverSummary("");
      setHandoverNurseSign("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save handover briefing.", { id: loadingToastId });
    }
  };

  // Submit Patient discharge verification checks to database
  const handleDischargeSubmit = async () => {
    if (!selectedPatientId) {
      toast.error("Please select a patient");
      return;
    }
    const checksDone = dischargeChecks.filter(d => d.done).map(d => d.label).join(", ");
    if (!checksDone) {
      toast.error("No checklist items checked");
      return;
    }

    const loadingToastId = toast.loading("Submitting discharge clearance...");
    try {
      await addNotesMutation.mutateAsync({
        notes: `[Discharge Clearance Check] Cleared checks: ${checksDone}.`
      });
      toast.success("Patient discharge checkpoints logged and verified!", { id: loadingToastId });
      setActiveDrawer(null);
      setDischargeChecks(prev => prev.map(c => ({ ...c, done: false })));
    } catch (err: any) {
      toast.error(err.message || "Failed to save discharge checklist.", { id: loadingToastId });
    }
  };

  const saveDischargePrepMutation = useSaveNurseDischargePrep(selectedPatientId);

  const handleDischargePrepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Please select a patient context first.");
      return;
    }

    setPrepSubmitting(true);
    const loadingToastId = toast.loading("Saving discharge preparation checklist states...");
    try {
      await saveDischargePrepMutation.mutateAsync({
        doctorApprovalStatus: prepDoctorApproval,
        finalVitalSigns: prepFinalVitals,
        medicationCompleted: prepMedicationCompleted,
        patientEducationCompleted: prepEducationCompleted,
        pendingNursingTasks: prepPendingNursingTasks,
        medicalEquipmentReturned: prepEquipmentReturned,
        dischargeDocumentsReady: prepDocsReady,
        wheelchairRequired: prepWheelchairRequired,
        transportRequired: prepTransportRequired,
        remarks: prepRemarks,
        status: prepStatus
      });
      toast.success("Discharge preparation checklist successfully updated!", { id: loadingToastId });
      setActiveDrawer(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save discharge checklist.", { id: loadingToastId });
    } finally {
      setPrepSubmitting(false);
    }
  };

  // Load existing discharge preparation states when a patient is selected
  useEffect(() => {
    if (!selectedPatientId || activeDrawer !== "discharge") return;
    const pt = currentInpatients.find((p: any) => (p.patient?._id || p._id) === selectedPatientId);
    if (pt && pt.dischargePreparation) {
      const prep = pt.dischargePreparation;
      setPrepDoctorApproval(!!prep.doctorApprovalStatus);
      setPrepFinalVitals(!!prep.finalVitalSigns);
      setPrepMedicationCompleted(!!prep.medicationCompleted);
      setPrepEducationCompleted(!!prep.patientEducationCompleted);
      setPrepPendingNursingTasks(!!prep.pendingNursingTasks);
      setPrepEquipmentReturned(!!prep.medicalEquipmentReturned);
      setPrepDocsReady(!!prep.dischargeDocumentsReady);
      setPrepWheelchairRequired(!!prep.wheelchairRequired);
      setPrepTransportRequired(!!prep.transportRequired);
      setPrepRemarks(prep.remarks || "");
      setPrepStatus(prep.status || "Pending");
    } else {
      setPrepDoctorApproval(false);
      setPrepFinalVitals(false);
      setPrepMedicationCompleted(false);
      setPrepEducationCompleted(false);
      setPrepPendingNursingTasks(false);
      setPrepEquipmentReturned(false);
      setPrepDocsReady(false);
      setPrepWheelchairRequired(false);
      setPrepTransportRequired(false);
      setPrepRemarks("");
      setPrepStatus("Pending");
    }
  }, [selectedPatientId, activeDrawer, currentInpatients]);

  // ─── Filter roster list (Nurse assigned patients) ─────────────────────────────────

  const assignedPatients = currentInpatients.filter((item: any) => {
    const nurseId = staff?._id;
    const nurseEmail = staff?.email || user?.email;
    if (!item.assignedNurse) return false;

    const matchId = item.assignedNurse === nurseId || (typeof item.assignedNurse === "object" && item.assignedNurse?._id === nurseId);
    const matchEmail = typeof item.assignedNurse === "object" && item.assignedNurse?.email === nurseEmail;

    return matchId || matchEmail;
  });

  // Unique filter dropdown values extracted dynamically from assigned patients
  const uniqueWards = Array.from(new Set(assignedPatients.map((p: any) => p.ward).filter(Boolean))) as string[];
  const uniqueDoctors = Array.from(new Set(assignedPatients.map((p: any) => p.admittingDoctor?.name).filter(Boolean))) as string[];
  const uniqueRooms = Array.from(new Set(assignedPatients.map((p: any) => p.room?.roomNumber).filter(Boolean))) as string[];
  const uniqueBeds = Array.from(new Set(assignedPatients.map((p: any) => p.bed?.bedNumber).filter(Boolean))) as string[];
  const uniqueStatuses = Array.from(new Set(assignedPatients.map((p: any) => p.status).filter(Boolean))) as string[];

  // Dynamic filter for Assigned Patients View
  const searchFilteredAssignedPatients = assignedPatients.filter((item: any) => {
    // 1. Search Query
    const name = item.patient?.name || "";
    const uhid = item.patient?.uhid || "";
    const diagnosis = item.primaryDiagnosis || item.admissionReason || "";
    const query = searchPatientQuery.toLowerCase();
    const matchesSearch = name.toLowerCase().includes(query) || uhid.toLowerCase().includes(query) || diagnosis.toLowerCase().includes(query);

    // 2. Dropdown Filters
    const matchesWard = !filterWard || item.ward === filterWard;
    const matchesDoctor = !filterDoctor || item.admittingDoctor?.name === filterDoctor;
    const matchesRoom = !filterRoom || item.room?.roomNumber === filterRoom;
    const matchesBed = !filterBed || item.bed?.bedNumber === filterBed;
    const matchesStatus = !filterStatus || item.status === filterStatus;

    return matchesSearch && matchesWard && matchesDoctor && matchesRoom && matchesBed && matchesStatus;
  });

  // Sorting
  const sortedAssignedPatients = [...searchFilteredAssignedPatients].sort((a: any, b: any) => {
    let aVal: any = "";
    let bVal: any = "";

    if (sortField === "name") {
      aVal = a.patient?.name || "";
      bVal = b.patient?.name || "";
    } else if (sortField === "uhid") {
      aVal = a.patient?.uhid || "";
      bVal = b.patient?.uhid || "";
    } else if (sortField === "admissionDate") {
      aVal = new Date(a.admissionDate || 0).getTime();
      bVal = new Date(b.admissionDate || 0).getTime();
    } else if (sortField === "status") {
      aVal = a.status || "";
      bVal = b.status || "";
    } else if (sortField === "room") {
      aVal = a.room?.roomNumber || "";
      bVal = b.room?.roomNumber || "";
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination for Assigned Patients table
  const totalFilteredCount = sortedAssignedPatients.length;
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);
  const paginatedPatients = sortedAssignedPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Original list search (for Search Drawer or sidebar roster view)
  const filteredPatients = currentInpatients.filter((item: any) => {
    const name = item.patient?.name || "";
    const uhid = item.patient?.uhid || "";
    const diag = item.diagnosis || item.primaryDiagnosis || item.admissionReason || "";
    const query = searchPatientQuery.toLowerCase();
    return name.toLowerCase().includes(query) || uhid.toLowerCase().includes(query) || diag.toLowerCase().includes(query);
  });

  // Compile timeline data from database
  // Grabs the recent timeline activities from ALL assigned patients and merges them in sorted chronological order
  const databaseTimelineEvents = currentInpatients
    .flatMap((p: any) => (p.timeline || []).map((t: any) => ({
      ...t,
      patientName: p.patient?.name || "Patient",
      roomNumber: p.room?.roomNumber || "N/A"
    })))
    .sort((a: any, b: any) => new Date(b.date || b.recordedAt || 0).getTime() - new Date(a.date || a.recordedAt || 0).getTime());

  // Split events for Recent Activities Feed (Top 6 entries)
  const recentShiftActivities = databaseTimelineEvents.slice(0, 6).map((item: any) => {
    let icon = ClipboardList;
    let color = "text-navy-500 bg-navy-50";

    if (item.eventType === "vital_update" || item.description?.toLowerCase().includes("vital")) {
      icon = Thermometer;
      color = "text-rose-500 bg-rose-50";
    } else if (item.description?.toLowerCase().includes("medication") || item.description?.toLowerCase().includes("dose")) {
      icon = Pill;
      color = "text-indigo-500 bg-indigo-50";
    } else if (item.eventType === "admission" || item.description?.toLowerCase().includes("admit")) {
      icon = Users;
      color = "text-emerald-500 bg-emerald-50";
    }

    return {
      time: item.time || new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: `${item.patientName} (Room ${item.roomNumber}): ${item.description}`,
      icon,
      color
    };
  });

  // Calculate dynamic dashboard stats
  const totalAssignedCount = currentInpatients.length;

  // Critical cases = priority is Emergency or Urgent
  const criticalCount = currentInpatients.filter((p: any) => p.priority === "Emergency" || p.priority === "Urgent").length;

  // Pending vitals: patients who have NO vitals recorded yet
  const pendingVitalsCount = currentInpatients.filter((p: any) => !p.vitals || p.vitals.length === 0).length;

  // Pending medications count: count of active medications across all inpatients
  const pendingMedsCount = currentInpatients.reduce((acc: number, p: any) =>
    acc + (p.medicationOrders?.filter((m: any) => m.status === "active").length || 0)
    , 0);

  // Emergency Alerts: count patients with priority === Emergency
  const emergencyAlertsCount = currentInpatients.filter((p: any) => p.priority === "Emergency").length;

  // Real Nursing Tasks Completion index
  // Task is marked complete for patients who have at least one vital sign and one progress note today
  const patientVitalsSavedTodayCount = currentInpatients.filter((p: any) => {
    if (!p.vitals || p.vitals.length === 0) return false;
    const latestVital = p.vitals[p.vitals.length - 1];
    const vitalDate = new Date(latestVital.recordedAt).toDateString();
    return vitalDate === new Date().toDateString();
  }).length;

  const patientNotesSavedTodayCount = currentInpatients.filter((p: any) => {
    if (!p.timeline || p.timeline.length === 0) return false;
    return p.timeline.some((t: any) => {
      const noteDate = new Date(t.date).toDateString();
      return noteDate === new Date().toDateString() && t.eventType === "clinical_note";
    });
  }).length;

  const totalPossibleClinicalTasks = totalAssignedCount * 2; // (Vitals + Note per patient)
  const completedClinicalTasks = patientVitalsSavedTodayCount + patientNotesSavedTodayCount;
  const taskCompletionPercentage = totalPossibleClinicalTasks > 0 ? Math.round((completedClinicalTasks / totalPossibleClinicalTasks) * 100) : 0;

  // Visual states
  const showLoading = isInpatientsLoading || isBedsLoading || isWardsLoading || isRoomsLoading;
  const showEmpty = !isInpatientsLoading && currentInpatients.length === 0;

  // ==========================================
  // SKELETON COMPONENT TEMPLATES
  // ==========================================

  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] animate-pulse space-y-3">
      <div className="flex justify-between items-start">
        <div className="h-4.5 w-24 bg-slate-200 rounded" />
        <div className="h-9 w-9 bg-slate-200 rounded-xl" />
      </div>
      <div className="h-8 w-16 bg-slate-200 rounded" />
      <div className="space-y-1.5 pt-1">
        <div className="h-3 w-full bg-slate-200 rounded" />
        <div className="h-2.5 w-3/4 bg-slate-200 rounded" />
      </div>
    </div>
  );

  const SkeletonTimeline = () => (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 animate-pulse">
      <div className="h-5 w-40 bg-slate-200 rounded" />
      <div className="space-y-6 pt-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-12 h-4.5 bg-slate-200 rounded shrink-0" />
            <div className="h-5 w-5 bg-slate-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 bg-slate-200 rounded" />
              <div className="h-2.5 w-2/3 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SkeletonActivity = () => (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 animate-pulse">
      <div className="h-5 w-40 bg-slate-200 rounded" />
      <div className="space-y-4 pt-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-4/5 bg-slate-200 rounded" />
              <div className="h-2 w-1/4 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10 relative font-sans">

      {viewingPatientDetailsId && isDetailInpatientLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <Loader2 className="h-10 w-10 text-navy-700 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Retrieving patient chart details...</p>
        </div>
      ) : viewingPatientDetailsId && !detailInpatient ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">Patient Details Not Found</h3>
          <p className="text-xs text-slate-400 mt-1">We could not fetch the details for this patient from the database.</p>
          <button
            onClick={() => setViewingPatientDetailsId(null)}
            className="mt-4 px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Back to Patients
          </button>
        </div>
      ) : viewingPatientDetailsId ? (
        // ====================================================================
        // PATIENT DETAILS READ-ONLY PAGE VIEW
        // ====================================================================
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* Top Header Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewingPatientDetailsId(null)}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors flex items-center justify-center cursor-pointer"
                title="Back to Patients"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative">
                {detailInpatient.patient?.photoUrl ? (
                  <img
                    src={detailInpatient.patient.photoUrl}
                    alt={detailInpatient.patient.name}
                    className="h-14 w-14 rounded-full object-cover ring-4 ring-navy-50"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center font-extrabold text-lg ring-4 ring-navy-50">
                    {detailInpatient.patient?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                    {detailInpatient.patient?.name}
                  </h1>
                  <span className={`text-[9px] font-extrabold uppercase border px-2 py-0.5 rounded-full tracking-wide ${detailInpatient.priority === "Emergency" || detailInpatient.priority === "Urgent"
                      ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}>
                    {detailInpatient.priority} Priority
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-semibold">
                  UHID: <span className="font-mono text-slate-600 font-bold">{detailInpatient.patient?.uhid || "N/A"}</span>
                  <span className="mx-2">•</span>
                  Status: <span className="capitalize font-bold text-navy-600">{detailInpatient.status}</span>
                </p>
              </div>
            </div>

            {/* Top clinical quick action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setSelectedPatientId(detailInpatient.patient?._id);
                  setActiveDrawer("vitals");
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-rose-100 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <Activity className="h-4 w-4" />
                Record Vitals
              </button>
              <button
                onClick={() => {
                  setSelectedPatientId(detailInpatient.patient?._id);
                  setActiveDrawer("meds");
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <Pill className="h-4 w-4" />
                Medication Administration
              </button>
              <button
                onClick={() => {
                  setSelectedPatientId(detailInpatient.patient?._id);
                  setActiveDrawer("notes");
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-purple-100 text-purple-650 hover:bg-purple-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <ClipboardList className="h-4 w-4" />
                Nursing Notes
              </button>
              <button
                onClick={() => {
                  setSelectedPatientId(detailInpatient.patient?._id);
                  setActiveDrawer("bedside");
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-emerald-100 text-emerald-600 hover:bg-emerald-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <HeartPulse className="h-4 w-4" />
                Bedside Care
              </button>
              <button
                onClick={() => setViewingPatientDetailsId(null)}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Back to Patients
              </button>
            </div>
          </div>

          {/* Main details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left and Middle Content Cards (8-span) */}
            <div className="lg:col-span-8 space-y-6">

              {/* Current Diagnosis Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-navy-500" />
                    Current Admission Diagnosis
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md cursor-not-allowed">
                    <Lock className="h-3 w-3" /> Read Only
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Primary Diagnosis</label>
                    <p className="mt-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                      {detailInpatient.primaryDiagnosis || "No primary diagnosis entered by admitting physician."}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reason for Admission</label>
                    <p className="mt-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                      {detailInpatient.admissionReason || "No admission reason details logged."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Latest Vitals Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Thermometer className="h-4 w-4 text-rose-500" />
                    Latest Bedside Vital Signs
                  </h3>
                  {detailInpatient.vitals && detailInpatient.vitals.length > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Last logged: {new Date(detailInpatient.vitals[detailInpatient.vitals.length - 1].recordedAt).toLocaleString()} by {detailInpatient.vitals[detailInpatient.vitals.length - 1].recordedBy}
                    </span>
                  )}
                </div>

                {detailInpatient.vitals && detailInpatient.vitals.length > 0 ? (
                  (() => {
                    const latest = detailInpatient.vitals[detailInpatient.vitals.length - 1];
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Temp */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Temperature</p>
                          <p className="text-lg font-extrabold text-slate-800 mt-1">{latest.temperature ? `${latest.temperature}°F` : "—"}</p>
                        </div>
                        {/* Blood Pressure */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blood Pressure</p>
                          <p className="text-lg font-extrabold text-slate-800 mt-1">{latest.bloodPressure || "—"}</p>
                        </div>
                        {/* Pulse Rate */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pulse Rate</p>
                          <p className="text-lg font-extrabold text-slate-800 mt-1">{latest.pulseRate ? `${latest.pulseRate} bpm` : "—"}</p>
                        </div>
                        {/* Respiratory Rate */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resp. Rate</p>
                          <p className="text-lg font-extrabold text-slate-800 mt-1">{latest.respiratoryRate ? `${latest.respiratoryRate} /min` : "—"}</p>
                        </div>
                        {/* Oxygen Saturation */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Oxygen Sat.</p>
                          <p className="text-lg font-extrabold text-emerald-600 mt-1">{latest.oxygenSaturation ? `${latest.oxygenSaturation}%` : "—"}</p>
                        </div>
                        {/* Weight */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight</p>
                          <p className="text-lg font-extrabold text-slate-800 mt-1">{latest.weight ? `${latest.weight} kg` : "—"}</p>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    No vitals logged for this admission yet.
                  </p>
                )}
              </div>

              {/* Current Medications (Prescriptions) Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-indigo-500" />
                    Scheduled Medications (Prescriptions)
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md cursor-not-allowed">
                    <Lock className="h-3 w-3" /> Read Only
                  </span>
                </div>

                {detailInpatient.medicationOrders && detailInpatient.medicationOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-150">
                          <th className="py-2.5 px-3">Drug Name</th>
                          <th className="py-2.5 px-3">Dosage</th>
                          <th className="py-2.5 px-3">Frequency</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">Route</th>
                          <th className="py-2.5 px-3">Prescribed By</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {detailInpatient.medicationOrders.map((med: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-bold text-slate-800">{med.drugName}</td>
                            <td className="py-3 px-3">{med.dosage}</td>
                            <td className="py-3 px-3">{med.frequency}</td>
                            <td className="py-3 px-3">{med.duration}</td>
                            <td className="py-3 px-3 capitalize">{med.route}</td>
                            <td className="py-3 px-3 text-slate-500">{med.prescribingDoctorName}</td>
                            <td className="py-3 px-3">
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${med.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"
                                }`}>
                                {med.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    No medication prescriptions active for this inpatient.
                  </p>
                )}
              </div>

              {/* Medical History Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-purple-500" />
                    Patient Medical History
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md cursor-not-allowed">
                    <Lock className="h-3 w-3" /> Read Only
                  </span>
                </div>

                {detailInpatient.patient?.medicalHistory && detailInpatient.patient.medicalHistory.length > 0 ? (
                  <div className="space-y-4">
                    {detailInpatient.patient.medicalHistory.map((hist: any, i: number) => (
                      <div key={i} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1">
                          <span>{new Date(hist.date).toLocaleDateString()} · {hist.visitType || "Visit"}</span>
                          <span className="text-navy-700 uppercase font-bold">{hist.doctorName} ({hist.department})</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">Diagnosis: {hist.diagnosis || "No diagnosis logged"}</h4>
                        {hist.notes && <p className="text-xs text-slate-500 mt-1 font-medium">{hist.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    No past medical history recorded in this patient's profile chart.
                  </p>
                )}
              </div>

            </div>

            {/* Right Sidebar Content Cards (4-span) */}
            <div className="lg:col-span-4 space-y-6">

              {/* Allergies Card (Alert Warning Style) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-3">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-500 animate-bounce" />
                  Allergies & Clinical Alerts
                </h3>
                {detailInpatient.patient?.allergies ? (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Allergies Active Alert</p>
                      <p className="text-xs font-bold mt-1 leading-relaxed">
                        {detailInpatient.patient.allergies}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                    <p className="text-xs font-bold">No known drug or food allergies.</p>
                  </div>
                )}
              </div>

              {/* Patient Demographics Info Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-3">
                  <User className="h-4 w-4 text-navy-500" />
                  Patient Demographics
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 font-semibold">Age / Gender</span>
                    <span className="text-slate-700 font-bold">{detailInpatient.patient?.age || "N/A"} yrs / <span className="capitalize">{detailInpatient.patient?.gender}</span></span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 font-semibold">Blood Group</span>
                    <span className="text-slate-700 font-extrabold uppercase bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">{detailInpatient.patient?.bloodGroup || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 font-semibold">Phone Contact</span>
                    <span className="text-slate-700 font-bold">{detailInpatient.patient?.phone || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 font-semibold">Insurance Provider</span>
                    <span className="text-slate-700 font-bold">{detailInpatient.patient?.insuranceProvider || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-405 font-semibold block mb-1">Billing Address</span>
                    <p className="text-slate-700 font-medium leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px]">
                      {detailInpatient.patient?.address || "No address details stored."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admission details Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-3">
                  <BedDouble className="h-4 w-4 text-navy-500" />
                  Admission Allocation
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 font-semibold">Admission Code</span>
                    <span className="text-slate-700 font-bold font-mono">{detailInpatient.admissionNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 font-semibold">Ward Allocation</span>
                    <span className="text-slate-700 font-bold">{detailInpatient.ward || "General Ward"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 font-semibold">Allocated Room</span>
                    <span className="text-slate-700 font-bold">Room {detailInpatient.room?.roomNumber || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 font-semibold">Allocated Bed</span>
                    <span className="text-slate-700 font-bold">Bed {detailInpatient.bed?.bedNumber || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 font-semibold">Admitted On</span>
                    <span className="text-slate-700 font-bold">
                      {new Date(detailInpatient.admissionDate).toLocaleDateString()} at {detailInpatient.admissionTime || "—"}
                    </span>
                  </div>
                  {detailInpatient.attenderName && (
                    <div className="border-t border-slate-50 pt-2 space-y-1">
                      <span className="text-slate-405 font-semibold block">Primary Attender</span>
                      <p className="text-slate-700 font-bold">{detailInpatient.attenderName} <span className="text-slate-400 font-medium">({detailInpatient.attenderPhone})</span></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Admitting Doctor Details Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-3">
                  <Stethoscope className="h-4 w-4 text-navy-500" />
                  Primary Physician
                </h3>
                {detailInpatient.admittingDoctor ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                      Dr
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{detailInpatient.admittingDoctor.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium capitalize mt-0.5">{detailInpatient.admittingDoctor.specialization || "Physician Consultant"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-405 text-center">No admitting doctor assigned yet.</p>
                )}
              </div>

              {/* Recent Nursing Timeline Notes Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-3">
                  <ClipboardList className="h-4 w-4 text-navy-500" />
                  Recent Clinical Progress Notes
                </h3>

                {detailInpatient.timeline && detailInpatient.timeline.length > 0 ? (
                  <div className="relative border-l border-slate-200 pl-4 space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {detailInpatient.timeline
                      .filter((t: any) => t.eventType === "clinical_note" || t.eventType === "vital_update")
                      .map((note: any, i: number) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400" />
                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold mb-0.5">
                            <span>{new Date(note.date).toLocaleDateString()} at {note.time}</span>
                            <span className="uppercase font-extrabold text-navy-600">{note.userName}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-normal font-medium">{note.description}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No clinical timeline updates logged.</p>
                )}
              </div>

            </div>

          </div>

        </div>
      ) : activeTab === "inpatients" ? (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* Header Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center">
                <BedDouble className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Assigned Patients Directory</h1>
                <p className="text-xs text-slate-500 mt-0.5">Real-time clinical roster of admitted inpatients currently assigned to your care shifts.</p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex gap-4 self-start md:self-auto">
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned</p>
                <p className="text-xl font-extrabold text-navy-700">{assignedPatients.length}</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Critical</p>
                <p className="text-xl font-extrabold text-rose-700">
                  {assignedPatients.filter((p: any) => p.priority === "Emergency" || p.priority === "Urgent").length}
                </p>
              </div>
            </div>
          </div>

          {/* Filtering Control Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

              {/* Search Patient */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Patient Name, ID, or Diagnosis..."
                  value={searchPatientQuery}
                  onChange={(e) => {
                    setSearchPatientQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                />
                {searchPatientQuery && (
                  <button
                    onClick={() => {
                      setSearchPatientQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filters Header */}
              <div className="flex items-center gap-1.5 text-xs text-slate-450 font-bold uppercase tracking-wider shrink-0 lg:border-l lg:border-slate-100 lg:pl-4">
                <SlidersHorizontal className="h-3.5 w-3.5 text-navy-500" />
                Filter Options
              </div>
            </div>

            {/* Select Dropdown Filters Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">

              {/* Ward Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ward</label>
                <select
                  value={filterWard}
                  onChange={(e) => {
                    setFilterWard(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-2.5 rounded-xl cursor-pointer outline-none transition focus:border-navy-500"
                >
                  <option value="">All Wards</option>
                  {uniqueWards.map((w, i) => (
                    <option key={i} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              {/* Doctor Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctor</label>
                <select
                  value={filterDoctor}
                  onChange={(e) => {
                    setFilterDoctor(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-2.5 rounded-xl cursor-pointer outline-none transition focus:border-navy-500"
                >
                  <option value="">All Doctors</option>
                  {uniqueDoctors.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Room Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room</label>
                <select
                  value={filterRoom}
                  onChange={(e) => {
                    setFilterRoom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-2.5 rounded-xl cursor-pointer outline-none transition focus:border-navy-500"
                >
                  <option value="">All Rooms</option>
                  {uniqueRooms.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Bed Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bed</label>
                <select
                  value={filterBed}
                  onChange={(e) => {
                    setFilterBed(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-2.5 rounded-xl cursor-pointer outline-none transition focus:border-navy-500"
                >
                  <option value="">All Beds</option>
                  {uniqueBeds.map((b, i) => (
                    <option key={i} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Patient Status Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-2.5 rounded-xl cursor-pointer outline-none transition focus:border-navy-500"
                >
                  <option value="">All Statuses</option>
                  {uniqueStatuses.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Reset Button */}
              {(filterWard || filterDoctor || filterRoom || filterBed || filterStatus || searchPatientQuery) && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterWard("");
                      setFilterDoctor("");
                      setFilterRoom("");
                      setFilterBed("");
                      setFilterStatus("");
                      setSearchPatientQuery("");
                      setCurrentPage(1);
                    }}
                    className="flex items-center gap-1.5 justify-center w-full px-3 py-2 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 font-bold text-xs bg-slate-50 hover:bg-red-50/50 rounded-xl transition-all h-9 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Roster Table Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[1150px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                    <th className="py-4 px-5">
                      <button
                        onClick={() => {
                          setSortField("uhid");
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        }}
                        className="flex items-center gap-1 hover:text-slate-800 transition-colors uppercase font-bold cursor-pointer"
                      >
                        Patient ID
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-4 px-5">
                      <button
                        onClick={() => {
                          setSortField("name");
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        }}
                        className="flex items-center gap-1 hover:text-slate-800 transition-colors uppercase font-bold cursor-pointer"
                      >
                        Patient Name
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-4 px-5">Age / Gender</th>
                    <th className="py-4 px-5">Blood</th>
                    <th className="py-4 px-5">Assigned Doctor</th>
                    <th className="py-4 px-5">
                      <button
                        onClick={() => {
                          setSortField("room");
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        }}
                        className="flex items-center gap-1 hover:text-slate-800 transition-colors uppercase font-bold cursor-pointer"
                      >
                        Location
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-4 px-5 min-w-[130px]">Diagnosis (Read Only)</th>
                    <th className="py-4 px-5">
                      <button
                        onClick={() => {
                          setSortField("admissionDate");
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        }}
                        className="flex items-center gap-1 hover:text-slate-800 transition-colors uppercase font-bold cursor-pointer"
                      >
                        Admitted On
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-4 px-5">
                      <button
                        onClick={() => {
                          setSortField("status");
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        }}
                        className="flex items-center gap-1 hover:text-slate-800 transition-colors uppercase font-bold cursor-pointer"
                      >
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-4 px-5 text-right pr-6">Clinical Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {showLoading ? (
                    [1, 2, 3, 4, 5].map((idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4.5 px-5"><div className="h-3 w-16 bg-slate-200 rounded" /></td>
                        <td className="py-4.5 px-5"><div className="h-3 w-28 bg-slate-200 rounded" /></td>
                        <td className="py-4.5 px-5"><div className="h-3 w-12 bg-slate-200 rounded" /></td>
                        <td className="py-4.5 px-5"><div className="h-3 w-8 bg-slate-200 rounded" /></td>
                        <td className="py-4.5 px-5"><div className="h-3 w-24 bg-slate-200 rounded" /></td>
                        <td className="py-4.5 px-5"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                        <td className="py-4.5 px-5"><div className="h-3.5 w-44 bg-slate-200 rounded" /></td>
                        <td className="py-4.5 px-5"><div className="h-3 w-16 bg-slate-200 rounded" /></td>
                        <td className="py-4.5 px-5"><div className="h-5 w-16 bg-slate-200 rounded-full" /></td>
                        <td className="py-4.5 px-5 text-right"><div className="h-7 w-32 bg-slate-200 rounded-xl ml-auto" /></td>
                      </tr>
                    ))
                  ) : paginatedPatients.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <div className="max-w-md mx-auto">
                          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2.5 animate-bounce" />
                          <h3 className="text-sm font-bold text-slate-700">No Patients Found</h3>
                          <p className="text-xs text-slate-450 mt-1">
                            {assignedPatients.length === 0
                              ? "No patients are currently assigned to your shift profile. Please verify assignments."
                              : "No patients match the search query or active filter settings."}
                          </p>
                          {(filterWard || filterDoctor || filterRoom || filterBed || filterStatus || searchPatientQuery) && (
                            <button
                              onClick={() => {
                                setFilterWard("");
                                setFilterDoctor("");
                                setFilterRoom("");
                                setFilterBed("");
                                setFilterStatus("");
                                setSearchPatientQuery("");
                                setCurrentPage(1);
                              }}
                              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 border border-navy-200 text-navy-700 font-bold text-xs bg-navy-50 rounded-xl hover:bg-navy-100 transition-all cursor-pointer"
                            >
                              Clear All Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPatients.map((item: any, index) => {
                      const patient = item.patient || {};
                      const doctor = item.admittingDoctor || {};
                      const room = item.room || {};
                      const bed = item.bed || {};

                      // Diagnosis (Read-Only) text getter
                      const diagText = item.primaryDiagnosis || item.admissionReason || "No primary diagnosis recorded";

                      // Status/Priority configuration
                      let statusBg = "bg-slate-50 text-slate-700 border-slate-200";
                      if (item.priority === "Emergency" || item.priority === "Urgent") {
                        statusBg = "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
                      } else if (item.status === "discharged") {
                        statusBg = "bg-emerald-50 text-emerald-700 border-emerald-250";
                      } else if (item.status === "discharge_requested") {
                        statusBg = "bg-amber-50 text-amber-700 border-amber-250";
                      } else if (item.status === "Under Observation") {
                        statusBg = "bg-sky-50 text-sky-700 border-sky-200";
                      }

                      return (
                        <tr
                          key={index}
                          className="hover:bg-slate-50 transition-colors border-b border-slate-100/50"
                        >
                          {/* Patient ID */}
                          <td className="py-4 px-5">
                            <span className="font-mono text-xs text-slate-450 font-bold whitespace-nowrap">
                              {patient.uhid || "N/A"}
                            </span>
                          </td>
                          {/* Name */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-navy-50 flex items-center justify-center text-navy-700 font-extrabold text-xs shrink-0">
                                {patient.name?.charAt(0).toUpperCase() || "?"}
                              </div>
                              <span
                                onClick={() => setViewingPatientDetailsId(patient._id)}
                                className="font-bold text-slate-800 text-sm hover:text-navy-600 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                {patient.name || "Unknown Patient"}
                              </span>
                            </div>
                          </td>
                          {/* Age / Gender */}
                          <td className="py-4 px-5 text-xs text-slate-600 font-semibold">
                            {patient.age ? `${patient.age} yrs` : "N/A"} / <span className="capitalize">{patient.gender || "N/A"}</span>
                          </td>
                          {/* Blood Group */}
                          <td className="py-4 px-5 text-xs">
                            <span className="font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600 uppercase">
                              {patient.bloodGroup || "N/A"}
                            </span>
                          </td>
                          {/* Admitting Doctor */}
                          <td className="py-4 px-5">
                            <div>
                              <p className="text-xs font-bold text-slate-700">{doctor.name || "N/A"}</p>
                              <p className="text-[10px] text-slate-400 font-medium capitalize mt-0.5">{doctor.specialization || "Physician"}</p>
                            </div>
                          </td>
                          {/* Location */}
                          <td className="py-4 px-5">
                            <div className="space-y-0.5 text-xs font-semibold text-slate-600">
                              <p className="text-slate-800">{item.ward || "General Ward"}</p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                <span>Room: <strong className="text-slate-700 font-bold">{room.roomNumber || "N/A"}</strong></span>
                                <span>•</span>
                                <span>Bed: <strong className="text-slate-700 font-bold">{bed.bedNumber || "N/A"}</strong></span>
                              </p>
                            </div>
                          </td>
                          {/* Diagnosis (Read Only) */}
                          <td className="py-4 px-5 max-w-[130px]">
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-start gap-1.5 cursor-not-allowed" title="Read Only Diagnosis">
                              <Info className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <p className="text-[10px] text-slate-500 italic leading-snug font-medium line-clamp-2">
                                {diagText}
                              </p>
                            </div>
                          </td>
                          {/* Admitted Date */}
                          <td className="py-4 px-5 text-xs text-slate-500 font-medium">
                            {new Date(item.admissionDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </td>
                          {/* Status */}
                          <td className="py-4 px-5">
                            <span className={`inline-block text-[9px] font-extrabold uppercase border px-2 py-0.5 rounded-full shrink-0 tracking-wide ${statusBg}`}>
                              {item.priority === "Emergency" ? "Critical (Emergency)" : (item.status === "admitted" ? "Stable" : item.status)}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="py-4 px-5 text-right pr-6">
                            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                              {/* View Details */}
                              <button
                                onClick={() => {
                                  setViewingPatientDetailsId(patient._id);
                                }}
                                className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300 transition-all cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                              {/* Record Vitals */}
                              <button
                                onClick={() => {
                                  setSelectedPatientId(patient._id);
                                  setActiveDrawer("vitals");
                                }}
                                className="p-1 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all cursor-pointer"
                                title="Record Vitals"
                              >
                                <Activity className="h-3 w-3" />
                              </button>
                              {/* Medication */}
                              <button
                                onClick={() => {
                                  setSelectedPatientId(patient._id);
                                  setActiveDrawer("meds");
                                }}
                                className="p-1 rounded-lg border border-indigo-100 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-all cursor-pointer"
                                title="Medications"
                              >
                                <Pill className="h-3 w-3" />
                              </button>
                              {/* Notes */}
                              <button
                                onClick={() => {
                                  setSelectedPatientId(patient._id);
                                  setActiveDrawer("notes");
                                }}
                                className="p-1 rounded-lg border border-purple-100 text-purple-500 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-all cursor-pointer"
                                title="Nursing Notes"
                              >
                                <ClipboardList className="h-3 w-3" />
                              </button>
                              {/* Bedside */}
                              <button
                                onClick={() => {
                                  setSelectedPatientId(patient._id);
                                  setActiveDrawer("bedside");
                                }}
                                className="p-1 rounded-lg border border-emerald-100 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all cursor-pointer"
                                title="Bedside Care"
                              >
                                <HeartPulse className="h-3 w-3" />
                              </button>
                              {/* Discharge Prep */}
                              <button
                                onClick={() => {
                                  setSelectedPatientId(patient._id);
                                  setActiveDrawer("discharge");
                                }}
                                className="p-1 rounded-lg border border-amber-100 text-amber-500 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all cursor-pointer"
                                title="Discharge Preparation"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="bg-slate-50 border-t border-slate-100 px-5 py-3.5 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong className="text-slate-700 font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</strong> to <strong className="text-slate-700 font-semibold">{Math.min(currentPage * itemsPerPage, totalFilteredCount)}</strong> of <strong className="text-slate-700 font-semibold">{totalFilteredCount}</strong> patients
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 font-bold text-xs cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>

                  <div className="flex gap-1.5">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`h-7.5 w-7.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === idx + 1
                            ? "bg-navy-700 text-white shadow-sm"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 font-bold text-xs cursor-pointer"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : isViewingHistory ? (
        <ShiftHistoryView onBack={() => setIsViewingHistory(false)} />
      ) : (
        <>
          {/* ==========================================
              HEADER SECTION (Doctor Dashboard Design Match)
             ========================================== */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100/60 flex items-center justify-center shrink-0">
                <HeartPulse className="h-6 w-6 text-navy-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
                    Nurse Dashboard
                  </h1>
                  <Badge tone="info">Duty Roster Staff</Badge>
                </div>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Monitor assigned patients, medications, vitals, nursing notes and shift handovers.
                </p>
              </div>
            </div>

            {/* Right Side: Current Date, Live Clock, Shift Status */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-right">
                <p className="text-xs font-bold text-slate-800 font-sans">
                  {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-[11px] font-mono font-bold text-navy-700 mt-0.5">
                  {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl px-3.5 py-2 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block font-sans">Shift Status</span>
                <span className="text-xs font-extrabold text-emerald-800 font-sans flex items-center gap-1 justify-center">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Morning Shift
                </span>
              </div>
            </div>
          </div>

          {/* ==========================================
              SHIFT MANAGEMENT & COCKPIT WIDGET
             ========================================== */}
          <ShiftManagementWidget
            onStartHandover={() => setIsHandoverModalOpen(true)}
            onViewHistory={() => setIsViewingHistory(true)}
            onOpenPendingAccept={(handover) => setPendingHandoverToAccept(handover)}
          />

          {/* ==========================================
              6 KPI CARDS GRID (Doctor Dashboard Palette & Layout)
             ========================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {showLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                {/* 1. Assigned Patients (Blue) */}
                <div
                  onClick={() => navigate("/nurse/inpatients")}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">Assigned Patients</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-slate-800 font-sans tracking-tight">{totalAssignedCount}</p>
                    <p className="text-[11px] font-medium font-sans text-slate-500 mt-1">
                      {totalAssignedCount === 0 ? "No Patients Assigned" : `${criticalCount} Critical cases`}
                    </p>
                  </div>
                </div>

                {/* 2. Pending Medications (Orange/Amber) */}
                <div
                  onClick={() => setActiveDrawer("meds")}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">Pending Meds</span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Pill className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-slate-800 font-sans tracking-tight">{pendingMedsCount}</p>
                    <p className="text-[11px] font-medium font-sans text-slate-500 mt-1">
                      {pendingMedsCount === 0 ? "No Pending Medications - Great Job!" : "Active prescriptions scheduled"}
                    </p>
                  </div>
                </div>

                {/* 3. Pending Vitals (Purple) */}
                <div
                  onClick={() => setActiveDrawer("vitals")}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">Pending Vitals</span>
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Thermometer className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-slate-800 font-sans tracking-tight">{pendingVitalsCount}</p>
                    <p className="text-[11px] font-medium font-sans text-slate-500 mt-1">
                      {pendingVitalsCount === 0 ? "No Pending Vitals - Everything Updated" : "Vitals entry required"}
                    </p>
                  </div>
                </div>

                {/* 4. Critical Patients (Red) */}
                <div
                  onClick={() => navigate("/nurse/inpatients")}
                  className={`rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group flex flex-col justify-between ${
                    criticalCount > 0 ? "bg-rose-50/40 border-rose-200" : "bg-white border-slate-200/80"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">Critical Cases</span>
                    <div className={`p-2 rounded-xl border ${
                      criticalCount > 0 ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      <ShieldAlert className={`h-4.5 w-4.5 ${criticalCount > 0 ? "animate-bounce" : ""}`} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-slate-800 font-sans tracking-tight">{criticalCount}</p>
                    <p className="text-[11px] font-medium font-sans text-slate-500 mt-1">
                      {criticalCount === 0 ? "No Critical Patients - All Patients Stable" : "Emergency triage priority"}
                    </p>
                  </div>
                </div>

                {/* 5. Shift Status (Green) */}
                <div onClick={() => setIsHandoverModalOpen(true)} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group flex flex-col justify-between cursor-pointer">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">Shift Status</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-sm font-extrabold text-emerald-800 font-sans">Morning Shift</p>
                    </div>
                    <p className="text-[11px] font-medium font-sans text-slate-500 mt-1">
                      On Duty · Roster Active
                    </p>
                  </div>
                </div>

                {/* 6. Nurse Alerts (Amber) */}
                <div
                  onClick={() => setActiveDrawer("alerts")}
                  className={`rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group flex flex-col justify-between ${
                    emergencyAlertsCount > 0 ? "bg-amber-50/40 border-amber-200" : "bg-white border-slate-200/80"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">Nurse Alerts</span>
                    <div className={`p-2 rounded-xl border ${
                      emergencyAlertsCount > 0 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      <Bell className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-slate-800 font-sans tracking-tight">{emergencyAlertsCount}</p>
                    <p className="text-[11px] font-medium font-sans text-slate-500 mt-1">
                      {emergencyAlertsCount === 0 ? "No Active Alerts" : "Ward alarms pending"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ==========================================
              CLINICAL SHIFT TASKS PROGRESS BAR SECTION
             ========================================== */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 font-sans uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-navy-700" /> Clinical Shift Tasks Progress
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">Overall task completion status for assigned ward patients</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={taskCompletionPercentage >= 80 ? "success" : taskCompletionPercentage >= 40 ? "warning" : "neutral"}>
                  {taskCompletionPercentage}% Overall Completion
                </Badge>
              </div>
            </div>

            {/* Main Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700 font-sans">
                <span>Completed: {completedClinicalTasks} Tasks</span>
                <span>Pending: {totalPossibleClinicalTasks - completedClinicalTasks} Tasks</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className="bg-gradient-to-r from-navy-700 via-indigo-600 to-emerald-500 h-2 rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{ width: `${taskCompletionPercentage}%` }}
                />
              </div>
            </div>

            {/* Task Progress List Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Vitals Monitoring */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                    <Thermometer className="h-4 w-4 text-rose-500" /> Vitals Monitoring
                  </span>
                  <span className="font-bold text-slate-600 font-mono text-[11px]">{patientVitalsSavedTodayCount} / {totalAssignedCount}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalAssignedCount > 0 ? (patientVitalsSavedTodayCount / totalAssignedCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Medication Administration */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-indigo-500" /> Medication Admin
                  </span>
                  <span className="font-bold text-slate-600 font-mono text-[11px]">{totalAssignedCount - pendingMedsCount} / {totalAssignedCount}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalAssignedCount > 0 ? ((totalAssignedCount - pendingMedsCount) / totalAssignedCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Nursing Notes */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-purple-500" /> Nursing Notes
                  </span>
                  <span className="font-bold text-slate-600 font-mono text-[11px]">{patientNotesSavedTodayCount} / {totalAssignedCount}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalAssignedCount > 0 ? (patientNotesSavedTodayCount / totalAssignedCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ==========================================
              QUICK ACTIONS GRID
             ========================================== */}
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 font-sans flex items-center gap-1.5">
              <Grid className="h-4.5 w-4.5 text-navy-500" />
              Bedside Clinical Quick Actions
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* 1. Record Vitals */}
              <div
                onClick={() => setActiveDrawer("vitals")}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-navy-200 cursor-pointer flex flex-col justify-between h-32 hover:shadow-md transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors">
                  <Thermometer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 font-sans">Record Vitals</h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Log temp, BP, pulse</p>
                </div>
              </div>

              {/* 2. Medication Admin */}
              <div
                onClick={() => setActiveDrawer("meds")}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-navy-200 cursor-pointer flex flex-col justify-between h-32 hover:shadow-md transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 font-sans">Medication Admin</h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Dose checkoffs & logs</p>
                </div>
              </div>

              {/* 3. Nursing Notes */}
              <div
                onClick={() => setActiveDrawer("notes")}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-navy-200 cursor-pointer flex flex-col justify-between h-32 hover:shadow-md transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-500 border border-purple-100 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 font-sans">Nursing Notes</h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Write EMR progress notes</p>
                </div>
              </div>

              {/* 4. Shift Handover */}
              <div
                onClick={() => {
                  setSelectedPatientId("");
                  setActiveDrawer("handover");
                }}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-navy-200 cursor-pointer flex flex-col justify-between h-32 hover:shadow-md transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 font-sans">Shift Handover</h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Outgoing signoff brief</p>
                </div>
              </div>

              {/* 5. Ward Management */}
              <div
                onClick={() => navigate("/nurse/inpatients")}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-navy-200 cursor-pointer flex flex-col justify-between h-32 hover:shadow-md transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <BedDouble className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 font-sans">Ward Management</h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Bed roster & inpatients</p>
                </div>
              </div>

              {/* 6. Emergency Alerts */}
              <div
                onClick={() => setActiveDrawer("alerts")}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-navy-200 cursor-pointer flex flex-col justify-between h-32 hover:shadow-md transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 font-sans">Emergency Alerts</h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Acknowledge ward alarms</p>
                </div>
              </div>
            </div>
          </div>

          {/* ==========================================
              BOTTOM GRID: SCHEDULE & RECENT ACTIVITIES
             ========================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Col: Today's Schedule Timeline (7-span) */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-navy-500" />
                Today's Schedule & Ward Activities
              </h2>

              {showLoading ? (
                <SkeletonTimeline />
              ) : showEmpty || databaseTimelineEvents.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-150 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center py-16">
                  <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">No Activities Found</h3>
                  <p className="text-xs text-slate-400 mt-1">There are no medical timeline records or scheduled notes logged in active admissions.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                  <div className="relative border-l-2 border-slate-100 pl-6 space-y-6 max-h-[500px] overflow-y-auto pr-1">
                    {databaseTimelineEvents.map((item, idx) => (
                      <div key={idx} className="relative">

                        {/* Activity Bullet Node */}
                        <span className="absolute -left-[31px] top-0.5 rounded-full border-4 border-white p-1 shadow-sm shrink-0 bg-navy-500 text-white">
                          <Clock className="h-3 w-3" />
                        </span>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-navy-600 bg-navy-50 border border-navy-100 px-2 py-0.5 rounded">
                              {item.time || new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <h4 className="text-xs font-bold text-slate-800">
                              {item.patientName} (Room {item.roomNumber})
                            </h4>
                          </div>

                          {/* Event Type badge */}
                          <span className="self-start text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-navy-50 text-navy-700 border border-navy-100">
                            {item.eventType || "Care Entry"}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed max-w-xl">
                          {item.description}
                        </p>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Logged by: <strong className="font-semibold">{item.userName}</strong> ({item.userRole})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Recent Activity Feed (5-span) */}
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-navy-500" />
                Recent EMR Log Entries
              </h2>

              {showLoading ? (
                <SkeletonActivity />
              ) : showEmpty || recentShiftActivities.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-155 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center py-16">
                  <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">No EMR Logs today</h3>
                  <p className="text-xs text-slate-400 mt-1">Activities logged during this supervisor shift will appear here.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1">
                    {recentShiftActivities.map((act, index) => {
                      const Icon = act.icon;
                      return (
                        <div key={index} className="flex gap-3 py-3.5 first:pt-0 last:pb-0 items-start hover:bg-slate-50 transition-colors px-1 rounded-lg">
                          <div className={`p-2 rounded-xl shrink-0 ${act.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-slate-700 leading-normal">
                              {act.message}
                            </p>
                            <span className="text-[10px] text-slate-405 font-mono font-medium block">
                              {act.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==========================================
          ACTION OVERLAYS / DRAWERS
         ========================================== */}
      {activeDrawer && createPortal(
        <div
          className="fixed inset-0 bg-transparent z-[999] transition-opacity duration-300 flex justify-end animate-in fade-in"
          onClick={() => setActiveDrawer(null)}
        >
          {/* Drawer Content Body */}
          <div
            className="w-full max-w-md bg-white h-screen shadow-2xl p-5 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-350 border-l border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Drawer Header */}
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-navy-600 bg-navy-50 border border-navy-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Nurse bedside utility
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 capitalize mt-1.5 flex items-center gap-2">
                    {activeDrawer === "patients" && <><Users className="h-5 w-5 text-navy-500" /> Assigned Patient Roster</>}
                    {activeDrawer === "vitals" && <><Thermometer className="h-5 w-5 text-rose-500" /> Bedside Vital Signs Entry</>}
                    {activeDrawer === "meds" && <><Pill className="h-5 w-5 text-indigo-500" /> Medication Dispense Chart</>}
                    {activeDrawer === "notes" && <><FileEdit className="h-5 w-5 text-violet-500" /> Log Clinical Progress Note</>}
                    {activeDrawer === "bedside" && <><Heart className="h-5 w-5 text-pink-500" /> Bedside Shift Care Plan</>}
                    {activeDrawer === "alerts" && <><ShieldAlert className="h-5 w-5 text-red-500" /> Emergency Alerts Panel</>}
                    {activeDrawer === "handover" && <><CalendarDays className="h-5 w-5 text-amber-500" /> Shift Handoff Sync Checklist</>}
                    {activeDrawer === "discharge" && <><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Inpatient Discharge Checklist</>}
                  </h3>
                </div>

                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-800 cursor-pointer transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Content Inner */}
              <div className="mt-6 space-y-6">

                {/* 1. ASSIGNED PATIENTS LISTING */}
                {activeDrawer === "patients" && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search roster by patient name, UHID, room..."
                        value={searchPatientQuery}
                        onChange={(e) => setSearchPatientQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 outline-none focus:border-navy-500 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                      {filteredPatients.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">No assigned patient found matching search.</p>
                      ) : (
                        filteredPatients.map((item: any, idx: number) => {
                          const patientData = item.patient || {};
                          const roomData = item.room || {};
                          const bedData = item.bed || {};
                          const isSelected = selectedPatientId === (patientData._id || item._id);

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedPatientId(patientData._id || item._id);
                                toast.success(`Active selection: ${patientData.name}`);
                              }}
                              className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                                  ? "bg-navy-50/50 border-navy-300 ring-1 ring-navy-300"
                                  : "bg-slate-50/50 border-slate-150 hover:bg-slate-55 hover:border-slate-350"
                                }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-800">{patientData.name || "Unknown Patient"}</h4>
                                  <p className="text-[10px] text-slate-450 mt-0.5">UHID: {patientData.uhid || "—"} · {patientData.gender || "—"}, {patientData.age || "—"} yrs</p>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${item.priority === "Emergency" || item.priority === "Urgent"
                                    ? "bg-rose-50 text-rose-700 border border-rose-100"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  }`}>
                                  {item.priority || "Routine"}
                                </span>
                              </div>

                              <div className="border-t border-dashed border-slate-200 my-3" />

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-semibold text-slate-550">
                                <div>Room: <strong className="text-slate-700">{roomData.roomNumber || "N/A"}</strong></div>
                                <div>Bed: <strong className="text-slate-700">{bedData.bedNumber || "N/A"}</strong></div>
                                <div>Allergies: <strong className="text-rose-650">{patientData.allergies || "None"}</strong></div>
                                <div>Blood: <strong className="text-slate-700">{patientData.bloodGroup || "N/A"}</strong></div>
                              </div>

                              <div className="mt-2 text-[10px]">
                                <span className="text-slate-455">Admitting Doctor: </span>
                                <strong className="text-slate-655 font-bold">{item.admittingDoctor?.name || "On Call Duty Doctor"}</strong>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 2. RECORD VITALS FORM */}
                {activeDrawer === "vitals" && (
                  (() => {
                    const selectedAdmission = currentInpatients.find(
                      (item: any) => (item.patient?._id || item._id) === selectedPatientId
                    );
                    const previousVitals = selectedAdmission?.vitals
                      ? [...selectedAdmission.vitals].reverse()
                      : [];

                    return (
                      <div className="space-y-6">
                        <form onSubmit={handleSubmitVitals} className="space-y-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Select Patient</label>
                            <select
                              required
                              value={selectedPatientId}
                              onChange={(e) => {
                                setSelectedPatientId(e.target.value);
                                setEditingVitalId(null);
                              }}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                              <option value="">-- Choose Assigned Patient --</option>
                              {currentInpatients.map((p: any, idx) => (
                                <option key={idx} value={p.patient?._id || p._id}>
                                  {p.patient?.name} (Room {p.room?.roomNumber || "N/A"})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Temp */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Temperature (°F)</label>
                              <input
                                type="text"
                                placeholder="e.g. 98.6"
                                value={vitalsTemp}
                                onChange={(e) => setVitalsTemp(e.target.value)}
                                className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus:border-navy-500 ${isVitalAbnormal("temp", vitalsTemp) ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200"
                                  }`}
                              />
                            </div>
                            {/* Pulse */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Pulse Rate (bpm)</label>
                              <input
                                type="text"
                                placeholder="e.g. 72"
                                value={vitalsPulse}
                                onChange={(e) => setVitalsPulse(e.target.value)}
                                className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus:border-navy-500 ${isVitalAbnormal("pulse", vitalsPulse) ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200"
                                  }`}
                              />
                            </div>
                            {/* BP */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Blood Pressure</label>
                              <input
                                type="text"
                                placeholder="e.g. 120/80"
                                value={vitalsBp}
                                onChange={(e) => setVitalsBp(e.target.value)}
                                className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus:border-navy-500 ${isVitalAbnormal("bp", vitalsBp) ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200"
                                  }`}
                              />
                            </div>
                            {/* Resp */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Respiratory Rate</label>
                              <input
                                type="text"
                                placeholder="e.g. 16"
                                value={vitalsResp}
                                onChange={(e) => setVitalsResp(e.target.value)}
                                className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus:border-navy-500 ${isVitalAbnormal("resp", vitalsResp) ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200"
                                  }`}
                              />
                            </div>
                            {/* SpO2 */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Oxygen Saturation (%)</label>
                              <input
                                type="text"
                                placeholder="e.g. 98"
                                value={vitalsO2}
                                onChange={(e) => setVitalsO2(e.target.value)}
                                className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus:border-navy-500 ${isVitalAbnormal("spo2", vitalsO2) ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200"
                                  }`}
                              />
                            </div>
                            {/* Sugar */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Blood Sugar (mg/dL)</label>
                              <input
                                type="text"
                                placeholder="e.g. 110"
                                value={vitalsBloodSugar}
                                onChange={(e) => setVitalsBloodSugar(e.target.value)}
                                className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus:border-navy-500 ${isVitalAbnormal("sugar", vitalsBloodSugar) ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200"
                                  }`}
                              />
                            </div>
                            {/* Height */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Height (cm)</label>
                              <input
                                type="text"
                                placeholder="e.g. 175"
                                value={vitalsHeight}
                                onChange={(e) => setVitalsHeight(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                              />
                            </div>
                            {/* Weight */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Weight (kg)</label>
                              <input
                                type="text"
                                placeholder="e.g. 70"
                                value={vitalsWeight}
                                onChange={(e) => setVitalsWeight(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                              />
                            </div>
                          </div>

                          {/* Auto BMI */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">BMI (Auto-calculated)</label>
                            <input
                              type="text"
                              readOnly
                              placeholder="—"
                              value={vitalsBmi}
                              className="w-full rounded-xl border border-slate-100 bg-slate-105 px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-not-allowed"
                            />
                          </div>


                          {/* Observation Notes */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Observation Notes</label>
                            <textarea
                              rows={2}
                              placeholder="Log physical signs, comments, or clinical remarks..."
                              value={vitalsObservationNotes}
                              onChange={(e) => setVitalsObservationNotes(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium focus:border-navy-500 outline-none resize-none"
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              type="submit"
                              disabled={vitalsSubmitting}
                              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-98"
                            >
                              {vitalsSubmitting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                              ) : editingVitalId ? (
                                <><FileEdit className="h-4 w-4" /> Update Record</>
                              ) : (
                                <><Save className="h-4 w-4" /> Save Record</>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={resetVitalsForm}
                              className="px-4 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-98"
                            >
                              Reset Form
                            </button>
                          </div>
                        </form>

                        {/* Previous Vitals List Display */}
                        <div className="border-t border-slate-100 pt-6">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-rose-500" />
                            Previous Vital Sign Logs
                          </h4>
                          {previousVitals.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic text-center py-6 bg-slate-50 border border-slate-100 rounded-xl">
                              No previous vital signs logged for this patient.
                            </p>
                          ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                              {previousVitals.map((v: any, vIdx: number) => (
                                <div
                                  key={v._id || vIdx}
                                  className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2.5 relative group hover:border-navy-200 transition-colors"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-[10px] text-slate-450 font-bold">
                                        {v.recordedAt ? new Date(v.recordedAt).toLocaleString() : "Date Unknown"}
                                      </p>
                                      <p className="text-[9px] text-slate-400 mt-0.5">
                                        Logged by: <strong className="font-semibold text-slate-600">{v.recordedBy || "Unknown"}</strong>
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleEditVitalClick(v)}
                                      className="text-[9px] font-bold text-navy-700 hover:text-navy-900 bg-white border border-slate-200 hover:border-navy-200 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                                    >
                                      <FileEdit className="h-3 w-3" /> Edit
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-[10px] font-semibold text-slate-500">
                                    <div>
                                      Temp: <span className={`font-bold ${isVitalAbnormal("temp", v.temperature) ? "text-red-650 font-bold bg-red-50 border border-red-200 px-1 rounded" : "text-slate-800"}`}>{v.temperature ? `${v.temperature}°F` : "—"}</span>
                                    </div>
                                    <div>
                                      Pulse: <span className={`font-bold ${isVitalAbnormal("pulse", v.pulseRate) ? "text-red-650 font-bold bg-red-50 border border-red-200 px-1 rounded" : "text-slate-800"}`}>{v.pulseRate ? `${v.pulseRate} bpm` : "—"}</span>
                                    </div>
                                    <div>
                                      BP: <span className={`font-bold ${isVitalAbnormal("bp", v.bloodPressure) ? "text-red-650 font-bold bg-red-50 border border-red-200 px-1 rounded" : "text-slate-800"}`}>{v.bloodPressure || "—"}</span>
                                    </div>
                                    <div>
                                      Resp Rate: <span className={`font-bold ${isVitalAbnormal("resp", v.respiratoryRate) ? "text-red-655 font-bold bg-red-50 border border-red-200 px-1 rounded" : "text-slate-800"}`}>{v.respiratoryRate ? `${v.respiratoryRate} /min` : "—"}</span>
                                    </div>
                                    <div>
                                      SpO₂: <span className={`font-bold ${isVitalAbnormal("spo2", v.oxygenSaturation) ? "text-red-650 font-bold bg-red-50 border border-red-200 px-1 rounded" : "text-slate-800"}`}>{v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"}</span>
                                    </div>
                                    <div>
                                      Sugar: <span className={`font-bold ${isVitalAbnormal("sugar", v.bloodSugar) ? "text-red-650 font-bold bg-red-50 border border-red-200 px-1 rounded" : "text-slate-800"}`}>{v.bloodSugar ? `${v.bloodSugar} mg/dL` : "—"}</span>
                                    </div>
                                    <div>Height: <strong className="text-slate-700">{v.height ? `${v.height} cm` : "—"}</strong></div>
                                    <div>Weight: <strong className="text-slate-700">{v.weight ? `${v.weight} kg` : "—"}</strong></div>
                                    <div>BMI: <strong className="text-slate-700">{v.bmi || "—"}</strong></div>
                                  </div>



                                  {v.observationNotes && (
                                    <div className="bg-white border border-slate-100 p-2 rounded-lg text-[10px] text-slate-500 italic leading-relaxed">
                                      <strong>Observation:</strong> {v.observationNotes}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* 3. MEDICATION CHART */}
                {activeDrawer === "meds" && (
                  (() => {
                    const selectedAdmission = currentInpatients.find(
                      (item: any) => (item.patient?._id || item._id) === selectedPatientId
                    );
                    const prescriptions = selectedAdmission?.medicationOrders || [];

                    return (
                      <div className="space-y-6">
                        {/* Selected Patient Selector */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Select Patient</label>
                          <select
                            required
                            value={selectedPatientId}
                            onChange={(e) => {
                              setSelectedPatientId(e.target.value);
                              setSelectedMedOrderId(null);
                              setMedAction(null);
                            }}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <option value="">-- Choose Assigned Patient --</option>
                            {currentInpatients.map((p: any, idx) => (
                              <option key={idx} value={p.patient?._id || p._id}>
                                {p.patient?.name} (Room {p.room?.roomNumber || "N/A"})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selected Medication Action Form */}
                        {selectedMedOrderId && medAction && (
                          (() => {
                            const targetMed = prescriptions.find((m: any) => m._id === selectedMedOrderId);
                            return (
                              <form onSubmit={handleMedicationActionSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top duration-205">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                  <h4 className="text-xs font-bold text-slate-700">
                                    Log Action: <span className="text-navy-600">{targetMed?.drugName}</span>
                                  </h4>
                                  <span className="text-[10px] font-bold text-slate-500 bg-white border px-2 py-0.5 rounded-lg uppercase tracking-wide">
                                    {medAction}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  {/* Administration Time */}
                                  {medAction === "Administered" && (
                                    <div className="col-span-2">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Administration Time</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. 09:30 AM"
                                        value={medAdminTime}
                                        onChange={(e) => setMedAdminTime(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none bg-white"
                                      />
                                    </div>
                                  )}

                                  {/* Reschedule Time */}
                                  {medAction === "Rescheduled" && (
                                    <div className="col-span-2">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">New Scheduled Time</label>
                                      <input
                                        type="text"
                                        required
                                        placeholder="e.g. 11:30 AM"
                                        value={medScheduledTime}
                                        onChange={(e) => setMedScheduledTime(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none bg-white"
                                      />
                                    </div>
                                  )}

                                  {/* Remarks */}
                                  <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                      Remarks {(medAction === "Skipped" || medAction === "Rescheduled") ? "(Required)" : "(Optional)"}
                                    </label>
                                    <textarea
                                      rows={2}
                                      required={medAction === "Skipped" || medAction === "Rescheduled"}
                                      placeholder={
                                        medAction === "Skipped"
                                          ? "Detail why this dose is being skipped (e.g. patient sleeping, out for scan)..."
                                          : medAction === "Rescheduled"
                                            ? "Detail justification for schedule change (e.g. physician instruction)..."
                                            : "e.g. Well tolerated, taken with meals..."
                                      }
                                      value={medRemarks}
                                      onChange={(e) => setMedRemarks(e.target.value)}
                                      className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium focus:border-navy-500 outline-none resize-none bg-white"
                                    />
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    disabled={medSubmitting}
                                    className="flex-1 bg-navy-600 hover:bg-navy-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1 text-xs shadow-sm cursor-pointer transition-all active:scale-98"
                                  >
                                    {medSubmitting ? (
                                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Logging...</>
                                    ) : (
                                      <>Submit Log</>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMedOrderId(null);
                                      setMedAction(null);
                                    }}
                                    className="px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-xl font-bold text-xs cursor-pointer transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            );
                          })()
                        )}

                        {/* Prescribed Medications Table */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Pill className="h-4 w-4 text-indigo-500" />
                            Doctor Prescriptions (Read Only)
                          </h4>

                          {prescriptions.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic text-center py-6 bg-slate-50 border border-slate-100 rounded-xl">
                              No active prescriptions prescribed by doctors for this patient.
                            </p>
                          ) : (
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                              {prescriptions.map((med: any, idx: number) => (
                                <div key={med._id || idx} className="p-3.5 bg-slate-50 border border-slate-155 rounded-xl space-y-3 hover:border-indigo-250 transition-colors">

                                  {/* Medicine Card Metadata */}
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-800">{med.drugName}</h5>
                                      <p className="text-[10px] text-slate-450 mt-0.5">
                                        Route: <strong className="text-slate-700">{med.route || "Oral"}</strong> · Dose: <strong className="text-slate-700">{med.dosage}</strong>
                                      </p>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${med.status === "active" || med.status === "resumed"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                        : "bg-amber-50 text-amber-700 border border-amber-100"
                                      }`}>
                                      {med.status || "active"}
                                    </span>
                                  </div>

                                  {/* Table Metrics */}
                                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                                    <div>Frequency: <strong className="text-slate-700">{med.frequency}</strong></div>
                                    <div>Duration: <strong className="text-slate-700">{med.duration}</strong></div>
                                    <div>Scheduled: <strong className="text-indigo-700 font-bold">{med.scheduledTime || "Not Set"}</strong></div>
                                    <div className="col-span-3 text-[9px] text-slate-400 border-t border-slate-100 pt-1 mt-1">
                                      Prescribed by: <strong className="font-semibold text-slate-650">{med.prescribingDoctorName}</strong>
                                    </div>
                                  </div>

                                  {/* Nurse Action Controls (The nurse can only administer/skip/reschedule) */}
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMedOrderId(med._id);
                                        setMedAction("Administered");
                                        setMedAdminTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                                      }}
                                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors active:scale-98 flex items-center justify-center gap-1 shadow-sm"
                                    >
                                      Administer
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMedOrderId(med._id);
                                        setMedAction("Skipped");
                                      }}
                                      className="flex-1 py-1.5 bg-rose-50 border border-rose-200 text-rose-750 hover:bg-rose-100 font-bold text-[10px] rounded-lg cursor-pointer transition-colors active:scale-98 flex items-center justify-center gap-1"
                                    >
                                      Skip
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMedOrderId(med._id);
                                        setMedAction("Rescheduled");
                                      }}
                                      className="flex-1 py-1.5 bg-amber-50 border border-amber-200 text-amber-750 hover:bg-amber-100 font-bold text-[10px] rounded-lg cursor-pointer transition-colors active:scale-98 flex items-center justify-center gap-1"
                                    >
                                      Reschedule
                                    </button>
                                  </div>

                                  {/* Administration Logs History */}
                                  {med.administrationLogs && med.administrationLogs.length > 0 && (
                                    <div className="border-t border-dashed border-slate-200 pt-2.5 mt-2 space-y-2">
                                      <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Administration History</h6>
                                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                        {med.administrationLogs.map((log: any, lIdx: number) => (
                                          <div key={log._id || lIdx} className="bg-white border border-slate-100 p-2 rounded-lg text-[9px] text-slate-500 space-y-1">
                                            <div className="flex justify-between items-center font-bold">
                                              <span className={`px-1.5 py-0.2 rounded text-[8px] uppercase ${log.action === "Administered"
                                                  ? "bg-emerald-50 text-emerald-700"
                                                  : log.action === "Skipped"
                                                    ? "bg-rose-50 text-rose-700"
                                                    : "bg-amber-50 text-amber-700"
                                                }`}>{log.action}</span>
                                              <span className="text-[8px] text-slate-400">
                                                {new Date(log.timestamp).toLocaleString()}
                                              </span>
                                            </div>
                                            {log.scheduledTime && (
                                              <div>Schedule: <strong className="text-slate-700">{log.scheduledTime}</strong></div>
                                            )}
                                            {log.administrationTime && (
                                              <div>Admin Time: <strong className="text-slate-700">{log.administrationTime}</strong></div>
                                            )}
                                            {log.remarks && (
                                              <div className="italic bg-slate-50/50 p-1 rounded text-slate-450 mt-0.5">Remarks: {log.remarks}</div>
                                            )}
                                            <div className="text-[8px] text-slate-400 mt-0.5 text-right font-medium">
                                              Nurse Signature: <strong className="font-semibold text-slate-600">{log.nurseName}</strong>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* 4. DAILY NURSING NOTES */}
                {activeDrawer === "notes" && (
                  (() => {
                    const selectedAdmission = currentInpatients.find(
                      (item: any) => (item.patient?._id || item._id) === selectedPatientId
                    );

                    const docNotes = (selectedAdmission?.progressNotes || []).map((n: any) => ({
                      ...n,
                      _id: n._id || n.id,
                      noteType: "doctor",
                      recordedByName: n.doctorName || "Doctor",
                      recordedAt: n.date ? new Date(n.date) : new Date(),
                      additionalNotes: n.notes || "",
                      treatmentProgress: n.assessment || "",
                      observationType: "Progress Note"
                    }));

                    const nurseNotes = (selectedAdmission?.nursingNotes || []).map((n: any) => ({
                      ...n,
                      noteType: "nurse",
                      recordedAt: n.recordedAt ? new Date(n.recordedAt) : new Date()
                    }));

                    const allNotes = [...docNotes, ...nurseNotes].sort(
                      (a: any, b: any) => b.recordedAt.getTime() - a.recordedAt.getTime()
                    );

                    const filteredNotes = allNotes.filter((n: any) => {
                      if (nurseNoteFilterType === "Doctor Notes" && n.noteType !== "doctor") return false;
                      if (nurseNoteFilterType === "Nurse Notes" && n.noteType !== "nurse") return false;

                      if (nurseNoteSearchQuery.trim() !== "") {
                        const query = nurseNoteSearchQuery.toLowerCase();
                        const matchesContent = (n.additionalNotes || "").toLowerCase().includes(query) ||
                          (n.treatmentProgress || "").toLowerCase().includes(query) ||
                          (n.observationType || "").toLowerCase().includes(query) ||
                          (n.recordedByName || "").toLowerCase().includes(query);
                        return matchesContent;
                      }

                      return true;
                    });

                    return (
                      <div className="space-y-6">

                        {/* Selector and Main Form */}
                        <form onSubmit={handleSubmitNurseNote} className="space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <FileEdit className="h-4 w-4 text-violet-500" />
                              {editingNurseNoteId ? "Edit Nursing Note" : "Log Daily Nursing Note"}
                            </h4>
                            {editingNurseNoteId && (
                              <button
                                type="button"
                                onClick={resetNurseNoteForm}
                                className="text-[10px] text-rose-600 font-bold hover:underline"
                              >
                                Cancel Edit
                              </button>
                            )}
                          </div>

                          {/* Patient Selector */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Select Patient</label>
                            <select
                              required
                              value={selectedPatientId}
                              onChange={(e) => {
                                setSelectedPatientId(e.target.value);
                                resetNurseNoteForm();
                              }}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <option value="">-- Choose Patient Chart --</option>
                              {currentInpatients.map((p: any, idx) => (
                                <option key={idx} value={p.patient?._id || p._id}>
                                  {p.patient?.name} (Room {p.room?.roomNumber || "N/A"})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Observation Type */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Observation Type</label>
                              <select
                                value={noteObservationType}
                                onChange={(e) => setNoteObservationType(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none cursor-pointer"
                              >
                                <option value="Routine">Routine Round</option>
                                <option value="Post-Op">Post-Operative</option>
                                <option value="Emergency">Emergency Alert</option>
                                <option value="ICU Round">ICU Intensive Round</option>
                                <option value="Discharge Check">Discharge Check</option>
                              </select>
                            </div>



                            {/* Mobility */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Mobility Status</label>
                              <input
                                type="text"
                                placeholder="e.g. Ambulatory / Bed Rest"
                                value={noteMobility}
                                onChange={(e) => setNoteMobility(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                              />
                            </div>

                            {/* Mental Status */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Mental Status</label>
                              <input
                                type="text"
                                placeholder="e.g. Alert & Oriented x3"
                                value={noteMentalStatus}
                                onChange={(e) => setNoteMentalStatus(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                              />
                            </div>

                            {/* Skin Condition */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Skin Condition</label>
                              <input
                                type="text"
                                placeholder="e.g. Intact, dry, warm"
                                value={noteSkinCondition}
                                onChange={(e) => setNoteSkinCondition(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                              />
                            </div>

                            {/* Diet */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Diet Description</label>
                              <input
                                type="text"
                                placeholder="e.g. Liquid Diet / Regular"
                                value={noteDiet}
                                onChange={(e) => setNoteDiet(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                              />
                            </div>

                            {/* Fluid Intake */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Fluid Intake (mL)</label>
                              <input
                                type="text"
                                placeholder="e.g. 500 ml IV"
                                value={noteFluidIntake}
                                onChange={(e) => setNoteFluidIntake(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                              />
                            </div>

                            {/* Output */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Output / Urine (mL)</label>
                              <input
                                type="text"
                                placeholder="e.g. 350 ml void"
                                value={noteOutput}
                                onChange={(e) => setNoteOutput(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                              />
                            </div>
                          </div>

                          {/* Wound Care */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Wound Care / Dressing remarks</label>
                            <input
                              type="text"
                              placeholder="e.g. Clean dry dressing applied..."
                              value={noteWoundCare}
                              onChange={(e) => setNoteWoundCare(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                            />
                          </div>

                          {/* Treatment Progress */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Treatment Progress / Remarks</label>
                            <input
                              type="text"
                              placeholder="e.g. Improving patient hemodynamics..."
                              value={noteTreatmentProgress}
                              onChange={(e) => setNoteTreatmentProgress(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                            />
                          </div>

                          {/* Additional Notes */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Additional Observations / Notes</label>
                            <textarea
                              rows={2}
                              placeholder="Describe any other clinical findings..."
                              value={noteAdditionalNotes}
                              onChange={(e) => setNoteAdditionalNotes(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium focus:border-navy-500 outline-none resize-none"
                            />
                          </div>

                          {/* Submit Actions */}
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={nurseNoteSubmitting}
                              className="flex-1 bg-violet-650 hover:bg-violet-750 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 text-xs shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-98"
                            >
                              {nurseNoteSubmitting ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...</>
                              ) : editingNurseNoteId ? (
                                <><FileEdit className="h-3.5 w-3.5" /> Update Daily Note</>
                              ) : (
                                <><Save className="h-3.5 w-3.5" /> Save Daily Note</>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={resetNurseNoteForm}
                              className="px-4 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer transition-all"
                            >
                              Reset Form
                            </button>
                          </div>
                        </form>

                        {/* History Timeline */}
                        <div className="border-t border-slate-100 pt-6 space-y-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-violet-500" />
                            Clinical Notes History Timeline
                          </h4>

                          {/* Search & Filter Inputs */}
                          <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Search notes content..."
                                value={nurseNoteSearchQuery}
                                onChange={(e) => setNurseNoteSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 outline-none focus:border-navy-500 text-xs font-medium"
                              />
                            </div>
                            <select
                              value={nurseNoteFilterType}
                              onChange={(e) => setNurseNoteFilterType(e.target.value)}
                              className="rounded-xl border border-slate-200 px-3 py-1.5 outline-none focus:border-navy-500 text-xs font-bold cursor-pointer"
                            >
                              <option>All Notes</option>
                              <option>Nurse Notes</option>
                              <option>Doctor Notes</option>
                            </select>
                          </div>

                          {/* History Listing */}
                          {filteredNotes.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic text-center py-6 bg-slate-50 border border-slate-100 rounded-xl">
                              No matching clinical progress notes found for this patient.
                            </p>
                          ) : (
                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                              {filteredNotes.map((note: any, idx: number) => {
                                const isDoctor = note.noteType === "doctor";
                                const isOwnNurseNote = !isDoctor && staff && note.recordedBy?.toString() === staff._id?.toString();

                                return (
                                  <div
                                    key={note._id || idx}
                                    className={`p-3.5 border rounded-xl space-y-2 relative transition-colors ${isDoctor
                                        ? "bg-blue-50/40 border-blue-150"
                                        : "bg-slate-50 border-slate-150 hover:border-violet-200"
                                      }`}
                                  >
                                    {/* Note Metadata Header */}
                                    <div className="flex justify-between items-start gap-2">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${isDoctor
                                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                                              : "bg-violet-100 text-violet-750 border border-violet-200"
                                            }`}>
                                            {isDoctor ? "Doctor Note" : `Nurse Note · ${note.observationType}`}
                                          </span>
                                          <span className="text-[10px] text-slate-450 font-bold">
                                            {note.recordedAt.toLocaleString()}
                                          </span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-0.5">
                                          Signed by: <strong className="font-semibold text-slate-600">{note.recordedByName}</strong> {isDoctor && <span className="text-slate-400 font-normal">(Physician)</span>}
                                        </p>
                                      </div>

                                      {/* Actions: Edit/Delete (Doctors' notes are strictly read-only) */}
                                      {!isDoctor && isOwnNurseNote && (
                                        <div className="flex gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleEditNurseNoteClick(note)}
                                            className="text-[9px] font-bold text-navy-700 hover:text-navy-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm cursor-pointer transition-colors"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteNurseNoteClick(note._id || note.id)}
                                            className="text-[9px] font-bold text-rose-700 hover:text-rose-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm cursor-pointer transition-colors"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Clinical Metrics Grid (Only for nursing notes) */}
                                    {!isDoctor && (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 text-[9px] font-semibold text-slate-550 bg-white p-2 rounded-lg border border-slate-100">
                                        <div>Mobility: <strong className="text-slate-700">{note.mobility || "—"}</strong></div>
                                        <div>Mental: <strong className="text-slate-700">{note.mentalStatus || "—"}</strong></div>
                                        <div>Skin: <strong className="text-slate-700">{note.skinCondition || "—"}</strong></div>
                                        <div>Diet: <strong className="text-slate-700">{note.diet || "—"}</strong></div>
                                        <div>Intake: <strong className="text-slate-750">{note.fluidIntake || "—"}</strong></div>
                                        <div>Output: <strong className="text-slate-750">{note.output || "—"}</strong></div>
                                        <div className="col-span-2">Wound Care: <strong className="text-slate-700">{note.woundCare || "None"}</strong></div>
                                      </div>
                                    )}

                                    {/* Main Note Contents */}
                                    <div className="text-[10px] text-slate-655 leading-relaxed bg-white/70 border border-slate-100/50 p-2.5 rounded-lg space-y-1">
                                      {isDoctor && note.plan && (
                                        <div>
                                          <span className="font-bold text-blue-700">Plan:</span> {note.plan}
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-bold text-slate-700">{isDoctor ? "Notes:" : "Progress / Notes:"}</span>{" "}
                                        {note.additionalNotes || note.treatmentProgress || "No text remarks logged."}
                                      </div>
                                    </div>

                                    {note.modifiedAt && (
                                      <span className="text-[8px] text-slate-400 italic block text-right font-medium">
                                        Edited on: {new Date(note.modifiedAt).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* 5. BEDSIDE CARE PLAN */}
                {activeDrawer === "bedside" && (
                  (() => {
                    const selectedAdmission = currentInpatients.find(
                      (item: any) => (item.patient?._id || item._id) === selectedPatientId
                    );

                    const completedCount = [
                      bedsideBedPosition, bedsidePatientHygiene, bedsideOralCare, bedsideBathGiven,
                      bedsideDressingChanged, bedsideIvLineChecked, bedsideCatheterCare, bedsidePressureUlcerPrev,
                      bedsideFallPrevention, bedsideMobilityAssist, bedsideOxygenSupport, bedsideNutrition,
                      bedsideFluidIntake, bedsideOutputMonitoring
                    ].filter(Boolean).length;

                    const progressPercent = Math.round((completedCount / 14) * 100);

                    const previousLogs = selectedAdmission?.bedsideCareLogs || [];

                    return (
                      <form onSubmit={(e) => handleSaveBedsideChecks(e)} className="space-y-5">

                        {/* Selector */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Select Patient</label>
                          <select
                            value={selectedPatientId}
                            onChange={(e) => setSelectedPatientId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {currentInpatients.map((p: any, idx) => (
                              <option key={idx} value={p.patient?._id || p._id}>
                                {p.patient?.name} (Room {p.room?.roomNumber || "N/A"})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 bg-pink-50/20 border border-pink-100 p-3.5 rounded-2xl">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>Checklist Progress</span>
                            <span className="text-pink-650 bg-pink-50 px-2 py-0.5 rounded text-[10px] font-bold">
                              {progressPercent}% ({completedCount}/14 done)
                            </span>
                          </div>
                          <div className="w-full bg-slate-150 h-2.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-pink-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Responsive Checklist Grid */}
                        <div className="space-y-2.5">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Daily Bedside Nursing Checklist</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/50 border border-slate-150 rounded-2xl">

                            {[
                              { label: "Bed Position", val: bedsideBedPosition, set: setBedsideBedPosition },
                              { label: "Patient Hygiene", val: bedsidePatientHygiene, set: setBedsidePatientHygiene },
                              { label: "Oral Care", val: bedsideOralCare, set: setBedsideOralCare },
                              { label: "Bath Given", val: bedsideBathGiven, set: setBedsideBathGiven },
                              { label: "Dressing Changed", val: bedsideDressingChanged, set: setBedsideDressingChanged },
                              { label: "IV Line Checked", val: bedsideIvLineChecked, set: setBedsideIvLineChecked },
                              { label: "Catheter Care", val: bedsideCatheterCare, set: setBedsideCatheterCare },
                              { label: "Pressure Ulcer Prevention", val: bedsidePressureUlcerPrev, set: setBedsidePressureUlcerPrev },
                              { label: "Fall Prevention", val: bedsideFallPrevention, set: setBedsideFallPrevention },
                              { label: "Mobility Assistance", val: bedsideMobilityAssist, set: setBedsideMobilityAssist },
                              { label: "Oxygen Support", val: bedsideOxygenSupport, set: setBedsideOxygenSupport },
                              { label: "Nutrition", val: bedsideNutrition, set: setBedsideNutrition },
                              { label: "Fluid Intake", val: bedsideFluidIntake, set: setBedsideFluidIntake },
                              { label: "Output Monitoring", val: bedsideOutputMonitoring, set: setBedsideOutputMonitoring },
                            ].map((item, idx) => (
                              <label
                                key={idx}
                                className="flex items-center gap-2.5 bg-white border border-slate-150 p-2.5 rounded-xl cursor-pointer hover:border-pink-300 transition-colors select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.val}
                                  onChange={(e) => item.set(e.target.checked)}
                                  className="rounded accent-pink-500 h-4.5 w-4.5 cursor-pointer shrink-0"
                                />
                                <span className={`text-[11px] font-semibold ${item.val ? "text-slate-500 line-through" : "text-slate-700"}`}>
                                  {item.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Completion Status & Remarks */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Completion Status</label>
                            <select
                              value={bedsideCompletionStatus}
                              onChange={(e) => setBedsideCompletionStatus(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none cursor-pointer"
                            >
                              <option value="Completed">Completed</option>
                              <option value="Partially Completed">Partially Completed</option>
                              <option value="In Progress">In Progress</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Completed By</label>
                            <input
                              type="text"
                              disabled
                              value={staff?.name || "Logged-in Nurse"}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Observation Remarks</label>
                          <input
                            type="text"
                            placeholder="e.g. Tolerated oral feeds, IV line patent..."
                            value={bedsideRemarks}
                            onChange={(e) => setBedsideRemarks(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                          />
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={bedsideSubmitting}
                            className="flex-1 bg-pink-650 hover:bg-pink-750 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm cursor-pointer transition-all active:scale-98"
                          >
                            {bedsideSubmitting ? (
                              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                            ) : (
                              <><Save className="h-4 w-4" /> Save Bedside Care Logs</>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={resetBedsideForm}
                            className="px-4 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer transition-all"
                          >
                            Reset
                          </button>
                        </div>

                        {/* Previous bedside care logs history display */}
                        <div className="border-t border-slate-150 pt-4 space-y-3">
                          <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Previous bedside logs</h5>
                          {previousLogs.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              No previous bedside care logs recorded.
                            </p>
                          ) : (
                            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                              {previousLogs.map((log: any, lIdx: number) => {
                                const checkedItems = [
                                  log.bedPosition && "Bed Position",
                                  log.patientHygiene && "Patient Hygiene",
                                  log.oralCare && "Oral Care",
                                  log.bathGiven && "Bath Given",
                                  log.dressingChanged && "Dressing Changed",
                                  log.ivLineChecked && "IV Line Checked",
                                  log.catheterCare && "Catheter Care",
                                  log.pressureUlcerPrevention && "Pressure Ulcer Prevention",
                                  log.fallPrevention && "Fall Prevention",
                                  log.mobilityAssistance && "Mobility Assistance",
                                  log.oxygenSupport && "Oxygen Support",
                                  log.nutrition && "Nutrition",
                                  log.fluidIntake && "Fluid Intake",
                                  log.outputMonitoring && "Output Monitoring"
                                ].filter(Boolean);

                                return (
                                  <div key={log._id || lIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                      <span className={`px-2 py-0.5 rounded text-[8px] uppercase ${log.completionStatus === "Completed"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                          : log.completionStatus === "Partially Completed"
                                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                                            : "bg-blue-50 text-blue-700 border border-blue-100"
                                        }`}>
                                        {log.completionStatus}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-bold">
                                        {new Date(log.completedTime).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {checkedItems.map((item, iIdx) => (
                                        <span key={iIdx} className="bg-white border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded text-[9px] font-semibold shadow-sm">
                                          ✓ {item}
                                        </span>
                                      ))}
                                      {checkedItems.length === 0 && (
                                        <span className="text-[9px] text-slate-400 italic">No checklist items checked</span>
                                      )}
                                    </div>
                                    {log.remarks && (
                                      <p className="text-[9px] italic text-slate-500 bg-white border border-slate-100 p-1.5 rounded">
                                        Remarks: {log.remarks}
                                      </p>
                                    )}
                                    <div className="text-[9px] text-slate-400 text-right font-medium">
                                      Signed: <strong className="font-semibold text-slate-655">{log.completedBy}</strong>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </form>
                    );
                  })()
                )}

                {/* 6. EMERGENCY ALERTS PANEL */}
                {activeDrawer === "alerts" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex gap-3">
                      <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-800">Ward Emergency Admission Alerts</h4>
                        <p className="text-[11px] text-rose-750 font-medium">Use the alerts control below to review inpatient cases flagged as Urgent or Emergency triage status in the database.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Emergency Priority Patients</label>

                      {criticalCount === 0 ? (
                        <p className="text-xs text-slate-455 text-center py-6">All admitted inpatients categorized as routine priority.</p>
                      ) : (
                        currentInpatients
                          .filter((item: any) => item.priority === "Emergency" || item.priority === "Urgent")
                          .map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-4 rounded-xl border border-red-150 bg-red-50/50"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-extrabold text-slate-800">{item.patient?.name}</h4>
                                    <span className="text-[8px] font-extrabold px-1.5 rounded uppercase bg-red-650 text-white animate-pulse">
                                      {item.priority}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-1">UHID: {item.patient?.uhid} (Room {item.room?.roomNumber || "N/A"})</p>
                                  <p className="text-[10px] text-slate-655 mt-1 font-semibold">Reason: {item.admissionReason || "No admission notes logged."}</p>
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end mt-4">
                                <button
                                  onClick={() => {
                                    toast.success(`Priority verified for Room ${item.room?.roomNumber || "N/A"}`);
                                  }}
                                  className="px-3 py-1.5 text-[10px] font-bold bg-red-600 hover:bg-red-750 rounded-lg text-white cursor-pointer"
                                >
                                  Acknowledge Triage
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>

                    <div className="border-t border-dashed border-slate-200 my-4" />

                    {showCodeBlueInput ? (
                      <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-3 mt-4">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-5 w-5 text-red-650 animate-bounce" />
                          <span className="text-xs font-bold uppercase tracking-wider">Confirm Code Blue Activation</span>
                        </div>
                        <p className="text-[10px] text-red-800">
                          This will broadcast a hospital-wide critical alert for emergency resuscitation.
                        </p>
                        <div>
                          <label className="block text-[9px] font-bold text-red-700 uppercase mb-1">Target Patient Room / Area</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Room 201-A, ICU Bed 3"
                            value={codeBlueRoom}
                            onChange={(e) => setCodeBlueRoom(e.target.value)}
                            className="w-full rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold focus:border-red-500 bg-white outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!codeBlueRoom.trim()) {
                                toast.error("Please enter a room code");
                                return;
                              }
                              toast.error(`!!! CRITICAL ALERT: CODE BLUE DISPATCHED TO ${codeBlueRoom.toUpperCase()} !!!`, { duration: 8000 });
                              setShowCodeBlueInput(false);
                              setCodeBlueRoom("");
                            }}
                            className="flex-1 py-1.5 bg-red-600 hover:bg-red-750 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            DISPATCH NOW
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCodeBlueInput(false);
                              setCodeBlueRoom("");
                            }}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setShowCodeBlueInput(true);
                        }}
                        className="w-full bg-red-655 hover:bg-red-700 text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md cursor-pointer transition-all active:scale-98 animate-pulse"
                      >
                        <AlertTriangle className="h-4.5 w-4.5" /> INITIATE EMERGENCY CODE BLUE
                      </button>
                    )}
                  </div>
                )}

                {/* 7. SHIFT HANDOVER FORM */}
                {activeDrawer === "handover" && (
                  <form onSubmit={handleSubmitHandover} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Select Patient context</label>
                      <select
                        required
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                      >
                        <option value="">-- Choose Assigned Patient --</option>
                        {currentInpatients.map((p: any, idx) => (
                          <option key={idx} value={p.patient?._id || p._id}>
                            {p.patient?.name} (Room {p.room?.roomNumber || "N/A"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 border border-slate-150 rounded-xl p-3 bg-slate-50/50">
                      {handoverChecks.map((check) => (
                        <div
                          key={check.id}
                          onClick={() => {
                            setHandoverChecks(prev => prev.map(c => c.id === check.id ? { ...c, done: !c.done } : c));
                          }}
                          className="flex items-center gap-2 py-1.5 cursor-pointer"
                        >
                          <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${check.done ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300 bg-white"
                            }`}>
                            {check.done && <CheckCircle className="h-3 w-3" />}
                          </span>
                          <span className="text-xs font-semibold text-slate-705">{check.label}</span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Shift Handover Summary Details</label>
                      <textarea
                        rows={4}
                        placeholder="Detail any telemetry updates, critical dosage administration, or physician verbal orders to carry over..."
                        value={handoverSummary}
                        onChange={(e) => setHandoverSummary(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-navy-500 outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Outgoing Staff Signature</label>
                      <input
                        required
                        type="text"
                        placeholder="Type Full Name (e.g. Sarah Jenkins, RN)"
                        value={handoverNurseSign}
                        onChange={(e) => setHandoverNurseSign(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus:border-navy-500 outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-4 bg-amber-655 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm cursor-pointer transition-all active:scale-98"
                    >
                      <UserCheck className="h-4 w-4" /> Sign Off & Log Handover notes
                    </button>
                  </form>
                )}

                {/* 8. DISCHARGE PREPARATION CHECKLIST */}
                {activeDrawer === "discharge" && (
                  <form onSubmit={handleDischargePrepSubmit} className="space-y-4 text-xs font-semibold text-slate-655">

                    {/* Clinical Alert Warning */}
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        Discharge Prep Protocol
                      </div>
                      <p className="text-[9px] font-medium leading-normal text-amber-800">
                        Nurses only coordinate checklist items and flag status. Final clinical discharge clearance must be signed by the admitting physician.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Select Inpatient</label>
                      <select
                        required
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 outline-none"
                      >
                        <option value="">-- Choose Patient --</option>
                        {currentInpatients.map((p: any, idx) => (
                          <option key={idx} value={p.patient?._id || p._id}>
                            {p.patient?.name} (Room {p.room?.roomNumber || "N/A"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedPatientId && (
                      <div className="space-y-4">

                        {/* Checklist Section */}
                        <div className="space-y-2.5 border border-slate-150 rounded-xl p-3 bg-slate-50/50">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Preparation Checklist</span>

                          {/* 1. Doctor Approval Status */}
                          <div
                            onClick={() => setPrepDoctorApproval(!prepDoctorApproval)}
                            className="flex items-center gap-2.5 py-1 cursor-pointer select-none"
                          >
                            <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${prepDoctorApproval ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                              {prepDoctorApproval && <CheckCircle className="h-3 w-3" />}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">Doctor Approval Status</span>
                          </div>

                          {/* 2. Final Vital Signs */}
                          <div
                            onClick={() => setPrepFinalVitals(!prepFinalVitals)}
                            className="flex items-center gap-2.5 py-1 cursor-pointer select-none"
                          >
                            <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${prepFinalVitals ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                              {prepFinalVitals && <CheckCircle className="h-3 w-3" />}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">Final Vital Signs Recorded</span>
                          </div>

                          {/* 3. Medication Completed */}
                          <div
                            onClick={() => setPrepMedicationCompleted(!prepMedicationCompleted)}
                            className="flex items-center gap-2.5 py-1 cursor-pointer select-none"
                          >
                            <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${prepMedicationCompleted ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                              {prepMedicationCompleted && <CheckCircle className="h-3 w-3" />}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">Medications Completed</span>
                          </div>

                          {/* 4. Patient Education Completed */}
                          <div
                            onClick={() => setPrepEducationCompleted(!prepEducationCompleted)}
                            className="flex items-center gap-2.5 py-1 cursor-pointer select-none"
                          >
                            <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${prepEducationCompleted ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                              {prepEducationCompleted && <CheckCircle className="h-3 w-3" />}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">Patient Education Completed</span>
                          </div>

                          {/* 5. Pending Nursing Tasks */}
                          <div
                            onClick={() => setPrepPendingNursingTasks(!prepPendingNursingTasks)}
                            className="flex items-center gap-2.5 py-1 cursor-pointer select-none"
                          >
                            <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${prepPendingNursingTasks ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                              {prepPendingNursingTasks && <CheckCircle className="h-3 w-3" />}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">All Nursing Tasks Completed</span>
                          </div>

                          {/* 6. Medical Equipment Returned */}
                          <div
                            onClick={() => setPrepEquipmentReturned(!prepEquipmentReturned)}
                            className="flex items-center gap-2.5 py-1 cursor-pointer select-none"
                          >
                            <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${prepEquipmentReturned ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                              {prepEquipmentReturned && <CheckCircle className="h-3 w-3" />}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">Medical Equipment Returned</span>
                          </div>

                          {/* 7. Discharge Documents Ready */}
                          <div
                            onClick={() => setPrepDocsReady(!prepDocsReady)}
                            className="flex items-center gap-2.5 py-1 cursor-pointer select-none"
                          >
                            <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${prepDocsReady ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                              {prepDocsReady && <CheckCircle className="h-3 w-3" />}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">Discharge Summaries/Docs Ready</span>
                          </div>

                          {/* 8. Wheelchair Required */}
                          <div
                            onClick={() => setPrepWheelchairRequired(!prepWheelchairRequired)}
                            className="flex items-center gap-2.5 py-1 cursor-pointer select-none"
                          >
                            <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${prepWheelchairRequired ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                              {prepWheelchairRequired && <CheckCircle className="h-3 w-3" />}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 font-bold text-blue-700">Wheelchair Required for Transit</span>
                          </div>

                          {/* 9. Transport Required */}
                          <div
                            onClick={() => setPrepTransportRequired(!prepTransportRequired)}
                            className="flex items-center gap-2.5 py-1 cursor-pointer select-none"
                          >
                            <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${prepTransportRequired ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                              {prepTransportRequired && <CheckCircle className="h-3 w-3" />}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 font-bold text-indigo-700">Special Transport/Ambulance Booked</span>
                          </div>

                        </div>

                        {/* Prep Status */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Preparation Status</label>
                          <select
                            value={prepStatus}
                            onChange={(e) => setPrepStatus(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-navy-500 bg-white outline-none cursor-pointer"
                          >
                            <option value="Pending">Pending (Work In Progress)</option>
                            <option value="Ready for Doctor Review">Ready for Doctor Review</option>
                            <option value="Completed">Completed (Assigned Doctor Approved)</option>
                          </select>
                        </div>

                        {/* Remarks */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Coordination Remarks</label>
                          <textarea
                            rows={3}
                            placeholder="Add notes regarding transit requests, pharmacy delays, or other comments..."
                            value={prepRemarks}
                            onChange={(e) => setPrepRemarks(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-navy-500 outline-none resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={prepSubmitting}
                          className="w-full py-2.5 bg-emerald-655 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm cursor-pointer transition-all active:scale-98"
                        >
                          <CheckCircle2 className="h-4.5 w-4.5" />
                          {prepSubmitting ? "Saving Checklist..." : "Save Discharge Prep Data"}
                        </button>

                      </div>
                    )}
                  </form>
                )}

              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="border-t border-slate-100 pt-4 mt-6 flex justify-end gap-2">
              <button
                onClick={() => setActiveDrawer(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 hover:bg-slate-50 cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Shift Handover Interactive Modal */}
      <ShiftHandoverModal
        isOpen={isHandoverModalOpen || activeDrawer === "handover"}
        onClose={() => {
          setIsHandoverModalOpen(false);
          setActiveDrawer(null);
        }}
      />

      {/* Incoming Pending Handover Accept Modal */}
      <PendingHandoverAcceptModal
        handover={pendingHandoverToAccept}
        onClose={() => setPendingHandoverToAccept(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetNurseNoteId)}
        title="Confirm Deletion"
        message="Are you sure you want to delete this nursing note? This action cannot be undone."
        isLoading={deleteNurseNoteMutation.isPending}
        onClose={() => setDeleteTargetNurseNoteId(null)}
        onConfirm={confirmDeleteNurseNote}
      />
    </div>
  );
}

export default NurseDashboard;
