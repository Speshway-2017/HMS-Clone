import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { List, Plus, Network, BedDouble, UserCheck, ShieldAlert, ArrowRightLeft, DoorOpen, Printer, CheckCircle, FileText, Search, AlertTriangle, AlertCircle } from "lucide-react";
import {
  useAdmissionRequests,
  useRoomsAvailability,
  useAdmissions,
  useAdmitPatient,
  useTransferPatient,
  useRequestDischarge,
  useDischargeRequests,
  useConfirmDischarge,
  useMarkNotificationRead,
  usePatientsSearch,
  useDoctorsAvailability,
  usePatientDetail,
  useRejectAdmissionRequest
} from "../../features/receptionist";
import { useDepartments } from "../../features/departments";
import { isDoctorInDepartment } from "../../lib/doctorUtils";
import { useStaffList } from "../../features/staff";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { Badge } from "../../components/ui/Badge";
import { formatINR } from "../../lib/currency";
import { api } from "../../lib/api";
import { useMyHospital } from "../../features/hospitals";

interface Props {
  activeTab?: "new" | "admissions" | "rooms" | "transfer" | "discharges" | "discharged";
}

const IP_LIMITS = {
  SEARCH: 100,
  EXPECTED_STAY: 3,
  DIAGNOSIS: 150,
  INSURANCE: 100,
  POLICY_NUMBER: 50,
  ADVANCE_AMOUNT: 10,
  REMARKS: 500,
};

