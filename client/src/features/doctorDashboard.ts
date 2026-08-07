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

export interface Prescription {
  _id: string;
  hospital: string;
  patient: Patient | string;
  doctor: any;
  department?: any;
  prescriptionNumber?: string;
  diagnosis: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  advice?: string;
  followUpDate?: string;
  medicines?: {
    name: string;
    strength?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    instructions?: string;
    status?: string;
    prescribedAt?: string;
  }[];
  medications?: {
    name: string;
    strength?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    instructions?: string;
    status?: string;
    prescribedAt?: string;
  }[];
  status: string;
  dispensedBy?: any;
  dispensedByName?: string;
  dispensedAt?: string;
  notes?: string;
  pdfUrl?: string;
  downloadUrl?: string;
  date?: string;
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

// 1b. Advanced Analytics
export function useDoctorDashboardAnalytics(filters?: { range?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ["doctorDashboard", "analytics", filters],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: any }>("/doctors/dashboard/analytics", { params: filters });
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
    mutationFn: async ({ patientId, notes, diagnosis, plan }: { patientId: string; notes: string; diagnosis?: string; plan?: string }) => {
      const res = await api.post(`/doctors/dashboard/inpatients/${patientId}/notes`, { notes, diagnosis, plan });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "inpatient", variables.patientId] });
    },
  });
}

export function useInpatientDetails(patientId: string | null) {
  return useQuery({
    queryKey: ["doctorDashboard", "inpatient", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const res = await api.get<{ status: string; data: any }>(`/doctors/dashboard/inpatients/${patientId}/details`);
      return res.data.data;
    },
    enabled: !!patientId,
  });
}

export function useAddInpatientMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      patientId, drugName, dosage, frequency, duration, route, notes
    }: {
      patientId: string; drugName: string; dosage: string; frequency: string; duration: string; route?: string; notes?: string;
    }) => {
      const res = await api.post(`/doctors/dashboard/inpatients/${patientId}/medications`, {
        drugName, dosage, frequency, duration, route, notes
      });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "inpatient", variables.patientId] });
    },
  });
}

export function useUpdateInpatientMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      patientId, medicationId, action, drugName, dosage, frequency, duration, route, notes
    }: {
      patientId: string; medicationId: string; action: "modify" | "stop" | "resume"; drugName?: string; dosage?: string; frequency?: string; duration?: string; route?: string; notes?: string;
    }) => {
      const res = await api.put(`/doctors/dashboard/inpatients/${patientId}/medications`, {
        medicationId, action, drugName, dosage, frequency, duration, route, notes
      });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "inpatient", variables.patientId] });
    },
  });
}

export function useSaveInpatientVitals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      patientId, temperature, bloodPressure, pulseRate, respiratoryRate, oxygenSaturation, weight
    }: {
      patientId: string; temperature?: string; bloodPressure?: string; pulseRate?: string; respiratoryRate?: string; oxygenSaturation?: string; weight?: string;
    }) => {
      const res = await api.post(`/doctors/dashboard/inpatients/${patientId}/vitals`, {
        temperature, bloodPressure, pulseRate, respiratoryRate, oxygenSaturation, weight
      });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "inpatient", variables.patientId] });
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
    mutationFn: async (payload: {
      appointmentId?: string;
      patientId: string;
      diagnosis: string;
      medicines?: any[];
      medications?: any[];
      notes?: string;
      advice?: string;
      followUpDate?: Date | null;
      labOrders?: string[];
      radiologyOrders?: string[];
    }) => {
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
  type: string;
  notes?: string;
  priority: "Routine" | "Urgent" | "STAT";
  status: "pending" | "completed" | "cancelled";
  resultsUrl?: string;
  findings?: string;
  date: string;
  createdAt: string;
}

export interface DraftMedication {
  name: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  morning?: boolean;
  afternoon?: boolean;
  night?: boolean;
}

export interface DraftRadiologyOrder {
  type: string;
  notes: string;
  priority: string;
}

