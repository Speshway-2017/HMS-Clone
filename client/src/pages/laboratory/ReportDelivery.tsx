import { useState, useEffect } from "react";
import { FileText, Search, Printer, Download, Eye, Check } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";

interface TestResultRow {
  parameter: string;
  value: string;
  refRange: string;
  status: "normal" | "low" | "high" | "critical";
}

interface TestRequest {
  _id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  orderedBy: string;
  tests: string[];
  priority: string;
  date: string;
  status: string;
  sampleId?: string;
  sampleType?: string;
  collectionTime?: string;
  results?: TestResultRow[];
  comments?: string;
  verifiedBy?: string;
  verificationTime?: string;
}

export function LaboratoryReportDelivery() {
  const [requests, setRequests] = useState<TestRequest[]>([]);
  const [search, setSearch] = useState("");
  const [selectedReq, setSelectedReq] = useState<TestRequest | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hms_laboratory_requests");
    if (saved) {
      setRequests(JSON.parse(saved));
    }
  }, []);

  // Filter only completed reports
  const completedReports = requests.filter(r => r.status === "Completed");

  const filtered = completedReports.filter(r => 
    r.patientName.toLowerCase().includes(search.toLowerCase()) || 
    r.sampleId?.toLowerCase().includes(search.toLowerCase()) || 
    r._id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Report Delivery</h1>
        <p className="text-sm text-slate-500">Access verified laboratory certificates, print reports, and deliver reports to doctor/patient portal.</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Finalized Reports List</h3>
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
              header: "Report ID",
              render: (r) => <span className="font-bold text-blue-750">{r._id}</span>
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
              header: "Sample ID",
              render: (r) => <span className="font-mono text-xs text-slate-650">{r.sampleId}</span>
            },
            {
              header: "Verified By",
              render: (r) => <span className="text-xs text-slate-700">{r.verifiedBy}</span>
            },
            {
              header: "Tests Conducted",
              render: (r) => <span className="text-xs font-medium text-slate-800">{r.tests.join(", ")}</span>
            },
            {
              header: "Clinical Status",
              render: (r) => {
                const isAbnormal = r.results?.some(res => res.status === "high" || res.status === "low" || res.status === "critical");
                return (
                  <Badge tone={isAbnormal ? "danger" : "success"}>
                    {isAbnormal ? "ABNORMAL" : "NORMAL"}
                  </Badge>
                );
              }
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
                  <Button 
                    variant="ghost" 
                    onClick={() => alert("Simulating PDF download...")}
                    className="p-1 text-slate-500 hover:text-green-700 hover:bg-slate-100"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
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
                    RELEASED &amp; SIGNED
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
                  <span className="block text-slate-400 uppercase font-semibold text-[9px]">Sample ID / Type</span>
                  <span className="font-bold text-slate-800">{selectedReq.sampleId} / {selectedReq.sampleType?.split(" (")[0]}</span>
                </div>
                <div>
                  <span className="block text-slate-400 uppercase font-semibold text-[9px]">Ordered By</span>
                  <span className="font-bold text-slate-800">{selectedReq.orderedBy}</span>
                </div>
              </div>

              {/* Results table */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">Report Parameters</h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-left font-semibold uppercase">
                      <th className="pb-2">Test Parameter</th>
                      <th className="pb-2">Result Value</th>
                      <th className="pb-2">Reference Range</th>
                      <th className="pb-2">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReq.results?.map((res, idx) => (
                      <tr key={idx} className="border-b border-slate-100 py-2.5">
                        <td className="py-2 font-medium text-slate-800">{res.parameter}</td>
                        <td className={`py-2 font-bold ${res.status === "high" || res.status === "critical" ? "text-red-600" : "text-slate-800"}`}>
                          {res.value}
                        </td>
                        <td className="py-2 text-slate-500">{res.refRange}</td>
                        <td className="py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            res.status === "normal" 
                              ? "bg-green-50 text-green-700 border border-green-150" 
                              : "bg-red-50 text-red-700 border border-red-150"
                          }`}>
                            {res.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Comments block */}
              {selectedReq.comments && (
                <div className="text-xs border-t border-slate-100 pt-3">
                  <span className="font-bold text-slate-700 block">Assay Comments:</span>
                  <p className="text-slate-500 italic mt-0.5">"{selectedReq.comments}"</p>
                </div>
              )}

              {/* Lab signatures */}
              <div className="flex justify-between items-end border-t border-slate-200 pt-6 mt-4 text-[10px]">
                <div>
                  <span className="block text-slate-450">Draw Time: {selectedReq.collectionTime}</span>
                  <span className="block text-slate-450 mt-0.5">Release Date: {selectedReq.verificationTime}</span>
                </div>
                <div className="text-center">
                  <div className="h-6 w-24 border-b border-dashed border-slate-300 mx-auto" />
                  <span className="block font-bold text-slate-800 mt-1">{selectedReq.verifiedBy}</span>
                  <span className="block text-slate-400 text-[9px]">Lab Director / Pathologist Sign-off</span>
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setIsReportModalOpen(false)}>Close</Button>
              <Button 
                onClick={() => {
                  alert("Simulating report download...");
                }} 
                className="bg-blue-600 hover:bg-blue-750 flex items-center gap-1"
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button 
                onClick={() => {
                  alert("Sending report print job to central clinical printer...");
                  setIsReportModalOpen(false);
                }} 
                className="bg-green-700 hover:bg-green-800 flex items-center gap-1"
              >
                <Printer className="h-4 w-4" /> Print Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
