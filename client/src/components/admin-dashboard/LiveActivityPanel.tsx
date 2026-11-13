import { useState, useEffect } from "react";
import { Zap, Bell, AlertTriangle, ShieldAlert, CheckCircle2, FileText, UserPlus, CreditCard, Activity, Pill } from "lucide-react";
import { socket } from "../../lib/socket";

interface LiveEvent {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  icon: any;
  color: string;
}

interface LiveActivityPanelProps {
  notifications?: any[];
}

export function LiveActivityPanel({ notifications }: LiveActivityPanelProps) {
  const [events, setEvents] = useState<LiveEvent[]>([
    { id: "1", type: "payment", title: "Payment ₹1,250 received for Invoice #INV-8492", timestamp: "Just now", icon: CreditCard, color: "text-emerald-600 bg-emerald-50" },
    { id: "2", type: "patient", title: "New OP Patient registered: Rahul Sharma (UHID: HMS-9041)", timestamp: "2 mins ago", icon: UserPlus, color: "text-emerald-700 bg-emerald-50" },
    { id: "3", type: "lab", title: "Lab Report Uploaded: CBC Test for Patient #402", timestamp: "5 mins ago", icon: FileText, color: "text-rose-600 bg-rose-50" },
    { id: "4", type: "admission", title: "IP Admission: Patient admitted to ICU Bed #04", timestamp: "12 mins ago", icon: Activity, color: "text-rose-700 bg-rose-50" },
    { id: "5", type: "pharmacy", title: "Prescription Dispensed: Paracetamol 650mg & Amoxicillin", timestamp: "18 mins ago", icon: Pill, color: "text-emerald-600 bg-emerald-50" },
  ]);

  // Subscribe to real-time socket events
  useEffect(() => {
    const handleNewEvent = (data: any) => {
      const newEv: LiveEvent = {
        id: Date.now().toString(),
        type: data?.type || "update",
        title: data?.title || data?.message || "Real-time system update received",
        timestamp: "Just now",
        icon: Zap,
        color: "text-emerald-700 bg-emerald-50",
      };

      setEvents((prev) => [newEv, ...prev.slice(0, 9)]);
    };

    socket.on("dashboard_update", handleNewEvent);
    socket.on("admission:request:created", handleNewEvent);
    socket.on("prescription:new", handleNewEvent);
    socket.on("prescription:dispensed", handleNewEvent);
    socket.on("payment_update", handleNewEvent);

    return () => {
      socket.off("dashboard_update", handleNewEvent);
      socket.off("admission:request:created", handleNewEvent);
      socket.off("prescription:new", handleNewEvent);
      socket.off("prescription:dispensed", handleNewEvent);
      socket.off("notification:new", handleNewEvent);
      socket.off("payment_update", handleNewEvent);
    };
  }, []);

  const criticalNotifications = (notifications || []).filter((n) => n.severity === "critical" || n.type === "inventory");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Live Event Stream Ticker (2 cols) */}
      <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-800">Live Hospital Activity Feed</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Real-time
          </span>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {events.map((ev) => {
            const IconComponent = ev.icon || Zap;
            return (
              <div key={ev.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${ev.color}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{ev.title}</p>
                    <p className="text-[10px] text-slate-400">{ev.timestamp}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Alerts & Notifications Center (1 col) */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <Bell className="h-5 w-5 text-amber-600" /> Critical Alerts
          </div>
          <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
            {criticalNotifications.length || 3} New
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="rounded-lg bg-white p-3 border border-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800">Low Stock Warning</p>
              <p className="text-[11px] text-slate-500">Paracetamol 650mg is below reorder threshold (12 packs remaining).</p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-3 border border-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800">ICU Bed Occupancy High</p>
              <p className="text-[11px] text-slate-500">ICU Ward capacity has reached 90% utilization.</p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-3 border border-emerald-200 flex items-start gap-2.5">
            <FileText className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800">Pending Lab Verifications</p>
              <p className="text-[11px] text-slate-500">5 Diagnostic reports waiting for doctor verification.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
