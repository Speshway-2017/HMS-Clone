import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Search,
  CheckCheck,
  Clock,
  Pill,
  Thermometer,
  ShieldAlert,
  Heart,
  CalendarDays,
  ClipboardList,
  Info,
  SlidersHorizontal,
  Eye,
  Trash2,
  BellRing,
  Volume2,
  VolumeX,
  Volume1,
  FileCheck2
} from "lucide-react";
import {
  useNurseNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useSnoozeNotification,
  useDismissNotification,
  NurseNotification
} from "../../features/nurse";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

// Synth Beep for critical alerts
function playEmergencyChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;
    
    // Resuscitation standard double-tone
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(880, now, 0.25);
    playTone(660, now + 0.3, 0.35);
  } catch (err) {
    console.warn("AudioContext chime disabled by browser autoplay restrictions.");
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  
  // Audio chime settings state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Queries
  const { data: notifications, isLoading, error } = useNurseNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const snoozeMutation = useSnoozeNotification();
  const dismissMutation = useDismissNotification();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  // Keep track of previously known notifications to trigger chimes/toasts on new arrivals
  const prevNotifsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    
    const currentIds = notifications.map(n => n._id);
    const newArrivals = notifications.filter(n => !prevNotifsRef.current.includes(n._id));

    if (prevNotifsRef.current.length > 0 && newArrivals.length > 0) {
      newArrivals.forEach((notif) => {
        const priority = notif.data?.priority || (notif.severity === "critical" ? "Critical" : "Medium");
        
        // Show real-time Toast notification
        if (priority === "Critical" || priority === "High") {
          toast.error(`NEW ALERT: ${notif.title}`, { duration: 5000 });
          if (soundEnabled) {
            playEmergencyChime();
          }
        } else {
          toast.success(notif.title, { icon: "🔔" });
        }
      });
    }

    prevNotifsRef.current = currentIds;
  }, [notifications, soundEnabled]);

  // Actions Submit Handlers
  const handleMarkRead = async (id: string) => {
    try {
      await markReadMutation.mutateAsync(id);
    } catch (err: any) {
      toast.error(err.message || "Failed to mark as read.");
    }
  };

  const handleMarkAllRead = async () => {
    const loadingToastId = toast.loading("Marking all notifications as read...");
    try {
      await markAllReadMutation.mutateAsync();
      toast.success("All notifications marked as read!", { id: loadingToastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to update notifications.", { id: loadingToastId });
    }
  };

  const handleSnooze = async (id: string) => {
    const loadingToastId = toast.loading("Snoozing reminder for 15 minutes...");
    try {
      await snoozeMutation.mutateAsync(id);
      toast.success("Reminder successfully snoozed for 15m!", { id: loadingToastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to snooze reminder.", { id: loadingToastId });
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissMutation.mutateAsync(id);
      toast.success("Notification dismissed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to dismiss notification.");
    }
  };

  const handleViewPatient = (patientId: string) => {
    if (!patientId) return;
    navigate(`/nurse/inpatients`);
  };

  // Helper matching type metadata
  const getNotificationTypeMeta = (type: string) => {
    switch (type) {
      case "medication":
        return { icon: Pill, color: "text-indigo-500 bg-indigo-50 border-indigo-100", label: "Medication Reminder" };
      case "vitals":
        return { icon: Thermometer, color: "text-blue-500 bg-blue-50 border-blue-100", label: "Vital Signs Reminder" };
      case "critical_alert":
        return { icon: ShieldAlert, color: "text-red-500 bg-red-50 border-red-100", label: "Critical Vital Alert" };
      case "emergency":
        return { icon: BellRing, color: "text-rose-600 bg-rose-50 border-rose-100", label: "Emergency Alert" };
      case "assignment":
        return { icon: ClipboardList, color: "text-teal-500 bg-teal-50 border-teal-100", label: "New Patient Assignment" };
      case "bedside":
        return { icon: Heart, color: "text-emerald-500 bg-emerald-50 border-emerald-100", label: "Bedside Care Reminder" };
      case "notes_reminder":
        return { icon: ClipboardList, color: "text-violet-500 bg-violet-50 border-violet-100", label: "Nursing Notes Reminder" };
      case "handover_reminder":
        return { icon: CalendarDays, color: "text-amber-500 bg-amber-50 border-amber-100", label: "Shift Handover Reminder" };
      case "discharge_prep":
        return { icon: FileCheck2, color: "text-cyan-500 bg-cyan-50 border-cyan-100", label: "Discharge Request" };
      case "doctor_instruction":
        return { icon: Info, color: "text-slate-500 bg-slate-50 border-slate-100", label: "Doctor Instructions" };
      default:
        return { icon: Bell, color: "text-slate-500 bg-slate-50 border-slate-100", label: "General Warning" };
    }
  };

  const getPriorityStyle = (priority?: string, severity?: string) => {
    const level = priority || (severity === "critical" ? "Critical" : severity === "warning" ? "High" : severity === "info" ? "Medium" : "Low");
    switch (level) {
      case "Critical":
        return { bg: "bg-red-50 border-red-200 text-red-700", dot: "bg-red-500", label: "Critical" };
      case "High":
        return { bg: "bg-orange-50 border-orange-200 text-orange-700", dot: "bg-orange-550", label: "High" };
      case "Medium":
        return { bg: "bg-blue-50 border-blue-200 text-blue-700", dot: "bg-blue-500", label: "Medium" };
      case "Low":
      default:
        return { bg: "bg-slate-100 border-slate-200 text-slate-600", dot: "bg-slate-400", label: "Low" };
    }
  };

  // 1. Search Filtering
  const searchFiltered = (notifications || []).filter((notif) => {
    const name = notif.data?.patientName || "";
    const uhid = notif.data?.uhid || "";
    const room = notif.data?.roomNumber || "";
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || uhid.toLowerCase().includes(query) || room.toLowerCase().includes(query);
  });

  const tabFiltered = searchFiltered.filter((notif) => {
    const actualType = notif.data?.type || notif.type;
    if (activeFilter === "All") return true;
    if (activeFilter === "Medication") return actualType === "medication";
    if (activeFilter === "Vitals") return actualType === "vitals" || actualType === "critical_alert";
    if (activeFilter === "Emergency") return actualType === "emergency";
    if (activeFilter === "Assigned Patients") return actualType === "assignment";
    if (activeFilter === "Bedside Care") return actualType === "bedside";
    if (activeFilter === "Nursing Notes") return actualType === "notes_reminder";
    if (activeFilter === "Shift Handover") return actualType === "handover_reminder";
    if (activeFilter === "Discharge Preparation") return actualType === "discharge_prep";
    if (activeFilter === "Doctor Instructions") return actualType === "doctor_instruction";
    return true;
  });

  // 3. Hide snoozed reminders dynamically
  const activeNotifications = tabFiltered.filter((n) => {
    if (n.data?.snoozedUntil) {
      return new Date(n.data.snoozedUntil).getTime() < Date.now();
    }
    return true;
  });

  const unreadCount = activeNotifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 pb-10">
      
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-500" />
            Nurse Notification Center
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Displaying live medication alerts, vital alerts, emergency calls, and care schedule logs.
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Sound toggle controls */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${
              soundEnabled 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-emerald-600" />
                Chimes On
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-slate-400" />
                Silent Mode
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-705 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Filters Layout Column (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4 border border-slate-100 shadow-sm bg-white space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-450 font-bold uppercase tracking-wider mb-2">
              <SlidersHorizontal className="h-4 w-4 text-navy-500" />
              Category Filters
            </div>

            <div className="flex flex-col gap-1 text-xs">
              {[
                { filter: "All", count: activeNotifications.length },
                { filter: "Medication", count: activeNotifications.filter(n => (n.data?.type || n.type) === "medication").length },
                { filter: "Vitals", count: activeNotifications.filter(n => (n.data?.type || n.type) === "vitals" || (n.data?.type || n.type) === "critical_alert").length },
                { filter: "Emergency", count: activeNotifications.filter(n => (n.data?.type || n.type) === "emergency").length },
                { filter: "Assigned Patients", count: activeNotifications.filter(n => (n.data?.type || n.type) === "assignment").length },
                { filter: "Bedside Care", count: activeNotifications.filter(n => (n.data?.type || n.type) === "bedside").length },
                { filter: "Nursing Notes", count: activeNotifications.filter(n => (n.data?.type || n.type) === "notes_reminder").length },
                { filter: "Shift Handover", count: activeNotifications.filter(n => (n.data?.type || n.type) === "handover_reminder").length },
                { filter: "Discharge Preparation", count: activeNotifications.filter(n => (n.data?.type || n.type) === "discharge_prep").length },
                { filter: "Doctor Instructions", count: activeNotifications.filter(n => (n.data?.type || n.type) === "doctor_instruction").length }
              ].map((item) => (
                <button
                  key={item.filter}
                  onClick={() => setActiveFilter(item.filter)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-bold flex justify-between items-center transition-colors cursor-pointer ${
                    activeFilter === item.filter
                      ? "bg-navy-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{item.filter}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${
                    activeFilter === item.filter ? "bg-navy-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Search and Cards List Layout Column (9 Cols) */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient Name, UHID, or Room Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500 text-xs font-semibold shadow-sm bg-white"
            />
          </div>

          {/* Cards List Container */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-white border border-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : activeNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center py-20">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No nursing notifications available.</h3>
              <p className="text-xs text-slate-400 mt-1">There are no pending alerts or reminder checkpoints logged.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeNotifications.map((notif) => {
                const actualType = notif.data?.type || notif.type;
                const typeMeta = getNotificationTypeMeta(actualType);
                const priority = getPriorityStyle(notif.data?.priority, notif.severity);
                const Icon = typeMeta.icon;

                return (
                  <div
                    key={notif._id}
                    className={`bg-white rounded-2xl p-5 border shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300 flex flex-col md:flex-row justify-between gap-4 relative group ${
                      !notif.isRead ? "border-l-4 border-l-indigo-500 bg-indigo-50/5" : "border-slate-100"
                    }`}
                  >
                    
                    {/* Unread Indicator dot */}
                    {!notif.isRead && (
                      <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                    )}

                    <div className="flex gap-4">
                      {/* Icon Circle */}
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${typeMeta.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content details */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{notif.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border tracking-wider ${priority.bg}`}>
                            {priority.label}
                          </span>
                        </div>
                        
                        <p className="text-slate-500 font-medium text-[11px] leading-relaxed">{notif.message}</p>

                        {/* Patient specifics */}
                        {notif.data?.patientName && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 bg-slate-50/50 p-2 border border-slate-100 rounded-lg text-[10px] font-semibold text-slate-600 mt-2">
                            <div>Patient: <strong className="text-slate-800">{notif.data.patientName}</strong></div>
                            <div>UHID: <strong className="text-slate-800">{notif.data.uhid || "N/A"}</strong></div>
                            <div>Room/Bed: <strong className="text-slate-800">{notif.data.roomNumber || "N/A"}</strong></div>
                            <div>Ward: <strong className="text-slate-800">{notif.data.ward || "General"}</strong></div>
                          </div>
                        )}

                        {/* Type specific specs */}
                        {actualType === "medication" && notif.data?.medicineName && (
                          <div className="text-[10px] text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded inline-block mt-2 font-bold">
                            Medicine: {notif.data.medicineName} ({notif.data.dosage}) • Time: {notif.data.scheduledTime}
                          </div>
                        )}
                        {actualType === "vitals" && notif.data?.dueTime && (
                          <div className="text-[10px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded inline-block mt-2 font-bold">
                            Due Time: {notif.data.dueTime}
                          </div>
                        )}

                        <div className="text-[9px] text-slate-400 font-medium font-mono pt-1">
                          Received: {new Date(notif.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      
                      {/* View Patient Details */}
                      {notif.data?.patientName && (
                        <button
                          type="button"
                          onClick={() => handleViewPatient(notif._id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-650 hover:text-slate-800 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm bg-white"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      )}

                      {/* Mark read/unread */}
                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notif._id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-705 font-bold text-[10px] cursor-pointer transition-colors shadow-sm"
                        >
                          Read
                        </button>
                      )}

                      {/* Snooze (Medication and vital signs only) */}
                      {(actualType === "medication" || actualType === "vitals") && (
                        <button
                          type="button"
                          onClick={() => handleSnooze(notif._id)}
                          className="px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 text-indigo-600 font-bold text-[10px] cursor-pointer transition-colors shadow-sm bg-white"
                        >
                          Snooze
                        </button>
                      )}

                      {/* Dismissal (Only non-critical / non-emergency) */}
                      {notif.severity !== "critical" && actualType !== "critical_alert" && actualType !== "emergency" && (
                        <button
                          type="button"
                          onClick={() => handleDismiss(notif._id)}
                          className="p-1 rounded-lg border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-650 transition-colors cursor-pointer bg-white"
                          title="Dismiss"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
