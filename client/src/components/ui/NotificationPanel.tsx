import { useEffect, useRef, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  type Variants,
} from "framer-motion";
import {
  Bell,
  CalendarClock,
  Package,
  Receipt,
  UserPlus,
  X,
  Check,
  CheckCheck,
  Loader2,
  BellOff,
  Trash2,
  AlertTriangle,
  Pin,
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

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 20, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const headingVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 22 },
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: "easeIn" } },
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

const NotificationItem = forwardRef<
  HTMLDivElement,
  {
    notification: AppNotification;
    isRead: boolean;
    pinned: boolean;
    onNavigate: (link: string, id?: string) => void;
    onDelete: (id: string) => Promise<void>;
    onMarkRead?: (id: string) => void;
    onTogglePin: (id: string) => void;
  }
>(function NotificationItem(
  {
    notification,
    isRead,
    pinned,
    onNavigate,
    onDelete,
    onMarkRead,
    onTogglePin,
  },
  ref
) {
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
    <motion.div
      ref={ref}
      layoutId={notification.id}
      layout
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`relative border-b transition-all ${
        pinned
          ? "bg-indigo-50/90 border-l-4 border-l-indigo-600 border-indigo-100/80 hover:bg-indigo-100/70"
          : `${styles.bg} border-slate-100`
      } ${isRead ? "opacity-75" : ""}`}
    >
      {showConfirmDelete ? (
        /* Inline On-Screen Confirmation Box */
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
          onClick={() => onNavigate(notification.link, notification.id)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-100/60 cursor-pointer group transition-colors"
        >
          {/* Icon */}
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
              pinned ? "bg-indigo-600 text-white shadow-xs" : styles.icon
            }`}
          >
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

          {/* Right Action Area: Pin Toggle + Unread Dot + Tick Mark + Delete Trash Icon */}
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            {!isRead && (
              <span className={`h-2.5 w-2.5 rounded-full ${styles.dot} mr-1`} title="Unread" />
            )}

            {/* Pin Toggle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(notification.id);
              }}
              aria-label={pinned ? `Unpin ${notification.title}` : `Pin ${notification.title}`}
              className={`p-1 rounded-lg transition-colors duration-200 cursor-pointer ${
                pinned
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-70 group-hover:opacity-100"
              }`}
              title={pinned ? "Unpin Notification" : "Pin Notification"}
            >
              <Pin
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  pinned ? "-rotate-45" : ""
                }`}
              />
            </button>

            {/* Delete Trash Icon */}
            <button
              onClick={handleDeleteClick}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
              title="Delete Notification"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
});

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const userId = user?.id || (user as any)?._id || "user";

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`hms_read_notifs_${userId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`hms_deleted_notifs_${userId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [showPinnedSection, setShowPinnedSection] = useState(false);
  const [showAllSection, setShowAllSection] = useState(true);

  const pinnedLengthRef = useRef(0);
  const unpinnedLengthRef = useRef(0);

  // Conditionally load nurse notifications count
  const isNurse = user?.role === "nurse";
  const { data: nurseNotifsData } = useNurseNotifications(isNurse);
  const nurseMarkAllReadMutation = useMarkAllNotificationsRead();

  const { data, isLoading: isGeneralLoading } = useNotifications();
  const deleteNotifMutation = useDeleteNotification();

  // Format notifications depending on role
  const rawNotifications: AppNotification[] = isNurse
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

  // Filter out locally deleted notifications immediately
  const notifications = rawNotifications.filter((n) => !deletedIds.has(n.id));

  const total = notifications.length;
  const isLoading = isNurse ? false : isGeneralLoading;

  // Compute unreadCount based on role
  const unreadCount = isNurse
    ? (nurseNotifsData || []).filter(n => !n.isRead && !readIds.has(n._id || (n as any).id) && !deletedIds.has(n._id || (n as any).id)).length
    : notifications.filter((n) => !readIds.has(n.id)).length;

  // Sort: newest first
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const pinnedItems = sorted.filter((i) => pinnedIds.has(i.id));
  const unpinnedItems = sorted.filter((i) => !pinnedIds.has(i.id));

  pinnedLengthRef.current = pinnedItems.length;
  unpinnedLengthRef.current = unpinnedItems.length;

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (pinnedItems.length > 0) setShowPinnedSection(true);
  }, [pinnedItems.length]);

  useEffect(() => {
    if (unpinnedItems.length > 0) setShowAllSection(true);
  }, [unpinnedItems.length]);

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
      if (notif.severity === "critical" || notif.data?.priority === "High") {
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
          audio.volume = 0.6;
          audio.play().catch(() => {});
        } catch (_) {}

        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-red-950 text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-2 ring-red-500/50 p-4 border border-red-500/30`}>
            <div className="flex-1 w-0 p-1">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-red-600/30 flex items-center justify-center border border-red-500/50">
                    <span className="text-xl">🚨</span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-red-200 uppercase tracking-wider">{notif.title}</p>
                  <p className="mt-1 text-xs text-red-100 leading-relaxed">{notif.message}</p>
                  {notif.data?.patientName && (
                    <p className="mt-2 text-xs font-bold text-amber-300 bg-red-900/60 py-1 px-2.5 rounded-lg border border-red-700/50 inline-block">
                      Patient: {notif.data.patientName} {notif.data.bedNumber ? `(Bed: ${notif.data.bedNumber})` : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex border-l border-red-900/60 pl-3 flex-col justify-center gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate(notif.link || "/doctor/ip-management");
                }}
                className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-colors"
              >
                View Now
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold px-3 py-1 rounded-xl transition-colors"
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
              <div className="h-8 w-8 rounded-xl bg-navy-600 flex items-center justify-center font-bold shrink-0">
                <Bell className="h-4 w-4 text-white" />
              </div>
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
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const next = new Set([...prev, ...allIds]);
      try {
        localStorage.setItem(`hms_read_notifs_${userId}`, JSON.stringify(Array.from(next)));
      } catch (_) {}
      return next;
    });
    if (isNurse) {
      nurseMarkAllReadMutation.mutate();
    }
  }

  function handleNavigate(link: string, id?: string) {
    if (id) {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(`hms_read_notifs_${userId}`, JSON.stringify(Array.from(next)));
        } catch (_) {}
        return next;
      });
    }

    let targetLink = link;

    if (user?.role === "nurse" && link.includes("/doctor/ip-management")) {
      targetLink = "/nurse/ip-management";
    }

    if (targetLink) {
      setOpen(false);
      navigate(targetLink);
    }
  }

  const handleDeleteNotification = async (id: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(`hms_deleted_notifs_${userId}`, JSON.stringify(Array.from(next)));
      } catch (_) {}
      return next;
    });

    if (!isNurse) {
      try {
        await deleteNotifMutation.mutateAsync(id);
      } catch (e) {
        console.error("Failed to delete notification on server:", e);
      }
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Bell Button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {open && (
        <div className="fixed top-16 left-2 right-2 sm:absolute sm:top-11 sm:left-auto sm:right-0 sm:w-96 z-[100] w-auto rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-white">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-navy-700" />
              <span className="text-sm font-extrabold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy-700 border border-navy-100">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-extrabold text-navy-700 hover:text-navy-900 transition-colors"
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

          {/* Body with Pinned List Layout Group Animation */}
          <div className="max-h-[65vh] sm:max-h-[28rem] overflow-y-auto">
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
              <LayoutGroup>
                <motion.div layout className="flex w-full flex-col divide-y divide-slate-100">
                  {/* Pinned Notifications Section */}
                  <AnimatePresence onExitComplete={() => setShowPinnedSection(false)}>
                    {showPinnedSection && (
                      <motion.div
                        key="pinned-section"
                        layout
                        variants={headingVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="flex flex-col"
                      >
                        <motion.p
                          layout="position"
                          className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-white bg-indigo-600 border-b border-indigo-700 flex items-center justify-between shadow-xs"
                        >
                          <span className="flex items-center gap-1.5">
                            <Pin className="h-3.5 w-3.5 -rotate-45" /> Pinned Notifications
                          </span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white font-black">
                            {pinnedItems.length}
                          </span>
                        </motion.p>
                        <AnimatePresence
                          mode="popLayout"
                          onExitComplete={() => {
                            if (pinnedLengthRef.current === 0)
                              setShowPinnedSection(false);
                          }}
                        >
                          {pinnedItems.map((n) => (
                            <NotificationItem
                              key={n.id}
                              notification={n}
                              isRead={readIds.has(n.id)}
                              pinned
                              onNavigate={handleNavigate}
                              onDelete={handleDeleteNotification}
                              onMarkRead={(id) => setReadIds((prev) => new Set([...prev, id]))}
                              onTogglePin={togglePin}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* All Notifications Section */}
                  <AnimatePresence onExitComplete={() => setShowAllSection(false)}>
                    {showAllSection && (
                      <motion.div
                        key="all-section"
                        layout
                        variants={headingVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="flex flex-col"
                      >
                        {pinnedItems.length > 0 && (
                          <motion.p
                            layout="position"
                            className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 bg-slate-100 border-b border-slate-200 flex items-center justify-between"
                          >
                            <span>All Notifications</span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                              {unpinnedItems.length}
                            </span>
                          </motion.p>
                        )}
                        <AnimatePresence
                          mode="popLayout"
                          onExitComplete={() => {
                            if (unpinnedLengthRef.current === 0) setShowAllSection(false);
                          }}
                        >
                          {unpinnedItems.map((n) => (
                            <NotificationItem
                              key={n.id}
                              notification={n}
                              isRead={readIds.has(n.id)}
                              pinned={false}
                              onNavigate={handleNavigate}
                              onDelete={handleDeleteNotification}
                              onMarkRead={(id) => setReadIds((prev) => new Set([...prev, id]))}
                              onTogglePin={togglePin}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>
            )}
          </div>

          {/* Footer */}
          {!isLoading && (
            <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between bg-slate-50/50">
              {user?.role?.toLowerCase() === "nurse" && (
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/nurse/notifications");
                  }}
                  className="text-xs font-extrabold text-navy-700 hover:text-navy-900 transition-colors cursor-pointer flex items-center gap-1"
                >
                  View All Notifications →
                </button>
              )}
              <p className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto">
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
