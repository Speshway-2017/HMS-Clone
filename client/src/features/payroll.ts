import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type PayrollStatus =
  | "Draft"
  | "Calculated"
  | "Needs Recalculation"
  | "Locked"
  | "Disbursed"
  | "Paid";

export interface PayrollEmployeeSummary {
  employeeRef: string;
  employeeType: "Staff" | "Doctor";
  employeeId: string;
  employeeName: string;
  designation: string;
  department?: any;
  month: string;
  attendanceSummary: {
    workingDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    weeklyOffs: number;
    holidays: number;
    effectivePresentDays: number;
    overtimeHours: number;
    attendancePercentage: number;
    attendanceSource: string;
    lastSyncTimestamp: string;
  };
  salaryBreakdown: {
    perDaySalary: number;
    hourlyRate: number;
    basicSalary: number;
    allowances: number;
    specialAllowance: number;
    bonus: number;
    incentives: number;
    overtimePayment: number;
    grossSalary: number;
    pfDeduction: number;
    esiDeduction: number;
    professionalTax: number;
    lopDeduction: number;
    recovery: number;
    otherDeductions: number;
    totalDeductions: number;
    netSalary: number;
  };
  status: PayrollStatus;
  remarks?: string;
  paidAt?: string;
  disbursedAt?: string;
  lockedAt?: string;
  payrollRecordId?: string;
}

export function usePayrollSummary(month: string) {
  return useQuery({
    queryKey: ["payroll", "summary", month],
    queryFn: async () => {
      const res = await api.get("/payroll/summary", { params: { month } });
      return res.data.data as {
        month: string;
        syncTimestamp: string;
        employees: PayrollEmployeeSummary[];
      };
    },
  });
}

export function useRecalculatePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { month: string; employeeId?: string }) => {
      const res = await api.post("/payroll/recalculate", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}

export function useSavePayrollAdjustments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      employeeRef?: string;
      employeeType: string;
      month: string;
      specialAllowance?: number;
      bonus?: number;
      incentives?: number;
      recovery?: number;
      professionalTax?: number;
      remarks?: string;
      status?: "Draft" | "Calculated";
    }) => {
      const res = await api.post("/payroll/adjust", payload);
      return res.data.data.payrollRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}

export function useLockPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { month: string; employeeId?: string }) => {
      const res = await api.post("/payroll/lock", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}

export function useDisbursePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      employeeType: string;
      month: string;
      paymentMethod?: string;
    }) => {
      const res = await api.post("/payroll/disburse", payload);
      return res.data.data.payrollRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}

export const useProcessPayroll = useDisbursePayroll;

export function usePayslip(employeeId: string | undefined, month: string) {
  return useQuery({
    queryKey: ["payroll", "payslip", employeeId, month],
    enabled: !!employeeId && !!month,
    queryFn: async () => {
      const res = await api.get(`/payroll/payslip/${employeeId}/${month}`);
      return res.data.data.payslip;
    },
  });
}