export interface DraftAdmissionRecommendation {
  priority: "Routine" | "Urgent" | "Emergency";
  preferredWard: string;
  preferredBedType: string;
  expectedStay: string;
  primaryDiagnosis: string;
  clinicalNotes: string;
  admissionReason: string;
  specialInstructions: string;
  recommended: boolean;
}

export interface ConsultationSession {
  _id: string;
  hospital: string;
  patient: string;
  appointment: string;
  doctor: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  vitals: {
    temperature: string;
    bloodPressure: string;
    pulseRate: string;
    respiratoryRate: string;
    oxygenSaturation: string;
    weight: string;
  };
  chiefComplaint: string;
  diagnosis: string;
  symptoms: string;
  clinicalNotes: string;
  treatmentPlan: string;
  advice: string;
  prescriptions: DraftMedication[];
  labOrders: string[];
  radiologyOrders: DraftRadiologyOrder[];
  admissionRecommendation: DraftAdmissionRecommendation;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationWorkspaceResponse {
  appointment: Appointment;
  queueItem: Queue | null;
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  radiologyOrders: RadiologyOrder[];
  admissions: any[];
  admissionRequests?: any[];
  draftSession?: ConsultationSession | null;
}

export function useStartConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const res = await api.post(`/doctors/dashboard/consultations/start`, { appointmentId });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
      if (data?.appointment) {
        queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "workspace", data.appointment] });
      }
    },
  });
}

export function useConsultationDraft(appointmentId: string) {
  return useQuery({
    queryKey: ["doctorDashboard", "consultation", "draft", appointmentId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ConsultationSession | null }>(
        `/doctors/dashboard/consultations/${appointmentId}/draft`
      );
      return res.data.data;
    },
    enabled: !!appointmentId,
  });
}

export function useUpdateConsultationDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      consultationId,
      updateData,
      appointmentId,
    }: {
      consultationId: string;
      updateData: Partial<ConsultationSession>;
      appointmentId: string;
    }) => {
      const res = await api.put<{ status: string; data: ConsultationSession }>(
        `/doctors/dashboard/consultations/${consultationId}/draft`,
        updateData
      );
      return res.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "workspace", variables.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "consultation", "draft", variables.appointmentId] });
    },
  });
}

export function useCompleteConsultationSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      consultationId,
      followUpDate,
    }: {
      consultationId: string;
      followUpDate?: Date | string | null;
    }) => {
      const res = await api.post(
        `/doctors/dashboard/consultations/${consultationId}/complete`,
        { followUpDate }
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

export function useCancelConsultationSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (consultationId: string) => {
      const res = await api.post(`/doctors/dashboard/consultations/${consultationId}/cancel`);
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
    mutationFn: async (payload: {
      appointmentId: string;
      medications: any[];
      labOrders?: string[];
      radiologyOrders?: string[];
      diagnosis?: string;
      chiefComplaint?: string;
      clinicalNotes?: string;
      advice?: string;
      followUpDate?: Date | null;
    }) => {
      const { appointmentId, ...body } = payload;
      const res = await api.post(`/doctors/dashboard/appointments/${appointmentId}/complete`, body);
      return res.data;
    },
    onSuccess: (data) => {
      const apptId = data.data?._id;
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
      if (apptId) {
        queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "workspace", apptId] });
      }
    },
  });
}

