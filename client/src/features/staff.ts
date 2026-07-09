import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Staff, Paginated } from "../types/domain";

interface StaffListParams {
  page?: number;
  role?: string;
  search?: string;
}

interface StaffListResponse extends Paginated<Staff> {
  counts: { present: number; late: number; absent: number; onLeave: number };
}

export function useStaffList(params: StaffListParams) {
  return useQuery({
    queryKey: ["staff", params],
    queryFn: async () => {
      const res = await api.get<StaffListResponse>("/staff", { params });
      return res.data;
    },
  });
}

export function useTopStaff() {
  return useQuery({
    queryKey: ["staff", "top"],
    queryFn: async () => {
      const res = await api.get("/staff/top");
      return res.data.data.staff as Staff[];
    },
  });
}

export function useStaffMember(id: string | undefined) {
  return useQuery({
    queryKey: ["staff", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/staff/${id}`);
      return res.data.data.staff as Staff;
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Staff>) => {
      const res = await api.post("/staff", payload);
      return res.data.data.staff as Staff;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Staff>) => {
      const res = await api.patch(`/staff/${id}`, payload);
      return res.data.data.staff as Staff;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/staff/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}
