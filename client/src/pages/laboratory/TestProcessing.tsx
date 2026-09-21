import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Plus, Trash, Check, AlertTriangle, FileUp, IndianRupee, Eye, FlaskConical, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useLaboratoryRequests, useStartProcessing, UnifiedRequest } from "../../features/laboratory";

const getTestCategory = (name: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes("x-ray") || n.includes("mri") || n.includes("ct") || n.includes("ultrasound") || n.includes("usg") || n.includes("scan") || n.includes("radiology")) {
    return "Radiology & Imaging";
  }
  if (n.includes("blood") || n.includes("cbc") || n.includes("hemogram") || n.includes("platelet") || n.includes("esr") || n.includes("anemia")) {
    return "Hematology";
  }
  if (n.includes("lipid") || n.includes("glucose") || n.includes("sugar") || n.includes("hba1c") || n.includes("lft") || n.includes("kft") || n.includes("creatinine") || n.includes("thyroid") || n.includes("t3") || n.includes("t4") || n.includes("tsh") || n.includes("liver") || n.includes("kidney") || n.includes("panel")) {
    return "Biochemistry";
  }
  if (n.includes("ecg") || n.includes("echo") || n.includes("tmt") || n.includes("cardiac") || n.includes("troponin") || n.includes("heart")) {
    return "Cardiology";
  }
  if (n.includes("urine") || n.includes("stool") || n.includes("culture") || n.includes("sputum") || n.includes("swab")) {
    return "Microbiology";
  }
  return "Laboratory Specimen";
};

