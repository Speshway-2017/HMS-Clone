import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { WardInfo } from "./wards";

export interface EmbeddedRoomTariff {
  roomChargePerDay: number;
  admissionDeposit: number;
  extraBedCharge: number;
  nursingCharge: number;
  serviceCharge: number;
  emergencyCharge: number;
  discountPercent: number;
  gstPercent: number;
  effectiveFrom: string;
  status: "Active" | "Inactive";
}

export interface RoomInfo {
  _id: string;
  roomNumber: string;
  roomName: string;
  ward: string | WardInfo;
  wardName: string;
  floor: number;
  roomType: "General" | "Semi Private" | "Semi-Private" | "Private" | "Deluxe" | "Suite" | "ICU" | "NICU" | "PICU" | "Emergency" | "Isolation";
  acType: "AC" | "Non AC";
  acSubTypes?: string[];
  capacity: number;
  totalBeds?: number;
  occupiedBeds?: number;
  availableBeds?: number;
  description: string;
  status: "Available" | "Occupied" | "Cleaning" | "Maintenance" | "Blocked" | "Active" | "Inactive";
  tariff?: EmbeddedRoomTariff;
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
  const activeBranchId = localStorage.getItem("hms_active_branch_id") || "all";
  return useQuery({
    queryKey: ["rooms", params, activeBranchId],
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
  acType: string;
  acSubTypes?: string[];
  capacity: number;
  description?: string;
  status?: string;
  autoGenerateBeds?: boolean;
  tariff?: Partial<EmbeddedRoomTariff>;
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
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
    }
  });
}

export interface UpdateRoomPayload {
  roomNumber?: string;
  roomName?: string;
  wardId?: string;
  floor?: number;
  roomType?: string;
  acType?: string;
  acSubTypes?: string[];
  capacity?: number;
  description?: string;
  status?: string;
  autoGenerateBeds?: boolean;
  tariff?: Partial<EmbeddedRoomTariff>;
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
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
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
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
    }
  });
}
