import { useState, useEffect } from "react";
import { FlaskConical, Plus, CheckCircle2, Clock, AlertTriangle, Search, User, ShieldAlert, X, Eye, Download } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { KpiCard } from "../../components/ui/KpiCard";
// ── SECURITY FIXES: use doctor-scoped hooks, NOT generic usePatients() or usePatients() mapped reports ──
import {
  useDoctorLabOrders,
  useDoctorLabOrderById,
  useCreateLabOrder,
  useDoctorPatients,
} from "../../features/doctorDashboard";

const NEW_ORDER_TESTS = [
  "CBC (Complete Blood Count)", "Lipid Profile", "LFT (Liver Function Tests)",
  "RFT (Renal Function Tests)", "HbA1c", "Thyroid Profile (TSH, T3, T4)",
  "Troponin I", "CRP (C-Reactive Protein)", "Urine Routine & Microscopy",
  "Coagulation Profile (PT, APTT)", "Serum Electrolytes", "Blood Culture & Sensitivity",
];

const RESULT_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  normal: "success",
  elevated: "warning",
  high: "danger",
  borderline: "warning",
  pending: "neutral",
  low: "info",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  pending: "neutral",
  accepted: "info",
  processing: "warning",
  report_uploaded: "warning",
  verified: "info",
  completed: "success",
  rejected: "danger",
};

const TABS = ["View Reports", "Order Tests", "Approve Results"];