export function useRecommendAdmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appointmentId,
      priority,
      preferredWard,
      preferredBedType,
      expectedStay,
      primaryDiagnosis,
      clinicalNotes,
      admissionReason,
      specialInstructions
    }: {
      appointmentId: string;
      priority: "Routine" | "Urgent" | "Emergency";
      preferredWard: string;
      preferredBedType: string;
      expectedStay: string;
      primaryDiagnosis: string;
      clinicalNotes: string;
      admissionReason: string;
      specialInstructions: string;
    }) => {
      const res = await api.post(`/admission-requests`, {
        appointmentId,
        priority,
        preferredWard,
        preferredBedType,
        expectedStay,
        primaryDiagnosis,
        clinicalNotes,
        admissionReason,
        specialInstructions
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

export function usePrescriptions(params?: { status?: string; patient?: string }) {
  return useQuery({
    queryKey: ["prescriptions", params],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: any[] }>("/prescriptions", { params });
      return res.data.data;
    },
  });
}

export function useDispensePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.patch<{ status: string; data: any }>(`/prescriptions/${id}/dispense`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useCancelPrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<{ status: string; data: unknown }>(`/prescriptions/${id}/cancel`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Doctor-scoped Patient Records
// These hooks call the SECURED endpoints that enforce doctor ownership on the
// server. They must NEVER be replaced with the generic usePatients() hook in
// doctor-role pages.
// ─────────────────────────────────────────────────────────────────────────────

export interface DoctorPatientListResponse {
  patients: import("../types/domain").Patient[];
  counts: { total: number; admitted: number; opd: number; discharged: number };
}

/**
 * Fetch only the patients assigned to the authenticated doctor.
 * Filtering is enforced at the MongoDB level — no frontend filtering.
 */
export function useDoctorPatients(params?: { search?: string; patientId?: string }) {
  return useQuery({
    queryKey: ["doctorDashboard", "myPatients", params],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DoctorPatientListResponse }>(
        "/doctors/dashboard/my-patients",
        { params },
      );
      return res.data.data;
    },
  });
}

export interface DoctorPatientDetailResponse {
  patient: import("../types/domain").Patient;
  appointments: import("../types/domain").Appointment[];
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  radiologyOrders: unknown[];
  admissions: unknown[];
}

/**
 * Fetch a single patient by ID — server enforces ownership check.
 * Returns 403 if this patient does not belong to the authenticated doctor.
 */
export function useDoctorPatientById(patientId: string | null | undefined) {
  return useQuery({
    queryKey: ["doctorDashboard", "myPatients", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DoctorPatientDetailResponse }>(
        `/doctors/dashboard/my-patients/${patientId}`,
      );
      return res.data.data;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Doctor-scoped Lab Orders
// These hooks call the SECURED endpoints that enforce doctor ownership on the
// server.
// ─────────────────────────────────────────────────────────────────────────────

export interface DoctorLabOrdersResponse {
  orders: LabOrder[];
  counts: { total: number; pending: number; completed: number; rejected: number };
}

/**
 * Fetch lab orders created by or assigned to the authenticated doctor.
 */
export function useDoctorLabOrders(params?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ["doctorDashboard", "myLabOrders", params],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DoctorLabOrdersResponse }>(
        "/doctors/dashboard/my-lab-orders",
        { params },
      );
      return res.data.data;
    },
  });
}

/**
 * Fetch a single lab order by ID with ownership validation.
 */
export function useDoctorLabOrderById(labOrderId: string | null | undefined) {
  return useQuery({
    queryKey: ["doctorDashboard", "myLabOrders", labOrderId],
    enabled: !!labOrderId,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: { order: LabOrder; report?: any; reports?: any[] } }>(
        `/doctors/dashboard/my-lab-orders/${labOrderId}`,
      );
      return res.data.data;
    },
  });
}

/**
 * Mark a doctor's notification as read.
 */
export function useMarkDoctorNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ status: string; data: { notification: any } }>(
        `/doctors/dashboard/notifications/${id}/read`
      );
      return res.data.data.notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "notifications"] });
    },
  });
}

export function useUpdatePrescriptionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch<{ status: string; data: { prescription: any } }>(
        `/prescriptions/${id}/status`,
        { status }
      );
      return res.data.data.prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    },
  });
}

export function useConsultationHistory(consultationId: string | null | undefined) {
  return useQuery({
    queryKey: ["doctorDashboard", "consultationHistory", consultationId],
    enabled: !!consultationId,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: { history: any[]; completedAt?: string; completedBy?: any; status: string } }>(
        `/doctors/dashboard/consultations/${consultationId}/history`
      );
      return res.data.data;
    },
  });
}