const TEXT_GENERAL_REGEX = /^[a-zA-Z0-9\s,\.\-/'&()#]+$/;
const DIAGNOSIS_REGEX = /^[a-zA-Z0-9\s,\.\-/'&()#]+$/;

export function IPManagementPage({ activeTab = "admissions" }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"new" | "admissions" | "rooms" | "transfer" | "discharges" | "discharged">(activeTab);
  const { data: hospitalData } = useMyHospital();

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  // Sub Tab for New Admissions: Doctor Requests vs Manual
  const [subTab, setSubTab] = useState<"requests" | "manual">("requests");

  // Manual Admission search & details states
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [manualDept, setManualDept] = useState("");
  const [manualDoctor, setManualDoctor] = useState("");
  const [manualAdmissionType, setManualAdmissionType] = useState<"Emergency" | "Elective" | "Direct Admission">("Direct Admission");
  const [manualExpectedStay, setManualExpectedStay] = useState("");
  const [manualPrimaryDiagnosis, setManualPrimaryDiagnosis] = useState("");
  const [verbalApproval, setVerbalApproval] = useState(false);

  // Validation Error States
  const [searchError, setSearchError] = useState<string | null>(null);
  const [expectedStayError, setExpectedStayError] = useState<string | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [insuranceError, setInsuranceError] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [remarksError, setRemarksError] = useState<string | null>(null);

  const validateDiagnosis = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) {
      const msg = "Primary Diagnosis is required. Please fill out this field. Field is required";
      setDiagnosisError(msg);
      return msg;
    }
    if (val.length > IP_LIMITS.DIAGNOSIS) {
      const msg = `Primary Diagnosis cannot exceed ${IP_LIMITS.DIAGNOSIS} characters. Too long text not accepted. Too long text is not accepted. Please enter valid data`;
      setDiagnosisError(msg);
      return msg;
    }
    if (!DIAGNOSIS_REGEX.test(val)) {
      const msg = "Primary Diagnosis contains invalid characters. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      setDiagnosisError(msg);
      return msg;
    }
    setDiagnosisError(null);
    return null;
  };

  const validateExpectedStay = (val: string): string | null => {
    if (!val || !val.trim()) {
      setExpectedStayError(null);
      return null;
    }
    if (val.length > IP_LIMITS.EXPECTED_STAY) {
      const msg = `Expected Stay cannot exceed ${IP_LIMITS.EXPECTED_STAY} digits. Too long text not accepted. Too long text is not accepted. Please enter valid data`;
      setExpectedStayError(msg);
      return msg;
    }
    if (/[^\d]/.test(val) || parseInt(val, 10) <= 0) {
      const msg = "Expected Stay must be a valid positive number of days. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      setExpectedStayError(msg);
      return msg;
    }
    setExpectedStayError(null);
    return null;
  };

  const validateInsurance = (val: string): string | null => {
    if (!val || !val.trim()) {
      setInsuranceError(null);
      return null;
    }
    if (val.length > IP_LIMITS.INSURANCE) {
      const msg = `Insurance Provider cannot exceed ${IP_LIMITS.INSURANCE} characters. Too long text not accepted. Too long text is not accepted. Please enter valid data`;
      setInsuranceError(msg);
      return msg;
    }
    if (!TEXT_GENERAL_REGEX.test(val)) {
      const msg = "Insurance Provider contains invalid characters. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      setInsuranceError(msg);
      return msg;
    }
    setInsuranceError(null);
    return null;
  };

  const validatePolicy = (val: string): string | null => {
    if (!val || !val.trim()) {
      setPolicyError(null);
      return null;
    }
    if (val.length > IP_LIMITS.POLICY_NUMBER) {
      const msg = `Policy Number cannot exceed ${IP_LIMITS.POLICY_NUMBER} characters. Too long text not accepted. Too long text is not accepted. Please enter valid data`;
      setPolicyError(msg);
      return msg;
    }
    if (!TEXT_GENERAL_REGEX.test(val)) {
      const msg = "Policy Number contains invalid characters. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      setPolicyError(msg);
      return msg;
    }
    setPolicyError(null);
    return null;
  };

  const validateRemarks = (val: string): string | null => {
    if (!val || !val.trim()) {
      setRemarksError(null);
      return null;
    }
    if (val.length > IP_LIMITS.REMARKS) {
      const msg = `Admission Remarks cannot exceed ${IP_LIMITS.REMARKS} characters. Too long text not accepted. Too long text is not accepted. Please enter valid data`;
      setRemarksError(msg);
      return msg;
    }
    if (!TEXT_GENERAL_REGEX.test(val)) {
      const msg = "Admission Remarks contains invalid characters. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      setRemarksError(msg);
      return msg;
    }
    setRemarksError(null);
    return null;
  };

  const validateAdvance = (val: string): string | null => {
    if (!val || !val.trim()) {
      const msg = "Advance Deposit Amount is required. Please fill out this field. Field is required";
      setAdvanceError(msg);
      return msg;
    }
    if (val.length > IP_LIMITS.ADVANCE_AMOUNT) {
      const msg = `Advance Deposit Amount cannot exceed ${IP_LIMITS.ADVANCE_AMOUNT} digits. Too long text not accepted. Too long text is not accepted. Please enter valid data`;
      setAdvanceError(msg);
      return msg;
    }
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      const msg = "Advance Deposit Amount must be a valid non-negative number. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      setAdvanceError(msg);
      return msg;
    }
    setAdvanceError(null);
    return null;
  };

  const validateSearch = (val: string): string | null => {
    if (!val || !val.trim()) {
      setSearchError(null);
      return null;
    }
    if (val.length > IP_LIMITS.SEARCH) {
      const msg = `Search query cannot exceed ${IP_LIMITS.SEARCH} characters. Too long text not accepted. Too long text is not accepted. Please enter valid data`;
      setSearchError(msg);
      return msg;
    }
    if (!TEXT_GENERAL_REGEX.test(val)) {
      const msg = "Search query contains invalid characters. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      setSearchError(msg);
      return msg;
    }
    setSearchError(null);
    return null;
  };

  const handleKeyGuard = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, maxLen: number) => {
    const isControlKey = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Home", "End", "Tab", "Enter", "Escape"
    ].includes(e.key) || e.ctrlKey || e.metaKey || e.altKey;

    if (isControlKey) return;

    const target = e.currentTarget;
    const hasSelection = (target.selectionEnd ?? 0) - (target.selectionStart ?? 0) > 0;
    if (target.value.length >= maxLen && !hasSelection) {
      e.preventDefault();
    }
  };

  const handlePasteGuard = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    maxLen: number,
    setter: (val: string) => void,
    validator: (val: string) => any
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text") || "";
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const current = target.value;
    const combined = current.slice(0, start) + pasted + current.slice(end);
    const sliced = combined.slice(0, maxLen);
    setter(sliced);
    validator(sliced);
  };

  // Form Fields for admission
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [admissionTime, setAdmissionTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [ward, setWard] = useState("");
  const [roomType, setRoomType] = useState("");
  const [dailyTariff, setDailyTariff] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [assignedNurse, setAssignedNurse] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");

  // Print Outcome State
  const [successData, setSuccessData] = useState<any | null>(null);

  // Transfer state
  const [transferAdmissionId, setTransferAdmissionId] = useState("");
  const [transferWard, setTransferWard] = useState("");
  const [transferRoomType, setTransferRoomType] = useState("");
  const [transferDailyTariff, setTransferDailyTariff] = useState(0);
  const [transferRoomId, setTransferRoomId] = useState("");
  const [transferBedId, setTransferBedId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  // Discharge State
  const [dischargeAdmissionId, setDischargeAdmissionId] = useState("");
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [isDischargeOpen, setIsDischargeOpen] = useState(false);
  const [billingHistory, setBillingHistory] = useState<any>(null);

  // Queries
  const { data: requests, refetch: refetchRequests } = useAdmissionRequests();
  const { data: rooms, refetch: refetchRooms } = useRoomsAvailability();
  const { data: activeAdmissions, refetch: refetchAdmissions } = useAdmissions("admitted");
  const { data: dischargedAdmissions, refetch: refetchDischargedAdmissions } = useAdmissions("discharged");
  const uniqueWards = Array.from(new Set(rooms?.map((r: any) => r.wardName).filter(Boolean)));

  // Additional autocomplete & metadata queries
  const { data: doctors } = useDoctorsAvailability();
  const { data: departmentsResponse } = useDepartments();
  const departments = departmentsResponse || [];
  const { data: searchPatients } = usePatientsSearch(patientSearchQuery);
  const { data: patientDetail } = usePatientDetail(selectedPatientId);
  const { data: staffData } = useStaffList({ role: "nurse", limit: 100 } as any);
  const nurses = staffData?.data || [];

  // Mutations
  const admitMutation = useAdmitPatient();
  const transferMutation = useTransferPatient();
  const dischargeMutation = useRequestDischarge();
  const confirmDischargeMutation = useConfirmDischarge();
  const markReadMutation = useMarkNotificationRead();

  const checkBillingAndOpenDischarge = async (admissionId: string, initialNotes?: string) => {
    const loadingToast = toast.loading("Fetching patient billing history...");
    try {
      const res = await api.get(`/reception/admissions/${admissionId}/billing-status`);
      toast.dismiss(loadingToast);
      setBillingHistory(res.data.data);
      setDischargeAdmissionId(admissionId);
      setDischargeNotes(initialNotes || "");
      setIsDischargeOpen(true);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || "Failed to verify billing status.");
    }
  };

  // Handle URL query parameters at startup
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlTab = queryParams.get("tab") as "new" | "admissions" | "rooms" | "transfer" | "discharges" | "discharged" | null;
    const urlAdmissionId = queryParams.get("admissionId") || "";
    const urlDischargeId = queryParams.get("dischargeAdmissionId") || "";

    if (urlTab) {
      setTab(urlTab);
    }
    if (urlAdmissionId) {
      setTransferAdmissionId(urlAdmissionId);
    }
    if (urlDischargeId) {
      setTab("admissions");
      checkBillingAndOpenDischarge(urlDischargeId);
    }
  }, [window.location.search]);

  // Synchronize bed and admission selection if opened with bedId in URL
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlBedId = queryParams.get("bedId");
    if (!urlBedId) return;

    if (tab === "transfer" && !transferAdmissionId && activeAdmissions && activeAdmissions.length > 0) {
      const match = activeAdmissions.find((adm: any) => {
        const bId = adm.bed?._id || adm.bed;
        return String(bId) === String(urlBedId);
      });
      if (match) {
        setTransferAdmissionId(match._id);
      }
    }

    if (tab === "new" && !selectedBedId && rooms && rooms.length > 0) {
      const parentRoom = rooms.find((r: any) => r.beds?.some((b: any) => String(b._id) === String(urlBedId)));
      if (parentRoom) {
        setWard(parentRoom.wardName || "");
        setRoomType(parentRoom.acType || "");
        setSelectedRoomId(parentRoom._id);
        setSelectedBedId(urlBedId);
      }
    }
  }, [tab, activeAdmissions, rooms, transferAdmissionId, selectedBedId]);

  // Discharge requests from doctors
  const { data: dischargeRequests, refetch: refetchDischargeRequests } = useDischargeRequests();
  useEffect(() => {
    if (ward && roomType) {
      api.get("/room-tariffs/lookup", { params: { ward, roomType } })
        .then((res: any) => {
          setDailyTariff(res.data.data?.tariff || 0);
        })
        .catch((err: any) => {
          console.error("Failed to load daily tariff:", err);
          setDailyTariff(0);
        });
    } else {
      setDailyTariff(0);
    }
  }, [ward, roomType]);

  useEffect(() => {
    if (transferWard && transferRoomType) {
      api.get("/room-tariffs/lookup", { params: { ward: transferWard, roomType: transferRoomType } })
        .then((res: any) => {
          setTransferDailyTariff(res.data.data?.tariff || 0);
        })
        .catch((err: any) => {
          console.error("Failed to load transfer tariff:", err);
          setTransferDailyTariff(0);
        });
    } else {
      setTransferDailyTariff(0);
    }
  }, [transferWard, transferRoomType]);

  const handleSelectRequest = (req: any) => {
    setSelectedReq(req);
    const patientId = req.patient?._id || req.data?.patientId || "";
    setSelectedPatientId(patientId);
    setSubTab("requests");
    // Auto-populate patient and insurance details if available
    setInsuranceProvider(req.data?.insuranceProvider || "");
    setInsurancePolicyNumber(req.data?.insurancePolicyNumber || "");
    const suggestedWard = req.preferredWard || req.data?.suggestedWard || "General";
    setWard(suggestedWard);
    const diag = req.primaryDiagnosis || req.data?.diagnosis || "";
    setNotes(`Admission requested for: ${diag}`);
    setTab("new");
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subTab === "requests" && !selectedReq) {
      toast.error("Please select a pending admission request first");
      return;
    }
    if (subTab === "manual" && !selectedPatientId) {
      toast.error("Please search and select a patient first");
      return;
    }
    if (!ward || !selectedRoomId || !selectedBedId || !assignedNurse) {
      toast.error("Please fill all required room/bed allocation fields and select a nurse");
      return;
    }

    if (subTab === "manual") {
      const diagErr = validateDiagnosis(manualPrimaryDiagnosis);
      const stayErr = validateExpectedStay(manualExpectedStay);
      const insErr = validateInsurance(insuranceProvider);
      const polErr = validatePolicy(insurancePolicyNumber);
      const remErr = validateRemarks(notes);
      const advErr = validateAdvance(advanceAmount);

      if (!manualDoctor) {
        toast.error("Admitting doctor selection is mandatory");
        return;
      }
      if (!verbalApproval) {
        toast.error("Doctor verbal order checkbox must be verified");
        return;
      }
      if (diagErr || stayErr || insErr || polErr || remErr || advErr) {
        toast.error(diagErr || stayErr || insErr || polErr || remErr || advErr || "Please correct the form errors.");
        return;
      }
    }

    try {
      const payload: any = {
        admissionDate,
        admissionTime,
        ward,
        roomId: selectedRoomId,
        bedId: selectedBedId,
        assignedNurse,
        attenderName: "N/A",
        attenderPhone: "N/A",
        insuranceProvider,
        insurancePolicyNumber,
        advanceAmount: parseFloat(advanceAmount),
        admissionNotes: notes,
        paymentMethod
      };

      if (subTab === "requests") {
        payload.requestId = selectedReq._id;
        if (selectedReq.type === "admission_request" || selectedReq.message) {
          payload.notificationId = selectedReq._id;
        }
        payload.patientId = selectedReq.patient?._id || selectedReq.data?.patientId;
        payload.opVisitId = selectedReq.opVisit || selectedReq.data?.opVisitId || null;
        payload.admissionMode = "Doctor Requested";
        payload.admittingDoctor = selectedReq.doctor?._id || selectedReq.data?.doctorId || null;
        payload.departmentId = selectedReq.department?._id || selectedReq.data?.departmentId || null;
        payload.priority = selectedReq.priority || selectedReq.data?.priority || "Routine";
        payload.admissionReason = selectedReq.primaryDiagnosis || selectedReq.data?.diagnosis || "";
      } else {
        payload.patientId = selectedPatientId;
        payload.admissionMode = "Receptionist Initiated";
        payload.admittingDoctor = manualDoctor;
        payload.departmentId = manualDept || null;
        payload.priority = "Routine";
        payload.admissionReason = manualPrimaryDiagnosis;
        payload.verbalApproval = verbalApproval;
        payload.admissionType = manualAdmissionType;
        payload.expectedStay = manualExpectedStay;
        payload.primaryDiagnosis = manualPrimaryDiagnosis;
        payload.opVisitId = patientDetail?.currentConsultation?.appointmentId || null;
      }

      const result = await admitMutation.mutateAsync(payload);

      setSuccessData(result);
      // Reset form states
      setSelectedReq(null);
      setSelectedPatientId("");
      setPatientSearchQuery("");
      setManualDept("");
      setManualDoctor("");
      setManualExpectedStay("");
      setManualPrimaryDiagnosis("");
      setVerbalApproval(false);
      setWard("");
      setSelectedRoomId("");
      setSelectedBedId("");
      setAssignedNurse("");
      setInsuranceProvider("");
      setInsurancePolicyNumber("");
      setAdvanceAmount("0");
      setPaymentMethod("Cash");
      setNotes("");
      refetchRequests();
      refetchAdmissions();
      refetchRooms();
      toast.success("Patient successfully admitted!");
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message;
      if (errMsg && errMsg.includes("Admission Slip")) {
        toast.success("Patient successfully admitted!");
        setSuccessData({
          admissionNumber: `ADM-${Date.now().toString().slice(-6)}`,
          patientName: subTab === "requests" ? selectedReq?.patientName : (patientDetail?.patient?.name || patientSearchQuery),
          uhid: subTab === "requests" ? selectedReq?.patientId : selectedPatientId,
          room: selectedRoomId,
          bed: selectedBedId,
          admittingDoctor: subTab === "requests" ? selectedReq?.doctorName : manualDoctor,
          admittedAt: new Date().toISOString()
        });
        const finalPatientId = subTab === "requests" ? selectedReq?.patientId : selectedPatientId;
        if (finalPatientId) {
          navigate(`/receptionist/patients/${finalPatientId}`);
        }
      } else {
        toast.error(errMsg || "Failed to admit patient");
      }
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAdmissionId || !transferRoomId || !transferBedId) {
      toast.error("Please select patient, room, and bed");
      return;
    }

    try {
      await transferMutation.mutateAsync({
        admissionId: transferAdmissionId,
        newRoomId: transferRoomId,
        newBedId: transferBedId,
        notes: transferNotes
      });

      toast.success("Patient Room Transfer processed successfully!");
      setTransferAdmissionId("");
      setTransferRoomId("");
      setTransferBedId("");
      setTransferNotes("");
      refetchRooms();
      refetchAdmissions();
      setTab("admissions");
    } catch (err: any) {
      toast.error(err.message || "Failed to process transfer");
    }
  };

  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeAdmissionId) return;

    try {
      await dischargeMutation.mutateAsync({
        admissionId: dischargeAdmissionId,
        notes: dischargeNotes
      });

      toast.success("Patient discharged successfully.");
      setDischargeAdmissionId("");
      setDischargeNotes("");
      setIsDischargeOpen(false);
      setBillingHistory(null);
      refetchRooms();
      refetchAdmissions();
      refetchDischargeRequests();
      refetchDischargedAdmissions();
      setTab("admissions");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete discharge");
    }
  };

  const admissionsColumns = [
    {
      header: "UHID",
      render: (row: any) => <span className="font-mono text-xs font-semibold text-slate-800">{row.patient?.uhid || "N/A"}</span>
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900">{row.patient?.name || "N/A"}</div>
          <div className="text-[10px] text-slate-450">
            {row.patient?.gender || "N/A"}{row.patient?.age !== undefined && row.patient?.age !== null ? ` / ${row.patient.age} yrs` : ""}
          </div>
        </div>
      )
    },
    {
      header: "Admission Date",
      render: (row: any) => <span className="text-xs">{row.admissionDate ? new Date(row.admissionDate).toLocaleDateString("en-IN") : "N/A"}</span>
    },
    {
      header: "Ward / Room / Bed",
      render: (row: any) => (
        <span className="text-xs font-medium text-slate-700">
          {(typeof row.ward === "object" ? row.ward?.name : row.ward) || "N/A"} — R{typeof row.room === "object" && row.room ? row.room.roomNumber : (row.room || "N/A")} / Bed {typeof row.bed === "object" && row.bed ? row.bed.bedNumber : (row.bed || "N/A")}
        </span>
      )
    },
    {
      header: "Assigned Nurse",
      render: (row: any) => (
        <div className="text-xs font-semibold text-slate-700">
          {row.assignedNurse?.name || "N/A"}
          {row.assignedNurse?.employeeId && (
            <div className="text-[10px] text-slate-450 font-normal">ID: {row.assignedNurse.employeeId}</div>
          )}
        </div>
      )
    },
    {
      header: "Actions",
      render: (row: any) => (
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => {
              setTransferAdmissionId(row._id);
              setTab("transfer");
            }}
            variant="secondary"
            className="text-[10px] px-2 py-1 flex items-center gap-1"
          >
            <ArrowRightLeft className="h-3 w-3" /> Transfer
          </Button>
          <Button
            type="button"
            onClick={() => checkBillingAndOpenDischarge(row._id)}
            variant="danger"
            className="text-[10px] px-2 py-1 flex items-center gap-1"
          >
            <DoorOpen className="h-3 w-3" /> Discharge
          </Button>
        </div>
      )
    }
  ];

  const rejectRequestMutation = useRejectAdmissionRequest();

  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  const handleRejectRequest = (requestId: string) => {
    setRejectTargetId(requestId);
  };

  const confirmRejectRequest = async () => {
    if (!rejectTargetId) return;
    try {
      await rejectRequestMutation.mutateAsync(rejectTargetId);
      toast.success("Admission request rejected.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject request");
    } finally {
      setRejectTargetId(null);
    }
  };

  const requestColumns = [
    {
      header: "Request No",
      render: (row: any) => <span className="font-mono text-xs font-bold text-indigo-700">{row.requestNumber || "N/A"}</span>
    },
    {
      header: "Patient",
      render: (row: any) => <span className="text-xs font-semibold text-slate-800">{row.patient?.name || row.message?.split("requested IP admission for ")[1]?.split(" (")[0] || "N/A"}</span>
    },
    {
      header: "UHID",
      render: (row: any) => <span className="font-mono text-xs font-semibold text-slate-650">{row.patient?.uhid || row.data?.uhid || row.message?.split("(")[1]?.split(")")[0] || "N/A"}</span>
    },
    {
      header: "Doctor",
      render: (row: any) => <span className="text-xs text-slate-800">Dr. {row.doctor?.name || row.message?.split("Dr. ")[1]?.split(" requested")[0] || "N/A"}</span>
    },
    {
      header: "Department",
      render: (row: any) => <span className="text-xs text-slate-600">{row.department?.name || row.data?.departmentName || "N/A"}</span>
    },
    {
      header: "Priority",
      render: (row: any) => (
        <Badge tone={row.priority === "Emergency" ? "danger" : row.priority === "Urgent" ? "warning" : "info"}>
          {row.priority || "Routine"}
        </Badge>
      )
    },
    {
      header: "Diagnosis",
      render: (row: any) => <span className="text-xs font-medium text-slate-700">{row.primaryDiagnosis || row.data?.diagnosis || "N/A"}</span>
    },
    {
      header: "Requested Time",
      render: (row: any) => <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString("en-IN")}</span>
    },
    {
      header: "Status",
      render: (row: any) => (
        <Badge tone={["Admission Requested", "Pending", "pending"].includes(row.status) ? "warning" : row.status === "Approved" || row.status === "Admitted" ? "success" : "danger"}>
          {["Admission Requested", "Pending", "pending"].includes(row.status) ? "Pending" : row.status}
        </Badge>
      )
    },
    {
      header: "Actions",
      render: (row: any) => (
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => handleSelectRequest(row)}
            className="text-xs px-2.5 py-1 flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700"
          >
            <UserCheck className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button
            type="button"
            onClick={() => handleRejectRequest(row._id)}
            variant="secondary"
            className="text-xs px-2.5 py-1 text-red-650 hover:text-red-700 border-red-200 hover:bg-red-50 flex items-center gap-1"
          >
            Reject
          </Button>
        </div>
      )
    }
  ];

  const dischargedColumns = [
    {
      header: "IP No / UHID",
      render: (row: any) => (
        <div>
          <div className="font-mono text-xs font-bold text-indigo-700">{row.admissionNumber || "N/A"}</div>
          <div className="font-mono text-[10px] text-slate-500">{row.patient?.uhid || "N/A"}</div>
        </div>
      )
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900">{row.patient?.name || "N/A"}</div>
          <div className="text-[10px] text-slate-450">{row.patient?.gender || "N/A"} / {row.patient?.age ? `${row.patient.age} yrs` : "N/A"}</div>
        </div>
      )
    },
    {
      header: "Ward / Room",
      render: (row: any) => (
        <span className="text-xs font-medium text-slate-700">
          {row.ward} — R{row.room?.roomNumber || "N/A"}
        </span>
      )
    },
    {
      header: "Admission Date",
      render: (row: any) => <span className="text-xs text-slate-700">{row.admissionDate ? new Date(row.admissionDate).toLocaleDateString("en-IN") : "N/A"}</span>
    },
    {
      header: "Discharge Date",
      render: (row: any) => (
        <span className="text-xs font-medium text-slate-700">
          {row.dischargedAt ? new Date(row.dischargedAt).toLocaleDateString("en-IN") : (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString("en-IN") : "N/A")}
        </span>
      )
    },
    {
      header: "Doctor",
      render: (row: any) => (
        <span className="text-xs text-slate-800">
          Dr. {row.admittingDoctor?.name || row.dischargeRequestedBy?.name || "N/A"}
        </span>
      )
    },
    {
      header: "Discharge Notes",
      render: (row: any) => (
        <span className="text-xs text-slate-600 line-clamp-2 max-w-xs">
          {row.dischargeNotes || row.diagnosisAtDischarge || "Cleared & Discharged"}
        </span>
      )
    },
    {
      header: "Status",
      render: (row: any) => (
        <Badge tone="success">
          {row.status || "Discharged"}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inpatient (IP) Management</h1>
          <p className="text-sm text-slate-500">Handle IP admissions, ward transfers, and patient discharge requests.</p>
        </div>
 
        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 w-fit">
          <button
            onClick={() => setTab("admissions")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "admissions" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <List className="h-3.5 w-3.5" /> Current Admissions
          </button>
          <button
            onClick={() => setTab("new")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "new" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> Admission Requests
          </button>
          <button
            onClick={() => setTab("rooms")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "rooms" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <BedDouble className="h-3.5 w-3.5" /> Bed Grid Map
          </button>
          <button
            onClick={() => setTab("transfer")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "transfer" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" /> Room Transfer
          </button>
          <button
            onClick={() => setTab("discharges")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "discharges" ? "bg-rose-50 text-rose-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <DoorOpen className="h-3.5 w-3.5" /> Discharge Requests
            {(dischargeRequests?.length ?? 0) > 0 && (
              <span className="ml-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {dischargeRequests!.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("discharged")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "discharged" ? "bg-emerald-50 text-emerald-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" /> Discharged
            {(dischargedAdmissions?.length ?? 0) > 0 && (
              <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                {dischargedAdmissions!.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Current Admissions Tab */}
      {tab === "admissions" && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-800">Current Inpatients Registry</h2>
          <DataTable columns={admissionsColumns} rows={activeAdmissions || []} rowKey={(row) => row._id} />
        </Card>
      )}

      {/* Admission Requests Tab */}
      {tab === "new" && (
        <div className="space-y-6">
          {successData ? (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-6 text-center space-y-2">
                <CheckCircle className="mx-auto h-12 w-12 text-emerald-600 animate-bounce" />
                <h2 className="text-xl font-bold text-slate-800">Inpatient Admitted Successfully</h2>
                <p className="text-sm text-slate-550 max-w-lg mx-auto">
                  Patient <b>{successData.wristBand?.patientName}</b> has been checked into ward <b>{successData.wristBand?.ward}</b>. Bed allocation and real-time dashboard notifications have been completed.
                </p>
              </div>

              <div className="max-w-xl mx-auto">
                
                {/* 1. Admission Slip Card */}
                <Card id="admission-slip-print" className="space-y-4 border border-slate-200 shadow-md p-6 bg-white relative print:border-none print:shadow-none print:p-0">
                  <div className="absolute top-4 right-4 bg-navy-50 text-navy-700 font-bold font-mono text-xs px-2 py-0.5 rounded border border-navy-100">
                    ADMISSION SLIP
                  </div>
                  
                  {/* Header */}
                  <div className="text-center pb-4 border-b border-dashed border-slate-200 flex flex-col items-center gap-1.5 justify-center">
                    {hospitalData?.logoUrl && (
                      <img src={hospitalData.logoUrl} alt={hospitalData.name} className="h-12 object-contain" />
                    )}
                    <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">{hospitalData?.name || successData.admissionSlip?.hospitalName}</h3>
                    <p className="text-[10px] text-slate-450 mt-0.5">INPATIENT DEPT (IPD) RECORD</p>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Admission No</span>
                      <span className="font-bold text-indigo-700 font-mono">{successData.admissionSlip?.admissionNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">UHID / Patient ID</span>
                      <span className="font-semibold text-slate-700 font-mono">{successData.admissionSlip?.uhid}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Patient Name</span>
                      <span className="font-bold text-slate-800">{successData.admissionSlip?.patientName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Age / Gender</span>
                      <span className="font-semibold text-slate-700">{successData.admissionSlip?.age} Yrs / {successData.admissionSlip?.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Ward & Room</span>
                      <span className="font-semibold text-slate-700">{successData.admissionSlip?.ward} (Room {successData.admissionSlip?.roomNumber})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Allocated Bed</span>
                      <span className="font-semibold text-slate-700">Bed {successData.admissionSlip?.bedNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Assigned Nurse</span>
                      <span className="font-semibold text-slate-700">{successData.admissionSlip?.assignedNurseName || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Admission Date & Time</span>
                      <span className="font-semibold text-slate-700">{successData.admissionSlip?.admissionDate} @ {successData.admissionSlip?.admissionTime}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Insurance Provider</span>
                      <span className="font-semibold text-slate-700">{successData.admissionSlip?.insuranceProvider}</span>
                    </div>
                  </div>

                  {/* Payment block */}
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-455 block uppercase tracking-wider text-[9px] font-bold">Advance Deposit Paid</span>
                      <span className="font-bold text-slate-800">{formatINR(successData.admissionSlip?.advancePaid)}</span>
                    </div>
                    {successData.admissionSlip?.advancePaid > 0 && (
                      <>
                        <div>
                          <span className="text-slate-455 block uppercase tracking-wider text-[9px] font-bold">Payment Method</span>
                          <span className="font-semibold text-slate-800">{successData.admissionSlip?.paymentMethod}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-455 block uppercase tracking-wider text-[9px] font-bold">Receipt Number</span>
                          <span className="font-semibold text-slate-700 font-mono">{successData.admissionSlip?.receiptNumber}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {successData.admissionSlip?.admissionNotes && (
                    <div className="bg-slate-50 rounded-lg p-2.5 text-[10px] text-slate-500 border border-slate-100">
                      <span className="font-semibold text-slate-600 block mb-0.5">Clinical Notes:</span>
                      {successData.admissionSlip?.admissionNotes}
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    <Button onClick={() => window.print()} className="w-full flex items-center justify-center gap-1.5 text-xs py-2">
                      <Printer className="h-4 w-4" /> Print Admission Slip
                    </Button>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => { setSuccessData(null); }} variant="secondary" className="flex-1 text-xs py-1.5">
                        New Admission
                      </Button>
                      <Button onClick={() => { setSuccessData(null); setTab("admissions"); }} variant="secondary" className="flex-1 text-xs py-1.5">
                        Go to Registry
                      </Button>
                    </div>
                  </div>
                </Card>

              </div>
            </div>
          ) : (
            <>
              {/* Sub-tabs header */}
              <div className="flex items-center gap-4 border-b border-slate-200 pb-3 mb-6">
                <button
                  type="button"
                  onClick={() => { setSubTab("requests"); setSelectedReq(null); setSelectedPatientId(""); }}
                  className={`text-sm font-semibold pb-1 border-b-2 transition-all ${
                    subTab === "requests" ? "border-indigo-650 text-indigo-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Doctor Admission Requests
                </button>
                <button
                  type="button"
                  onClick={() => { setSubTab("manual"); setSelectedReq(null); setSelectedPatientId(""); }}
                  className={`text-sm font-semibold pb-1 border-b-2 transition-all ${
                    subTab === "manual" ? "border-indigo-655 text-indigo-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Manual Admission
                </button>
              </div>

              {subTab === "requests" && !selectedReq && (
                <Card>
                  <h2 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" /> Pending Doctor Admission Requests
                  </h2>
                  <DataTable columns={requestColumns} rows={requests || []} rowKey={(row) => row._id} emptyMessage="No pending admission requests from doctors." />
                </Card>
              )}

              {subTab === "manual" && !selectedPatientId && (
                <Card className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Search className="h-5 w-5 text-indigo-600" /> Search Patient for Manual Admission
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search patient by UHID, Patient Name, Phone, Appointment Number, or Token Number..."
                      value={patientSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPatientSearchQuery(val);
                        validateSearch(val);
                      }}
                      onKeyDown={(e) => handleKeyGuard(e, IP_LIMITS.SEARCH)}
                      onPaste={(e) => handlePasteGuard(e, IP_LIMITS.SEARCH, setPatientSearchQuery, validateSearch)}
                      maxLength={IP_LIMITS.SEARCH}
                      className={`w-full rounded-lg border pl-10 pr-4 py-2 text-sm outline-none transition-all ${
                        searchError
                          ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20"
                          : "border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      }`}
                    />
                  </div>
                  {searchError && (
                    <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1" role="alert">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{searchError}</span>
                    </p>
                  )}
                  {patientSearchQuery && searchPatients && searchPatients.length > 0 && (
                    <div className="rounded-lg border border-slate-150 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {searchPatients.map((p) => {
                        const anyP = p as any;
                        return (
                          <button
                            key={p._id}
                            type="button"
                            onClick={() => {
                              if (anyP.status === "admitted") {
                                toast.error("This patient is already admitted.");
                                navigate(`/receptionist/patients/${p._id}`);
                                return;
                              }
                              // Set selected patient
                              setSelectedPatientId(p._id);
                              setPatientSearchQuery(`${p.name} (${p.uhid})`);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                              selectedPatientId === p._id ? "bg-indigo-50 font-semibold" : ""
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-slate-800">{p.name}</div>
                              <div className="text-slate-450 font-mono text-[10px]">{p.uhid} — {p.phone} {anyP.status === "admitted" ? "— ADMITTED" : ""}</div>
                            </div>
                            {selectedPatientId === p._id && <span className="text-[10px] bg-indigo-600 text-white rounded px-1.5 py-0.5">Selected</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}

              {/* Show Demographic Profile details for selected patient */}
              {selectedPatientId && patientDetail && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card className="md:col-span-1 space-y-4">
                    <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                      Patient Demographics
                    </h3>
                    <div className="flex flex-col items-center text-center p-3 space-y-3">
                      {patientDetail.patient?.photoUrl ? (
                        <img
                          src={patientDetail.patient.photoUrl}
                          alt="Patient Photo"
                          className="w-20 h-20 rounded-full border border-slate-200 object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-3xl font-extrabold text-slate-400 uppercase">
                          {patientDetail.patient?.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{patientDetail.patient?.name}</h4>
                        <span className="font-mono text-xs text-indigo-600 font-bold">{patientDetail.patient?.uhid}</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-[11px] border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Age / Gender:</span>
                        <span className="font-semibold text-slate-700">{patientDetail.patient?.age} Yrs / {patientDetail.patient?.gender}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Blood Group:</span>
                        <span className="font-semibold text-slate-700">{patientDetail.patient?.bloodGroup || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Allergies:</span>
                        <span className="font-bold text-red-650">{patientDetail.patient?.allergies || "No Known Allergies"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Address:</span>
                        <span className="font-semibold text-slate-700 text-right">{patientDetail.patient?.address || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Emergency Contact:</span>
                        <span className="font-semibold text-slate-700">{patientDetail.patient?.emergencyContact?.name || "N/A"} ({patientDetail.patient?.emergencyContact?.phone || "N/A"})</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="md:col-span-2 space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                        Active Outpatient (OP) Consultation History
                      </h3>
                      {patientDetail.currentConsultation ? (
                        <div className="rounded-lg bg-indigo-50/30 border border-indigo-100 p-4 mt-2 space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400 block mb-0.5">Consulting Doctor</span>
                              <span className="font-semibold text-slate-800">Dr. {patientDetail.currentConsultation.doctor}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-0.5">Department</span>
                              <span className="font-semibold text-slate-800">{patientDetail.currentConsultation.department}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 block mb-0.5">Primary Diagnosis / Chief Complaint</span>
                              <span className="font-bold text-indigo-700">{patientDetail.currentConsultation.diagnosis}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-450 italic mt-2">No active outpatient consultations recorded today. Admitting directly via Receptionist Order.</p>
                      )}
                    </div>

                    <div className="text-xs bg-slate-50 rounded-lg p-3 text-slate-500 border border-slate-100">
                      <span className="font-bold text-slate-700 block mb-1">Admitting Status Validation:</span>
                      ✔ Patient exists in registry. <br />
                      ✔ Patient is currently registered as outpatient. <br />
                      ✔ Patient is eligible for direct manual admission.
                    </div>
                  </Card>
                </div>
              )}

              {((subTab === "requests" && selectedReq) || (subTab === "manual" && selectedPatientId)) && (
                (patientDetail as any)?.activeAdmission ? (
                  <Card className="border border-red-200 bg-red-50/50 p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="h-6 w-6 text-red-650 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-red-800">Duplicate IP Admission Blocked</h4>
                        <p className="text-xs text-red-750 leading-relaxed">
                          This patient already has an active inpatient admission (IP No: {(patientDetail as any).activeAdmission.admissionNumber}). Please discharge the patient before creating a new admission.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-red-100">
                      <Button
                        type="button"
                        onClick={() => {
                          setTab("admissions");
                          setSelectedReq(null);
                          setSelectedPatientId("");
                          setPatientSearchQuery("");
                        }}
                        className="bg-red-700 hover:bg-red-800 text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        View Existing Admission
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedReq(null);
                          setSelectedPatientId("");
                          setPatientSearchQuery("");
                        }}
                        variant="secondary"
                        className="text-xs py-1.5 px-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <form onSubmit={handleAdmit} className="space-y-6">
                  {subTab === "requests" && (
                    <Card className="space-y-4 bg-navy-50/20 border-navy-100">
                      <h3 className="text-sm font-bold text-navy-800 border-b pb-2 flex items-center justify-between">
                        <span>Review Doctor Admission Request Details</span>
                        <Badge tone={selectedReq.priority === "Emergency" ? "danger" : selectedReq.priority === "Urgent" ? "warning" : "info"}>
                          {selectedReq.priority || "Routine"}
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block font-semibold">Patient Name:</span>
                          <span className="font-bold text-slate-800">{selectedReq.patient?.name || selectedReq.message?.split("requested IP admission for ")[1]?.split(" (")[0] || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">UHID:</span>
                          <span className="font-semibold font-mono text-slate-700">{selectedReq.patient?.uhid || selectedReq.data?.uhid || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Request Number:</span>
                          <span className="font-bold font-mono text-indigo-700">{selectedReq.requestNumber || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Recommending Doctor:</span>
                          <span className="font-semibold text-slate-800">Dr. {selectedReq.doctor?.name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Suggested Department:</span>
                          <span className="font-semibold text-slate-800">{selectedReq.department?.name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Suggested Ward & Bed:</span>
                          <span className="font-semibold text-slate-800">{selectedReq.preferredWard || "General"} ({selectedReq.preferredBedType || "Standard"})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Expected Stay duration:</span>
                          <span className="font-semibold text-slate-800">{selectedReq.expectedStay || "N/A"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block font-semibold">Primary Diagnosis:</span>
                          <span className="font-bold text-indigo-850">{selectedReq.primaryDiagnosis || selectedReq.data?.diagnosis || "N/A"}</span>
                        </div>
                      </div>
                      {(selectedReq.clinicalNotes || selectedReq.specialInstructions) && (
                        <div className="border-t border-slate-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {selectedReq.clinicalNotes && (
                            <div>
                              <span className="text-slate-400 block font-semibold">Clinical Notes:</span>
                              <p className="text-slate-700 italic">{selectedReq.clinicalNotes}</p>
                            </div>
                          )}
                          {selectedReq.specialInstructions && (
                            <div>
                              <span className="text-slate-400 block font-semibold">Special Instructions:</span>
                              <p className="text-red-700 font-medium">{selectedReq.specialInstructions}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Manual Admission Details tab */}
                  {subTab === "manual" && (
                    <Card className="space-y-4">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                        Admission Details & Authorizations
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SelectField
                          label="Department *"
                          required
                          value={manualDept}
                          onChange={(e) => {
                            setManualDept(e.target.value);
                            setManualDoctor("");
                          }}
                        >
                          <option value="">Select Department</option>
                          {departments.map((d: any) => (
                            <option key={d._id} value={d._id}>{d.name}</option>
                          ))}
                        </SelectField>

                        <SelectField
                          label="Admitting Doctor *"
                          required
                          value={manualDoctor}
                          onChange={(e) => setManualDoctor(e.target.value)}
                        >
                          <option value="">Select Doctor</option>
                          {doctors
                            ?.filter((doc: any) => isDoctorInDepartment(doc, manualDept, departments))
                            ?.map((doc: any) => (
                              <option key={doc._id} value={doc._id}>Dr. {doc.name} ({doc.specialization || "General Medicine"})</option>
                            ))}
                        </SelectField>

                        <SelectField
                          label="Admission Type *"
                          required
                          value={manualAdmissionType}
                          onChange={(e: any) => setManualAdmissionType(e.target.value)}
                        >
                          <option value="Direct Admission">Direct Admission</option>
                          <option value="Emergency">Emergency</option>
                          <option value="Elective">Elective</option>
                        </SelectField>

                        <InputField
                          label="Expected Stay (Days)"
                          value={manualExpectedStay}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualExpectedStay(val);
                            validateExpectedStay(val);
                          }}
                          onKeyDown={(e) => handleKeyGuard(e, IP_LIMITS.EXPECTED_STAY)}
                          onPaste={(e) => handlePasteGuard(e, IP_LIMITS.EXPECTED_STAY, setManualExpectedStay, validateExpectedStay)}
                          maxLength={IP_LIMITS.EXPECTED_STAY}
                          error={expectedStayError || undefined}
                          placeholder="e.g. 3"
                        />

                        <InputField
                          label="Primary Diagnosis *"
                          required
                          value={manualPrimaryDiagnosis}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualPrimaryDiagnosis(val);
                            validateDiagnosis(val);
                          }}
                          onKeyDown={(e) => handleKeyGuard(e, IP_LIMITS.DIAGNOSIS)}
                          onPaste={(e) => handlePasteGuard(e, IP_LIMITS.DIAGNOSIS, setManualPrimaryDiagnosis, validateDiagnosis)}
                          maxLength={IP_LIMITS.DIAGNOSIS}
                          showCharCount
                          charCount={manualPrimaryDiagnosis.length}
                          maxCharCount={IP_LIMITS.DIAGNOSIS}
                          error={diagnosisError || undefined}
                          placeholder="e.g. Acute Appendicitis"
                        />

                        <div className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            id="verbalApproval"
                            checked={verbalApproval}
                            onChange={(e) => setVerbalApproval(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor="verbalApproval" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                            Verified Doctor Verbal Order / Consent *
                          </label>
                        </div>
                      </div>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card className="space-y-4">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                        Bed Allocation
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                          label="Admission Date"
                          type="date"
                          required
                          value={admissionDate}
                          onChange={(e) => setAdmissionDate(e.target.value)}
                        />
                        <InputField
                          label="Admission Time"
                          type="time"
                          required
                          value={admissionTime}
                          onChange={(e) => setAdmissionTime(e.target.value)}
                        />
                        <SelectField
                          label="Select Ward"
                          required
                          value={ward}
                          onChange={(e) => {
                            setWard(e.target.value);
                            setRoomType("");
                            setSelectedRoomId("");
                            setSelectedBedId("");
                          }}
                        >
                          <option value="">Select Ward</option>
                          {uniqueWards.map((w: string) => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </SelectField>
                        <SelectField
                          label="Select Room Type (AC / Non AC)"
                          required
                          value={roomType}
                          onChange={(e) => {
                            setRoomType(e.target.value);
                            setSelectedRoomId("");
                            setSelectedBedId("");
                          }}
                        >
                          <option value="">Select Room Type</option>
                          <option value="Non AC">Non AC</option>
                          <option value="AC">AC</option>
                        </SelectField>
                        <SelectField
                          label="Select Room"
                          required
                          value={selectedRoomId}
                          onChange={(e) => {
                            const rId = e.target.value;
                            setSelectedRoomId(rId);
                            setSelectedBedId("");
                            const selRoom = rooms?.find((r: any) => r._id === rId);
                            if (selRoom?.tariff?.roomChargePerDay) {
                              setDailyTariff(selRoom.tariff.roomChargePerDay);
                            }
                          }}
                        >
                          <option value="">Select Room</option>
                          {rooms
                            ?.filter(r => (!ward || r.wardName === ward) && (!roomType || r.acType === roomType))
                            .map(r => (
                              <option key={r._id} value={r._id}>Room {r.roomNumber} ({r.roomType} - {r.acType})</option>
                            ))}
                        </SelectField>
                        <SelectField
                          label="Select Bed"
                          required
                          value={selectedBedId}
                          onChange={(e) => setSelectedBedId(e.target.value)}
                        >
                          <option value="">Select Bed</option>
                          {rooms
                            ?.find(r => r._id === selectedRoomId)
                            ?.beds.filter(b => !b.isOccupied)
                            .map(b => (
                              <option key={b._id} value={b._id}>Bed {b.bedNumber}</option>
                            ))}
                        </SelectField>
                        <InputField
                          label="Daily Tariff"
                          disabled
                          readOnly
                          value={dailyTariff > 0 ? `₹${dailyTariff}/day` : "₹0/day"}
                        />
                      </div>
                    </Card>

                    <Card className="space-y-4">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                        Nurse & Finance Information
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SelectField
                          label="Assign Nurse"
                          required
                          value={assignedNurse}
                          onChange={(e: any) => setAssignedNurse(e.target.value)}
                        >
                          <option value="">Select Nurse</option>
                          {nurses.map((n: any) => (
                            <option key={n._id} value={n._id}>
                              {n.name} {n.employeeId ? `(${n.employeeId})` : ""}
                            </option>
                          ))}
                        </SelectField>
                        <InputField
                          label="Insurance Provider"
                          value={insuranceProvider}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInsuranceProvider(val);
                            validateInsurance(val);
                          }}
                          onKeyDown={(e) => handleKeyGuard(e, IP_LIMITS.INSURANCE)}
                          onPaste={(e) => handlePasteGuard(e, IP_LIMITS.INSURANCE, setInsuranceProvider, validateInsurance)}
                          maxLength={IP_LIMITS.INSURANCE}
                          showCharCount
                          charCount={insuranceProvider.length}
                          maxCharCount={IP_LIMITS.INSURANCE}
                          error={insuranceError || undefined}
                          placeholder="e.g. Cigna, BlueShield"
                        />
                        <InputField
                          label="Policy Number"
                          value={insurancePolicyNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInsurancePolicyNumber(val);
                            validatePolicy(val);
                          }}
                          onKeyDown={(e) => handleKeyGuard(e, IP_LIMITS.POLICY_NUMBER)}
                          onPaste={(e) => handlePasteGuard(e, IP_LIMITS.POLICY_NUMBER, setInsurancePolicyNumber, validatePolicy)}
                          maxLength={IP_LIMITS.POLICY_NUMBER}
                          showCharCount
                          charCount={insurancePolicyNumber.length}
                          maxCharCount={IP_LIMITS.POLICY_NUMBER}
                          error={policyError || undefined}
                          placeholder="e.g. #CS-293"
                        />
                        <InputField
                          label="Advance Deposit Amount (₹) *"
                          type="number"
                          required
                          value={advanceAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdvanceAmount(val);
                            validateAdvance(val);
                          }}
                          error={advanceError || undefined}
                        />
                        <SelectField
                          label="Payment Method"
                          required
                          value={paymentMethod}
                          onChange={(e: any) => setPaymentMethod(e.target.value)}
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Card">Card Swipe</option>
                        </SelectField>
                      </div>
                    </Card>
                  </div>

                  <Card className="space-y-4">
                    <TextareaField
                      label="Admission Remarks / Notes"
                      value={notes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNotes(val);
                        validateRemarks(val);
                      }}
                      onKeyDown={(e) => handleKeyGuard(e, IP_LIMITS.REMARKS)}
                      onPaste={(e) => handlePasteGuard(e, IP_LIMITS.REMARKS, setNotes, validateRemarks)}
                      maxLength={IP_LIMITS.REMARKS}
                      showCharCount
                      charCount={notes.length}
                      maxCharCount={IP_LIMITS.REMARKS}
                      error={remarksError || undefined}
                      rows={2}
                      placeholder="Ward specialty notes, equipment configuration, special patient instructions..."
                    />
                  </Card>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        setSelectedReq(null);
                        setSelectedPatientId("");
                        setPatientSearchQuery("");
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={admitMutation.isPending}>
                      {admitMutation.isPending ? "Processing..." : "Confirm Admission (Status: IP ADMITTED)"}
                    </Button>
                  </div>
                  </form>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* Bed Grid Map Tab */}
      {tab === "rooms" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-600 shadow-xs">
            <span className="font-bold text-slate-700">Bed Status Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
              <span>Vacant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-500"></span>
              <span>Under Maintenance / Blocked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-blue-500"></span>
              <span>Cleaning</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {rooms?.map((room) => (
              <Card key={room._id} className="space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">Room {room.roomNumber}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">{room.wardName}</div>
                  </div>
                  <span className="text-[10px] font-bold bg-navy-50 text-navy-700 px-2 py-0.5 rounded-full">
                    {room.roomType}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {room.beds.map((bed) => {
                    const statusLower = (bed.status || "").toLowerCase();
                    const isBlocked = statusLower === "blocked" || statusLower === "maintenance";
                    const isCleaning = statusLower === "cleaning";
                    const isOccupied = bed.isOccupied || statusLower === "occupied";

                    let cardClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
                    let label = "Vacant";

                    if (isOccupied) {
                      cardClass = "bg-red-50 border-red-200 text-red-700";
                      label = "Occupied";
                    } else if (isBlocked) {
                      cardClass = "bg-amber-50 border-amber-300 text-amber-800";
                      label = statusLower === "blocked" ? "Under Maintenance" : "Maintenance";
                    } else if (isCleaning) {
                      cardClass = "bg-blue-50 border-blue-200 text-blue-700";
                      label = "Cleaning";
                    }

                    return (
                      <div
                        key={bed._id}
                        className={`rounded-lg border p-2 text-center text-xs font-semibold select-none transition-colors ${cardClass}`}
                      >
                        <div>{bed.bedNumber}</div>
                        <div className="text-[9px] font-medium mt-0.5">{label}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Room Transfer Tab */}
      {tab === "transfer" && (
        <form onSubmit={handleTransfer} className="max-w-2xl space-y-6">
          <Card className="space-y-4">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
              Process Bed Transfer
            </h3>

            <SelectField
              label="Select Inpatient"
              required
              value={transferAdmissionId}
              onChange={(e) => setTransferAdmissionId(e.target.value)}
            >
              <option value="">Choose Patient</option>
              {activeAdmissions?.map((adm) => (
                <option key={adm._id} value={adm._id}>
                  {adm.patient?.name} ({adm.patient?.uhid}) — Bed {adm.bed?.bedNumber}
                </option>
              ))}
            </SelectField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="New Ward"
                required
                value={transferWard}
                onChange={(e) => {
                  setTransferWard(e.target.value);
                  setTransferRoomType("");
                  setTransferRoomId("");
                  setTransferBedId("");
                }}
              >
                <option value="">Select Ward</option>
                {uniqueWards.map((w: string) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </SelectField>

              <SelectField
                label="New Room Type"
                required
                value={transferRoomType}
                onChange={(e) => {
                  setTransferRoomType(e.target.value);
                  setTransferRoomId("");
                  setTransferBedId("");
                }}
              >
                <option value="">Select Room Type</option>
                <option value="Non AC">Non AC</option>
                <option value="AC">AC</option>
              </SelectField>

              <SelectField
                label="New Room"
                required
                value={transferRoomId}
                onChange={(e) => {
                  setTransferRoomId(e.target.value);
                  setTransferBedId("");
                }}
              >
                <option value="">Select Room</option>
                {rooms
                  ?.filter(r => (!transferWard || r.wardName === transferWard) && (!transferRoomType || r.acType === transferRoomType))
                  .map((r) => (
                    <option key={r._id} value={r._id}>Room {r.roomNumber} ({r.roomType} - {r.acType})</option>
                  ))}
              </SelectField>

              <SelectField
                label="New Bed"
                required
                value={transferBedId}
                onChange={(e) => setTransferBedId(e.target.value)}
              >
                <option value="">Select Bed</option>
                {rooms
                  ?.find((r) => r._id === transferRoomId)
                  ?.beds.filter((b) => !b.isOccupied)
                  .map((b) => (
                    <option key={b._id} value={b._id}>Bed {b.bedNumber}</option>
                  ))}
              </SelectField>

              <InputField
                label="New Tariff Price"
                disabled
                readOnly
                value={transferDailyTariff > 0 ? `₹${transferDailyTariff}/day` : "₹0/day"}
              />
            </div>

            <TextareaField
              label="Reason for Transfer"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              rows={2}
            />
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" onClick={() => setTab("admissions")} variant="secondary">
              Cancel
            </Button>
            <Button type="submit">
              Submit Bed Transfer
            </Button>
          </div>
        </form>
      )}

      {/* Discharge Requests Tab — Doctor-initiated, Receptionist confirms */}
      {tab === "discharges" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Discharge Requests</h2>
              <p className="text-xs text-slate-500">Patients cleared for discharge by their treating doctor. Review and confirm to vacate the bed.</p>
            </div>
          </div>
          {!dischargeRequests || dischargeRequests.length === 0 ? (
            <Card className="flex h-48 flex-col items-center justify-center text-center border-dashed">
              <DoorOpen className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No pending discharge requests</p>
              <p className="text-xs text-slate-400">When a doctor finalizes a discharge, it will appear here for your confirmation.</p>
            </Card>
          ) : (
            dischargeRequests.map((adm: any) => (
              <Card key={adm._id} className="border-rose-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700">
                        {adm.patient?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "—"}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{adm.patient?.name}</h3>
                        <p className="text-xs text-slate-400">
                          {adm.patient?.uhid} · {adm.patient?.gender}/{adm.patient?.age} yrs · Ward: {adm.ward} · Bed {adm.bed?.bedNumber}
                        </p>
                      </div>
                      <span className="ml-auto rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Discharge Pending</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Diagnosis at Discharge</p>
                        <p className="text-xs text-slate-700">{adm.diagnosisAtDischarge || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Discharge Medications</p>
                        <p className="text-xs text-slate-700">{adm.dischargeMedications || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Follow-up Instructions</p>
                        <p className="text-xs text-slate-700">{adm.followUp || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Special Instructions</p>
                        <p className="text-xs text-slate-700">{adm.specialInstructions || "—"}</p>
                      </div>
                    </div>
                    {adm.labPharmacyDuesTotal > 0 && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-750 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 font-bold text-red-800">
                          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-600" />
                          <span>Pending Laboratory / Pharmacy Dues: ₹{Number(adm.labPharmacyDuesTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <p className="leading-relaxed">
                          Patient has unpaid pharmacy or laboratory invoices. These must be cleared before confirming discharge.
                        </p>
                        <div className="divide-y divide-red-100 rounded-lg border border-red-100 bg-white text-[11px] mt-1.5">
                          {adm.labPharmacyDues?.map((inv: any) => (
                            <div key={inv._id} className="flex justify-between p-2">
                              <div>
                                <span className="font-semibold text-slate-700">
                                  {inv.billingType === "PHARMACY" ? "Pharmacy" : "Laboratory/Diagnostics"}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  No: {inv.invoiceNumber || inv._id.substring(18).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-bold text-red-600">₹{inv.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {adm.dischargeRequestedBy && (
                      <p className="text-xs text-slate-400 mt-2">
                        Requested by Dr. {adm.dischargeRequestedBy?.name || "—"} ·{" "}
                        {adm.dischargeRequestedAt ? new Date(adm.dischargeRequestedAt).toLocaleString("en-IN") : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => checkBillingAndOpenDischarge(adm._id, adm.diagnosisAtDischarge || "Doctor finalized discharge")}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <CheckCircle className="h-4 w-4" /> Confirm Discharge
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex items-center gap-1.5 text-xs"
                      onClick={() => {
                        setTransferAdmissionId(adm._id);
                        setTab("transfer");
                      }}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Instead
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Discharged Patients Tab */}
      {tab === "discharged" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Discharged Inpatients Registry</h2>
              <p className="text-xs text-slate-500">History of all inpatient admissions that have been cleared and discharged.</p>
            </div>
            <Badge tone="success" className="text-xs font-semibold">
              Total Discharged: {dischargedAdmissions?.length || 0}
            </Badge>
          </div>
          <DataTable columns={dischargedColumns} rows={dischargedAdmissions || []} rowKey={(row) => row._id} />
        </Card>
      )}

      {/* Discharge Dialog */}
      {isDischargeOpen && (() => {
        const currentAdm = activeAdmissions?.find((a: any) => a._id === dischargeAdmissionId) || 
                           dischargeRequests?.find((a: any) => a._id === dischargeAdmissionId);
        const patientName = currentAdm?.patient?.name || "Patient";
        const uhid = currentAdm?.patient?.uhid || "";
        const isBlocked = billingHistory && billingHistory.totalDues > 1;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto backdrop-blur-xs">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
              {/* Header */}
              <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Discharge & Billing Verification</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Verify patient financial balance and medical discharge details.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{patientName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">UHID: {uhid}</div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Billing Summary Status Banner */}
                {billingHistory ? (
                  isBlocked ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 shadow-sm">
                      <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-rose-900">Outstanding Balance Detected</h4>
                        <p className="text-xs mt-1 leading-relaxed">
                          Patient cannot be discharged. There is a total pending balance of <span className="font-bold">₹{billingHistory.totalDues.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>. All outstanding dues must be fully cleared before discharge.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 shadow-sm">
                      <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-emerald-900">Financial Clearance Approved</h4>
                        <p className="text-xs mt-0.5 leading-relaxed">
                          Patient is clear for discharge. All outstanding dues have been paid.
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">Loading billing details...</div>
                )}

                {/* Billing History Section */}
                {billingHistory && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial History Breakdown</h3>
                    
                    {/* IP Bill Details */}
                    <div className="rounded-xl border border-slate-105 bg-slate-50/50 p-4 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                        <span className="text-xs font-bold text-slate-700">Inpatient (IP) Bill Status</span>
                        {billingHistory.ipBill ? (
                          <span className={`text-[10px] rounded-full border px-2 py-0.5 font-bold uppercase ${
                            billingHistory.ipBill.status === "Paid" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {billingHistory.ipBill.status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No active IP bill</span>
                        )}
                      </div>

                      {billingHistory.ipBill && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase font-semibold">Bill Number</div>
                            <div className="font-bold text-slate-700 mt-0.5">{billingHistory.ipBill.billNumber}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase font-semibold">Total Amount</div>
                            <div className="font-bold text-slate-700 mt-0.5">₹{billingHistory.ipBill.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase font-semibold">Advance & Ins. Paid</div>
                            <div className="font-semibold text-slate-500 mt-0.5">₹{(billingHistory.ipBill.advancePaid + billingHistory.ipBill.insuranceCovered).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div>
                            <div className="text-rose-600 text-[10px] uppercase font-bold">IP Outstanding</div>
                            <div className="font-black text-rose-700 mt-0.5">₹{billingHistory.ipBill.outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                      )}

                      {/* IP Bill Items Breakdown */}
                      {billingHistory.ipBillItems && billingHistory.ipBillItems.length > 0 && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-white overflow-hidden text-[11px] max-h-40 overflow-y-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-slate-550 font-semibold sticky top-0">
                              <tr>
                                <th className="px-3 py-1.5 text-left">Category</th>
                                <th className="px-3 py-1.5 text-left">Description</th>
                                <th className="px-3 py-1.5 text-center">Qty/Days</th>
                                <th className="px-3 py-1.5 text-right">Price</th>
                                <th className="px-3 py-1.5 text-right">Discount</th>
                                <th className="px-3 py-1.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {billingHistory.ipBillItems.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-3 py-1 font-semibold">{item.category}</td>
                                  <td className="px-3 py-1 text-slate-500">{item.description}</td>
                                  <td className="px-3 py-1 text-center">{item.quantity || item.days || 1}</td>
                                  <td className="px-3 py-1 text-right">₹{item.unitPrice || 0}</td>
                                  <td className="px-3 py-1 text-right">₹{item.discount || 0}</td>
                                  <td className="px-3 py-1 text-right font-medium">₹{item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* OP/Pharmacy/Diagnostics Invoices */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                      <div className="text-xs font-bold text-slate-700 pb-2 border-b border-slate-200/60 flex justify-between">
                        <span>Laboratory, Pharmacy & OP Invoices</span>
                        <span className="font-bold text-rose-650">Pending Dues: ₹{billingHistory.totalPendingOP.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      
                      {!billingHistory.invoices || billingHistory.invoices.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-2">No other pharmacy or laboratory invoices found for this patient.</p>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden text-[11px] max-h-40 overflow-y-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                              <tr>
                                <th className="px-3 py-1.5 text-left">Invoice No</th>
                                <th className="px-3 py-1.5 text-left">Type</th>
                                <th className="px-3 py-1.5 text-left">Date</th>
                                <th className="px-3 py-1.5 text-right">Total</th>
                                <th className="px-3 py-1.5 text-right">Balance Due</th>
                                <th className="px-3 py-1.5 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {billingHistory.invoices.map((inv: any) => {
                                const invNum = inv.invoiceNumber || inv._id.substring(18).toUpperCase();
                                const dateStr = new Date(inv.issuedAt || inv.createdAt).toLocaleDateString("en-IN");
                                return (
                                  <tr key={inv._id} className="hover:bg-slate-50">
                                    <td className="px-3 py-1 font-mono">{invNum}</td>
                                    <td className="px-3 py-1 font-medium">{inv.billingType}</td>
                                    <td className="px-3 py-1 text-slate-500">{dateStr}</td>
                                    <td className="px-3 py-1 text-right">₹{inv.totals?.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-3 py-1 text-right font-semibold text-rose-600">₹{(inv.totals?.patientBalance ?? (inv.status === "paid" ? 0 : inv.totals?.total)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-3 py-1 text-center">
                                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                        inv.status === "paid" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                                      }`}>
                                        {inv.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Inputs */}
                <form onSubmit={handleDischargeSubmit} className="space-y-4">
                  <div>
                    <TextareaField
                      label="Discharge Summary & Audit Notes"
                      required
                      value={dischargeNotes}
                      onChange={(e) => setDischargeNotes(e.target.value)}
                      rows={3}
                      placeholder="Provide diagnosis at discharge or final discharge notes..."
                    />
                  </div>

                  {/* Actions Panel */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100">
                    <div className="text-left w-full sm:w-auto">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Outstanding Balance</div>
                      <div className={`text-lg font-black ${isBlocked ? "text-rose-600" : "text-emerald-600"}`}>
                        ₹{billingHistory ? billingHistory.totalDues.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                      </div>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto justify-end">
                      <Button 
                        type="button" 
                        onClick={() => {
                          setIsDischargeOpen(false);
                          setBillingHistory(null);
                        }} 
                        variant="secondary"
                        className="text-xs px-4"
                      >
                        Cancel
                      </Button>
                      
                      {isBlocked ? (
                        <Button
                          type="button"
                          onClick={() => {
                            setIsDischargeOpen(false);
                            setBillingHistory(null);
                            navigate(`/receptionist/billing/ip?admissionId=${dischargeAdmissionId}`);
                          }}
                          variant="primary"
                          className="text-xs px-4 bg-indigo-650 hover:bg-indigo-750 flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4" /> Go to Billing Dashboard
                        </Button>
                      ) : (
                        <Button 
                          type="submit" 
                          variant="danger" 
                          className="text-xs px-4 flex items-center gap-1"
                          disabled={dischargeMutation.isPending}
                        >
                          {dischargeMutation.isPending ? "Discharging..." : "Complete Discharge"}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

      <ConfirmDeleteModal
        isOpen={Boolean(rejectTargetId)}
        title="Confirm Rejection"
        message="Are you sure you want to reject this admission request? This action cannot be undone."
        confirmText="Reject Request"
        isLoading={rejectRequestMutation.isPending}
        onClose={() => setRejectTargetId(null)}
        onConfirm={confirmRejectRequest}
      />
    </div>
  );
}
