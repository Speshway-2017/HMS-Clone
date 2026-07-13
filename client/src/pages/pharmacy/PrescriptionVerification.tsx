import { useState } from "react";
import { ClipboardCheck, CheckCircle2, XCircle, Search, Eye } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { TextareaField } from "../../components/ui/Field";
import { usePrescriptions, useDispensePrescription, useCancelPrescription } from "../../features/doctorDashboard";
import toast from "react-hot-toast";

interface Prescription {
  _id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  doctorName: string;
  department: string;
  medicines: string[];
  allergies: string;
  diagnosis: string;
  date: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
}

export function PharmacyPrescriptionVerification() {
  const [activeTab, setActiveTab] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  const [search, setSearch] = useState("");
  const [selectedPresc, setSelectedPresc] = useState<Prescription | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: realPrescriptions, isLoading } = usePrescriptions();
  const dispenseMutation = useDispensePrescription();
  const cancelMutation = useCancelPrescription();

  const prescriptions: Prescription[] = (realPrescriptions || []).map((rx: any) => {
    let uiStatus: "Pending" | "Approved" | "Rejected" = "Pending";
    if (rx.status === "Dispensed" || rx.status === "Completed") {
      uiStatus = "Approved";
    } else if (rx.status === "Cancelled") {
      uiStatus = "Rejected";
    }

    return {
      _id: rx._id,
      patientName: rx.patient?.name || "Unknown Patient",
      patientAge: rx.patient?.age || 30,
      patientGender: rx.patient?.gender || "Male",
      doctorName: rx.doctor?.name || "Attending Physician",
      department: rx.department?.name || "General Medicine",
      medicines: (rx.medications || []).map(
        (m: any) => `${m.name}${m.strength ? ` (${m.strength})` : ""} - ${m.dosage}, ${m.frequency}, ${m.duration}`
      ),
      allergies: rx.patient?.allergies || "None",
      diagnosis: rx.diagnosis || "Observation",
      date: new Date(rx.createdAt).toISOString().split("T")[0],
      status: uiStatus,
      rejectionReason: rx.status === "Cancelled" ? "Prescription Cancelled" : ""
    };
  });

  const handleApprove = async (id: string) => {
    try {
      await dispenseMutation.mutateAsync(id);
      toast.success("Prescription verified & approved for dispensing!");
      setIsDetailsOpen(false);
      setSelectedPresc(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to verify prescription");
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedPresc || !rejectionReason.trim()) return;
    try {
      await cancelMutation.mutateAsync(selectedPresc._id);
      toast.success("Prescription rejected / cancelled successfully.");
      setRejectionReason("");
      setIsRejectOpen(false);
      setIsDetailsOpen(false);
      setSelectedPresc(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject prescription");
    }
  };

  const filtered = prescriptions.filter(p => {
    const matchesTab = p.status === activeTab;
    const matchesSearch = 
      p.patientName.toLowerCase().includes(search.toLowerCase()) || 
      p._id.toLowerCase().includes(search.toLowerCase()) ||
      p.doctorName.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-slate-500 font-medium">Loading prescriptions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prescription Verification</h1>
        <p className="text-sm text-slate-500">Review, verify, and validate doctor prescriptions before dispensing.</p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
          {(["Pending", "Approved", "Rejected"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab 
                  ? "bg-white text-navy-700 shadow-sm" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {tab} ({prescriptions.filter(p => p.status === tab).length})
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search prescription/patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-350 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-navy-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Prescription Grid List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
            No {activeTab.toLowerCase()} prescriptions found matching search criteria.
          </div>
        ) : (
          filtered.map(p => (
            <Card key={p._id} className="flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-navy-700">{p._id}</span>
                  <Badge tone={p.status === "Pending" ? "info" : p.status === "Approved" ? "success" : "danger"}>
                    {p.status}
                  </Badge>
                </div>
                
                <h4 className="text-base font-bold text-slate-800">{p.patientName}</h4>
                <p className="text-xs text-slate-500 mb-2">{p.patientAge} Yrs, {p.patientGender}</p>

                <div className="border-t border-dashed border-slate-100 my-3"></div>

                <div className="space-y-1 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Prescriber:</span>
                    <span className="font-medium text-slate-700">{p.doctorName} ({p.department})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span className="text-slate-700">{p.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Known Allergies:</span>
                    <span className={`font-semibold ${p.allergies !== "None" ? "text-red-500" : "text-slate-700"}`}>{p.allergies}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg mb-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Prescribed Medicines</div>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                    {p.medicines.map((med, idx) => (
                      <li key={idx}>{med}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <Button 
                  onClick={() => {
                    setSelectedPresc(p);
                    setIsDetailsOpen(true);
                  }}
                  variant="secondary" 
                  className="flex-1 text-xs py-1.5 flex items-center justify-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" /> Details
                </Button>

                {p.status === "Pending" && (
                  <>
                    <Button 
                      onClick={() => handleApprove(p._id)} 
                      variant="primary" 
                      className="flex-1 text-xs py-1.5 bg-green-700 hover:bg-green-800"
                    >
                      Verify
                    </Button>
                    <Button 
                      onClick={() => {
                        setSelectedPresc(p);
                        setIsRejectOpen(true);
                      }} 
                      variant="danger" 
                      className="text-xs py-1.5 px-3"
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedPresc && (
        <Modal 
          title={`Prescription Details - ${selectedPresc._id}`} 
          isOpen={isDetailsOpen} 
          onClose={() => setIsDetailsOpen(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Patient</div>
                <div className="font-bold text-slate-800">{selectedPresc.patientName}</div>
                <div className="text-xs text-slate-500">{selectedPresc.patientAge} Yrs | {selectedPresc.patientGender}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Prescriber</div>
                <div className="font-bold text-slate-800">{selectedPresc.doctorName}</div>
                <div className="text-xs text-slate-500">{selectedPresc.department}</div>
              </div>
            </div>

            <div className="text-sm">
              <div className="text-xs text-slate-400 font-semibold uppercase mb-1">Diagnosis</div>
              <div className="text-slate-800 bg-slate-50 p-2 rounded-lg">{selectedPresc.diagnosis}</div>
            </div>

            <div className="text-sm">
              <div className="text-xs text-slate-400 font-semibold uppercase mb-1">Allergy Warning Check</div>
              <div className={`p-2 rounded-lg font-medium ${
                selectedPresc.allergies !== "None" 
                  ? "bg-red-50 text-red-700 border border-red-200" 
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}>
                Patient Allergies: {selectedPresc.allergies}
              </div>
            </div>

            <div className="text-sm">
              <div className="text-xs text-slate-400 font-semibold uppercase mb-1">Prescribed Medicines & Dosage</div>
              <div className="bg-slate-550/5 border border-slate-200 rounded-lg p-3 space-y-2">
                {selectedPresc.medicines.map((med, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs text-slate-800">
                    <span className="font-semibold">{med.split(" - ")[0]}</span>
                    <span className="bg-navy-50 text-navy-700 px-2 py-0.5 rounded font-mono text-[10px]">{med.split(" - ")[1]}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedPresc.status === "Rejected" && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-sm">
                <div className="font-semibold text-xs uppercase text-rose-550 mb-0.5">Rejection Reason</div>
                <div>{selectedPresc.rejectionReason}</div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setIsDetailsOpen(false)}>Close</Button>
              {selectedPresc.status === "Pending" && (
                <>
                  <Button 
                    onClick={() => {
                      setIsRejectOpen(true);
                    }}
                    variant="danger"
                  >
                    Reject
                  </Button>
                  <Button 
                    onClick={() => handleApprove(selectedPresc._id)} 
                    className="bg-green-700 hover:bg-green-800"
                  >
                    Approve & Verify
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {selectedPresc && (
        <Modal 
          title="Reject Prescription" 
          isOpen={isRejectOpen} 
          onClose={() => setIsRejectOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Please enter the clinical/inventory reason for rejecting this prescription (e.g., drug interaction with patient's allergy to Sulfonamides, out of stock, dosage anomaly).
            </p>
            <TextareaField
              label="Rejection Reason"
              required
              placeholder="E.g., Flagged potential interaction with known allergies."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
              <Button variant="danger" disabled={!rejectionReason.trim()} onClick={handleRejectSubmit}>Submit Rejection</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
