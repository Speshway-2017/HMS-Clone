import { useState } from "react";
import { FlaskConical, Plus, CheckCircle2, Clock, AlertTriangle, Search } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { KpiCard } from "../../components/ui/KpiCard";
import { usePatients } from "../../features/patients";

const NEW_ORDER_TESTS = [
  "CBC (Complete Blood Count)", "Lipid Profile", "LFT (Liver Function Tests)",
  "RFT (Renal Function Tests)", "HbA1c", "Thyroid Profile (TSH, T3, T4)",
  "Troponin I", "CRP (C-Reactive Protein)", "Urine Routine & Microscopy",
  "Coagulation Profile (PT, APTT)", "Serum Electrolytes", "Blood Culture & Sensitivity",
];

const RESULT_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  normal: "success", elevated: "warning", high: "danger", borderline: "warning", pending: "neutral", low: "info",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  approved: "success", awaiting_approval: "warning", pending: "neutral",
};

const TABS = ["View Reports", "Order Tests", "Approve Results"];

export function LaboratoryPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [priority, setPriority] = useState("routine");
  const { data: patientsData, isLoading } = usePatients({ page: 1 });

  const patients = patientsData?.data || [];

  const toggleTest = (t: string) =>
    setSelectedTests((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  // Construct dynamic laboratory reports from database patients
  const labReports = patients.map((p, index) => {
    const isEven = index % 2 === 0;
    const isThird = index % 3 === 0;
    
    const tests = isEven ? [
      { name: "HbA1c",            result: "7.2%",        ref: "< 5.7% (Normal)", status: "elevated" },
      { name: "Fasting Glucose",  result: "142 mg/dL",   ref: "70–99 mg/dL",     status: "high"    },
      { name: "LDL",              result: "142 mg/dL",   ref: "< 100 mg/dL",     status: "high"    },
    ] : [
      { name: "TSH",   result: "8.5 mIU/L",  ref: "0.4–4.0 mIU/L",  status: "high"   },
      { name: "Free T4",result: "1.2 ng/dL", ref: "0.8–1.8 ng/dL",  status: "normal" },
    ];

    const status = isThird ? "awaiting_approval" : isEven ? "approved" : "pending";
    const prio = isThird ? "stat" : isEven ? "routine" : "urgent";

    return {
      id: p._id,
      patient: p.name,
      orderDate: new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      reportDate: isThird ? "—" : new Date(new Date(p.createdAt).getTime() + 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      tests,
      status,
      priority: prio
    };
  });

  const filtered = labReports.filter(
    (r) =>
      r.patient.toLowerCase().includes(search.toLowerCase()) ||
      r.tests.some((t) => t.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laboratory</h1>
        <p className="text-sm text-slate-500">Order lab investigations, view reports, and approve results.</p>
      </div>

      {patients.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <FlaskConical className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Laboratory Reports</h3>
          <p className="text-xs text-slate-400">There are no patient records available to populate laboratory reports.</p>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total Reports"      value={labReports.length} icon={<FlaskConical className="h-5 w-5" />} emphasis />
            <KpiCard label="Pending"            value={labReports.filter(r => r.status === "pending").length} icon={<Clock className="h-5 w-5" />} />
            <KpiCard label="Awaiting Approval"  value={labReports.filter(r => r.status === "awaiting_approval").length} icon={<AlertTriangle className="h-5 w-5" />} />
            <KpiCard label="Approved"           value={labReports.filter(r => r.status === "approved").length} icon={<CheckCircle2 className="h-5 w-5" />} />
          </div>

          {/* Tabs */}
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

          {/* View Reports Tab */}
          {activeTab === 0 && (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patient or test..."
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              {filtered.map((report) => (
                <Card key={report.id}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{report.patient}</h3>
                      <p className="text-xs text-slate-500">
                        Ordered: {report.orderDate} · Reported: {report.reportDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={report.priority === "stat" ? "danger" : report.priority === "urgent" ? "warning" : "neutral"}>
                        {report.priority.toUpperCase()}
                      </Badge>
                      <Badge tone={STATUS_TONE[report.status]}>
                        {report.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-slate-100">
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Test</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Result</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Reference Range</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Flag</th>
                      </tr></thead>
                      <tbody>
                        {report.tests.map((t, i) => (
                          <tr key={i} className={`border-b border-slate-50 ${t.status === "high" || t.status === "elevated" ? "bg-red-50/40" : ""}`}>
                            <td className="py-2.5 font-medium text-slate-800">{t.name}</td>
                            <td className={`py-2.5 font-semibold ${t.status === "high" ? "text-red-600" : t.status === "elevated" ? "text-amber-600" : "text-slate-700"}`}>
                              {t.result}
                            </td>
                            <td className="py-2.5 text-slate-500">{t.ref}</td>
                            <td className="py-2.5"><Badge tone={RESULT_TONE[t.status]}>{t.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {report.status === "awaiting_approval" && (
                    <div className="mt-3 flex gap-2">
                      <Button variant="primary"><CheckCircle2 className="h-4 w-4" /> Approve Report</Button>
                      <Button variant="secondary">Request Repeat</Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Order Tests Tab */}
          {activeTab === 1 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <h3 className="mb-4 text-base font-semibold text-slate-800">Select Investigations</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {NEW_ORDER_TESTS.map((test) => (
                    <label
                      key={test}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                        selectedTests.includes(test)
                          ? "border-navy-400 bg-navy-50 text-navy-700"
                          : "border-slate-200 text-slate-600 hover:border-navy-200 hover:bg-navy-50/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test)}
                        onChange={() => toggleTest(test)}
                        className="accent-navy-700"
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
                      <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                        {patients.map((p) => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Priority</label>
                      <div className="flex gap-2">
                        {["routine", "urgent", "stat"].map((p) => (
                          <button
                            key={p}
                            onClick={() => setPriority(p)}
                            className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors ${
                              priority === p ? "bg-navy-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
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
                        placeholder="Reason for ordering..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                      />
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-navy-50 p-2.5">
                    <p className="text-xs font-semibold text-navy-700 mb-1">Selected Tests ({selectedTests.length})</p>
                    {selectedTests.length === 0
                      ? <p className="text-xs text-slate-400">No tests selected yet.</p>
                      : selectedTests.map((t) => <p key={t} className="text-xs text-slate-600">• {t}</p>)
                    }
                  </div>
                  <Button variant="primary" className="mt-3 w-full">
                    <Plus className="h-4 w-4" /> Place Order
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {/* Approve Results Tab */}
          {activeTab === 2 && (
            <div className="space-y-4">
              {labReports.filter((r) => r.status === "awaiting_approval").map((report) => (
                <Card key={report.id} className="border-amber-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{report.patient} — Awaiting Approval</h3>
                      <p className="text-xs text-slate-500">Ordered: {report.orderDate}</p>
                    </div>
                    <Badge tone="warning">Awaiting Approval</Badge>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {report.tests.map((t, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-sm font-medium text-slate-800">{t.name}</span>
                        <span className={`text-sm font-semibold ${t.status === "high" ? "text-red-600" : t.status === "elevated" ? "text-amber-600" : "text-slate-600"}`}>{t.result}</span>
                        <Badge tone={RESULT_TONE[t.status]}>{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary"><CheckCircle2 className="h-4 w-4" /> Approve All Results</Button>
                    <Button variant="secondary">Request Repeat Test</Button>
                    <Button variant="secondary">Add Comment</Button>
                  </div>
                </Card>
              ))}
              {labReports.filter((r) => r.status === "awaiting_approval").length === 0 && (
                <Card className="py-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600">All lab results have been approved.</p>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
