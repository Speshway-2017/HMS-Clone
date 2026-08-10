import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Plus, Trash, Check, AlertTriangle, FileUp, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useLaboratoryRequests, useStartProcessing, UnifiedRequest } from "../../features/laboratory";

export function LaboratoryTestProcessing() {
  const { data: requests = [], isLoading, isError } = useLaboratoryRequests();
  const startProcessing = useStartProcessing();
  const navigate = useNavigate();

  const handleStartProcessing = async (id: string) => {
    try {
      await startProcessing.mutateAsync(id);
      toast.success("Request status moved to Processing!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start processing.");
    }
  };

  // Show active accepted/processing diagnostic requests regardless of payment status (paid, unpaid, or partially paid)
  // Hide: Completed, Cancelled, Rejected
  const processingQueue = requests.filter(r => {
    const s = (r.status || "").toLowerCase();

    if (s === "completed" || s === "rejected" || s === "cancelled") return false;

    const isActiveStatus = s === "accepted" || s === "processing" || s === "sample collection" || s === "quality check" || s === "pending" || s === "report_uploaded" || s === "verified";

    return isActiveStatus;
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
        <h1 className="text-2xl font-bold text-slate-900">Laboratory & Radiology Processing</h1>
        <p className="text-sm text-slate-500">
          Track active diagnostic orders, start processing, and upload report documents. (Completed orders automatically move to Completed Reports).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Pending processing list */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Test Processing Queue</h3>
          {processingQueue.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <Check className="h-8 w-8 text-emerald-500 mb-1" />
              <p className="text-sm font-medium">All queue requests processed!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {processingQueue.map(req => {
                const p = (req.paymentStatus || "PAID").toUpperCase();
                const isPaid = p === "PAID";
                const isPartial = p === "PARTIALLY_PAID" || p === "PARTIALLY PAID";

                return (
                  <div key={req._id} className="flex flex-col sm:flex-row justify-between sm:items-center py-4 gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800">{req.patientName}</span>
                        <Badge tone={req.requestType === "Laboratory" ? "info" : "warning"}>{req.requestType}</Badge>
                        <Badge tone={req.priority === "STAT" ? "danger" : req.priority === "Urgent" ? "warning" : "neutral"}>
                          {req.priority}
                        </Badge>
                        {isPaid ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            PAID
                          </span>
                        ) : isPartial ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            PARTIALLY PAID
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            UNPAID / DUE
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Tests: <span className="font-semibold text-slate-700">{req.tests.join(", ")}</span> | Date: {new Date(req.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPaid && (
                        <Button
                          variant="secondary"
                          onClick={() => navigate("/laboratory/billing")}
                          className="flex items-center gap-1 text-xs py-1.5 px-2.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold"
                          title="Collect balance or bill in Laboratory Billing"
                        >
                          <IndianRupee className="h-3.5 w-3.5 text-amber-600" /> Pay / Bill
                        </Button>
                      )}
                      {req.status === "accepted" || req.status === "pending" ? (
                        <Button 
                          onClick={() => handleStartProcessing(req._id)}
                          className="text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700"
                        >
                          Start Processing
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => navigate("/laboratory/processing/upload", { state: { request: req } })}
                          className="flex items-center gap-1 text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <FileUp className="h-3.5 w-3.5" /> Upload Report
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right: Reference Specs */}
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Workflow Rules</h3>
          <div className="space-y-3 text-xs leading-relaxed text-slate-650">
            <p>1. **Payment Check:** Only orders marked as `PAID` appear in this processing queue.</p>
            <p>2. **Start Processing:** Moves order to `PROCESSING` status.</p>
            <p>3. **Upload Report:** Captures observations, recommendations, and files. Once published, the order automatically transitions to `COMPLETED` and moves to the **Completed Reports** module.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
