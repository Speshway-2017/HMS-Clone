import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, Eye, Search, FileText } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { usePrescriptions } from "../../features/doctorDashboard";

interface Prescription {
  _id: string;
  prescriptionNumber: string;
  patientName: string;
  patientUhid: string;
  patientAge: number;
  patientGender: string;
  doctorName: string;
  department: string;
  medicines: string[];
  date: string;
  status: "Pending" | "Preparing" | "Ready for Pickup" | "Partially Dispensed" | "Dispensed" | "Completed" | "Cancelled";
}

export function PharmacyPrescriptionVerification() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"Active" | "Completed" | "Cancelled">("Active");
  const [search, setSearch] = useState("");

  const { data: realPrescriptions, isLoading } = usePrescriptions();

  const prescriptions: Prescription[] = (realPrescriptions || []).map((rx: any) => {
    return {
      _id: rx._id,
      prescriptionNumber: rx.prescriptionNumber || rx._id.slice(-6).toUpperCase(),
      patientName: rx.patient?.name || "Unknown Patient",
      patientUhid: rx.patient?.uhid || "N/A",
      patientAge: rx.patient?.age || 30,
      patientGender: rx.patient?.gender || "Male",
      doctorName: rx.doctor?.name || "Attending Physician",
      department: rx.department?.name || "General Medicine",
      medicines: (rx.medications || []).map(
        (m: any) => `${m.name}${m.strength ? ` (${m.strength})` : ""} - ${m.dosage || ""}, ${m.frequency || ""}, ${m.duration || ""}`
      ),
      date: new Date(rx.createdAt).toISOString().split("T")[0],
      status: rx.status || "Pending",
    };
  });

  const filtered = prescriptions.filter(p => {
    const isCompleted = p.status === "Completed" || p.status === "Dispensed";
    const isCancelled = p.status === "Cancelled";
    const isActive = p.status === "Pending" || p.status === "Preparing" || p.status === "Ready for Pickup" || p.status === "Partially Dispensed";

    const matchesTab = 
      (activeTab === "Active" && isActive) ||
      (activeTab === "Completed" && isCompleted) ||
      (activeTab === "Cancelled" && isCancelled);

    const matchesSearch = 
      p.patientName.toLowerCase().includes(search.toLowerCase()) || 
      p.patientUhid.toLowerCase().includes(search.toLowerCase()) ||
      p.prescriptionNumber.toLowerCase().includes(search.toLowerCase()) ||
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

  const getStatusBadgeTone = (status: Prescription["status"]) => {
    switch (status) {
      case "Pending":
        return "info";
      case "Preparing":
        return "warning";
      case "Ready for Pickup":
        return "info";
      case "Partially Dispensed":
        return "warning";
      case "Dispensed":
      case "Completed":
        return "success";
      case "Cancelled":
        return "danger";
      default:
        return "info";
    }
  };

  const getDisplayStatus = (status: Prescription["status"]) => {
    if (status === "Pending") return "Waiting";
    return status;
  };

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
          {(["Active", "Completed", "Cancelled"] as const).map(tab => {
            const count = prescriptions.filter(p => {
              if (tab === "Active") return p.status === "Pending" || p.status === "Partially Dispensed" || p.status === "Dispensed";
              if (tab === "Completed") return p.status === "Completed";
              return p.status === "Cancelled";
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab 
                    ? "bg-white text-emerald-700 shadow-sm" 
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Patient / UHID / Prescription..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-350 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Prescription Grid List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
            No {activeTab.toLowerCase()} prescriptions found.
          </div>
        ) : (
          filtered.map(p => (
            <Card key={p._id} className="flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-700">{p.prescriptionNumber}</span>
                  </div>
                  <Badge tone={getStatusBadgeTone(p.status)}>
                    {getDisplayStatus(p.status)}
                  </Badge>
                </div>
                
                <h4 className="text-base font-bold text-slate-800">{p.patientName}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span>UHID: {p.patientUhid}</span>
                  <span>•</span>
                  <span>{p.patientAge} Yrs, {p.patientGender}</span>
                </div>

                <div className="border-t border-dashed border-slate-100 my-3"></div>

                <div className="space-y-1 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Prescriber:</span>
                    <span className="font-medium text-slate-700">{p.doctorName} ({p.department})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span className="text-slate-750">{p.date}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg mb-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Prescribed Medicines</div>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                    {p.medicines.slice(0, 3).map((med, idx) => (
                      <li key={idx} className="truncate">{med.split(" - ")[0]}</li>
                    ))}
                    {p.medicines.length > 3 && (
                      <li className="text-[10px] text-slate-400 list-none font-semibold">
                        + {p.medicines.length - 3} more items
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <a
                  href={`/api/v1/prescriptions/${p._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 text-xs font-semibold transition"
                >
                  <Eye className="h-3.5 w-3.5" /> View PDF
                </a>

                {p.status !== "Completed" && p.status !== "Cancelled" && (
                  <Button 
                    onClick={() => navigate(`/pharmacy/dispensing?prescriptionId=${p._id}`)} 
                    variant="primary" 
                    className="flex-1 text-xs py-1.5 bg-green-700 hover:bg-green-800"
                  >
                    Dispense
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
