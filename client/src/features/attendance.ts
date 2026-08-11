import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type AttendanceStatus =
  | "Present"
  | "Half Day"
  | "Absent"
  | "Paid Leave"
  | "Sick Leave"
  | "Casual Leave"
  | "Earned Leave"
  | "Maternity Leave"
  | "Paternity Leave"
  | "Emergency Leave"
  | "Unpaid Leave (LOP)"
  | "Holiday"
  | "Weekly Off"
  | "Training"
  | "Official Duty";

export type ShiftType = "Morning" | "General" | "Evening" | "Night" | "Custom Shift";

export interface AttendanceAuditLog {
  _id?: string;
  updatedBy?: any;
  updatedByName?: string;
  timestamp?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
}

export interface AttendanceRecord {
  _id?: string;
  hospital: string;
  branch?: any;
  department?: any;
  employeeRef: string;
  employeeType: "Staff" | "Doctor";
  employeeId: string;
  employeeName: string;
  designation: string;
  shift: ShiftType;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  breakMinutes?: number;
  workingHours: number;
  overtimeHours: number;
  overtimeMinutes?: number;
  overtimeReason?: string;
  isLate: boolean;
  lateMinutes?: number;
  isEarlyExit: boolean;
  earlyExitMinutes?: number;
  status: AttendanceStatus;
  leaveRef?: string;
  markedBy?: any;
  remarks?: string;
  attendanceSource?: string;
  auditHistory?: AttendanceAuditLog[];
  // Manual Correction Fields
  isManuallyCorrected?: boolean;
  correctionReason?: string;
  correctionNote?: string;
  correctedBy?: { _id: string; name: string; email: string } | null;
  correctedAt?: string | null;
  previousStatus?: string;
  previousCheckIn?: string;
  previousCheckOut?: string;
  previousWorkingHours?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceCorrectionPayload {
  status?: AttendanceStatus;
  shift?: ShiftType;
  checkInTime?: string;
  checkOutTime?: string;
  breakMinutes?: number;
  workingHours?: number;
  overtimeHours?: number;
  overtimeMinutes?: number;
  overtimeReason?: string;
  remarks?: string;
  isLate?: boolean;
  isEarlyExit?: boolean;
  correctionReason: string;   // required
  correctionNote?: string;
}

export interface AttendanceFilterParams {
  date?: string;
  department?: string;
  branch?: string;
  shift?: string;
  status?: string;
  search?: string;
  employeeId?: string;
  month?: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export const CORRECTION_REASONS = [
  "Login Failure",
  "Internet Issue",
  "Browser Crash",
  "Forgot Logout",
  "System Downtime",
  "Emergency Duty",
  "Night Shift Issue",
  "Server Issue",
  "Attendance Synchronization Failure",
  "Approved by Management",
  "Other",
] as const;

export type CorrectionReason = (typeof CORRECTION_REASONS)[number];

export function useDailyAttendance(params: AttendanceFilterParams) {
  return useQuery({
    queryKey: ["attendance", "daily", params],
    queryFn: async () => {
      const res = await api.get("/attendance/daily", { params });
      return res.data.data as {
        date: string;
        total: number;
        records: AttendanceRecord[];
      };
    },
  });
}

export function useMonthlyAttendanceSummary(params: AttendanceFilterParams) {
  return useQuery({
    queryKey: ["attendance", "monthly-summary", params],
    queryFn: async () => {
      const res = await api.get("/attendance/monthly-summary", { params });
      return res.data.data as {
        month: string;
        daysInMonth: number;
        standardWorkingDays: number;
        summaries: Array<{
          employeeId: string;
          employeeName: string;
          designation: string;
          month: string;
          workingDays: number;
          presentDays: number;
          absentDays: number;
          halfDays: number;
          paidLeaveDays: number;
          unpaidLeaveDays: number;
          weeklyOffs: number;
          holidays: number;
          overtimeHours: number;
          lateArrivals: number;
          earlyExits: number;
          attendancePercentage: number;
        }>;
      };
    },
  });
}

export function useAttendanceHistory(params: AttendanceFilterParams) {
  return useQuery({
    queryKey: ["attendance", "history", params],
    queryFn: async () => {
      const res = await api.get("/attendance/history", { params });
      return res.data;
    },
  });
}

export function useMarkSingleAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AttendanceRecord>) => {
      const res = await api.post("/attendance/mark", payload);
      return res.data.data.attendance as AttendanceRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}

export function useBulkMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { date: string; records: Partial<AttendanceRecord>[] }) => {
      const res = await api.post("/attendance/bulk", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}

/**
 * Mutation hook for Admin manual attendance correction.
 * Only accessible by hospital_admin / super_admin.
 * Automatically invalidates attendance + payroll queries.
 */
export function useCorrectAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      attendanceId,
      payload,
    }: {
      attendanceId: string;
      payload: AttendanceCorrectionPayload;
    }) => {
      const res = await api.patch(`/attendance/${attendanceId}/correct`, payload);
      return res.data.data.attendance as AttendanceRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}