export function LaboratoryTestProcessing() {
  const { data: requests = [], isLoading, isError } = useLaboratoryRequests();
  const startProcessing = useStartProcessing();
  const navigate = useNavigate();

  const [selectedRequestForModal, setSelectedRequestForModal] = useState<any | null>(null);

  const handleStartProcessing = async (id: string) => {
    try {
      await startProcessing.mutateAsync(id);
      toast.success("Request status moved to Processing!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start processing.");
    }
  };

  // Show active accepted/processing diagnostic requests regardless of payment status (paid, unpaid, or partially paid)
  // Hide: Completed, Report Uploaded, Verified, Cancelled, Rejected
  const processingQueue = requests.filter(r => {
    const s = (r.status || "").toLowerCase();

    if (s === "completed" || s === "report_uploaded" || s === "verified" || s === "rejected" || s === "cancelled") return false;

    const isActiveStatus = s === "accepted" || s === "processing" || s === "sample collection" || s === "quality check" || s === "pending";

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
        <Card className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Test Processing Queue</h3>
          {processingQueue.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <Check className="h-8 w-8 text-emerald-500 mb-1" />
              <p className="text-sm font-medium">All queue requests processed!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {processingQueue.map(req => {
                const p = (req.paymentStatus || "PAID").toUpperCase();
                const isPaid = p === "PAID";
                const isPartial = p === "PARTIALLY_PAID" || p === "PARTIALLY PAID";

                const maxVisible = 2;
                const visible = req.tests.slice(0, maxVisible);
                const extraCount = req.tests.length - maxVisible;

                return (
                  <div key={req._id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-xl bg-slate-50/60 hover:bg-slate-100/70 border border-slate-200/80 transition-all gap-4 shadow-2xs">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900">{req.patientName}</span>
                        <Badge tone={req.requestType === "Laboratory" ? "info" : "warning"}>{req.requestType}</Badge>
                        <Badge tone={req.priority === "STAT" ? "danger" : req.priority === "Urgent" ? "warning" : "neutral"}>
                          {req.priority}
                        </Badge>
                        {isPaid ? (
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                            PAID
                          </span>
                        ) : isPartial ? (
                          <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                            PARTIALLY PAID
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/80">
                            UNPAID / DUE
                          </span>
                        )}
                      </div>

                      {/* Clean Test Pills + Count Badge */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-xs font-bold text-slate-500 mr-1">Tests:</span>
                        {visible.map((t: string, idx: number) => (
                          <span
                            key={idx}
                            onClick={() => setSelectedRequestForModal(req)}
                            className="bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-all active:scale-95"
                            title="Click to view all requested tests"
                          >
                            {t}
                          </span>
                        ))}
                        {extraCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequestForModal(req);
                            }}
                            className="rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 text-[10px] font-extrabold cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-95 flex items-center gap-1"
                            title="Click to view full test list popup"
                          >
                            +{extraCount} more
                          </button>
                        )}
                        <span className="text-xs text-slate-400 font-medium ml-2 border-l border-slate-200 pl-2">
                          Date: {new Date(req.date).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Perfectly Aligned Action Buttons Container */}
                    <div className="flex items-center justify-end gap-2.5 shrink-0 sm:self-center mt-2 sm:mt-0">
                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => navigate("/laboratory/billing")}
                          className="h-9 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all active:scale-95 cursor-pointer"
                          title="Collect balance or bill in Laboratory Billing"
                        >
                          <IndianRupee className="h-3.5 w-3.5 text-amber-600 shrink-0" /> Pay / Bill
                        </button>
                      )}
                      {req.status === "accepted" || req.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => handleStartProcessing(req._id)}
                          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Activity className="h-3.5 w-3.5 shrink-0" /> Start Processing
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate("/laboratory/processing/upload", { state: { request: req } })}
                          className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                          <FileUp className="h-3.5 w-3.5 shrink-0" /> Upload Report
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right: Workflow Guidelines */}
        <Card className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-2">Workflow Rules & Guidelines</h3>
          <div className="space-y-3.5 text-xs leading-relaxed text-slate-650">
            <div className="flex items-start gap-2 rounded-xl bg-blue-50/50 p-3 border border-blue-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">1</span>
              <p>
                <strong className="font-extrabold text-slate-900">Payment Check:</strong> Active diagnostic requests appear in this queue. Dues can be billed via <span className="font-bold text-amber-700">Pay / Bill</span>.
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-indigo-50/50 p-3 border border-indigo-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">2</span>
              <p>
                <strong className="font-extrabold text-slate-900">Start Processing:</strong> Moves order to <span className="font-bold text-indigo-700">PROCESSING</span> status for assay execution.
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50/50 p-3 border border-emerald-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">3</span>
              <p>
                <strong className="font-extrabold text-slate-900">Upload Report:</strong> Upload diagnostic files and publish results. Completed orders automatically transition to <strong className="font-bold text-slate-900">Completed Reports</strong>.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* POPUP MODAL: FULL REQUESTED TESTS LIST */}
      {selectedRequestForModal && (
        <Modal
          isOpen={!!selectedRequestForModal}
          onClose={() => setSelectedRequestForModal(null)}
          title="Diagnostic Processing Order Details"
          size="lg"
        >
          <div className="space-y-5 text-slate-800">
            {/* Patient & Request Meta Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-semibold">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Patient Name & UHID</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedRequestForModal.patientName}</span>
                <span className="text-slate-500 block text-[11px] font-medium mt-0.5">
                  {selectedRequestForModal.patientAge ? `${selectedRequestForModal.patientAge} Yrs, ` : ""}{selectedRequestForModal.patientGender || ""} · UHID: <strong className="text-indigo-600 font-bold">{selectedRequestForModal.patientUhid || "HMS-PT-88201"}</strong>
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Request Reference ID</span>
                <span className="font-mono font-extrabold text-blue-700 text-xs">{selectedRequestForModal._id.toUpperCase()}</span>
                <span className="text-slate-500 block text-[11px] font-medium mt-0.5">
                  Order Date: <strong>{new Date(selectedRequestForModal.date).toLocaleDateString("en-IN")}</strong>
                </span>
              </div>
            </div>

            {/* Badges Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-150 py-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-800 font-extrabold text-xs px-3 py-1 rounded-lg border border-indigo-200">
                  {selectedRequestForModal.tests.length} Requested Test{selectedRequestForModal.tests.length > 1 ? "s" : ""}
                </span>
                <Badge tone={selectedRequestForModal.priority === "STAT" ? "danger" : selectedRequestForModal.priority === "Urgent" ? "warning" : "neutral"}>
                  Priority: {selectedRequestForModal.priority}
                </Badge>
              </div>
              <Badge tone={(selectedRequestForModal.paymentStatus || "").toUpperCase() === "PAID" ? "success" : "danger"}>
                Payment: {(selectedRequestForModal.paymentStatus || "UNPAID").toUpperCase()}
              </Badge>
            </div>

            {/* Complete Tests List Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" /> Prescribed Assays & Investigation Orders
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[48vh] overflow-y-auto pr-1">
                {selectedRequestForModal.tests.map((testName: string, index: number) => {
                  const category = getTestCategory(testName);
                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-start gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-black text-xs">
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-slate-900 text-xs truncate" title={testName}>
                          {testName}
                        </h5>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 mt-1">
                          <FlaskConical className="h-3 w-3 text-blue-600" /> {category}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRequestForModal(null)}
                className="rounded-lg px-4 py-2 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedRequestForModal.status === "accepted" || selectedRequestForModal.status === "pending" ? (
                  <Button
                    onClick={() => {
                      const reqId = selectedRequestForModal._id;
                      setSelectedRequestForModal(null);
                      handleStartProcessing(reqId);
                    }}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Activity className="h-4 w-4" /> Start Processing
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const reqObj = selectedRequestForModal;
                      setSelectedRequestForModal(null);
                      navigate("/laboratory/processing/upload", { state: { request: reqObj } });
                    }}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileUp className="h-4 w-4" /> Upload Report
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

