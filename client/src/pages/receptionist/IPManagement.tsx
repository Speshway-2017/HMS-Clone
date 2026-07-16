import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { List, Plus, Network, BedDouble, UserCheck, ShieldAlert, ArrowRightLeft, DoorOpen, Printer, CheckCircle, FileText, Search } from "lucide-react";
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
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { formatINR } from "../../lib/currency";
import { api } from "../../lib/api";

interface Props {
  activeTab?: "new" | "admissions" | "rooms" | "transfer" | "discharges";
}

export function IPManagementPage({ activeTab = "admissions" }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"new" | "admissions" | "rooms" | "transfer" | "discharges">(activeTab);

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

  // Form Fields for admission
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [admissionTime, setAdmissionTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [ward, setWard] = useState("");
  const [roomType, setRoomType] = useState("");
  const [dailyTariff, setDailyTariff] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [attenderName, setAttenderName] = useState("");
  const [attenderPhone, setAttenderPhone] = useState("");
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

  // Queries
  const { data: requests, refetch: refetchRequests } = useAdmissionRequests();
  const { data: rooms, refetch: refetchRooms } = useRoomsAvailability();
  const { data: activeAdmissions, refetch: refetchAdmissions } = useAdmissions("admitted");
  const { data: dischargedAdmissions } = useAdmissions("discharged");
  const uniqueWards = Array.from(new Set(rooms?.map((r: any) => r.wardName).filter(Boolean)));

  // Additional autocomplete & metadata queries
  const { data: doctors } = useDoctorsAvailability();
  const { data: departmentsResponse } = useDepartments();
  const departments = departmentsResponse || [];
  const { data: searchPatients } = usePatientsSearch(patientSearchQuery);
  const { data: patientDetail } = usePatientDetail(selectedPatientId);

  // Mutations
  const admitMutation = useAdmitPatient();
  const transferMutation = useTransferPatient();
  const dischargeMutation = useRequestDischarge();
  const confirmDischargeMutation = useConfirmDischarge();
  const markReadMutation = useMarkNotificationRead();

  // Handle URL query parameters at startup
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlTab = queryParams.get("tab") as "new" | "admissions" | "rooms" | "transfer" | "discharges" | null;
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
      setDischargeAdmissionId(urlDischargeId);
      setDischargeNotes("");
      setIsDischargeOpen(true);
    }
  }, [window.location.search]);

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
      alert("Please select a pending admission request first");
      return;
    }
    if (subTab === "manual" && !selectedPatientId) {
      alert("Please search and select a patient first");
      return;
    }
    if (!ward || !selectedRoomId || !selectedBedId || !attenderName || !attenderPhone) {
      alert("Please fill all required attender and room/bed allocation fields");
      return;
    }

    if (subTab === "manual") {
      if (!manualDoctor) {
        alert("Admitting doctor selection is mandatory");
        return;
      }
      if (!verbalApproval) {
        alert("Doctor verbal order checkbox must be verified");
        return;
      }
      if (!manualPrimaryDiagnosis || !manualPrimaryDiagnosis.trim()) {
        alert("Primary diagnosis / admission reason is required");
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
        attenderName,
        attenderPhone,
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
      setAttenderName("");
      setAttenderPhone("");
      setInsuranceProvider("");
      setInsurancePolicyNumber("");
      setAdvanceAmount("0");
      setPaymentMethod("Cash");
      setNotes("");
      refetchRequests();
      refetchRooms();
      refetchAdmissions();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "";
      if (errMsg.includes("already has an active inpatient admission") || errMsg.includes("already admitted")) {
        toast.error("This patient is already admitted.");
        const finalPatientId = subTab === "requests" ? (selectedReq?.patient?._id || selectedReq?.data?.patientId) : selectedPatientId;
        if (finalPatientId) {
          navigate(`/receptionist/patients/${finalPatientId}`);
        }
      } else {
        alert(errMsg || "Failed to admit patient");
      }
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAdmissionId || !transferRoomId || !transferBedId) {
      alert("Please select patient, room, and bed");
      return;
    }

    try {
      await transferMutation.mutateAsync({
        admissionId: transferAdmissionId,
        newRoomId: transferRoomId,
        newBedId: transferBedId,
        notes: transferNotes
      });

      alert("Patient Room Transfer processed successfully!");
      setTransferAdmissionId("");
      setTransferRoomId("");
      setTransferBedId("");
      setTransferNotes("");
      refetchRooms();
      refetchAdmissions();
      setTab("admissions");
    } catch (err: any) {
      alert(err.message || "Failed to process transfer");
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

      toast.success("Discharge completed. Bed is now vacant. Redirecting to billing...");
      const idToRedirect = dischargeAdmissionId;
      setDischargeAdmissionId("");
      setDischargeNotes("");
      setIsDischargeOpen(false);
      refetchRooms();
      refetchAdmissions();
      setTab("admissions");
      navigate(`/receptionist/billing/ip?admissionId=${idToRedirect}`);
    } catch (err: any) {
      alert(err.message || "Failed to complete discharge");
    }
  };

  const admissionsColumns = [
    {
      header: "UHID",
      render: (row: any) => <span className="font-mono text-xs font-semibold text-slate-800">{row.patient?.uhid}</span>
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-450">{row.patient?.gender} / {row.patient?.age} yrs</div>
        </div>
      )
    },
    {
      header: "Admission Date",
      render: (row: any) => <span className="text-xs">{new Date(row.admissionDate).toLocaleDateString()}</span>
    },
    {
      header: "Ward / Room / Bed",
      render: (row: any) => (
        <span className="text-xs font-medium text-slate-700">
          {row.ward} — R{row.room?.roomNumber} / Bed {row.bed?.bedNumber}
        </span>
      )
    },
    {
      header: "Attender",
      render: (row: any) => (
        <div className="text-xs">
          <div>{row.attenderName}</div>
          <div className="text-[10px] text-slate-400">{row.attenderPhone}</div>
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
            onClick={() => {
              setDischargeAdmissionId(row._id);
              setDischargeNotes("");
              setIsDischargeOpen(true);
            }}
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

  const handleRejectRequest = async (requestId: string) => {
    if (!window.confirm("Are you sure you want to reject this admission request?")) return;
    try {
      await rejectRequestMutation.mutateAsync(requestId);
      toast.success("Admission request rejected.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject request");
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
        <Badge tone={row.status === "Admission Requested" ? "warning" : row.status === "Approved" ? "success" : "danger"}>
          {row.status || "Requested"}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inpatient (IP) Management</h1>
          <p className="text-sm text-slate-500">Handle IP admissions, ward transfers, and patient discharge requests.</p>
        </div>

        {/* Tab triggers */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
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

              {/* Wrist Band and Admission Slip Side by Side */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                
                {/* 1. Admission Slip Card */}
                <Card className="space-y-4 border border-slate-200 shadow-md p-6 bg-white relative">
                  <div className="absolute top-4 right-4 bg-navy-50 text-navy-700 font-bold font-mono text-xs px-2 py-0.5 rounded border border-navy-100">
                    ADMISSION SLIP
                  </div>
                  
                  {/* Header */}
                  <div className="text-center pb-4 border-b border-dashed border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">{successData.admissionSlip?.hospitalName}</h3>
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
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Attender Name</span>
                      <span className="font-semibold text-slate-700">{successData.admissionSlip?.attenderName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Attender Phone</span>
                      <span className="font-semibold text-slate-700">{successData.admissionSlip?.attenderPhone}</span>
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
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-455 block uppercase tracking-wider text-[9px] font-bold">Advance Deposit Paid</span>
                      <span className="font-bold text-slate-800">{formatINR(successData.admissionSlip?.advancePaid)}</span>
                    </div>
                    {successData.admissionSlip?.advancePaid > 0 && (
                      <div className="text-right">
                        <span className="text-slate-455 block uppercase tracking-wider text-[9px] font-bold">Receipt Number</span>
                        <span className="font-semibold text-slate-700 font-mono">{successData.admissionSlip?.receiptNumber}</span>
                      </div>
                    )}
                  </div>

                  {successData.admissionSlip?.admissionNotes && (
                    <div className="bg-slate-50 rounded-lg p-2.5 text-[10px] text-slate-500 border border-slate-100">
                      <span className="font-semibold text-slate-600 block mb-0.5">Clinical Notes:</span>
                      {successData.admissionSlip?.admissionNotes}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button onClick={() => window.print()} className="w-full flex items-center justify-center gap-1.5 text-xs py-2">
                      <Printer className="h-4 w-4" /> Print Admission Slip
                    </Button>
                  </div>
                </Card>

                {/* 2. Wrist Band Card */}
                <Card className="space-y-6 border border-slate-200 shadow-md p-6 bg-white flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-800">Patient Identification Wristband</h3>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                        IPD BAND
                      </span>
                    </div>
                    <p className="text-xs text-slate-550">
                      Generate and print the secure identification band to be strapped onto the patient's wrist immediately upon check-in.
                    </p>

                    {/* Band Preview Render */}
                    <div className="rounded-xl border border-sky-200 bg-sky-50/20 p-5 space-y-4 relative overflow-hidden ring-1 ring-sky-100">
                      {/* Medical alert line */}
                      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-sky-500" />
                      
                      <div className="pl-2 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-sky-700 tracking-wider uppercase block">HMS SECURE ID BAND</span>
                            <h4 className="text-base font-bold text-slate-900 mt-0.5">{successData.wristBand?.patientName}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 block">IP NUM</span>
                            <span className="text-xs font-bold font-mono text-indigo-700">{successData.wristBand?.admissionNumber}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-100 pt-2 text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-400">UHID:</span> <span className="font-medium font-mono">{successData.wristBand?.uhid}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Gender/Age:</span> <span className="font-medium">{successData.wristBand?.gender} / {successData.wristBand?.age} Yrs</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Ward/Room/Bed:</span> <span className="font-medium">{successData.wristBand?.ward} - R{successData.wristBand?.roomNumber}/B{successData.wristBand?.bedNumber}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-red-500">Allergies:</span> <span className="font-bold text-red-600">{successData.wristBand?.allergies}</span>
                          </div>
                        </div>

                        {/* Simulated barcode representation */}
                        <div className="pt-2 text-center select-none font-mono tracking-widest text-slate-450 text-xs border-t border-dashed border-slate-200">
                          <div className="h-6 w-full bg-slate-800 rounded opacity-90 mb-1 flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider">
                            |||||| | |||| ||| | ||||| | |||
                          </div>
                          {successData.wristBand?.admissionNumber}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <Button onClick={() => window.print()} className="w-full flex items-center justify-center gap-1.5 text-xs py-2 bg-sky-700 hover:bg-sky-800">
                      <Printer className="h-4 w-4" /> Print Patient Wristband
                    </Button>
                    
                    <div className="flex gap-2">
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
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
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
                              setSelectedPatientId(p._id);
                              setPatientSearchQuery(`${p.name} (${p.uhid})`);
                              // Auto-populate some attender fields if same as emergency contact
                              setAttenderName(anyP.emergencyContact?.name || "");
                              setAttenderPhone(anyP.emergencyContact?.phone || "");
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
                      <img
                        src={patientDetail.patient?.photoUrl || "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?q=80&w=150"}
                        alt="Patient Photo"
                        className="w-20 h-20 rounded-full border border-slate-200 object-cover"
                      />
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
                            ?.filter((doc: any) => !manualDept || doc.department?._id === manualDept || doc.department === manualDept)
                            ?.map((doc: any) => (
                              <option key={doc._id} value={doc._id}>Dr. {doc.name} ({doc.specialization})</option>
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
                          onChange={(e) => setManualExpectedStay(e.target.value)}
                          placeholder="e.g. 3"
                        />

                        <InputField
                          label="Primary Diagnosis *"
                          required
                          value={manualPrimaryDiagnosis}
                          onChange={(e) => setManualPrimaryDiagnosis(e.target.value)}
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
                            setSelectedRoomId(e.target.value);
                            setSelectedBedId("");
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
                          value={dailyTariff > 0 ? `₹${dailyTariff}/day` : "₹0/day (Not Configured)"}
                        />
                      </div>
                    </Card>

                    <Card className="space-y-4">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                        Attender & Finance Information
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                          label="Attender Name"
                          required
                          value={attenderName}
                          onChange={(e) => setAttenderName(e.target.value)}
                        />
                        <InputField
                          label="Attender Phone"
                          required
                          value={attenderPhone}
                          onChange={(e) => setAttenderPhone(e.target.value)}
                        />
                        <InputField
                          label="Insurance Provider"
                          value={insuranceProvider}
                          onChange={(e) => setInsuranceProvider(e.target.value)}
                        />
                        <InputField
                          label="Policy number"
                          value={insurancePolicyNumber}
                          onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                        />
                        <InputField
                          label="Advance Deposit Amount (₹) *"
                          type="number"
                          required
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(e.target.value)}
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
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
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
                {room.beds.map((bed) => (
                  <div
                    key={bed._id}
                    className={`rounded-lg border p-2 text-center text-xs font-semibold select-none ${
                      bed.isOccupied
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    }`}
                  >
                    <div>{bed.bedNumber}</div>
                    <div className="text-[9px] font-normal mt-0.5">{bed.isOccupied ? "Occupied" : "Vacant"}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
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
                      onClick={async () => {
                        if (!window.confirm(`Confirm discharge for ${adm.patient?.name}? This will vacate the bed.`)) return;
                        try {
                          await confirmDischargeMutation.mutateAsync({ admissionId: adm._id, notes: adm.diagnosisAtDischarge || "Doctor finalized discharge" });
                          toast.success(`${adm.patient?.name} has been discharged. Bed is now vacant. Redirecting to billing...`);
                          refetchDischargeRequests();
                          refetchAdmissions();
                          refetchRooms();
                          navigate(`/receptionist/billing/ip?admissionId=${adm._id}`);
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || "Failed to confirm discharge.");
                        }
                      }}
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

      {/* Discharge Dialog */}
      {isDischargeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handleDischargeSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Confirm Patient Discharge</h2>
            <p className="text-xs text-slate-500">This action will vacant the bed immediately and set patient status to discharged.</p>
            <TextareaField
              label="Discharge Summary Notes"
              required
              value={dischargeNotes}
              onChange={(e) => setDischargeNotes(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" onClick={() => setIsDischargeOpen(false)} variant="secondary">
                Cancel
              </Button>
              <Button type="submit" variant="danger">
                Complete Discharge
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
