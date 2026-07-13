import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Appointment, Patient } from "../types/domain";

export interface Queue {
  _id: string;
  hospital: string;
  tokenNumber: string;
  type: "regular" | "priority" | "emergency";
  status: "waiting" | "called" | "completed" | "skipped";
  patient: Patient | string;
  doctor: string;
  department: string;
  createdAt: string;
}

export interface DbNotification {
  _id: string;
  hospital: string;
  title: string;
  message: string;
  type: "admission_request" | "appointment" | "inventory" | "invoice" | "general";
  link: string;
  severity: "info" | "warning" | "critical";
  recipientRole: string;
  isRead: boolean;
  createdAt: string;
}

// Additional TypeScript definitions
export interface Prescription {
  _id: string;
  hospital: string;
  patient: Patient | string;
  doctor: string;
  diagnosis: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  status: "pending" | "completed";
  notes: string;
  date: string;
  createdAt: string;
}

export interface LabOrder {
  _id: string;
  hospital: string;
  patient: Patient | string;
  doctor: string;
  tests: string[];
  priority: "Routine" | "Urgent" | "STAT";
  sampleStatus: "Pending" | "Collected" | "Processing" | "Completed" | "Rejected";
  results: {
    testName: string;
    value: string;
    referenceRange: string;
    status: "normal" | "elevated" | "high" | "low" | "borderline" | "pending";
  }[];
  status: "pending" | "completed" | "rejected";
  rejectionReason?: string;
  date: string;
  createdAt: string;
}

export interface Certificate {
  _id: string;
  hospital: string;
  patient: Patient | string;
  doctor: string;
  diagnosis: string;
  duration: string;
  notes: string;
  date: string;
  createdAt: string;
}

export interface DashboardMetrics {
  todayAppointments: number;
  waitingPatients: number;
  currentInpatients: number;
  completedConsultations: number;
  pendingPrescriptions: number;
  pendingLabOrders: number;
  followupPatients: number;
  todaySurgeries: number;
  notifications: number;
  calendar: number;
}

// 1. Dashboard Metrics
export function useDoctorDashboardMetrics() {
  return useQuery({
    queryKey: ["doctorDashboard", "metrics"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DashboardMetrics }>("/doctors/dashboard/metrics");
      return res.data.data;
    },
  });
}

// 2. Today's Appointments
export function useDoctorTodayAppointments() {
  return useQuery({
    queryKey: ["doctorDashboard", "appointments", "today"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Appointment[] }>("/doctors/dashboard/appointments/today");
      return res.data.data;
    },
  });
}

// 3. Queue List & Actions
export function useDoctorQueue() {
  return useQuery({
    queryKey: ["doctorDashboard", "queue"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Queue[] }>("/doctors/dashboard/queue");
      return res.data.data;
    },
  });
}

export function useCallPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (queueId: string) => {
      const res = await api.post(`/doctors/dashboard/queue/${queueId}/call`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

export function useSkipPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (queueId: string) => {
      const res = await api.post(`/doctors/dashboard/queue/${queueId}/skip`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (queueId: string) => {
      const res = await api.post(`/doctors/dashboard/queue/${queueId}/noshow`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

// 4. Current Inpatients List & Actions
export function useDoctorInpatients() {
  return useQuery({
    queryKey: ["doctorDashboard", "inpatients"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: any[] }>("/doctors/dashboard/inpatients");
      return res.data.data;
    },
  });
}

export function useAddInpatientNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, notes, diagnosis }: { patientId: string; notes: string; diagnosis?: string }) => {
      const res = await api.post(`/doctors/dashboard/inpatients/${patientId}/notes`, { notes, diagnosis });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

// 5. Completed Consultations List
export function useDoctorCompletedConsultations() {
  return useQuery({
    queryKey: ["doctorDashboard", "consultations", "completed"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Appointment[] }>("/doctors/dashboard/consultations/completed");
      return res.data.data;
    },
  });
}

// 6. Pending Prescriptions List & Actions
export function useDoctorPendingPrescriptions() {
  return useQuery({
    queryKey: ["doctorDashboard", "prescriptions", "pending"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Prescription[] }>("/doctors/dashboard/prescriptions");
      return res.data.data;
    },
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; diagnosis: string; medicines: any[]; notes?: string }) => {
      const res = await api.post("/doctors/dashboard/prescriptions", payload);
      return res.data.data as Prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

export function useCompletePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const res = await api.post(`/doctors/dashboard/prescriptions/${prescriptionId}/complete`);
      return res.data.data as Prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

// 7. Pending Lab Orders List & Actions
export function useDoctorPendingLabOrders() {
  return useQuery({
    queryKey: ["doctorDashboard", "laboratory", "pending"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: LabOrder[] }>("/doctors/dashboard/laboratory");
      return res.data.data;
    },
  });
}

export function useCreateLabOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; tests: string[]; priority: string }) => {
      const res = await api.post("/doctors/dashboard/laboratory", payload);
      return res.data.data as LabOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

// 8. Follow-up Patients List
export function useDoctorFollowups() {
  return useQuery({
    queryKey: ["doctorDashboard", "followups"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Appointment[] }>("/doctors/dashboard/followups");
      return res.data.data;
    },
  });
}

// 9. Today's Surgeries List
export function useDoctorTodaySurgeries() {
  return useQuery({
    queryKey: ["doctorDashboard", "surgeries"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Appointment[] }>("/doctors/dashboard/surgeries");
      return res.data.data;
    },
  });
}

