import { useState, useEffect } from "react";
import { ClipboardList, Search, Check, X, Eye } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { TextareaField } from "../../components/ui/Field";

interface TestRequest {
  _id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  orderedBy: string;
  tests: string[];
  priority: "Routine" | "Urgent" | "STAT";
  date: string;
  status: string;
  sampleId?: string;
  sampleType?: string;
  results?: any[];
  rejectionReason?: string;
}

export function LaboratoryTestRequestManagement() {
  const [requests, setRequests] = useState<TestRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"Pending" | "Accepted" | "Rejected">("Pending");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");

  // Modals state
  const [selectedReq, setSelectedReq] = useState<TestRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("hms_laboratory_requests");
    if (saved) {
      setRequests(JSON.parse(saved));
    }
  }, []);

  const saveRequests = (updated: TestRequest[]) => {
    setRequests(updated);
    localStorage.setItem("hms_laboratory_requests", JSON.stringify(updated));
  };

  const handleAccept = (id: string) => {
    const updated = requests.map(r => 
      r._id === id ? { ...r, status: "Sample Collected" } : r
    );
    saveRequests(updated);
    setIsDetailsOpen(false);
    setSelectedReq(null);
  };

  const handleRejectSubmit = () => {
    if (!selectedReq || !rejectionReason.trim()) return;
    const updated = requests.map(r => 
      r._id === selectedReq._id ? { ...r, status: "Rejected", rejectionReason } : r
    );
    saveRequests(updated);
    setRejectionReason("");
    setIsRejectOpen(false);
    setIsDetailsOpen(false);
    setSelectedReq(null);
  };

  const mapStatusTab = (status: string): "Pending" | "Accepted" | "Rejected" => {
    if (status === "Pending Request" || status === "Pending Approval" || status === "Pending") return "Pending";
    if (status === "Rejected") return "Rejected";
    return "Accepted"; // Sample Collected, In Progress, Awaiting Verification, Completed
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Test Request Management</h1>
        <p className="text-sm text-slate-500">Review, accept, or reject incoming laboratory test orders from doctors.</p>
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
          emptyMessage={`No ${activeTab.toLowerCase()} requests found.`}
          columns={[
            {
              header: "Request ID",
              render: (r) => <span className="font-bold text-blue-700">{r._id}</span>
            },
            {
              header: "Patient Details",
              render: (r) => (
                <div>
                  <div className="font-semibold text-slate-800">{r.patientName}</div>
                  <div className="text-xs text-slate-500">{r.patientAge} Yrs, {r.patientGender}</div>
                </div>
              )
            },
            {
              header: "Requested Tests",
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  {r.tests.map((t, idx) => (
                    <span key={idx} className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                      {t}
                    </span>
                  ))}
                </div>
              )
            },
            {
              header: "Ordered By",
              render: (r) => <span className="text-xs font-medium text-slate-700">{r.orderedBy}</span>
            },
            {
              header: "Date",
              render: (r) => <span className="text-xs text-slate-600">{r.date}</span>
            },
            {
              header: "Priority",
              render: (r) => (
                <Badge tone={r.priority === "STAT" ? "danger" : r.priority === "Urgent" ? "warning" : "neutral"}>
                  {r.priority}
                </Badge>
              )
            },
            {
              header: "Status",
              render: (r) => (
                <Badge tone={r.status === "Pending Request" || r.status === "Pending" ? "info" : r.status === "Rejected" ? "danger" : "success"}>
                  {r.status}
                </Badge>
              )
            },
            {
              header: "Actions",
              render: (r) => (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setSelectedReq(r);
                      setIsDetailsOpen(true);
                    }}
                    className="p-1 hover:text-blue-700 hover:bg-slate-100"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {mapStatusTab(r.status) === "Pending" && (
                    <>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleAccept(r._id)}
                        className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50"
                        title="Accept Request"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setSelectedReq(r);
                          setIsRejectOpen(true);
                        }}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50"
                        title="Reject Request"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Details Modal */}
      {selectedReq && (
        <Modal 
          title={`Test Request Details - ${selectedReq._id}`} 
          isOpen={isDetailsOpen} 
          onClose={() => setIsDetailsOpen(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Patient</div>
                <div className="font-bold text-slate-800">{selectedReq.patientName}</div>
                <div className="text-xs text-slate-500">{selectedReq.patientAge} Yrs | {selectedReq.patientGender}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Ordered By</div>
                <div className="font-bold text-slate-800">{selectedReq.orderedBy}</div>
                <div className="text-xs text-slate-500">Diagnostics Request</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase mb-1">Requested Tests</div>
              <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
                {selectedReq.tests.map((t, idx) => <li key={idx}>{t}</li>)}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-3">
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Priority</div>
                <Badge tone={selectedReq.priority === "STAT" ? "danger" : selectedReq.priority === "Urgent" ? "warning" : "neutral"}>
                  {selectedReq.priority}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Order Date</div>
                <div className="font-medium text-slate-850">{selectedReq.date}</div>
              </div>
            </div>

            {selectedReq.status === "Rejected" && selectedReq.rejectionReason && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">
                <div className="font-bold text-xs uppercase text-red-700 mb-0.5">Rejection Reason</div>
                <div>{selectedReq.rejectionReason}</div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setIsDetailsOpen(false)}>Close</Button>
              {mapStatusTab(selectedReq.status) === "Pending" && (
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
                    onClick={() => handleAccept(selectedReq._id)} 
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accept & Register
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {selectedReq && (
        <Modal 
          title="Reject Request" 
          isOpen={isRejectOpen} 
          onClose={() => setIsRejectOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Please enter the clinical/operation reason for rejecting this test request (e.g., sample volume insufficient, test temporarily unavailable).
            </p>
            <TextareaField
              label="Rejection Reason"
              required
              placeholder="E.g., Reagents out of stock for specific panels."
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
