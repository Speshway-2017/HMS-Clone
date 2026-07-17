import { useState } from "react";
import { ShieldCheck, Search, Eye, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { TextareaField } from "../../components/ui/Field";
import { useLaboratoryRequests, useVerifyReport, useRejectRequest, UnifiedRequest } from "../../features/laboratory";

export function LaboratoryQualityControl() {
  const { data: requests = [], isLoading, isError } = useLaboratoryRequests();
  const verifyReport = useVerifyReport();
  const rejectRequest = useRejectRequest();

  const [search, setSearch] = useState("");
  const [selectedReq, setSelectedReq] = useState<UnifiedRequest | null>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleVerify = async (id: string) => {
    try {
      await verifyReport.mutateAsync(id);
      toast.success("Report successfully verified!");
      setIsVerifyOpen(false);
      setSelectedReq(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to verify report.");
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedReq || !rejectionReason.trim()) return;
    try {
      await rejectRequest.mutateAsync({ requestId: selectedReq._id, rejectionReason });
      toast.success("Report rejected back to processing queue.");
      setRejectionReason("");
      setIsRejectOpen(false);
      setIsVerifyOpen(false);
      setSelectedReq(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject report.");
    }
  };

  // Filter requests awaiting verification
  const qcQueue = requests.filter(r => r.status === "report_uploaded");
  
  // Filter recently verified logs
  const auditLogs = requests.filter(r => r.status === "verified" || r.status === "completed");

  const filteredLogs = auditLogs.filter(r => 
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
        <h1 className="text-2xl font-bold text-slate-900">Quality Control (QC) Verification</h1>
        <p className="text-sm text-slate-500">Perform secondary clinical verification of test observations and uploaded documents before publication.</p>
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
                      <Badge tone={req.requestType === "Laboratory" ? "info" : "warning"}>{req.requestType}</Badge>
                      <Badge tone={req.priority === "STAT" ? "danger" : req.priority === "Urgent" ? "warning" : "neutral"}>
                        {req.priority}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Assays/Modality: {req.tests.join(", ")} | Req ID: {req._id.toUpperCase()}
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
          <div className="space-y-3 text-xs text-slate-650 leading-relaxed">
            <p>• **Verify Report Files:** Pathologist or supervisor reviews technical observations and uploaded documents for accuracy.</p>
            <p>• **Repeat Criteria:** If values are biochemically implausible compared to prior results, reject and request a test repeat.</p>
            <p>• **Release Protocol:** Verified reports remain in the `VERIFIED` state and are queued for publishing to patients and doctors.</p>
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
              placeholder="Search patient, request ID..."
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
                header: "Request ID",
                render: (r) => <span className="font-mono text-xs font-bold text-slate-700">{r._id.toUpperCase()}</span>
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
                render: (r) => <span className="font-semibold text-slate-800">{r.patientName}</span>
              },
              {
                header: "Date",
                render: (r) => <span className="text-xs text-slate-500">{new Date(r.date).toLocaleDateString()}</span>
              },
              {
                header: "Tests",
                render: (r) => <span className="text-xs text-blue-750">{r.tests.join(", ")}</span>
              },
              {
                header: "Status",
                render: (r) => (
                  <Badge tone={r.status === "completed" ? "success" : "info"}>
                    {r.status.toUpperCase()}
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
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="block text-slate-400">Patient:</span>
                <span className="font-bold text-slate-800">{selectedReq.patientName} ({selectedReq.patientAge}Y / {selectedReq.patientGender})</span>
              </div>
              <div>
                <span className="block text-slate-400">Request ID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedReq._id.toUpperCase()}</span>
              </div>
              <div>
                <span className="block text-slate-400">Request Type:</span>
                <span className="font-semibold text-slate-800">{selectedReq.requestType}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 text-xs">
              <span className="block text-slate-400 font-bold uppercase mb-1">Observations:</span>
              <p className="text-slate-800 font-medium whitespace-pre-wrap">Pending observations query (Review report files below)</p>
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
                onClick={() => handleVerify(selectedReq._id)} 
                className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
              >
                <Check className="h-4 w-4" /> Approve & Verify Report
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
