import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { WardInfo } from "./wards";

export interface RoomInfo {
  _id: string;
  roomNumber: string;
  roomName: string;
  ward: string | WardInfo;
  wardName: string;
  floor: number;
  roomType: "General" | "Semi-Private" | "Private" | "ICU" | "NICU" | "Emergency";
  capacity: number;
  description: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ListRoomsResponse {
  rooms: RoomInfo[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useRooms(params: { search?: string; ward?: string; status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["rooms", params],
    queryFn: async () => {
      const res = await api.get<{ data: ListRoomsResponse }>("/rooms", { params });
      return res.data.data;
    }
  });
}

export interface CreateRoomPayload {
  roomNumber: string;
  roomName?: string;
  wardId: string;
  floor: number;
  roomType: string;
  capacity: number;
  description?: string;
  status?: string;
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRoomPayload) => {
      const res = await api.post("/rooms", payload);
      return res.data.data.room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] }); // keep reception rooms list in sync
    }
  });
}

export interface UpdateRoomPayload {
  roomNumber?: string;
  roomName?: string;
  wardId?: string;
  floor?: number;
  roomType?: string;
  capacity?: number;
  description?: string;
  status?: string;
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateRoomPayload & { id: string }) => {
      const res = await api.patch(`/rooms/${id}`, payload);
      return res.data.data.room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
      queryClient.invalidateQueries({ queryKey: ["beds"] }); // bed's transit ward might change
    }
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/rooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
    }
  });
}
