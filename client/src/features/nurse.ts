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
      vitalId?: string;
      temperature?: string;
      bloodPressure?: string;
      pulseRate?: string;
      respiratoryRate?: string;
      oxygenSaturation?: string;
      weight?: string;
      height?: string;
      bmi?: string;
      painScore?: string;
      bloodSugar?: string;
      observationNotes?: string;
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

export function useAdministerNurseMed(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      medOrderId: string;
      action: "Administered" | "Skipped" | "Rescheduled";
      scheduledTime?: string;
      administrationTime?: string;
      remarks?: string;
    }) => {
      const res = await api.post(`/nurse/inpatients/${patientId}/medications/administer`, payload);
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

export function useSaveNurseNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      observationType: string;
      painAssessment?: string;
      mobility?: string;
      mentalStatus?: string;
      skinCondition?: string;
      fluidIntake?: string;
      output?: string;
      diet?: string;
      woundCare?: string;
      treatmentProgress?: string;
      additionalNotes?: string;
    }) => {
      const res = await api.post(`/nurse/inpatients/${patientId}/nursing-notes`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients", patientId] });
    },
  });
}

export function useUpdateNurseNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ noteId, payload }: {
      noteId: string;
      payload: {
        observationType: string;
        painAssessment?: string;
        mobility?: string;
        mentalStatus?: string;
        skinCondition?: string;
        fluidIntake?: string;
        output?: string;
        diet?: string;
        woundCare?: string;
        treatmentProgress?: string;
        additionalNotes?: string;
      };
    }) => {
      const res = await api.put(`/nurse/inpatients/${patientId}/nursing-notes/${noteId}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients", patientId] });
    },
  });
}

export function useDeleteNurseNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await api.delete(`/nurse/inpatients/${patientId}/nursing-notes/${noteId}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients", patientId] });
    },
  });
}

export function useSaveNurseBedsideChecks(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      bedPosition?: boolean;
      patientHygiene?: boolean;
      oralCare?: boolean;
      bathGiven?: boolean;
      dressingChanged?: boolean;
      ivLineChecked?: boolean;
      catheterCare?: boolean;
      pressureUlcerPrevention?: boolean;
      fallPrevention?: boolean;
      mobilityAssistance?: boolean;
      oxygenSupport?: boolean;
      nutrition?: boolean;
      fluidIntake?: boolean;
      outputMonitoring?: boolean;
      remarks?: string;
      completionStatus?: string;
    }) => {
      const res = await api.post(`/nurse/inpatients/${patientId}/bedside-checks`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients", patientId] });
    },
  });
}

export interface ShiftHandoverReport {
  _id?: string;
  currentShift: string;
  nextShift: string;
  patientsHandedOverCount: number;
  patientsHandedOverDetails: string;
  pendingMedication: string;
  pendingProcedures: string;
  criticalPatients: string;
  specialInstructions: string;
  remarks: string;
  nurseSignature: string;
  loggedByName: string;
  incomingNurseName?: string;
  timestamp: string;
  createdAt?: string;
}

export function useSaveShiftHandover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<ShiftHandoverReport, "loggedByName" | "timestamp">) => {
      const res = await api.post("/nurse/handovers", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "handovers"] });
    },
  });
}

export function useCompleteShiftHandover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      incomingNurseId: string;
      currentShift: string;
      nextShift: string;
      patientsHandedOverCount: number;
      patientsHandedOverDetails: string;
      pendingMedication?: string;
      pendingProcedures?: string;
      criticalPatients?: string;
      specialInstructions?: string;
      remarks?: string;
      nurseSignature: string;
      selectedAdmissionIds?: string[];
    }) => {
      const res = await api.post("/nurse/handovers/complete", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "handovers"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients"] });
    },
  });
}

export function useShiftHandovers(params?: {
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  shift?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["nurse", "handovers", params],
    queryFn: async () => {
      const res = await api.get<{ data: ShiftHandoverReport[] }>("/nurse/handovers", { params });
      return res.data.data;
    },
  });
}

export function useNurseShiftStatus() {
  return useQuery({
    queryKey: ["nurse", "shift-status"],
    queryFn: async () => {
      const res = await api.get("/nurse/shift-status");
      return res.data.data;
    },
    refetchInterval: 10000,
  });
}

export function useAcceptShiftHandover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (handoverId: string) => {
      const res = await api.post("/nurse/handovers/accept", { handoverId });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "handovers"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "shift-status"] });
    },
  });
}

export function useTriggerSupervisorAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post("/nurse/handovers/supervisor-alert");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "notifications"] });
    },
  });
}

export function useSaveNurseDischargePrep(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      doctorApprovalStatus: boolean;
      finalVitalSigns: boolean;
      medicationCompleted: boolean;
      patientEducationCompleted: boolean;
      pendingNursingTasks: boolean;
      medicalEquipmentReturned: boolean;
      dischargeDocumentsReady: boolean;
      wheelchairRequired: boolean;
      transportRequired: boolean;
      remarks?: string;
      status: string;
    }) => {
      const res = await api.post(`/nurse/inpatients/${patientId}/discharge-prep`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients", patientId] });
    },
  });
}

export interface NurseNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  severity: "info" | "warning" | "critical" | "danger" | "neutral";
  recipientRole: string;
  isRead: boolean;
  data?: {
    type?: string;
    patientName?: string;
    uhid?: string;
    roomNumber?: string;
    ward?: string;
    medicineName?: string;
    dosage?: string;
    scheduledTime?: string;
    dueTime?: string;
    priority?: string;
    assignedDoctor?: string;
    snoozedUntil?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function useNurseNotifications(enabled: boolean = true) {
  return useQuery({
    queryKey: ["nurse", "notifications"],
    queryFn: async () => {
      const res = await api.get<{ data: NurseNotification[] }>("/nurse/notifications");
      return res.data.data;
    },
    refetchInterval: 5000,
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/nurse/notifications/${id}/read`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post("/nurse/notifications/read-all");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "notifications"] });
    },
  });
}

export function useSnoozeNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/nurse/notifications/${id}/snooze`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "notifications"] });
    },
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/nurse/notifications/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "notifications"] });
    },
  });
}

export function useSendNoteToDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      patientId: string;
      noteContent: string;
      observationType?: string;
    }) => {
      const res = await api.post(`/nurse/notes/send-to-doctor`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse", "inpatients"] });
    },
  });
}
