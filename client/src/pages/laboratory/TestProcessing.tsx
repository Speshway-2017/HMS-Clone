import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Plus, Trash, Check, AlertTriangle, FileUp } from "lucide-react";
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

  // Filter requests that are in active processing states
  const processingQueue = requests.filter(r => {
    const s = (r.status || "").toLowerCase();
    return s === "accepted" || s === "processing" || s === "sample collection" || s === "quality check";
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
        <p className="text-sm text-slate-500">Track accepted diagnostic requests, start processing, and upload report documents.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Pending processing list */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Requests Active queue</h3>
          {processingQueue.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <Check className="h-8 w-8 text-green-500 mb-1" />
              <p className="text-sm font-medium">All active queue requests processed!</p>
              <p className="text-xs text-slate-400">No diagnostic orders are accepted or in-process currently.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {processingQueue.map(req => (
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
                      Assays/Modality: {req.tests.join(", ")} | Date: {new Date(req.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {req.status === "accepted" ? (
                      <Button 
                        onClick={() => handleStartProcessing(req._id)}
                        className="text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-750"
                      >
                        Start Processing
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => navigate("/laboratory/processing/upload", { state: { request: req } })}
                        className="flex items-center gap-1 text-xs py-1.5 px-3 bg-green-600 hover:bg-green-700"
                      >
                        <FileUp className="h-3.5 w-3.5" /> Upload Report
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: Analyzer specs */}
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Service Status Reference</h3>
          <div className="space-y-3 text-xs leading-relaxed text-slate-650">
            <p>1. **Start Processing:** Click to transition status to `PROCESSING` to log that diagnostic runs have commenced.</p>
            <p>2. **Upload Report:** Capture observations, recommendations, and remarks. Attach the digital scan, image, or PDF file (max 20MB).</p>
            <p>3. **Quality Check (QC):** Uploaded reports automatically queue for senior laboratory verification before publication.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
