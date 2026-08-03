import React, { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  ArrowRight,
  ShieldAlert,
  Bell,
  CheckCircle2,
  Calendar,
  Sparkles,
  UserCheck
} from "lucide-react";
import toast from "react-hot-toast";
import { useNurseShiftStatus, useTriggerSupervisorAlert } from "../../features/nurse";
import { socket } from "../../lib/socket";

interface ShiftManagementWidgetProps {
  onStartHandover: () => void;
  onViewHistory: () => void;
  onOpenPendingAccept: (handover: any) => void;
}

export const ShiftManagementWidget: React.FC<ShiftManagementWidgetProps> = ({
  onStartHandover,
  onViewHistory,
  onOpenPendingAccept,
}) => {
  const { data: shiftStatusData, refetch } = useNurseShiftStatus();
  const triggerSupervisorAlert = useTriggerSupervisorAlert();

  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [hasWarned15Min, setHasWarned15Min] = useState(false);
  const [hasWarned5Min, setHasWarned5Min] = useState(false);
  const [hasWarnedEnd, setHasWarnedEnd] = useState(false);
  const [overdueReminderCount, setOverdueReminderCount] = useState(0);

  // Sync remaining seconds from API and set live ticking interval
  useEffect(() => {
    if (shiftStatusData?.remainingSeconds !== undefined) {
      setRemainingSeconds(shiftStatusData.remainingSeconds);
    }
  }, [shiftStatusData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to Socket.IO real-time handover events
  useEffect(() => {
    const handleHandoverEvent = (data: any) => {
      refetch();
      if (data?.title) {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4 border-l-4 border-indigo-500`}>
            <div className="flex-1 w-0 flex items-center">
              <div className="flex-shrink-0 pt-0.5">
                <Bell className="h-6 w-6 text-indigo-600 animate-bounce" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">{data.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{data.message}</p>
              </div>
            </div>
          </div>
        ));
      }
    };

    socket.on("shift_handover_created", handleHandoverEvent);
    socket.on("shift_handover_submitted", handleHandoverEvent);
    socket.on("shift_handover_accepted", handleHandoverEvent);
    socket.on("supervisor_handover_alert", handleHandoverEvent);

    return () => {
      socket.off("shift_handover_created", handleHandoverEvent);
      socket.off("shift_handover_submitted", handleHandoverEvent);
      socket.off("shift_handover_accepted", handleHandoverEvent);
      socket.off("supervisor_handover_alert", handleHandoverEvent);
    };
  }, [refetch]);

  // Automated 15-min and 5-min shift ending notifications
  useEffect(() => {
    if (remainingSeconds > 0 && remainingSeconds <= 15 * 60 && !hasWarned15Min) {
      setHasWarned15Min(true);
      toast((t) => (
        <div className="flex items-start gap-3 p-1">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-slate-900">Shift Ending Soon</p>
            <p className="text-xs text-slate-600 mt-0.5">Your shift will end in 15 minutes. Please prepare to hand over all assigned patients.</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  onStartHandover();
                }}
                className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-bold"
              >
                Prepare Handover
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ), { duration: 10000 });
    }

    if (remainingSeconds > 0 && remainingSeconds <= 5 * 60 && !hasWarned5Min) {
      setHasWarned5Min(true);
      toast.error((t) => (
        <div className="flex items-start gap-3 p-1">
          <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <p className="text-xs font-extrabold text-slate-900 uppercase">Handover Required</p>
            <p className="text-xs text-slate-600 mt-0.5">Your shift is about to end. Please complete patient handover before leaving.</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  onStartHandover();
                }}
                className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold"
              >
                Start Handover
              </button>
            </div>
          </div>
        </div>
      ), { duration: 15000 });
    }

    if (remainingSeconds === 0 && !hasWarnedEnd && shiftStatusData?.shiftState !== "Shift Completed") {
      setHasWarnedEnd(true);
      toast.error("Shift has ended! Please complete patient handover immediately.", { duration: 12000 });
    }
  }, [remainingSeconds, hasWarned15Min, hasWarned5Min, hasWarnedEnd, shiftStatusData, onStartHandover]);

  // Periodic Overdue Reminders after shift end
  useEffect(() => {
    if (remainingSeconds === 0 && shiftStatusData?.shiftState !== "Shift Completed") {
      const reminderInterval = setInterval(() => {
        setOverdueReminderCount((prev) => {
          const nextCount = prev + 1;
          if (nextCount <= 6) {
            toast.error(`Reminder ${nextCount}/6: Shift ended. Please submit handover immediately.`, { duration: 8000 });
          } else if (nextCount === 7) {
            // Trigger supervisor alert automatically
            triggerSupervisorAlert.mutate();
            toast.error("Handover overdue limit reached. Nursing Supervisor has been notified.", { duration: 10000 });
          }
          return nextCount;
        });
      }, 5 * 60 * 1000); // Every 5 minutes

      return () => clearInterval(reminderInterval);
    }
  }, [remainingSeconds, shiftStatusData, triggerSupervisorAlert]);

  // Format seconds to HH:MM:SS
  const formatCountdown = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine countdown timer styling threshold
  const getTimerBadgeStyle = () => {
    if (remainingSeconds <= 5 * 60) {
      return "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
    }
    if (remainingSeconds <= 15 * 60) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  // Shift state colors mapping
  const getShiftStateBadge = (state?: string) => {
    switch (state) {
      case "On Duty":
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">On Duty</span>;
      case "Shift Ending Soon":
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">Ending Soon</span>;
      case "Handover Required":
      case "Waiting for Handover":
      case "Handover In Progress":
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200">Handover Required</span>;
      case "Shift Completed":
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">Completed</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">Upcoming Shift</span>;
    }
  };

  const currentShift = shiftStatusData?.currentShift || "Morning";
  const nextShift = shiftStatusData?.nextShift || "Evening";
  const pendingIncoming = shiftStatusData?.pendingIncomingHandovers || [];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-sans">Shift Management & Handover Cockpit</h3>
              {getShiftStateBadge(shiftStatusData?.shiftState)}
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">3-Shift rotation protocol (Morning 06:00-14:00 · Evening 14:00-22:00 · Night 22:00-06:00)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewHistory}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-sans"
          >
            <Calendar className="h-3.5 w-3.5" /> Shift Audit History
          </button>
          <button
            onClick={onStartHandover}
            className="px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer font-sans"
          >
            <UserCheck className="h-4 w-4" /> Start Shift Handover
          </button>
        </div>
      </div>

      {/* Incoming Pending Handovers Alert for Next Shift Nurse */}
      {pendingIncoming.length > 0 && (
        <div className="rounded-2xl bg-indigo-50/80 border border-indigo-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wide">Pending Incoming Handover Waiting</h4>
              <p className="text-xs text-indigo-800 mt-0.5">
                Nurse <strong className="font-bold">{pendingIncoming[0].loggedByName}</strong> has submitted shift duties for <strong className="font-bold">{pendingIncoming[0].patientsHandedOverCount} patient(s)</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenPendingAccept(pendingIncoming[0])}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer font-sans flex items-center gap-1"
            >
              Accept Handover <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main 4 Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Current & Next Shift */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Active Shift Cycle</span>
          <p className="text-sm font-black text-slate-800 font-sans flex items-center gap-1.5">
            {currentShift} Shift <span className="text-slate-400 font-medium text-xs">→ {nextShift}</span>
          </p>
          <span className="text-[11px] text-slate-500 block font-medium">
            {currentShift === "Morning" ? "06:00 AM - 02:00 PM" : currentShift === "Evening" ? "02:00 PM - 10:00 PM" : "10:00 PM - 06:00 AM"}
          </span>
        </div>

        {/* 2. Live Countdown Timer */}
        <div className={`border rounded-2xl p-4 space-y-1 ${getTimerBadgeStyle()}`}>
          <span className="text-[10px] font-extrabold uppercase tracking-wider block font-sans">Shift Ends In</span>
          <p className="text-2xl font-black font-mono tracking-tight">{formatCountdown(remainingSeconds)}</p>
          <span className="text-[10px] font-bold uppercase tracking-wide block">
            {remainingSeconds <= 5 * 60 ? "Critical Handover Time" : remainingSeconds <= 15 * 60 ? "Prepare Handover Brief" : "On Duty Active Shift"}
          </span>
        </div>

        {/* 3. Patients Handed Over */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Handover Progress</span>
          <p className="text-2xl font-black text-slate-800 font-sans tracking-tight">
            {shiftStatusData?.latestOutgoingHandover ? shiftStatusData.latestOutgoingHandover.patientsHandedOverCount : 0}
          </p>
          <span className="text-[11px] text-slate-500 font-medium block">
            {shiftStatusData?.latestOutgoingHandover?.status === "Completed" ? "Handover Completed & Verified" : "Patients logged in handover report"}
          </span>
        </div>

        {/* 4. Supervisor Alert Status */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Handover Verification</span>
          <div className="flex items-center gap-1.5 pt-0.5">
            {shiftStatusData?.latestOutgoingHandover?.status === "Completed" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">Audit Verified</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-700">Pending Sign-off</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-medium block">
            Auto-audited for supervisor log
          </span>
        </div>
      </div>
    </div>
  );
};
