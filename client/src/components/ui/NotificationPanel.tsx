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
} from "lucide-react";
import { useNotifications, AppNotification, NotificationType, NotificationSeverity } from "../../features/notifications";
import { useAuth } from "../../context/AuthContext";
import { useNurseNotifications } from "../../features/nurse";

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
    bg: "bg-blue-50 hover:bg-blue-100",
    icon: "bg-blue-100 text-blue-600",
    dot: "bg-blue-400",
  },
  warning: {
    bg: "bg-amber-50 hover:bg-amber-100",
    icon: "bg-amber-100 text-amber-600",
    dot: "bg-amber-400",
  },
  critical: {
    bg: "bg-red-50 hover:bg-red-100",
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
}: {
  notification: AppNotification;
  isRead: boolean;
  onNavigate: (link: string) => void;
}) {
  const meta = TYPE_META[notification.type];
  const styles = SEVERITY_STYLES[notification.severity];
  const Icon = meta.icon;

  return (
    <button
      onClick={() => onNavigate(notification.link)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${styles.bg} ${isRead ? "opacity-60" : ""}`}
    >
      {/* Icon */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700 truncate">{notification.title}</p>
          <span className="shrink-0 text-[10px] text-slate-400">{relativeTime(notification.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
      )}
    </button>
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

  const { data, isLoading } = useNotifications();
  const notifications = data?.data?.notifications ?? [];
  const total = data?.data?.total ?? 0;

  // Compute unreadCount based on role
  const unreadCount = isNurse
    ? (nurseNotifsData || []).filter(n => !n.isRead).length
    : notifications.filter((n) => !readIds.has(n.id)).length;

  if (isNurse) {
    return (
      <button
        onClick={() => navigate("/nurse/notifications")}
        className="relative rounded-full p-2 text-slate-400 hover:text-navy-705 hover:bg-navy-50 transition-all cursor-pointer"
        title="Nurse Notification Center"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>
    );
  }

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

  function handleMarkAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
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
    }
    navigate(targetLink);
    setOpen(false);
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => { if (n.link === link) next.add(n.id); });
      return next;
    });
  }

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
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  All read
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
                />
              ))
            )}
          </div>

          {/* Footer */}
          {!isLoading && sorted.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 text-center">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Auto-refreshes every 60 seconds
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
