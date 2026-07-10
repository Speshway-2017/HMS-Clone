import { useState, useEffect } from "react";
import { List, Plus, Network, BedDouble, UserCheck, ShieldAlert, ArrowRightLeft, DoorOpen, Printer, CheckCircle, FileText } from "lucide-react";
import {
  useAdmissionRequests,
  useRoomsAvailability,
  useAdmissions,
  useAdmitPatient,
  useTransferPatient,
  useRequestDischarge,
  useMarkNotificationRead
} from "../../features/receptionist";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { formatINR } from "../../lib/currency";

interface Props {
  activeTab?: "new" | "admissions" | "rooms" | "transfer" | "discharges";
}

export function IPManagementPage({ activeTab = "admissions" }: Props) {
  const [tab, setTab] = useState<"new" | "admissions" | "rooms" | "transfer" | "discharges">(activeTab);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  // Form Fields for admission
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [admissionTime, setAdmissionTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [ward, setWard] = useState("");
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

  // Mutations
  const admitMutation = useAdmitPatient();
  const transferMutation = useTransferPatient();
  const dischargeMutation = useRequestDischarge();
  const markReadMutation = useMarkNotificationRead();

  const handleSelectRequest = (req: any) => {
    setSelectedReq(req);
    // Auto-populate patient and insurance details if available
    setInsuranceProvider(req.data?.insuranceProvider || "");
    setInsurancePolicyNumber(req.data?.insurancePolicyNumber || "");
    setWard(req.data?.suggestedWard || "General Ward");
    setNotes(`Admission requested for: ${req.data?.diagnosis || ""}`);
    setTab("new");
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) {
      alert("Please select a pending admission request first");
      return;
    }
    if (!ward || !selectedRoomId || !selectedBedId || !attenderName || !attenderPhone) {
      alert("Please fill all required attender and room/bed allocation fields");
      return;
    }

    try {
      const result = await admitMutation.mutateAsync({
        notificationId: selectedReq._id,
        patientId: selectedReq.data.patientId,
        opVisitId: selectedReq.data.opVisitId,
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
      });

      setSuccessData(result);
      // Reset form states
      setSelectedReq(null);
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
      alert(err.message || "Failed to admit patient");
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

      alert("Discharge completed. Bed is now vacant.");
      setDischargeAdmissionId("");
      setDischargeNotes("");
      setIsDischargeOpen(false);
      refetchRooms();
      refetchAdmissions();
      setTab("admissions");
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

  const requestColumns = [
    {
      header: "Date Requested",
      render: (row: any) => <span className="text-xs">{new Date(row.createdAt).toLocaleDateString()}</span>
    },
    {
      header: "Notification Message",
      render: (row: any) => <span className="text-xs text-slate-700 font-medium">{row.message}</span>
    },
    {
      header: "Suggested Ward",
      render: (row: any) => <span className="text-xs font-semibold text-indigo-700">{row.data?.suggestedWard || "General"}</span>
    },
    {
      header: "Action",
      render: (row: any) => (
        <Button
          type="button"
          onClick={() => handleSelectRequest(row)}
          className="text-xs px-3 py-1 flex items-center gap-1"
        >
          <UserCheck className="h-3.5 w-3.5" /> Allocate Bed & Admit
        </Button>
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
              <Card>
                <h2 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" /> Pending IP Admission Requests
                </h2>
                <DataTable columns={requestColumns} rows={requests || []} rowKey={(row) => row._id} emptyMessage="No pending admission requests from doctors." />
              </Card>

              {selectedReq && (
                <form onSubmit={handleAdmit} className="space-y-6">
                  <Card className="space-y-4 bg-navy-50/20 border-navy-100">
                    <h3 className="text-sm font-bold text-navy-800">Review Request Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-450 block">Selected Patient:</span>
                        <span className="font-semibold text-slate-750">{selectedReq.message}</span>
                      </div>
                      <div>
                        <span className="text-slate-450 block">Suggested Ward Name:</span>
                        <span className="font-semibold text-slate-750">{selectedReq.data?.suggestedWard || "General Ward"}</span>
                      </div>
                    </div>
                  </Card>

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
                          onChange={(e) => setWard(e.target.value)}
                        >
                          <option value="">Select Ward</option>
                          <option value="General Ward">General Ward</option>
                          <option value="Semi-Private Ward">Semi-Private Ward</option>
                          <option value="Private Ward">Private Ward</option>
                          <option value="ICU">ICU</option>
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
                            ?.filter(r => !ward || r.wardName === ward)
                            .map(r => (
                              <option key={r._id} value={r._id}>Room {r.roomNumber} ({r.roomType})</option>
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
                    <Button type="button" onClick={() => setSelectedReq(null)} variant="secondary">
                      Cancel
                    </Button>
                    <Button type="submit">
                      Confirm Admission (Status: IP ADMITTED)
                    </Button>
                  </div>
                </form>
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
                label="New Room"
                required
                value={transferRoomId}
                onChange={(e) => {
                  setTransferRoomId(e.target.value);
                  setTransferBedId("");
                }}
              >
                <option value="">Select Room</option>
                {rooms?.map((r) => (
                  <option key={r._id} value={r._id}>Room {r.roomNumber} ({r.roomType})</option>
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
