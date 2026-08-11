import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Search, Eye, Check, IndianRupee, FlaskConical, Layers, Microscope } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useLaboratoryRequests, useAcceptRequest } from "../../features/laboratory";

const getTestCategory = (name: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes("x-ray") || n.includes("mri") || n.includes("ct") || n.includes("ultrasound") || n.includes("usg") || n.includes("scan") || n.includes("radiology")) {
    return "Radiology & Imaging";
  }
  if (n.includes("blood") || n.includes("cbc") || n.includes("hemogram") || n.includes("platelet") || n.includes("esr") || n.includes("anemia")) {
    return "Hematology";
  }
  if (n.includes("lipid") || n.includes("glucose") || n.includes("sugar") || n.includes("hba1c") || n.includes("lft") || n.includes("kft") || n.includes("creatinine") || n.includes("thyroid") || n.includes("t3") || n.includes("t4") || n.includes("tsh") || n.includes("liver") || n.includes("kidney") || n.includes("panel")) {
    return "Biochemistry";
  }
  if (n.includes("ecg") || n.includes("echo") || n.includes("tmt") || n.includes("cardiac") || n.includes("troponin") || n.includes("heart")) {
    return "Cardiology";
  }
  if (n.includes("urine") || n.includes("stool") || n.includes("culture") || n.includes("sputum") || n.includes("swab")) {
    return "Microbiology";
  }
  return "Laboratory Specimen";
};

