import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface RoomTariffInfo {
  _id: string;
  ward: string;
  roomType: "AC" | "Non AC";
  tariff: number;
  nursingTariff: number;
  status: "Active" | "Inactive";
  effectiveDate: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export function useRoomTariffs() {
  return useQuery({
    queryKey: ["roomTariffs"],
    queryFn: async () => {
      const res = await api.get<{ data: RoomTariffInfo[] }>("/room-tariffs");
      return res.data.data;
    }
  });
}

export function useCreateRoomTariff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<RoomTariffInfo, "_id" | "createdAt" | "updatedAt">) => {
      const res = await api.post("/room-tariffs", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomTariffs"] });
    }
  });
}

export function useUpdateRoomTariff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<RoomTariffInfo> }) => {
      const res = await api.patch(`/room-tariffs/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomTariffs"] });
    }
  });
}

export function useDeleteRoomTariff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/room-tariffs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomTariffs"] });
    }
  });
}
