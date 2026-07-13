import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { RoomInfo } from "./rooms";
import { WardInfo } from "./wards";

export interface BedInfo {
  _id: string;
  ward: string | WardInfo;
  room: string | RoomInfo;
  bedNumber: string;
  bedCode: string;
  bedType: string;
  status: "Available" | "Occupied" | "Reserved" | "Cleaning" | "Maintenance";
  isOccupied: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListBedsResponse {
  beds: BedInfo[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useBeds(params: { search?: string; ward?: string; room?: string; status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["beds", params],
    queryFn: async () => {
      const res = await api.get<{ data: ListBedsResponse }>("/beds", { params });
      return res.data.data;
    }
  });
}

export interface CreateBedPayload {
  bedNumber: string;
  roomId: string;
  bedType?: string;
  status?: string;
}

export function useCreateBed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBedPayload) => {
      const res = await api.post("/beds", payload);
      return res.data.data.bed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
    }
  });
}

export interface UpdateBedPayload {
  bedNumber?: string;
  roomId?: string;
  bedType?: string;
  status?: string;
}

export function useUpdateBed(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateBedPayload) => {
      const res = await api.patch(`/beds/${id}`, payload);
      return res.data.data.bed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
    }
  });
}

export function useDeleteBed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/beds/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
    }
  });
}