// 10. Notifications List
export function useDoctorNotifications() {
  return useQuery({
    queryKey: ["doctorDashboard", "notifications"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DbNotification[] }>("/doctors/dashboard/notifications");
      return res.data.data;
    },
  });
}

// 11. Calendar Schedule List
export function useDoctorCalendar() {
  return useQuery({
    queryKey: ["doctorDashboard", "calendar"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Appointment[] }>("/doctors/dashboard/calendar");
      return res.data.data;
    },
  });
}

// 12. Certificates List & Actions
export function useDoctorCertificates() {
  return useQuery({
    queryKey: ["doctorDashboard", "certificates"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Certificate[] }>("/doctors/dashboard/certificates");
      return res.data.data;
    },
  });
}

export function useCreateCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; diagnosis: string; duration: string; notes?: string }) => {
      const res = await api.post("/doctors/dashboard/certificates", payload);
      return res.data.data as Certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

// 13. Consultation Workspace Features
export interface RadiologyOrder {
  _id: string;
  hospital: string;
  patient: any;
  doctor: string;
  type: "X-ray" | "CT" | "MRI" | "Ultrasound";
  notes?: string;
  priority: "Routine" | "Urgent" | "STAT";
  status: "pending" | "completed" | "cancelled";
  resultsUrl?: string;
  findings?: string;
  date: string;
  createdAt: string;
}

export interface ConsultationWorkspaceResponse {
  appointment: Appointment;
  queueItem: Queue | null;
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  radiologyOrders: RadiologyOrder[];
  admissions: any[];
}

export function useStartConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const res = await api.post(`/doctors/dashboard/appointments/${appointmentId}/start`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

export function useConsultationWorkspace(appointmentId: string) {
  return useQuery({
    queryKey: ["doctorDashboard", "workspace", appointmentId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ConsultationWorkspaceResponse }>(
        `/doctors/dashboard/appointments/${appointmentId}/workspace`
      );
      return res.data.data;
    },
    enabled: !!appointmentId,
  });
}

export function useSaveVitals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appointmentId,
      vitals,
      chiefComplaint,
    }: {
      appointmentId: string;
      vitals: any;
      chiefComplaint: string;
    }) => {
      const res = await api.post(`/doctors/dashboard/appointments/${appointmentId}/vitals`, {
        vitals,
        chiefComplaint,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "workspace", data._id] });
    },
  });
}

export function useSaveClinicalNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appointmentId,
      diagnosis,
      symptoms,
      clinicalNotes,
      treatmentPlan,
      advice,
    }: {
      appointmentId: string;
      diagnosis: string;
      symptoms: string;
      clinicalNotes: string;
      treatmentPlan: string;
      advice: string;
    }) => {
      const res = await api.post(`/doctors/dashboard/appointments/${appointmentId}/notes`, {
        diagnosis,
        symptoms,
        clinicalNotes,
        treatmentPlan,
        advice,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "workspace", data._id] });
    },
  });
}

export function useCompleteConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const res = await api.post(`/doctors/dashboard/appointments/${appointmentId}/complete`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "workspace", data._id] });
    },
  });
}

export function useRecommendAdmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appointmentId,
      suggestedWard,
      diagnosis,
      notes,
    }: {
      appointmentId: string;
      suggestedWard: string;
      diagnosis: string;
      notes: string;
    }) => {
      const res = await api.post(`/doctors/dashboard/appointments/${appointmentId}/admission`, {
        suggestedWard,
        diagnosis,
        notes,
      });
      return res.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "workspace", variables.appointmentId] });
    },
  });
}

export function useCreateRadiologyOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appointmentId,
      patientId,
      type,
      notes,
      priority,
    }: {
      appointmentId: string;
      patientId: string;
      type: string;
      notes: string;
      priority: string;
    }) => {
      const res = await api.post(`/doctors/dashboard/appointments/${appointmentId}/radiology`, {
        patientId,
        type,
        notes,
        priority,
      });
      return res.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "workspace", variables.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "radiology", "orders"] });
    },
  });
}

export function useRadiologyOrders() {
  return useQuery({
    queryKey: ["doctorDashboard", "radiology", "orders"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: RadiologyOrder[] }>("/doctors/dashboard/radiology/list");
      return res.data.data;
    },
  });
}
