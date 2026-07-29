import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  User,
  BedDouble,
  FileText,
  Activity,
  Check,
  RefreshCw,
  Bell
} from "lucide-react";
import { useNurseNotifications, useMarkNotificationRead, useDismissNotification } from "../../features/nurse";

export function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: notifications = [], isLoading, refetch } = useNurseNotifications();
  const markReadMutation = useMarkNotificationRead();
  const dismissMutation = useDismissNotification();

  const alertItem = notifications.find((n) => n._id === id) || {
    _id: id || "alert-1",
    title: "Critical Vitals Alarm: Low Oxygen Saturation",
    message: "Patient SpO2 dropped below 90%. Immediate clinical evaluation and doctor escalation required.",
    severity: "critical" as const,
    type: "vitals",
    recipientRole: "nurse",
    isRead: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {
      patientName: "Rajesh Kumar",
      uhid: "UHID-8821",
      ward: "ICU Ward",
      roomNumber: "ICU-04",
      assignedDoctor: "Dr. Ananya Sharma",
      priority: "Emergency",
    },
  };

  const [resolved, setResolved] = useState(false);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return { date: "Today", time: "Just now" };
    const d = new Date(dateStr);
    const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return { date, time };
  };

  const handleAcknowledge = async () => {
    if (id) {
      await markReadMutation.mutateAsync(id);
      refetch();
    }
  };

  const handleResolve = async () => {
    if (id) {
      await dismissMutation.mutateAsync(id);
      setResolved(true);
      refetch();
    }
  };

  const { date, time } = formatDateTime(alertItem.createdAt);

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => navigate("/nurse/alerts")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Emergency Alerts
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">Alert Details #{alertItem._id.slice(-6)}</h1>
          </div>
          <p className="text-xs text-slate-500">Comprehensive alarm breakdown, clinical context, and response audit log.</p>
        </div>

        <div className="flex items-center gap-3">
          {!alertItem.isRead && (
            <button
              onClick={handleAcknowledge}
              disabled={markReadMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Acknowledge Alert
            </button>
          )}
          {!resolved ? (
            <button
              onClick={handleResolve}
              disabled={dismissMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark as Resolved
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-extrabold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Resolved
            </span>
          )}
        </div>
      </div>

      {/* Main Alert Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        {/* Severity Banner */}
        <div className={`rounded-xl p-4 border flex items-center justify-between ${
          alertItem.severity === "critical" || alertItem.severity === "danger"
            ? "border-red-200 bg-red-50 text-red-900"
            : alertItem.severity === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-blue-200 bg-blue-50 text-blue-900"
        }`}>
          <div className="flex items-center gap-3">
            <ShieldAlert className={`h-6 w-6 shrink-0 ${
              alertItem.severity === "critical" || alertItem.severity === "danger" ? "text-red-600 animate-pulse" : "text-amber-600"
            }`} />
            <div>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase mb-1 ${
                alertItem.severity === "critical" || alertItem.severity === "danger"
                  ? "bg-red-200 text-red-900"
                  : alertItem.severity === "warning"
                  ? "bg-amber-200 text-amber-900"
                  : "bg-blue-200 text-blue-900"
              }`}>
                {alertItem.severity} Alarm
              </span>
              <h2 className="text-base font-black">{alertItem.title}</h2>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
              resolved
                ? "bg-emerald-100 text-emerald-800"
                : alertItem.isRead
                ? "bg-blue-100 text-blue-800"
                : "bg-red-100 text-red-800"
            }`}>
              Status: {resolved ? "Resolved" : alertItem.isRead ? "Acknowledged" : "New / Unread"}
            </span>
          </div>
        </div>

        {/* Clinical Message Content */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Clinical Alert Message</h3>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs font-medium text-slate-800 leading-relaxed">
            {alertItem.message}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="rounded-lg border border-slate-200 p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <User className="h-4 w-4 text-navy-800" />
              <span className="text-xs font-semibold">Patient Name / UHID</span>
            </div>
            <p className="text-sm font-bold text-slate-900">{alertItem.data?.patientName || "Assigned Patient"}</p>
            <p className="text-xs font-mono text-slate-500">UHID: {alertItem.data?.uhid || "N/A"}</p>
          </div>

          <div className="rounded-lg border border-slate-200 p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <BedDouble className="h-4 w-4 text-navy-800" />
              <span className="text-xs font-semibold">Ward & Location</span>
            </div>
            <p className="text-sm font-bold text-slate-900">{alertItem.data?.ward || "General Ward"}</p>
            <p className="text-xs font-mono text-slate-500">Bed / Room: {alertItem.data?.roomNumber || "101"}</p>
          </div>

          <div className="rounded-lg border border-slate-200 p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="h-4 w-4 text-navy-800" />
              <span className="text-xs font-semibold">Triggered Timestamp</span>
            </div>
            <p className="text-sm font-bold text-slate-900">{date}</p>
            <p className="text-xs font-mono text-slate-500">{time}</p>
          </div>

          <div className="rounded-lg border border-slate-200 p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="h-4 w-4 text-navy-800" />
              <span className="text-xs font-semibold">Attending Doctor</span>
            </div>
            <p className="text-sm font-bold text-slate-900">{alertItem.data?.assignedDoctor || "Dr. Primary Consultant"}</p>
            <p className="text-xs text-slate-500">Care Priority: {alertItem.data?.priority || "High"}</p>
          </div>
        </div>

        {/* Audit Timeline */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Response Audit Log</h3>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span><strong>Triggered:</strong> Alert broadcasted via Socket.IO real-time monitor on {date} at {time}.</span>
            </div>
            {alertItem.isRead && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span><strong>Acknowledged:</strong> Flagged as read & acknowledged by Staff Nurse on shift.</span>
              </div>
            )}
            {resolved && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span><strong>Resolved:</strong> Clinical intervention verified and closed.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
