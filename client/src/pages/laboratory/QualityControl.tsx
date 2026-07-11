import { useState, useEffect } from "react";
import { ShieldCheck, Search, Eye, Check, X, AlertTriangle } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { TextareaField } from "../../components/ui/Field";

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
  rejectionReason?: string;
  verifiedBy?: string;
  verificationTime?: string;
}

export function LaboratoryQualityControl() {
  const [requests, setRequests] = useState<TestRequest[]>([]);
  const [search, setSearch] = useState("");
  const [selectedReq, setSelectedReq] = useState<TestRequest | null>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
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

  const handleApprove = (id: string) => {
    const updated = requests.map(r => 
      r._id === id 
        ? { 
            ...r, 
            status: "Completed",
            verifiedBy: "Dr. Alex Carter (Lab Director)",
            verificationTime: new Date().toLocaleString()
          } 
        : r
    );
    saveRequests(updated);
    setIsVerifyOpen(false);
    setSelectedReq(null);
  };

  const handleRejectSubmit = () => {
    if (!selectedReq || !rejectionReason.trim()) return;
    const updated = requests.map(r => 
      r._id === selectedReq._id 
        ? { 
            ...r, 
            status: "Sample Collected", // send back to collection or processing
            rejectionReason 
          } 
        : r
    );
    saveRequests(updated);
    setRejectionReason("");
    setIsRejectOpen(false);
    setIsVerifyOpen(false);
    setSelectedReq(null);
  };

  // Filter requests that are Awaiting Verification
  const qcQueue = requests.filter(r => r.status === "Awaiting Verification");
  
  // Filter recently verified logs
  const auditLogs = requests.filter(r => r.status === "Completed" && r.verifiedBy);

  const filteredLogs = auditLogs.filter(r => 
    r.patientName.toLowerCase().includes(search.toLowerCase()) || 
    r.sampleId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quality Control (QC)</h1>
        <p className="text-sm text-slate-500">Perform secondary clinical verification of test assay results before report publishing.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Pending QC Queue */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Awaiting QC Sign-off</h3>
          {qcQueue.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <ShieldCheck className="h-8 w-8 text-green-500 mb-1" />
              <p className="text-sm font-medium">All results verified!</p>
              <p className="text-xs text-slate-400">No diagnostic reports are pending verification.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {qcQueue.map(req => (
                <div key={req._id} className="flex flex-col sm:flex-row justify-between sm:items-center py-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">{req.patientName}</span>
                      <Badge tone={req.results?.some(res => res.status === "critical" || res.status === "high") ? "danger" : "neutral"}>
                        {req.results?.some(res => res.status === "critical" || res.status === "high") ? "ABNORMAL VALUE" : "NORMAL VALUE"}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Assays: {req.tests.join(", ")} | Sample ID: {req.sampleId}
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      setSelectedReq(req);
                      setIsVerifyOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs py-1.5 px-3 self-start sm:self-center bg-blue-600 hover:bg-blue-750"
                  >
                    <Eye className="h-3.5 w-3.5" /> Review &amp; Verify
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: Quality Policies */}
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">QC Guidelines</h3>
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>• **Critical Value Check:** Call the ordering physician immediately for any values marked **CRITICAL** (e.g. Hemoglobin &lt; 7.0 g/dL).</p>
            <p>• **Repeat Criteria:** If values are biochemically implausible compared to prior results, reject and request a test repeat.</p>
            <p>• **Approval Sign-off:** Only certified Lab Directors and senior pathologists may authorize report verification.</p>
          </div>
        </Card>
      </div>

      {/* QC Audit Logs */}
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">Verification Audit Log</h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, sample ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-350 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <Card>
          <DataTable
            rowKey={(r) => r._id}
            rows={filteredLogs}
            emptyMessage="No audit logs recorded."
            columns={[
              {
                header: "Sample ID",
                render: (r) => <span className="font-mono text-xs font-bold text-slate-700">{r.sampleId}</span>
              },
              {
                header: "Patient",
                render: (r) => <span className="font-semibold text-slate-800">{r.patientName}</span>
              },
              {
                header: "Verified By",
                render: (r) => <span className="text-xs font-medium text-slate-700">{r.verifiedBy}</span>
              },
              {
                header: "Verification Time",
                render: (r) => <span className="text-xs text-slate-500">{r.verificationTime}</span>
              },
              {
                header: "Tests",
                render: (r) => <span className="text-xs text-blue-750">{r.tests.join(", ")}</span>
              },
              {
                header: "Status",
                render: (r) => (
                  <Badge tone="success">
                    RELEASED
                  </Badge>
                )
              }
            ]}
          />
        </Card>
      </div>

      {/* Verify Results Modal */}
      {selectedReq && (
        <Modal 
          title={`Review Test Results - ${selectedReq.patientName}`} 
          isOpen={isVerifyOpen} 
          onClose={() => setIsVerifyOpen(false)}
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="block text-slate-400">Patient:</span>
                <span className="font-bold text-slate-800">{selectedReq.patientName} ({selectedReq.patientAge}Y / {selectedReq.patientGender})</span>
              </div>
              <div>
                <span className="block text-slate-400">Sample ID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedReq.sampleId}</span>
              </div>
              <div>
                <span className="block text-slate-400">Collector Remarks:</span>
                <span className="text-slate-600">{selectedReq.comments || "None"}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                    <th className="pb-2 text-left font-semibold">Parameter</th>
                    <th className="pb-2 text-left font-semibold">Value</th>
                    <th className="pb-2 text-left font-semibold">Reference Range</th>
                    <th className="pb-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReq.results?.map((res, i) => (
                    <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${res.status === "high" || res.status === "critical" ? "bg-red-50/40" : ""}`}>
                      <td className="py-2.5 font-medium text-slate-800">{res.parameter}</td>
                      <td className={`py-2.5 font-bold ${res.status === "high" || res.status === "critical" ? "text-red-600" : "text-slate-800"}`}>
                        {res.value}
                      </td>
                      <td className="py-2.5 text-slate-500 text-xs">{res.refRange}</td>
                      <td className="py-2.5">
                        <Badge tone={res.status === "normal" ? "success" : res.status === "critical" ? "danger" : "warning"}>
                          {res.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setIsVerifyOpen(false)}>Close</Button>
              <Button 
                onClick={() => {
                  setIsRejectOpen(true);
                }} 
                variant="danger"
              >
                Reject & Repeat
              </Button>
              <Button 
                onClick={() => handleApprove(selectedReq._id)} 
                className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
              >
                <Check className="h-4 w-4" /> Approve & Release Report
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {selectedReq && (
        <Modal 
          title="Reject Results" 
          isOpen={isRejectOpen} 
          onClose={() => setIsRejectOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Please enter the clinical validation reason for rejecting these values (e.g. potential contamination, dilution anomaly).
            </p>
            <TextareaField
              label="Rejection Reason"
              required
              placeholder="E.g., Flagged critical hematocrit value doesn't align with clinical presentation."
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