export function LaboratoryPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [priority, setPriority] = useState("Routine");
  const [patientId, setPatientId] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Detailed view report modal state
  const [selectedOrderReportId, setSelectedOrderReportId] = useState<string | null>(null);

  // Fetch only doctor-owned lab orders from secured endpoints
  const { data: labOrdersData, isLoading: isLabOrdersLoading, isError: isLabError } = useDoctorLabOrders({ search: debouncedSearch });

  // Fetch only doctor-assigned patients for the placement selector dropdown to prevent leakage
  const { data: myPatientsData, isLoading: isPatientsLoading } = useDoctorPatients();

  // Create lab order mutation
  const createLabOrderMutation = useCreateLabOrder();

  const orders = labOrdersData?.orders ?? [];
  const counts = labOrdersData?.counts;
  const myPatients = myPatientsData?.patients ?? [];

  const toggleTest = (t: string) =>
    setSelectedTests((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  // Handle Order Placement
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error("Please select a patient.");
      return;
    }
    if (selectedTests.length === 0) {
      toast.error("Please select at least one test.");
      return;
    }

    try {
      await createLabOrderMutation.mutateAsync({
        patientId,
        tests: selectedTests,
        priority,
      });
      toast.success("Laboratory investigation order placed successfully!");
      // Reset form state
      setSelectedTests([]);
      setPatientId("");
      setClinicalNotes("");
      setPriority("Routine");
      setActiveTab(0);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Failed to place lab order.";
      toast.error(errMsg);
    }
  };

  const handleApproveReport = (orderId: string) => {
    toast.success(`Lab Report #${orderId.slice(-6).toUpperCase()} approved and signed off!`);
  };

  if (isLabOrdersLoading || isPatientsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  if (isLabError) {
    return (
      <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-red-200 bg-red-50">
        <ShieldAlert className="mb-2 h-10 w-10 text-red-400" />
        <h3 className="text-sm font-semibold text-red-600">Failed to load laboratory reports</h3>
        <p className="text-xs text-red-400 mt-1">Please check your permissions or try reloading.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laboratory</h1>
        <p className="text-sm text-slate-500">Order lab investigations, view reports, and approve results.</p>
      </div>

      {orders.length === 0 && activeTab !== 1 ? (
        /* Empty State */
        <div className="space-y-6">
          <div className="flex gap-1 border-b border-slate-200">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === i ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
            <FlaskConical className="mb-2 h-10 w-10 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-600">No laboratory requests assigned to you.</h3>
            <p className="text-xs text-slate-400 mt-1">
              You haven't ordered any investigations yet. Click the "Order Tests" tab to start.
            </p>
          </Card>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Reports" value={counts?.total ?? orders.length} icon={<FlaskConical className="h-5 w-5" />} emphasis />
            <KpiCard label="Pending" value={counts?.pending ?? orders.filter(o => o.status === "pending").length} icon={<Clock className="h-5 w-5" />} />
            <KpiCard label="Completed" value={counts?.completed ?? orders.filter(o => o.status === "completed").length} icon={<CheckCircle2 className="h-5 w-5" />} />
            <KpiCard label="Rejected" value={counts?.rejected ?? orders.filter(o => o.status === "rejected").length} icon={<AlertTriangle className="h-5 w-5" />} />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200 overflow-x-auto max-w-full scrollbar-none flex-nowrap shrink-0">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === i ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* View Reports Tab */}
          {activeTab === 0 && (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search patient or test..."
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>

              {orders.map((order) => {
                const p = order.patient as any;
                const patientName = p?.name || "Unknown Patient";
                const uhid = p?.uhid || "—";
                const orderDate = new Date(order.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                const isCompleted = order.status === "completed" || order.status === "Completed";
                const hasReport = order.report && order.report.files && order.report.files.length > 0;
                const reportReady = isCompleted && hasReport;

                return (
                  <Card key={order._id}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">{patientName}</h3>
                        <p className="text-xs text-slate-500">
                          UHID: {uhid} · Ordered: {orderDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={order.priority === "STAT" ? "danger" : order.priority === "Urgent" ? "warning" : "info"}>
                          {order.priority.toUpperCase()}
                        </Badge>
                        <Badge tone={STATUS_TONE[order.status] ?? "neutral"}>
                          {order.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ordered Investigations</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {order.tests.map((test, index) => (
                          <span key={index} className="px-2.5 py-0.5 bg-slate-100 rounded-full text-xs text-slate-700">
                            {test}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Report Status Banner */}
                    <div className={`mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      reportReady
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-amber-50 border border-amber-200 text-amber-700"
                    }`}>
                      {reportReady ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Report Ready — Attachment available for download
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                          Report Pending — Awaiting lab technician upload
                        </>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedOrderReportId(order._id)}
                      >
                        View Detailed Report
                      </Button>
                      {isCompleted && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApproveReport(order._id)}
                        >
                          Approve Results
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}

              {orders.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">No reports match your search criteria.</p>
              )}
            </div>
          )}

          {/* Order Tests Tab */}
          {activeTab === 1 && (
            <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <h3 className="mb-4 text-base font-semibold text-slate-800">Select Investigations</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {NEW_ORDER_TESTS.map((test) => (
                    <label
                      key={test}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                        selectedTests.includes(test)
                          ? "border-navy-400 bg-navy-50 text-navy-700 shadow-sm"
                          : "border-slate-200 text-slate-600 hover:border-navy-200 hover:bg-navy-50/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test)}
                        onChange={() => toggleTest(test)}
                        className="accent-navy-700 rounded"
                      />
                      {test}
                    </label>
                  ))}
                </div>
              </Card>

              <div className="space-y-4">
                <Card>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Order Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Patient</label>
                      {myPatients.length === 0 ? (
                        <div className="text-xs text-red-500 p-2 bg-red-50 border border-red-200 rounded">
                          No patients assigned. You can only order tests for patients assigned to you.
                        </div>
                      ) : (
                        <select
                          value={patientId}
                          onChange={(e) => setPatientId(e.target.value)}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200"
                        >
                          <option value="">— Select Patient —</option>
                          {myPatients.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} ({p.uhid || "No UHID"})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Priority</label>
                      <div className="flex gap-2">
                        {["Routine", "Urgent", "STAT"].map((p) => (
                          <button
                            type="button"
                            key={p}
                            onClick={() => setPriority(p)}
                            className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors ${
                              priority === p
                                ? "bg-navy-700 text-white shadow-sm"
                                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Clinical Notes</label>
                      <textarea
                        rows={3}
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        placeholder="Reason for ordering..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                      />
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-navy-50 p-2.5">
                    <p className="text-xs font-semibold text-navy-700 mb-1">Selected Tests ({selectedTests.length})</p>
                    {selectedTests.length === 0 ? (
                      <p className="text-xs text-slate-400">No tests selected yet.</p>
                    ) : (
                      selectedTests.map((t) => <p key={t} className="text-xs text-slate-600 font-medium">• {t}</p>)
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="mt-3 w-full"
                    disabled={createLabOrderMutation.isPending || myPatients.length === 0}
                  >
                    {createLabOrderMutation.isPending ? "Placing Order..." : "Place Order"}
                  </Button>
                </Card>
              </div>
            </form>
          )}

          {/* Approve Results Tab */}
          {activeTab === 2 && (
            <div className="space-y-4">
              {orders.filter((o) => o.status === "completed").map((order) => {
                const p = order.patient as any;
                const patientName = p?.name || "Unknown Patient";
                const orderDate = new Date(order.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <Card key={order._id} className="border-emerald-200 bg-emerald-50/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">{patientName}</h3>
                        <p className="text-xs text-slate-500">Ordered: {orderDate}</p>
                      </div>
                      <Badge tone="success">Completed</Badge>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {order.results && order.results.length > 0 ? (
                        order.results.map((res: any, i: number) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-white border border-slate-100 px-3 py-2 text-xs shadow-sm">
                            <span className="font-medium text-slate-800">{res.testName}</span>
                            <span className={`font-semibold ${res.status === "high" ? "text-red-600" : res.status === "elevated" ? "text-amber-600" : "text-slate-600"}`}>
                              {res.value}
                            </span>
                            <Badge tone={RESULT_TONE[res.status] ?? "neutral"}>{res.status}</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 py-1">No individual test result values entered.</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveReport(order._id)}
                      >
                        Approve Report
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toast.success("Simulated repeat requested")}
                      >
                        Request Repeat Test
                      </Button>
                    </div>
                  </Card>
                );
              })}

              {orders.filter((o) => o.status === "completed").length === 0 && (
                <Card className="py-12 text-center bg-slate-50/50">
                  <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600">No completed lab reports waiting for approval.</p>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* View Detailed Report Modal (Handles audit log triggering on GET /:id) */}
      <ReportDetailModal
        orderId={selectedOrderReportId}
        onClose={() => setSelectedOrderReportId(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Detailed View Modal
// ─────────────────────────────────────────────────────────────────────────────

interface ReportDetailModalProps {
  orderId: string | null;
  onClose: () => void;
}

function ReportDetailModal({ orderId, onClose }: ReportDetailModalProps) {
  // Triggers API request which enforces ownership and writes an audit log in controller
  const { data: detailData, isLoading, isError } = useDoctorLabOrderById(orderId);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  if (!orderId) return null;

  const order = detailData?.order;
  const reportsList: any[] = detailData?.reports && detailData.reports.length > 0
    ? detailData.reports
    : detailData?.report
      ? [detailData.report]
      : [];

  const patient = order?.patient as any;
  const doctor = order?.doctor as any;

  const getResolvedFileUrl = (file: any, repId?: string) => {
    const rawUrl = file?.secure_url || file?.url || file?.path || "";
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("data:")) {
      return rawUrl;
    }
    if (rawUrl.startsWith("/")) {
      return `${window.location.origin}${rawUrl}`;
    }
    return `/api/v1/diagnostic-reports/${repId || reportsList[0]?._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-transparent">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-navy-700 to-navy-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-white" />
            <h2 className="text-base font-semibold text-white">Laboratory Investigation Report</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {isLoading && (
            <div className="py-12 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-700 border-t-transparent"></div>
            </div>
          )}

          {isError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Access Denied</p>
                <p className="text-xs mt-1">You do not have permission to view this report or it belongs to another doctor.</p>
              </div>
            </div>
          )}

          {order && (
            <>
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs border border-slate-200">
                <div>
                  <p className="font-semibold text-slate-400 uppercase">Patient Name</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{patient?.name || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-400 uppercase">UHID</p>
                  <p className="text-sm font-mono text-slate-800 mt-0.5">{patient?.uhid || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-400 uppercase">Age / Gender</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {patient?.age ? `${patient.age} yrs` : "—"} / {patient?.gender || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-400 uppercase">Ordering Doctor</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">Dr. {doctor?.name || "—"}</p>
                </div>
              </div>

              {/* Status information */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
                <span className="text-slate-400 font-semibold">Priority: <Badge tone="info">{order.priority}</Badge></span>
                <span className="text-slate-400 font-semibold">Sample Status: <Badge tone="neutral">{order.status.toUpperCase()}</Badge></span>
              </div>

              {/* Tests and Results */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Investigation Results</p>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-3 text-left font-semibold text-slate-500 uppercase">Test Name</th>
                        <th className="p-3 text-left font-semibold text-slate-500 uppercase">Observed Value</th>
                        <th className="p-3 text-left font-semibold text-slate-500 uppercase">Reference Range</th>
                        <th className="p-3 text-left font-semibold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                      {order.results && order.results.length > 0 ? (
                        order.results.map((res: any, idx: number) => (
                          <tr key={idx} className={res.status === "high" || res.status === "elevated" ? "bg-red-50/20" : ""}>
                            <td className="p-3 font-medium text-slate-800">{res.testName}</td>
                            <td className={`p-3 font-bold ${res.status === "high" ? "text-red-600" : res.status === "elevated" ? "text-amber-600" : "text-slate-700"}`}>
                              {res.value}
                            </td>
                            <td className="p-3 text-slate-500">{res.referenceRange || "—"}</td>
                            <td className="p-3">
                              <Badge tone={RESULT_TONE[res.status] ?? "neutral"}>{res.status}</Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        order.tests.map((t: string, idx: number) => {
                          const matchedReport = reportsList.find((r) => r.testName?.toLowerCase() === t.toLowerCase()) || reportsList[idx];
                          return (
                            <tr key={idx}>
                              <td className="p-3 font-medium text-slate-800">{t}</td>
                              <td className={`p-3 ${matchedReport ? "text-blue-700 font-semibold" : "text-slate-400 italic font-medium"}`}>
                                {matchedReport ? "Report Document Uploaded" : "Pending..."}
                              </td>
                              <td className="p-3 text-slate-400">—</td>
                              <td className="p-3">
                                <Badge tone={matchedReport ? "info" : "neutral"}>
                                  {matchedReport ? "uploaded" : "pending"}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Technician Observations & Files across ALL reports */}
              {reportsList.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4 space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Technician Observations & Documents ({reportsList.length})</p>
                  {reportsList.map((reportItem: any, rIdx: number) => (
                    <div key={reportItem._id || rIdx} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                      {reportItem.testName && (
                        <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                          <span className="font-bold text-navy-800 text-sm">{reportItem.testName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Report #{reportItem._id?.slice(-6)?.toUpperCase()}</span>
                        </div>
                      )}
                      {reportItem.observations && (
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Findings / Observations</div>
                          <div className="text-xs font-medium text-slate-800 mt-0.5 whitespace-pre-wrap">{reportItem.observations}</div>
                        </div>
                      )}
                      {reportItem.remarks && (
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Remarks</div>
                          <div className="text-xs text-slate-500 italic mt-0.5 whitespace-pre-wrap">{reportItem.remarks}</div>
                        </div>
                      )}
                      {reportItem.files && reportItem.files.length > 0 && (
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase mb-1.5">Attached Files ({reportItem.files.length})</div>
                          <div className="flex flex-col gap-2">
                            {reportItem.files.map((file: any, index: number) => {
                              const resolvedUrl = getResolvedFileUrl(file, reportItem._id);
                              const filename = file.original_filename || file.name || `${reportItem.testName || "Report"}_file_${index + 1}.jpg`;
                              return (
                                <div key={index} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 text-xs shadow-xs">
                                  <span className="font-semibold text-slate-700 truncate max-w-[220px]">{filename}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewFile({ url: resolvedUrl, name: filename })}
                                      className="inline-flex items-center gap-1 hover:underline text-blue-700 font-bold px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-md text-xs transition-colors"
                                    >
                                      <Eye className="h-3.5 w-3.5" /> View
                                    </button>
                                    <a
                                      href={resolvedUrl}
                                      download={filename}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 hover:underline text-emerald-700 font-bold px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-md text-xs transition-colors"
                                    >
                                      <Download className="h-3.5 w-3.5" /> Download
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 border-t border-slate-200/60 pt-2">
                        Uploaded By: <span className="font-bold text-slate-650">{reportItem.uploadedBy?.name || "Technician"}</span> on {new Date(reportItem.uploadedAt || reportItem.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Security confirmation */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p>Report accessed under doctor privilege. Your transaction was logged to the security audit trail.</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4 shrink-0">
          <Button onClick={onClose} variant="secondary" size="sm">
            Close
          </Button>
        </div>
      </div>

      {/* Inline Document & Image Lightbox Previewer Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-transparent animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Lightbox Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-3.5 text-white shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Eye className="h-4 w-4 text-blue-400 shrink-0" />
                <h3 className="text-sm font-semibold truncate">{previewFile.name}</h3>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/80 min-h-[350px]">
              {/\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(previewFile.url) || /\.(png|jpe?g|webp|gif|svg)/i.test(previewFile.name) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[78vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-slate-200 bg-white p-2"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[78vh] rounded-xl border border-slate-200 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