export function LaboratoryTestRequestManagement() {
  const { data: requests = [], isLoading, isError } = useLaboratoryRequests();
  const acceptRequest = useAcceptRequest();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"Pending" | "Accepted" | "Rejected">("Pending");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [selectedRequestForModal, setSelectedRequestForModal] = useState<any | null>(null);

  const mapStatusTab = (status: string): "Pending" | "Accepted" | "Rejected" => {
    const s = (status || "").toLowerCase();
    if (s === "pending" || s === "pending request" || s === "pending approval") return "Pending";
    if (s === "rejected") return "Rejected";
    return "Accepted"; // accepted, processing, report_uploaded, verified, completed
  };

  const handleDirectAccept = async (id: string) => {
    try {
      await acceptRequest.mutateAsync(id);
      toast.success("Request accepted! Moved to Test Processing queue.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to accept request.");
    }
  };

  const filtered = requests.filter(r => {
    const tabMatches = mapStatusTab(r.status) === activeTab;
    const searchMatches = 
      r.patientName.toLowerCase().includes(search.toLowerCase()) ||
      r._id.toLowerCase().includes(search.toLowerCase()) ||
      r.tests.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const priorityMatches = filterPriority === "All" || r.priority === filterPriority;
    return tabMatches && searchMatches && priorityMatches;
  });

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Test Request Management</h1>
        <p className="text-sm text-slate-500">Review, accept, or reject incoming laboratory and radiology test orders from doctors.</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
          {(["Pending", "Accepted", "Rejected"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {tab} ({requests.filter(r => mapStatusTab(r.status) === tab).length})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Priorities</option>
            <option value="Routine">Routine</option>
            <option value="Urgent">Urgent</option>
            <option value="STAT">STAT (Emergency)</option>
          </select>

          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search request ID, patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-350 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Main Request Grid Table */}
      <Card>
        <DataTable
          rowKey={(r) => r._id}
          rows={filtered}
          dense={true}
          emptyMessage={`No ${activeTab.toLowerCase()} requests found.`}
          columns={[
            {
              header: "Patient Details",
              render: (r) => (
                <div>
                  <div className="font-semibold text-slate-800 text-xs">{r.patientName}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {r.patientAge} Yrs, {r.patientGender} {r.patientUhid && `· UHID: ${r.patientUhid}`}
                  </div>
                  <div className="font-mono text-[9px] text-blue-600 mt-1 font-semibold">{r._id.toUpperCase()}</div>
                </div>
              )
            },
            {
              header: "Requested Tests",
              render: (r) => {
                const maxVisible = 2;
                const visible = r.tests.slice(0, maxVisible);
                const extraCount = r.tests.length - maxVisible;
                return (
                  <div className="flex flex-wrap items-center gap-1.5 max-w-[240px]">
                    {visible.map((t, idx) => (
                      <span
                        key={idx}
                        onClick={() => setSelectedRequestForModal(r)}
                        className="rounded-md bg-blue-50 hover:bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-800 border border-blue-200/60 cursor-pointer transition-all active:scale-95"
                        title="Click to view all requested tests"
                      >
                        {t}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequestForModal(r);
                        }}
                        className="rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 text-[9px] font-extrabold cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-95 flex items-center gap-1"
                        title="Click to view full requested tests popup"
                      >
                        +{extraCount} more
                      </button>
                    )}
                  </div>
                );
              }
            },
            {
              header: "Ordered By",
              render: (r) => (
                <div>
                  <div className="text-xs font-semibold text-slate-800">{r.orderedBy}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Ordered: {new Date(r.date).toLocaleDateString()}</div>
                </div>
              )
            },
            {
              header: "Priority",
              render: (r) => (
                <Badge tone={r.priority === "STAT" ? "danger" : r.priority === "Urgent" ? "warning" : "neutral"} className="text-[10px]">
                  {r.priority}
                </Badge>
              )
            },
            {
              header: "Status",
              render: (r) => {
                const s = r.status.toLowerCase();
                let tone: "info" | "danger" | "success" | "warning" = "info";
                if (s === "pending") tone = "info";
                else if (s === "rejected") tone = "danger";
                else if (s === "completed") tone = "success";
                else tone = "warning";
                return (
                  <Badge tone={tone} className="text-[10px]">
                    {r.status.toUpperCase()}
                  </Badge>
                );
              }
            },
            {
              header: "Actions",
              render: (r) => {
                const isPending = mapStatusTab(r.status) === "Pending";
                return (
                  <div className="flex items-center gap-1.5">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        navigate(`/laboratory/requests/${r._id}`, { state: { request: r } });
                      }}
                      className="p-1 hover:text-blue-700 hover:bg-slate-100"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isPending && (
                      <Button
                        onClick={() => handleDirectAccept(r._id)}
                        className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1"
                        title="Accept Request and move to Test Processing"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                    )}
                  </div>
                );
              }
            }
          ]}
        />
      </Card>

      {/* POPUP MODAL: FULL REQUESTED TESTS LIST */}
      {selectedRequestForModal && (
        <Modal
          isOpen={!!selectedRequestForModal}
          onClose={() => setSelectedRequestForModal(null)}
          title="Requested Diagnostic Tests List"
          size="lg"
        >
          <div className="space-y-5 text-slate-800">
            {/* Patient & Request Meta Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-semibold">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Patient Name & UHID</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedRequestForModal.patientName}</span>
                <span className="text-slate-500 block text-[11px] font-medium mt-0.5">
                  {selectedRequestForModal.patientAge} Yrs, {selectedRequestForModal.patientGender} · UHID: <strong className="text-indigo-600 font-bold">{selectedRequestForModal.patientUhid || "HMS-PT-88201"}</strong>
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Request Reference ID</span>
                <span className="font-mono font-extrabold text-blue-700 text-xs">{selectedRequestForModal._id.toUpperCase()}</span>
                <span className="text-slate-500 block text-[11px] font-medium mt-0.5">
                  Ordered by <strong>Dr. {selectedRequestForModal.orderedBy}</strong> on {new Date(selectedRequestForModal.date).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>

            {/* Badges Bar: Total Tests, Priority, Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-150 py-3">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-800 font-extrabold text-xs px-3 py-1 rounded-lg border border-indigo-200">
                  {selectedRequestForModal.tests.length} Requested Test{selectedRequestForModal.tests.length > 1 ? "s" : ""}
                </span>
                <Badge tone={selectedRequestForModal.priority === "STAT" ? "danger" : selectedRequestForModal.priority === "Urgent" ? "warning" : "neutral"}>
                  Priority: {selectedRequestForModal.priority}
                </Badge>
              </div>
              <Badge tone={selectedRequestForModal.status.toLowerCase() === "pending" ? "info" : selectedRequestForModal.status.toLowerCase() === "rejected" ? "danger" : "success"}>
                Status: {selectedRequestForModal.status.toUpperCase()}
              </Badge>
            </div>

            {/* Complete Tests List Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" /> Full Investigation Order List
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {selectedRequestForModal.tests.map((testName: string, index: number) => {
                  const category = getTestCategory(testName);
                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-start gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-black text-xs">
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-slate-900 text-xs truncate" title={testName}>
                          {testName}
                        </h5>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <FlaskConical className="h-3 w-3 text-blue-600" /> {category}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRequestForModal(null)}
                className="rounded-lg px-4 py-2 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {mapStatusTab(selectedRequestForModal.status) === "Pending" && (
                  <Button
                    onClick={() => {
                      const reqId = selectedRequestForModal._id;
                      setSelectedRequestForModal(null);
                      handleDirectAccept(reqId);
                    }}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="h-4 w-4" /> Accept All Tests
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    const reqId = selectedRequestForModal._id;
                    const reqObj = selectedRequestForModal;
                    setSelectedRequestForModal(null);
                    navigate(`/laboratory/requests/${reqId}`, { state: { request: reqObj } });
                  }}
                  className="py-2 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="h-4 w-4" /> Full Order Details
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

