import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { BedInfo } from "./beds";
import { WardInfo } from "./wards";
import { RoomInfo } from "./rooms";

export function useNurseInpatients() {
  return useQuery({
    queryKey: ["nurse", "inpatients"],
    queryFn: async () => {
      const res = await api.get("/nurse/inpatients");
      return res.data.data as any[];
    },
  });
}

export function useNurseInpatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ["nurse", "inpatients", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const res = await api.get(`/nurse/inpatients/${patientId}`);
      return res.data.data;
    },
  });
}

export function useSaveNurseVitals(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vitals: {
      temperature?: string;
      bloodPressure?: string;
      pulseRate?: string;
      respiratoryRate?: string;
      oxygenSaturation?: string;
      weight?: string;
    }) => {
      const res = await api.post(`/nurse/inpatients/${patientId}/vitals`, vitals);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients", patientId] });
    },
  });
}

export function useAddNurseNotes(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { notes: string }) => {
      const res = await api.post(`/nurse/inpatients/${patientId}/notes`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients", patientId] });
    },
  });
}

export function useNurseBeds() {
  return useQuery({
    queryKey: ["beds"],
    queryFn: async () => {
      const res = await api.get<{ data: { beds: BedInfo[] } }>("/beds");
      return res.data.data.beds;
    },
  });
}

export function useNurseWards() {
  return useQuery({
    queryKey: ["wards"],
    queryFn: async () => {
      const res = await api.get<{ data: { wards: WardInfo[] } }>("/wards");
      return res.data.data.wards;
    },
  });
}

export function useNurseRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await api.get<{ data: { rooms: RoomInfo[] } }>("/rooms");
      return res.data.data.rooms;
    },
  });
}
