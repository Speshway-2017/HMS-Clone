import { useDoctorQueue, useCallPatient, useSkipPatient, useMarkNoShow } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { User, Phone, Play, RefreshCw, EyeOff, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { mapAppointmentTypeForDisplay } from "../../features/appointments";

const PRIORITY_TONES: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  regular: "info",
  priority: "warning",
  emergency: "danger",
};

export function QueuePage() {
  const { data: queueItems, isLoading, isError, isFetching, refetch } = useDoctorQueue();
  const callPatientMutation = useCallPatient();
  const skipPatientMutation = useSkipPatient();
  const markNoShowMutation = useMarkNoShow();

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Queue refreshed successfully");
    } catch {
      toast.error("Failed to refresh queue. Please try again.");
    }
  };

  const handleCall = async (id: string) => {
    try {
      await callPatientMutation.mutateAsync(id);
      toast.success("Patient called");
    } catch (err) {
      toast.error("Failed to call patient");
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await skipPatientMutation.mutateAsync(id);
      toast.success("Patient skipped");
    } catch (err) {
      toast.error("Failed to skip patient");
    }
  };

  const handleNoShow = async (id: string) => {
    try {
      await markNoShowMutation.mutateAsync(id);
      toast.success("Patient marked as no show");
    } catch (err) {
      toast.error("Failed to mark patient as no show");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200"></div>
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200"></div>
        <div className="space-y-2 mt-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 w-full animate-pulse rounded bg-slate-200"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-red-200 bg-red-50">
        <AlertTriangle className="mb-2 h-10 w-10 text-red-400" />
        <h3 className="text-sm font-semibold text-red-600">Failed to load queue</h3>
        <p className="text-xs text-red-400">Please try reloading the page or check your connection.</p>
        <button onClick={() => refetch()} className="mt-4 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">
          Retry
        </button>
      </Card>
    );
  }

  // Filter queue for patients who are waiting or currently called
  const waitingPatients = queueItems?.filter(q => q.status === "waiting" || q.status === "called") || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Waiting Patients Queue</h1>
          <p className="text-sm text-slate-500">Live queue of patient tokens assigned to you today.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-navy-300"
          aria-label="Refresh Queue"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh Queue
        </button>
      </div>

      {waitingPatients.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <User className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">Queue is Empty</h3>
          <p className="text-xs text-slate-400">There are no waiting or called patients in your list today.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {waitingPatients.map((item) => {
            const patient = item.patient as any;
            const patientName = patient?.name || "Unknown Patient";
            const arrivalTime = new Date(item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
            const waitingTimeMins = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / (60 * 1000));
            const visitType = mapAppointmentTypeForDisplay((item as any).appointment?.type || (item.type === "emergency" ? "Emergency" : "Walk-in"));
            const visitTypeColors = {
              "Emergency": "bg-red-50 text-red-700 border-red-200",
              "Walk-in": "bg-amber-50 text-amber-700 border-amber-200",
              "Appointment": "bg-emerald-50 text-emerald-700 border-emerald-200"
            } as any;

            return (
              <div
                key={item._id}
                className={`flex flex-col lg:flex-row lg:items-center justify-between border rounded-xl p-4 transition-all duration-300 hover:shadow-sm ${
                  item.status === "called" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex gap-4 items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {item.tokenNumber}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {patientName}
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${visitTypeColors[visitType] || "bg-slate-50 text-slate-650 border-slate-200"}`}>
                        {visitType}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      UHID: <span className="font-mono">{patient?.uhid || "—"}</span> · Age: {patient?.age || "—"} · Gender: {patient?.gender || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 mt-4 lg:mt-0">
                  <div className="text-left">
                    <p className="text-xs text-slate-400">Position</p>
                    <p className="text-sm font-bold text-indigo-750">#{(item as any).queuePosition || 1}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-400">Slot Time</p>
                    <p className="text-sm font-semibold text-slate-700">{(item as any).appointment?.time || "—"}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-400">Check-In Time</p>
                    <p className="text-sm font-semibold text-slate-700">{arrivalTime}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-400">Waiting Time</p>
                    <p className="text-sm font-semibold text-slate-700">{waitingTimeMins > 0 ? `${waitingTimeMins} mins` : "Just arrived"}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status !== "called" ? (
                      <button
                        onClick={() => handleCall(item._id)}
                        disabled={callPatientMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <Play className="h-3.5 w-3.5" /> Call Patient
                      </button>
                    ) : (
                      <Badge tone="warning">Currently Called</Badge>
                    )}
                    <button
                      onClick={() => handleSkip(item._id)}
                      disabled={skipPatientMutation.isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                    >
                      <EyeOff className="h-3.5 w-3.5" /> Skip
                    </button>
                    <button
                      onClick={() => handleNoShow(item._id)}
                      disabled={markNoShowMutation.isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-medium transition-colors"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> No Show
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
