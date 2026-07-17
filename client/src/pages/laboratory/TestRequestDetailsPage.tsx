import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft, ClipboardList, User, BadgeCheck, FileText, Check, X,
  Activity, Thermometer, Heart, Wind, Droplets, Weight
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { TextareaField } from "../../components/ui/Field";
import { useLaboratoryRequests, useAcceptRequest, useRejectRequest, UnifiedRequest } from "../../features/laboratory";

export function TestRequestDetailsPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const acceptRequest = useAcceptRequest();
  const rejectRequest = useRejectRequest();
  const { data: requests = [], isLoading } = useLaboratoryRequests();

  const [request, setRequest] = useState<UnifiedRequest | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // 1. Try reading request from navigation state first (instant)
  // 2. Fall back to finding it in the loaded requests query
  useEffect(() => {
    if (location.state?.request) {
      setRequest(location.state.request);
    } else if (requests.length > 0 && requestId) {
      const found = requests.find(r => r._id === requestId);
      if (found) {
        setRequest(found);
      }
    }
  }, [location.state, requests, requestId]);

  if (isLoading && !request) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Request not found.</p>
        <Button onClick={() => navigate("/laboratory/requests")} className="mt-4">
          Back to Requests
        </Button>
      </div>
    );
  }

  const mapStatusTab = (status: string): "Pending" | "Accepted" | "Rejected" => {
    const s = status.toLowerCase();
    if (s === "pending" || s === "processing" || s === "report_uploaded" || s === "verified" || s === "completed") {
      return "Pending";
    }
    if (s === "accepted" || s === "qc_verified" || s === "published") {
      return "Accepted";
    }
    return "Rejected";
  };

  const handleAccept = async (id: string, req: UnifiedRequest) => {
    try {
      await acceptRequest.mutateAsync(id);
      toast.success("Request accepted! Redirecting to billing...");
      navigate("/laboratory/billing/new", {
        state: {
          fromRequest: true,
          patientId: req.patientId,
          patientName: req.patientName,
          patientUhid: req.patientUhid || "",
          tests: req.tests,
          priority: req.priority,
          requestId: req._id,
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to accept request.");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    try {
      await rejectRequest.mutateAsync({
        requestId: request._id,
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("Request rejected successfully.");
      setIsRejectOpen(false);
      navigate("/laboratory/requests");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject request.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/laboratory/requests")}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            Test Request Details
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Review patient clinical parameters, order information, and vitals.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient & Order Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-0 overflow-hidden">
            {/* Patient Header */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 border-b border-blue-100">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold shadow">
                  {request.patientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{request.patientName}</span>
                    <BadgeCheck className="h-4 w-4 text-green-500" />
                  </div>
                  {request.patientUhid && (
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-block mt-1">
                      {request.patientUhid}
                    </span>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs">
                    {request.patientAge && (
                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[9px] block">Age</span>
                        <span className="text-slate-700 font-medium">{request.patientAge} Yrs</span>
                      </div>
                    )}
                    {request.patientGender && (
                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[9px] block">Gender</span>
                        <span className="text-slate-700 font-medium">{request.patientGender}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Request Specifics */}
            <div className="p-5 space-y-4 text-xs border-b border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[9px] block">Request ID</span>
                <span className="font-mono text-slate-700 font-bold">{request._id.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[9px] block">Ordered By</span>
                <span className="font-bold text-slate-800">{request.orderedBy}</span>
                <span className="text-slate-400 block text-[10px]">{request.requestType} Request</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[9px] block">Priority</span>
                  <Badge tone={request.priority === "STAT" ? "danger" : request.priority === "Urgent" ? "warning" : "neutral"} className="mt-0.5">
                    {request.priority}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[9px] block">Status</span>
                  <Badge tone={request.status.toLowerCase() === "pending" ? "info" : request.status.toLowerCase() === "rejected" ? "danger" : "success"} className="mt-0.5">
                    {request.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[9px] block">Order Date</span>
                <span className="font-medium text-slate-700">{new Date(request.date).toLocaleString()}</span>
              </div>
            </div>

            {request.status.toLowerCase() === "rejected" && request.rejectionReason && (
              <div className="m-5 bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs">
                <div className="font-bold text-xs uppercase text-red-700 mb-0.5">Rejection Reason</div>
                <div>{request.rejectionReason}</div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Requested Tests & Clinical Parameters */}
        <div className="lg:col-span-2 space-y-4">
          {/* Requested Tests Card */}
          <Card className="p-5">
            <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-slate-400" /> Requested Tests
            </h3>
            <div className="flex flex-wrap gap-2">
              {request.tests.map((t, idx) => (
                <span key={idx} className="rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-xs font-semibold text-blue-800">
                  {t}
                </span>
              ))}
            </div>
          </Card>

          {/* Consultation Details & Vitals */}
          {request.appointment && typeof request.appointment === "object" && (
            <Card className="p-5 space-y-5">
              <div className="flex items-center gap-2 mb-1 border-b pb-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-bold text-indigo-700 uppercase tracking-wide">Consultation Details</span>
                {request.appointment.appointmentNumber && (
                  <Badge tone="info" className="ml-auto font-mono text-[10px]">
                    {request.appointment.appointmentNumber}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 uppercase text-[9px] block">Chief Complaint</span>
                  <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                    {request.appointment.chiefComplaint || "—"}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 uppercase text-[9px] block">Diagnosis</span>
                  <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                    {request.appointment.diagnosis || "—"}
                  </p>
                </div>
              </div>

              {/* Vitals */}
              {request.appointment.vitals && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-650 uppercase tracking-wider flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-slate-400" /> Patient Vitals
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Temp", val: request.appointment.vitals.temperature ? `${request.appointment.vitals.temperature} °F` : "—", icon: <Thermometer className="h-4 w-4 text-orange-500" /> },
                      { label: "Blood Pressure", val: request.appointment.vitals.bloodPressure || "—", icon: <Heart className="h-4 w-4 text-red-500" /> },
                      { label: "Pulse Rate", val: request.appointment.vitals.pulseRate ? `${request.appointment.vitals.pulseRate} bpm` : "—", icon: <Activity className="h-4 w-4 text-green-500" /> },
                      { label: "Resp. Rate", val: request.appointment.vitals.respiratoryRate ? `${request.appointment.vitals.respiratoryRate} /min` : "—", icon: <Wind className="h-4 w-4 text-blue-500" /> },
                      { label: "SpO₂", val: request.appointment.vitals.spo2 ? `${request.appointment.vitals.spo2} %` : "—", icon: <Droplets className="h-4 w-4 text-indigo-500" /> },
                      { label: "Weight", val: request.appointment.vitals.weight ? `${request.appointment.vitals.weight} kg` : "—", icon: <Weight className="h-4 w-4 text-purple-500" /> },
                    ].map((v, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">{v.icon}</div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">{v.label}</div>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{v.val}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Action Footer (Only shown when pending) */}
          {mapStatusTab(request.status) === "Pending" && (
            <Card className="p-4 flex justify-end gap-3">
              <Button
                onClick={() => setIsRejectOpen(true)}
                variant="danger"
                className="px-6 py-2.5"
              >
                Reject Request
              </Button>
              <Button
                onClick={() => handleAccept(request._id, request)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 font-bold"
              >
                Accept & Bill
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Reject Reason Modal */}
      <Modal title="Reject Request" isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)}>
        <div className="space-y-4">
          <TextareaField
            label="Reason for Rejection"
            required
            placeholder="Enter reason for rejecting this test request..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="secondary" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject}>Reject Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
