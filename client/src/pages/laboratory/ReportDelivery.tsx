import { useState } from "react";
import { FileText, Search, Printer, Download, Eye, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useLaboratoryRequests, usePublishReport, UnifiedRequest } from "../../features/laboratory";

export function LaboratoryReportDelivery() {
  const { data: requests = [], isLoading, isError } = useLaboratoryRequests();
  const publishReport = usePublishReport();

  const [search, setSearch] = useState("");
  const [selectedReq, setSelectedReq] = useState<UnifiedRequest | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handlePublish = async (id: string) => {
    try {
      await publishReport.mutateAsync(id);
      toast.success("Report published! Notifications sent to Doctor & Patient.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to publish report.");
    }
  };

  // Filter verified reports (awaiting publish)
  const verifiedReports = requests.filter(r => r.status === "verified");

  // Filter completed reports (already published)
  const completedReports = requests.filter(r => r.status === "completed");

  const filtered = completedReports.filter(r => 
    r.patientName.toLowerCase().includes(search.toLowerCase()) || 
    r._id.toLowerCase().includes(search.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-slate-900">Report Delivery &amp; Publishing</h1>
        <p className="text-sm text-slate-500">Publish verified diagnostic reports to patients and attending doctors in real-time.</p>
      </div>

      {/* Awaiting Release Queue */}
      <Card>
        <h3 className="mb-4 text-base font-semibold text-slate-800">Awaiting Release / Publication Queue</h3>
        {verifiedReports.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No verified reports are awaiting publication.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {verifiedReports.map(req => (
              <div key={req._id} className="flex flex-col sm:flex-row justify-between sm:items-center py-4 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">{req.patientName}</span>
                    <Badge tone={req.requestType === "Laboratory" ? "info" : "warning"}>{req.requestType}</Badge>
                    <Badge tone="success">QC VERIFIED</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Assays/Modality: {req.tests.join(", ")} | Req ID: {req._id.toUpperCase()}
                  </div>
                </div>
                <Button 
                  onClick={() => handlePublish(req._id)}
                  className="flex items-center gap-1 text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-750"
                >
                  <Send className="h-3.5 w-3.5" /> Publish Report
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Filters & Search for Completed */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Finalized / Published Reports</h3>
        </div>

        <div className="relative max-w-xs w-full">
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

      {/* Reports Data Table */}
      <Card>
        <DataTable
          rowKey={(r) => r._id}
          rows={filtered}
          emptyMessage="No finalized reports found."
          columns={[
            {
              header: "Request ID",
              render: (r) => <span className="font-bold text-blue-750 font-mono text-xs">{r._id.toUpperCase()}</span>
            },
            {
              header: "Request Type",
              render: (r) => (
                <Badge tone={r.requestType === "Laboratory" ? "info" : "warning"}>
                  {r.requestType}
                </Badge>
              )
            },
            {
              header: "Patient",
              render: (r) => (
                <div>
                  <div className="font-semibold text-slate-800">{r.patientName}</div>
                  <div className="text-[10px] text-slate-400">Age/Gen: {r.patientAge}Y / {r.patientGender}</div>
                </div>
              )
            },
            {
              header: "Ordered By",
              render: (r) => <span className="text-xs text-slate-700">{r.orderedBy}</span>
            },
            {
              header: "Tests Conducted",
              render: (r) => <span className="text-xs font-medium text-slate-800">{r.tests.join(", ")}</span>
            },
            {
              header: "Status",
              render: (r) => (
                <Badge tone="success">
                  PUBLISHED
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
                      setIsReportModalOpen(true);
                    }}
                    className="p-1 hover:text-blue-700 hover:bg-slate-100"
                    title="View Report Certificate"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <a 
                    href={`/api/v1/diagnostic-reports/${r._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 text-xs font-semibold transition"
                    title="Download Report Document"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Laboratory Report Certificate Modal */}
      {selectedReq && (
        <Modal 
          title="Laboratory Report Certificate" 
          isOpen={isReportModalOpen} 
          onClose={() => setIsReportModalOpen(false)}
        >
          <div className="space-y-6">
            {/* Elegant Diagnostic Report Layout */}
            <div className="bg-white border border-slate-350 p-6 rounded-lg font-sans space-y-4">
              {/* Lab Header */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-blue-700 uppercase tracking-wide">HMS Diagnostics Central Laboratory</h2>
                  <p className="text-[10px] text-slate-400">License No: LAB-10029-CENTRAL · Accreditation: NABL Certified</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex rounded bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 border border-green-200">
                    PUBLISHED &amp; SHARED
                  </span>
                </div>
              </div>

              {/* Patient Details metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-3 rounded-lg">
                <div>
                  <span className="block text-slate-400 uppercase font-semibold text-[9px]">Patient Name</span>
                  <span className="font-bold text-slate-800">{selectedReq.patientName}</span>
                </div>
                <div>
                  <span className="block text-slate-400 uppercase font-semibold text-[9px]">Age / Gender</span>
                  <span className="font-bold text-slate-800">{selectedReq.patientAge} Yrs / {selectedReq.patientGender}</span>
                </div>
                <div>
                  <span className="block text-slate-400 uppercase font-semibold text-[9px]">Request ID</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedReq._id.toUpperCase()}</span>
                </div>
                <div>
                  <span className="block text-slate-400 uppercase font-semibold text-[9px]">Ordered By</span>
                  <span className="font-bold text-slate-800">{selectedReq.orderedBy}</span>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">Report Parameters</h4>
                <p className="text-xs text-slate-650 italic">The finalized report has been signed off and is available for download as a PDF/image attachment.</p>
              </div>

              <div className="flex justify-between items-end border-t border-slate-200 pt-6 mt-4 text-[10px]">
                <div>
                  <span className="block text-slate-450">Order Date: {new Date(selectedReq.date).toLocaleDateString()}</span>
                </div>
                <div className="text-center">
                  <span className="block font-bold text-slate-850 mt-1">NABL Pathologist Sign-off</span>
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setIsReportModalOpen(false)}>Close</Button>
              <a 
                href={`/api/v1/diagnostic-reports/${selectedReq._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-750 text-white px-4 py-2 text-xs font-semibold transition shadow"
              >
                <Download className="h-4 w-4" /> Download PDF/Image
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
