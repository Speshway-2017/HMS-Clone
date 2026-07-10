import { useState } from "react";
import { ScanLine, AlertTriangle, CheckCircle2, Clock, ZoomIn } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { KpiCard } from "../../components/ui/KpiCard";
import { usePatients } from "../../features/patients";

const MODALITIES = ["All", "X-Ray", "MRI", "CT Scan", "Ultrasound", "ECG", "Echocardiography"];

const STATUS_TONE: Record<string, "success" | "danger" | "warning" | "neutral" | "info"> = {
  normal: "success", abnormal: "danger", pending: "neutral",
};

const MODALITY_COLOR: Record<string, string> = {
  "X-Ray":           "bg-blue-100 text-blue-700",
  "MRI":             "bg-purple-100 text-purple-700",
  "CT Scan":         "bg-orange-100 text-orange-700",
  "Ultrasound":      "bg-teal-100 text-teal-700",
  "ECG":             "bg-red-100 text-red-700",
  "Echocardiography":"bg-pink-100 text-pink-700",
};

export function RadiologyPage() {
  const [activeModality, setActiveModality] = useState("All");
  const { data: patientsData, isLoading } = usePatients({ page: 1 });

  const patients = patientsData?.data || [];

  // Construct dynamic radiology reports from database patients
  const radiologyReports = patients.map((p, index) => {
    const isEven = index % 2 === 0;
    const isThird = index % 3 === 0;

    const type = isEven ? "X-Ray" : isThird ? "MRI" : "CT Scan";
    const region = isEven ? "Chest (PA View)" : isThird ? "Right Knee" : "Brain (Plain)";
    const status = isThird ? "pending" : isEven ? "normal" : "abnormal";
    const priority = isThird ? "stat" : isEven ? "routine" : "urgent";
    const radiologist = isThird ? "—" : "Dr. K. Nair";
    const finding = isThird ? "Pending radiologist review." : isEven ? "No cardiomegaly. Lung fields clear. Costophrenic angles sharp." : "High density focus seen in the right temporal lobe, suggestive of bleed.";
    const impression = isThird ? "Pending." : isEven ? "Normal chest radiograph." : "Findings suggestive of acute hemorrhage. Correlate clinically.";

    return {
      id: p._id,
      type,
      patient: p.name,
      age: p.age || 35,
      date: new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      region,
      status,
      priority,
      finding,
      impression,
      radiologist,
      approved: isEven,
    };
  });

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const selectedReport = radiologyReports.find((r) => r.id === selectedReportId) || null;

  const filtered = radiologyReports.filter(
    (r) => activeModality === "All" || r.type === activeModality
  );

  const counts = {
    total: radiologyReports.length,
    abnormal: radiologyReports.filter((r) => r.status === "abnormal").length,
    pending: radiologyReports.filter((r) => r.status === "pending").length,
    normal: radiologyReports.filter((r) => r.status === "normal").length,
  };

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
        <h1 className="text-2xl font-bold text-slate-900">Radiology</h1>
        <p className="text-sm text-slate-500">View and manage imaging reports: X-Ray, MRI, CT Scan, Ultrasound, ECG.</p>
      </div>

      {patients.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <ScanLine className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Radiology Studies</h3>
          <p className="text-xs text-slate-400">There are no patient records available to populate radiology reports.</p>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total Studies"  value={counts.total}    icon={<ScanLine className="h-5 w-5" />} emphasis />
            <KpiCard label="Abnormal"       value={counts.abnormal} icon={<AlertTriangle className="h-5 w-5" />} />
            <KpiCard label="Pending Review" value={counts.pending}  icon={<Clock className="h-5 w-5" />} />
            <KpiCard label="Normal"         value={counts.normal}   icon={<CheckCircle2 className="h-5 w-5" />} />
          </div>

          {/* Modality Filter */}
          <div className="flex flex-wrap gap-2">
            {MODALITIES.map((m) => (
              <button
                key={m}
                onClick={() => setActiveModality(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeModality === m ? "bg-navy-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {m}
                {m !== "All" && (
                  <span className="ml-1 text-xs opacity-60">
                    ({radiologyReports.filter((r) => r.type === m).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReportId(report.id)}
                className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
                  selectedReport?.id === report.id ? "border-navy-400 shadow-md" : "border-slate-100 bg-white hover:bg-slate-50"
                }`}
              >
                {/* Imaging Preview Placeholder */}
                <div className="relative mb-3 flex h-36 items-center justify-center rounded-lg bg-slate-900">
                  <ScanLine className="h-12 w-12 text-slate-600" />
                  <div className={`absolute top-2 left-2 rounded px-2 py-0.5 text-xs font-bold ${MODALITY_COLOR[report.type] ?? "bg-slate-200 text-slate-700"}`}>
                    {report.type}
                  </div>
                  <button className="absolute top-2 right-2 rounded bg-white/10 p-1 hover:bg-white/20 transition-colors">
                    <ZoomIn className="h-3.5 w-3.5 text-white" />
                  </button>
                  {report.status === "abnormal" && (
                    <div className="absolute bottom-2 right-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{report.patient}</p>
                    <p className="text-xs text-slate-500">{report.age} yrs · {report.region}</p>
                  </div>
                  <Badge tone={STATUS_TONE[report.status]}>{report.status}</Badge>
                </div>
                <p className="text-xs text-slate-400 mb-2">{report.date} · {report.radiologist}</p>
                <p className="text-xs text-slate-600 line-clamp-2">{report.impression}</p>

                {!report.approved && report.status !== "pending" && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <AlertTriangle className="h-3 w-3" /> Awaiting doctor approval
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Detail Modal Panel */}
          {selectedReport && (
            <Card className="border-navy-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {selectedReport.type} — {selectedReport.patient}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedReport.region} · {selectedReport.date} · Radiologist: {selectedReport.radiologist}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={selectedReport.priority === "stat" ? "danger" : selectedReport.priority === "urgent" ? "warning" : "neutral"}>
                    {selectedReport.priority.toUpperCase()}
                  </Badge>
                  <Badge tone={STATUS_TONE[selectedReport.status]}>{selectedReport.status}</Badge>
                  <button onClick={() => setSelectedReportId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Findings</p>
                  <p className="text-sm text-slate-700">{selectedReport.finding}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Impression</p>
                  <p className="text-sm text-slate-700 font-medium">{selectedReport.impression}</p>
                </div>
              </div>

              {!selectedReport.approved && (
                <div className="mt-4 flex gap-2">
                  <button className="flex items-center gap-1 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
                    <CheckCircle2 className="h-4 w-4" /> Acknowledge &amp; Approve
                  </button>
                  <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Request Second Opinion
                  </button>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
