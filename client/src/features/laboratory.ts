import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface DiagnosticReportFile {
  public_id: string;
  secure_url: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
}

export interface ReportVersion {
  version: number;
  observations: string;
  remarks: string;
  files: DiagnosticReportFile[];
  editedBy: any;
  editedAt: string;
}

export interface DiagnosticReport {
  _id: string;
  hospital: string;
  patient: any;
  doctor: any;
  appointment: any;
  requestType: "Laboratory" | "Radiology" | "Combined";
  requestId: string;
  testName: string;
  observations: string;
  remarks: string;
  files: DiagnosticReportFile[];
  uploadedBy: { _id: string; name: string };
  uploadedAt: string;
  status: "report_uploaded" | "verified" | "completed";
  version?: number;
  versions?: ReportVersion[];
}

export interface UnifiedRequest {
  _id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone?: string;
  patientUhid?: string;
  orderedBy: string;
  tests: string[];
  priority: "Routine" | "Urgent" | "STAT";
  date: string;
  status: "pending" | "accepted" | "processing" | "report_uploaded" | "verified" | "completed" | "rejected" | "cancelled" | "Pending" | "Sample Collection" | "Processing" | "Quality Check" | "Completed" | "Cancelled";
  paymentStatus?: "PAID" | "PAYMENT_PENDING";
  requestType: "Laboratory" | "Radiology" | "Combined";
  rejectionReason?: string;
  sampleStatus?: string;
  sampleId?: string;
  sampleType?: string;
  collectionTime?: string;
  appointment?: any;
  notes?: string;
}

export function useLaboratoryRequests() {
  return useQuery({
    queryKey: ["laboratory", "requests"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: UnifiedRequest[] }>("/laboratory/requests");
      return res.data.data;
    },
  });
}

export function useCompletedReports() {
  return useQuery({
    queryKey: ["laboratory", "completed-reports"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DiagnosticReport[] }>("/laboratory/completed-reports");
      return res.data.data;
    },
  });
}

export function useAcceptRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await api.post(`/laboratory/${requestId}/accept`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory", "requests"] });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, rejectionReason }: { requestId: string; rejectionReason: string }) => {
      const res = await api.post(`/laboratory/${requestId}/reject`, { rejectionReason });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory", "requests"] });
    },
  });
}

export function useStartProcessing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await api.post(`/laboratory/${requestId}/start-processing`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory", "requests"] });
    },
  });
}

export function useUploadReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, formData }: { requestId: string; formData: FormData }) => {
      const res = await api.post(`/laboratory/${requestId}/upload-report`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["laboratory", "completed-reports"] });
    },
  });
}

export function useEditReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, formData }: { reportId: string; formData: FormData }) => {
      const res = await api.post(`/laboratory/reports/${reportId}/edit`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory", "completed-reports"] });
      queryClient.invalidateQueries({ queryKey: ["laboratory", "requests"] });
    },
  });
}

export function useVerifyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await api.post(`/laboratory/${requestId}/verify`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["laboratory", "completed-reports"] });
    },
  });
}

export function usePublishReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await api.post(`/laboratory/${requestId}/publish`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["laboratory", "completed-reports"] });
    },
  });
}

export function useConsultationReports(consultationId: string | undefined) {
  return useQuery({
    queryKey: ["consultations", consultationId, "reports"],
    enabled: !!consultationId,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DiagnosticReport[] }>(`/consultations/${consultationId}/reports`);
      return res.data.data;
    },
  });
}

export function usePatientReports(patientId: string | undefined) {
  return useQuery({
    queryKey: ["reports", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DiagnosticReport[] }>("/diagnostic-reports", {
        params: { patientId }
      });
      return res.data.data;
    },
  });
}

export function useCollectSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, sampleId, sampleType, collectedBy, remarks }: { requestId: string; sampleId?: string; sampleType?: string; collectedBy?: string; remarks?: string }) => {
      const res = await api.post(`/laboratory/${requestId}/collect-sample`, { sampleId, sampleType, collectedBy, remarks });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory", "requests"] });
    },
  });
}

export function useSubmitResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, results }: { requestId: string; results: any[] }) => {
      const res = await api.post(`/laboratory/${requestId}/results`, { results });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory", "requests"] });
    },
  });
}
