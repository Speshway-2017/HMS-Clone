import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Search, Eye, Check, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useLaboratoryRequests, useAcceptRequest } from "../../features/laboratory";

export function LaboratoryTestRequestManagement() {
  const { data: requests = [], isLoading, isError } = useLaboratoryRequests();
  const acceptRequest = useAcceptRequest();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"Pending" | "Accepted" | "Rejected">("Pending");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");

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
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {visible.map((t, idx) => (
                      <span key={idx} className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-800">
                        {t}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span 
                        title={r.tests.slice(maxVisible).join(", ")}
                        className="rounded bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[9px] font-semibold text-slate-600 cursor-help transition-colors"
                      >
                        +{extraCount} more
                      </span>
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

    </div>
  );
}
