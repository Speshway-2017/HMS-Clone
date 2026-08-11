import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface LeaveRequest {
  _id: string;
  hospital: string;
  leaveId: string;
  employeeRef: string;
  employeeType: "Staff" | "Doctor";
  employeeId: string;
  employeeName: string;
  department?: any;
  leaveType:
    | "Casual Leave"
    | "Sick Leave"
    | "Earned Leave"
    | "Maternity Leave"
    | "Paternity Leave"
    | "Compensatory Leave"
    | "Unpaid Leave";
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  approvedBy?: any;
  approvalDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveFilterParams {
  status?: string;
  employeeId?: string;
  leaveType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useLeaveRequests(params: LeaveFilterParams) {
  return useQuery({
    queryKey: ["leaves", params],
    queryFn: async () => {
      const res = await api.get("/leaves", { params });
      return res.data;
    },
  });
}

export function useApplyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<LeaveRequest>) => {
      const res = await api.post("/leaves", payload);
      return res.data.data.leave as LeaveRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/leaves/${id}/approve`);
      return res.data.data.leave as LeaveRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: string; rejectionReason?: string }) => {
      const res = await api.patch(`/leaves/${id}/reject`, { rejectionReason });
      return res.data.data.leave as LeaveRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
  });
}

export function useCancelLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/leaves/${id}/cancel`);
      return res.data.data.leave as LeaveRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}
