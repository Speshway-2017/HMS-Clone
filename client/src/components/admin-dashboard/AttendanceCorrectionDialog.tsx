import { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  AttendanceRecord,
  AttendanceCorrectionPayload,
  CORRECTION_REASONS,
  useCorrectAttendance,
} from "../../features/attendance";
import { Button } from "../ui/Button";
import { SelectField, TextareaField } from "../ui/Field";
import { api } from "../../lib/api";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
}

const STATUS_OPTIONS = [
  "Present",
  "Half Day",
  "Absent",
  "Paid Leave",
  "Sick Leave",
  "Casual Leave",
  "Earned Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Emergency Leave",
  "Unpaid Leave (LOP)",
  "Holiday",
  "Weekly Off",
  "Training",
  "Official Duty",
] as const;

const SHIFT_OPTIONS = ["Morning", "General", "Evening", "Night", "Custom Shift"] as const;

type AttendanceStatus = typeof STATUS_OPTIONS[number];

export function AttendanceCorrectionDialog({ isOpen, onClose, record }: Props) {
  const correctMutation = useCorrectAttendance();

  const [status, setStatus] = useState<AttendanceStatus>("Present");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [workingHours, setWorkingHours] = useState<number>(8);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [isLate, setIsLate] = useState(false);
  const [isEarlyExit, setIsEarlyExit] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (record) {
      setStatus((record.status as AttendanceStatus) ?? "Present");
      setCheckInTime(record.checkInTime ?? "");
      setCheckOutTime(record.checkOutTime ?? "");
      setWorkingHours(record.workingHours ?? 8);
      setOvertimeHours(record.overtimeHours ?? 0);
      setIsLate(record.isLate ?? false);
      setIsEarlyExit(record.isEarlyExit ?? false);
      setCorrectionReason("");
      setCorrectionNote("");
      setShowConfirm(false);
      setErrors({});
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!correctionReason) errs.correctionReason = "Correction reason is required. Please enter valid data";
    if (status === "Present" && !checkInTime) errs.checkInTime = "Check-in time is required for Present status. Please enter valid data";
    if (workingHours < 0) errs.workingHours = "Working hours cannot be negative. Please enter valid data";
    if (workingHours > 24) errs.workingHours = "Working hours cannot exceed 24 hours. Please enter valid data";
    if (overtimeHours < 0) errs.overtimeHours = "Overtime hours cannot be negative. Please enter valid data";
    if (overtimeHours > 12) errs.overtimeHours = "Overtime hours cannot exceed 12 hours. Please enter valid data";
    if (status === "Half Day" && workingHours > 4) errs.workingHours = "Half Day working hours cannot exceed 4 hours. Please enter valid data";
    if (overtimeHours > 0 && status !== "Present" && status !== "Half Day") {
      errs.overtimeHours = "Overtime can only be recorded for Present or Half Day. Please enter valid data";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0], { id: "correction-val-err" });
    }
    return Object.keys(errs).length === 0;
  };

  const handleReviewClick = () => {
    if (validate()) setShowConfirm(true);
  };

  const handleConfirm = async () => {
    const payload: AttendanceCorrectionPayload = {
      status,
      checkInTime: checkInTime || undefined,
      checkOutTime: checkOutTime || undefined,
      workingHours,
      overtimeHours,
      isLate,
      isEarlyExit,
      correctionReason,
      correctionNote: correctionNote || undefined,
    };
    try {
      if (record._id) {
        await correctMutation.mutateAsync({ attendanceId: record._id, payload });
      } else {
        const markRes = await api.post("/attendance/mark", {
          employeeId: record.employeeId,
          employeeType: record.employeeType,
          date: record.date,
          shift: record.shift || "General",
          status,
          checkInTime: checkInTime || (status === "Present" ? "09:00 AM" : ""),
          checkOutTime: checkOutTime || (status === "Present" ? "05:00 PM" : ""),
          workingHours,
          overtimeHours,
          isLate,
          isEarlyExit,
          remarks: correctionNote || correctionReason || "Manual Correction",
        });
        const createdId = markRes.data?.data?.attendance?._id;
        if (createdId) {
          await correctMutation.mutateAsync({ attendanceId: createdId, payload });
        }
      }
      toast.success("Manual attendance correction saved successfully!");
      setShowConfirm(false);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Correction failed. Please try again.";
      setErrors({ submit: msg });
      toast.error(msg, { id: "correction-submit-err" });
      setShowConfirm(false);
    }
  };

  const statusBadgeColor = (s: string) => {
    switch (s) {
      case "Present": return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Absent": return "bg-red-100 text-red-800 border-red-300";
      case "Half Day": return "bg-amber-100 text-amber-800 border-amber-300";
      case "Paid Leave": return "bg-sky-100 text-sky-800 border-sky-300";
      case "Unpaid Leave (LOP)": return "bg-rose-100 text-rose-800 border-rose-300";
      default: return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[95vh] border border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manual Attendance Correction</h2>
              <p className="text-xs text-amber-700 font-medium">Admin-Only Action · All changes are permanently logged</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close correction dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Employee & Current Attendance Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Employee</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{record.employeeName}</p>
              <p className="text-xs text-slate-500 font-mono">{record.employeeId}</p>
              <p className="text-xs text-slate-500">{record.designation}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Record</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-700 font-semibold">{record.date}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusBadgeColor(record.status)}`}>
                  {record.status}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                <span>{record.checkInTime || "--"} to {record.checkOutTime || "--"}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{record.attendanceSource ?? "Automatic Login"}</p>
              {record.isManuallyCorrected && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 mt-1">
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  Previously corrected · Original: {record.previousStatus || "Unknown"}
                </div>
              )}
            </div>
          </div>

          {/* Mandatory Reason */}
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">
                Correction Reason <span className="text-red-500">*</span>
              </span>
              <span className="text-xs text-amber-600">(Required)</span>
            </div>
            <SelectField
              label="Select Reason"
              value={correctionReason}
              onChange={(e) => {
                setCorrectionReason(e.target.value);
                setErrors((p) => ({ ...p, correctionReason: "" }));
              }}
              required
            >
              <option value="">Choose a correction reason...</option>
              {CORRECTION_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </SelectField>
            {errors.correctionReason && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors.correctionReason}
              </p>
            )}
            <TextareaField
              label="Additional Notes (Optional)"
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              rows={2}
              placeholder="e.g. Server was down from 9AM–10AM, employee was present but could not log in..."
            />
          </div>

          {/* Corrected Attendance Fields */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Corrected Attendance Values
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 md:col-span-1">
                <SelectField
                  label="Attendance Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectField>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Check In Time
                </label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => { setCheckInTime(e.target.value); setErrors((p) => ({ ...p, checkInTime: "" })); }}
                  placeholder="09:00 AM"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
                />
                {errors.checkInTime && <p className="mt-1 text-xs text-red-600">{errors.checkInTime}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Check Out Time
                </label>
                <input
                  type="text"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  placeholder="05:00 PM"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Working Hours
                </label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={workingHours}
                  onChange={(e) => { setWorkingHours(parseFloat(e.target.value) || 0); setErrors((p) => ({ ...p, workingHours: "" })); }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
                />
                {errors.workingHours && <p className="mt-1 text-xs text-red-600">{errors.workingHours}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Overtime Hours
                </label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  step={0.5}
                  value={overtimeHours}
                  onChange={(e) => { setOvertimeHours(parseFloat(e.target.value) || 0); setErrors((p) => ({ ...p, overtimeHours: "" })); }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
                />
                {errors.overtimeHours && <p className="mt-1 text-xs text-red-600">{errors.overtimeHours}</p>}
              </div>

              <div className="flex flex-col gap-2.5 justify-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isLate}
                    onChange={(e) => setIsLate(e.target.checked)}
                    className="rounded border-slate-300 accent-amber-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">Late Arrival</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isEarlyExit}
                    onChange={(e) => setIsEarlyExit(e.target.checked)}
                    className="rounded border-slate-300 accent-amber-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">Early Exit</span>
                </label>
              </div>
            </div>
          </div>

          {/* Payroll Info */}
          <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
            <Info className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
            <p className="text-xs text-sky-800">
              <span className="font-bold">Payroll Auto-Recalculation:</span> After saving, payroll for{" "}
              <span className="font-mono font-semibold">{record.date.slice(0, 7)}</span> will
              automatically reflect this correction. No manual refresh required.
            </p>
          </div>

          {errors.submit && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-700 font-medium">{errors.submit}</p>
            </div>
          )}

          {/* Confirmation Banner */}
          {showConfirm && (
            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-bold text-red-800">Confirm Permanent Correction</span>
              </div>
              <p className="text-xs text-red-700">
                You are about to manually correct attendance for{" "}
                <span className="font-bold">{record.employeeName}</span> on{" "}
                <span className="font-bold font-mono">{record.date}</span>.
                Status: <span className={`font-bold px-1.5 py-0.5 rounded border ${statusBadgeColor(record.status)}`}>{record.status}</span>
                {" "}&rarr;{" "}
                <span className={`font-bold px-1.5 py-0.5 rounded border ${statusBadgeColor(status)}`}>{status}</span>.
                Reason: <span className="font-bold">{correctionReason}</span>.
              </p>
              <p className="text-xs text-red-600 font-semibold">
                This action is permanently logged in the Audit Trail and cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={correctMutation.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {correctMutation.isPending ? "Saving..." : "Confirm & Save Correction"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                  disabled={correctMutation.isPending}
                >
                  Go Back
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showConfirm && (
          <div className="flex items-center justify-between p-5 border-t border-slate-200 bg-slate-50 rounded-b-2xl shrink-0">
            <p className="text-xs text-slate-500 max-w-xs">
              <span className="font-semibold text-amber-700">Admin Action:</span> Logged with your name, timestamp, and reason.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={correctMutation.isPending}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReviewClick}
                disabled={correctMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 focus-visible:outline-amber-600"
                aria-label="Review & Save Correction"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Review & Save Correction
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
