import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Patient, Paginated, Invoice } from "../types/domain";

interface PatientListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

interface PatientListResponse extends Paginated<Patient> {
  counts: { total: number; admitted: number; opd: number; discharged: number; newToday: number };
}

export function usePatients(params: PatientListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["patients", params],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<PatientListResponse>("/patients", { params });
      return res.data;
    },
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ["patients", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/patients/${id}`);
      return res.data.data.patient as Patient;
    },
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Patient>) => {
      const res = await api.post("/patients", payload);
      return res.data.data.patient as Patient;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Patient>) => {
      const res = await api.patch(`/patients/${id}`, payload);
      return res.data.data.patient as Patient;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/patients/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}

interface AddMedicalHistoryPayload {
  date: string;
  visitType?: string;
  doctorName?: string;
  department?: string;
  diagnosis?: string;
  notes?: string;
  status?: string;
}

export function useAddMedicalHistory(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddMedicalHistoryPayload) => {
      const res = await api.post(`/patients/${patientId}/medical-history`, payload);
      return res.data.data.patient as Patient;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId] }),
  });
}

export function usePatientProfileMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["patients", "me"],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await api.get("/patients/me");
      return res.data.data.patient as Patient;
    },
  });
}

export function useUpdatePatientProfileMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Patient> & Record<string, any>) => {
      const res = await api.patch("/patients/me", payload);
      return res.data.data.patient as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients", "me"] });
    },
  });
}

export function usePatientInvoices() {
  return useQuery({
    queryKey: ["patients", "invoices"],
    queryFn: async () => {
      const res = await api.get("/invoices");
      return res.data.data as Invoice[];
    },
  });
}

export function usePatientReports() {
  return useQuery({
    queryKey: ["patients", "reports"],
    queryFn: async () => {
      const res = await api.get("/diagnostic-reports");
      return res.data.data as any[];
    },
  });
}
