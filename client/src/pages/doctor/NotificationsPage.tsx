import { useDoctorNotifications } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Bell, AlertTriangle, RefreshCw } from "lucide-react";

const SEVERITY_TONES: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  info: "info",
  warning: "warning",
  critical: "danger",
};

export function NotificationsPage() {
  const { data: notifications, isLoading, isError, refetch } = useDoctorNotifications();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200"></div>
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200"></div>
        <div className="space-y-2 mt-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 w-full animate-pulse rounded bg-slate-200"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-red-200 bg-red-50">
        <AlertTriangle className="mb-2 h-10 w-10 text-red-400" />
        <h3 className="text-sm font-semibold text-red-600">Failed to load notifications</h3>
        <p className="text-xs text-red-400">Please try reloading the page or check your connection.</p>
        <button onClick={() => refetch()} className="mt-4 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Live alerts, admission requests, critical lab reports, and messages.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {notifications && notifications.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <Bell className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Notifications</h3>
          <p className="text-xs text-slate-400">You don't have any notifications or clinical alerts at the moment.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications?.map((notif) => {
            const dateStr = new Date(notif.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={notif._id}
                className="flex items-start gap-4 border border-slate-200 bg-white rounded-xl p-4 transition-all duration-300 hover:shadow-sm hover:bg-slate-50/50"
              >
                <div className={`p-2 rounded-lg shrink-0 ${notif.severity === "critical" ? "bg-red-50 text-red-600" : notif.severity === "warning" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                    <Badge tone={SEVERITY_TONES[notif.severity] || "neutral"}>
                      {notif.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                  <span className="text-[10px] text-slate-400 block mt-2">{dateStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
