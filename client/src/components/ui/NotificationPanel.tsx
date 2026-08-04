import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarClock,
  Package,
  Receipt,
  UserPlus,
  X,
  CheckCheck,
  Loader2,
  BellOff,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { socket } from "../../lib/socket";
import { useNotifications, useDeleteNotification, AppNotification, NotificationType, NotificationSeverity } from "../../features/notifications";
import { useAuth } from "../../context/AuthContext";
import { useNurseNotifications, useMarkAllNotificationsRead } from "../../features/nurse";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TYPE_META: Record<NotificationType, { icon: React.ElementType; label: string }> = {
  appointment: { icon: CalendarClock, label: "Appointment" },
  inventory: { icon: Package, label: "Inventory" },
  invoice: { icon: Receipt, label: "Invoice" },
  patient: { icon: UserPlus, label: "Patient" },
  admission_request: { icon: CalendarClock, label: "Admission Request" },
  general: { icon: Bell, label: "Notification" },
};

const SEVERITY_STYLES: Record<NotificationSeverity, { bg: string; icon: string; dot: string }> = {
  info: {
    bg: "bg-blue-50/70 hover:bg-blue-100/80",
    icon: "bg-blue-100 text-blue-600",
    dot: "bg-blue-500",
  },
  warning: {
    bg: "bg-amber-50/70 hover:bg-amber-100/80",
    icon: "bg-amber-100 text-amber-600",
    dot: "bg-amber-500",
  },
  critical: {
    bg: "bg-red-50/70 hover:bg-red-100/80",
    icon: "bg-red-100 text-red-600",
    dot: "bg-red-500",
  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex animate-pulse gap-3 px-4 py-3">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3 w-1/2 rounded bg-slate-200" />
        <div className="h-3 w-3/4 rounded bg-slate-200" />
      </div>
    </div>
  );
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  isRead,
  onNavigate,
  onDelete,
}: {
  notification: AppNotification;
  isRead: boolean;
  onNavigate: (link: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const meta = TYPE_META[notification.type] || TYPE_META.general;
  const styles = SEVERITY_STYLES[notification.severity] || SEVERITY_STYLES.info;
  const Icon = meta.icon;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await onDelete(notification.id);
      toast.success("Notification deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete notification.");
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(false);
  };

  return (
    <div className={`relative border-b border-slate-100 transition-all ${styles.bg} ${isRead ? "opacity-75" : ""}`}>
      {showConfirmDelete ? (
        /* Inline On-Screen Confirmation Box (No Browser Alerts!) */
        <div className="p-3 bg-rose-50 border-l-4 border-rose-600 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 animate-pulse" />
              <div>
                <p className="text-xs font-black text-rose-950">Confirm Deletion</p>
                <p className="text-[11px] text-rose-800 font-medium">Are you sure you want to delete this notification?</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Confirm
              </button>
              <button
                onClick={handleCancelDelete}
                className="px-2 py-1 bg-white border border-slate-200 text-slate-700 font-bold text-[11px] rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Regular Notification Card Row */
        <div
          onClick={() => onNavigate(notification.link)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-100/60 cursor-pointer group transition-colors"
        >
          {/* Icon */}
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800 truncate">{notification.title}</p>
              <span className="shrink-0 text-[10px] text-slate-400 font-medium">{relativeTime(notification.createdAt)}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
              {notification.message}
            </p>
          </div>

          {/* Right Action Area: Unread Dot OR Delete Trash Icon when Read */}
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            {!isRead ? (
              <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} title="Unread" />
            ) : (
              <button
                onClick={handleDeleteClick}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                title="Delete Notification"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Conditionally load nurse notifications count
  const isNurse = user?.role === "nurse";
  const { data: nurseNotifsData } = useNurseNotifications(isNurse);
  const nurseMarkAllReadMutation = useMarkAllNotificationsRead();

  const { data, isLoading: isGeneralLoading } = useNotifications();

  // Format notifications depending on role
  const notifications: AppNotification[] = isNurse
    ? (nurseNotifsData || []).map((n: any) => ({
        id: n._id || n.id || Math.random().toString(),
        type: "general" as NotificationType,
        title: n.title || "Nurse Notification",
        message: n.message || "",
        link: n.link || "/nurse/notifications",
        severity: (n.severity === "critical" || n.type === "critical_alert" ? "critical" : n.severity === "warning" ? "warning" : "info") as NotificationSeverity,
        createdAt: n.createdAt || new Date().toISOString(),
      }))
    : (data?.data?.notifications ?? []);

  const total = isNurse ? (nurseNotifsData || []).length : (data?.data?.total ?? 0);
  const isLoading = isNurse ? false : isGeneralLoading;

  // Compute unreadCount based on role
  const unreadCount = isNurse
    ? (nurseNotifsData || []).filter(n => !n.isRead && !readIds.has(n._id || (n as any).id)).length
    : notifications.filter((n) => !readIds.has(n.id)).length;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Real-time Socket.IO notification listener for Doctor role
  useEffect(() => {
    if (user?.role !== "doctor") return;

    const handleNewDoctorNotif = (notif: any) => {
      // Play audio alert if critical
      if (notif.severity === "critical" || notif.data?.priority === "High") {
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
          audio.play().catch(() => {});
        } catch (e) {}

        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-rose-600 text-white shadow-2xl rounded-2xl pointer-events-auto p-4 border-2 border-white flex flex-col gap-2`}>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-black text-lg shrink-0">!</div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">{notif.title || "Critical Patient Alert"}</p>
                <p className="text-xs font-bold mt-0.5 leading-relaxed">{notif.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-white/20">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate(notif.link || "/doctor/ip-management");
                }}
                className="px-3 py-1 bg-white text-rose-700 font-extrabold text-xs rounded-lg shadow-sm cursor-pointer"
              >
                View Patient
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        ), { duration: 15000 });
      } else {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-slate-900 text-white shadow-2xl rounded-2xl pointer-events-auto p-4 border border-slate-700 flex flex-col gap-2`}>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-navy-600 flex items-center justify-center font-bold shrink-0">🔔</div>
              <div>
                <p className="text-xs font-extrabold uppercase text-navy-200">{notif.title}</p>
                <p className="text-xs text-slate-300 mt-0.5">{notif.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
              {notif.data?.type === "patient_report" && (
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    navigate(notif.link || "/doctor/ip-management");
                  }}
                  className="px-3 py-1 bg-navy-600 hover:bg-navy-500 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                >
                  Open Report
                </button>
              )}
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate(notif.link || "/doctor/ip-management");
                }}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
              >
                View Patient
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        ), { duration: 8000 });
      }
    };

    socket.on("notification:new", handleNewDoctorNotif);
    return () => {
      socket.off("notification:new", handleNewDoctorNotif);
    };
  }, [user, navigate]);

  function handleMarkAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
    if (isNurse) {
      nurseMarkAllReadMutation.mutate();
    }
  }

  function handleNavigate(link: string) {
    let targetLink = link;
    if (user?.role === "pharmacist") {
      if (link.startsWith("/admin/inventory")) {
        targetLink = "/pharmacy/inventory";
      } else if (link.startsWith("/admin/finance") || link.startsWith("/admin/invoices")) {
        targetLink = "/pharmacy/billing";
      } else if (link.startsWith("/admin/patients")) {
        targetLink = "/pharmacy/prescriptions";
      } else if (link.startsWith("/admin/dashboard")) {
        targetLink = "/pharmacy";
      }
    } else if (user?.role === "laboratory") {
      if (link.startsWith("/admin/inventory")) {
        targetLink = "/laboratory/inventory";
      } else if (link.startsWith("/admin/patients")) {
        targetLink = "/laboratory/requests";
      } else if (link.startsWith("/admin/dashboard")) {
        targetLink = "/laboratory";
      }
    } else if (user?.role === "accountant") {
      if (link.startsWith("/admin/finance")) {
        targetLink = "/accountant/billing";
      } else if (link.startsWith("/admin/appointments")) {
        targetLink = "/accountant/dashboard";
      } else if (link.startsWith("/admin/patients")) {
        targetLink = "/accountant/billing";
      } else if (link.startsWith("/admin/inventory")) {
        targetLink = "/accountant/expenses";
      }
    } else if (user?.role === "receptionist") {
      if (link.startsWith("/admin/appointments") || link.startsWith("/reception/appointments")) {
        targetLink = "/receptionist/appointments";
      } else if (link.startsWith("/admin/patients") || link.startsWith("/reception/patients")) {
        targetLink = "/receptionist/patients";
      } else if (link.startsWith("/admin/finance") || link.startsWith("/admin/invoices") || link.startsWith("/reception/billing")) {
        targetLink = "/receptionist/billing";
      } else if (link.startsWith("/admin/admissions") || link.startsWith("/reception/admissions")) {
        targetLink = "/receptionist/ip";
      } else {
        targetLink = "/receptionist/dashboard";
      }
    }
    navigate(targetLink);
    setOpen(false);
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => { if (n.link === link) next.add(n.id); });
      return next;
    });
  }

  const deleteNotifMutation = useDeleteNotification();

  const handleDeleteNotification = async (id: string) => {
    await deleteNotifMutation.mutateAsync(id);
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Group by severity for visual ordering: critical first
  const sorted = [...notifications].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div ref={panelRef} className="relative">
      {/* ── Bell Button ── */}
      <button
        id="btn-notifications"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`relative rounded-lg p-2 transition-colors ${
          open ? "bg-navy-100 text-navy-700" : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-navy-700" />
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {total > 0 && (
                <span className="rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-bold text-navy-700">
                  {total}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-navy-700 hover:bg-navy-50 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-navy-700" />
                  Mark All Read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <>
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
              </>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <BellOff className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">You're all caught up!</p>
                  <p className="mt-0.5 text-xs text-slate-400">No notifications right now.</p>
                </div>
              </div>
            ) : (
              sorted.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  isRead={readIds.has(n.id)}
                  onNavigate={handleNavigate}
                  onDelete={handleDeleteNotification}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {!isLoading && (
            <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between bg-slate-50/50">
              <button
                onClick={() => {
                  setOpen(false);
                  if (user?.role === "nurse") {
                    navigate("/nurse/notifications");
                  } else if (user?.role === "doctor") {
                    navigate("/doctor/ip-management");
                  } else if (user?.role === "receptionist") {
                    navigate("/receptionist/appointments");
                  } else {
                    navigate("/admin/dashboard");
                  }
                }}
                className="text-xs font-extrabold text-navy-700 hover:text-navy-900 transition-colors cursor-pointer flex items-center gap-1"
              >
                View All Notifications →
              </button>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Live Sync
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
