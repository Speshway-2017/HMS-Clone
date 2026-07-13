import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// ── Types ──
export interface ReceptionStats {
  todayRegistrations: number;
  todayOP: number;
  todayIP: number;
  pendingPayments: number;
  completedPayments: number;
  todayCollections: number;
  todayAppointments: number;
  waitingQueue: number;
  emergencyQueue: number;
  doctorsAvailable: number;
  doctorsBusy: number;
  roomsAvailable: number;
  bedsAvailable: number;
}

export interface PatientSearchResult {
  _id: string;
  name: string;
  uhid: string;
  patientCode: string;
  phone: string;
  age: number;
  gender: string;
  bloodGroup: string;
  allergies?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
}

export interface QueueToken {
  _id: string;
  tokenNumber: string;
  type: "regular" | "priority" | "emergency";
  status: "waiting" | "called" | "completed" | "skipped";
  patient: {
    _id: string;
    name: string;
    uhid: string;
    phone: string;
    age: number;
    gender: string;
  };
  doctor: {
    _id: string;
    name: string;
    specialization: string;
  };
  department: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

export interface RoomAvailability {
  _id: string;
  roomNumber: string;
  roomType: "General" | "Semi-Private" | "Private" | "ICU";
  wardName: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  beds: {
    _id: string;
    bedNumber: string;
    isOccupied: boolean;
  }[];
}

export interface AdmissionRequest {
  _id: string;
  requestNumber?: string;
  patient?: any;
  doctor?: any;
  department?: any;
  priority?: "Routine" | "Urgent" | "Emergency";
  preferredWard?: string;
  preferredBedType?: string;
  expectedStay?: string;
  primaryDiagnosis?: string;
  clinicalNotes?: string;
  admissionReason?: string;
  specialInstructions?: string;
  status?: "Admission Requested" | "Approved" | "Admitted" | "Rejected";
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  data?: {
    patientId: string;
    opVisitId: string;
    diagnosis: string;
    suggestedWard?: string;
    suggestedRoomType?: string;
    requestId?: string;
    requestNumber?: string;
  };
  createdAt: string;
}

export interface InpatientAdmission {
  _id: string;
  patient: {
    _id: string;
    name: string;
    uhid: string;
    phone: string;
    age: number;
    gender: string;
  };
  admissionDate: string;
  ward: string;
  room: {
    _id: string;
    roomNumber: string;
    roomType: string;
  };
  bed: {
    _id: string;
    bedNumber: string;
  };
  attenderName: string;
  attenderPhone: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  advanceAmount: number;
  admissionNotes: string;
  status: "admitted" | "discharged";
}

// ── Dashboard Statistics Hook ──
export function useReceptionStats() {
  return useQuery({
    queryKey: ["reception", "stats"],
    queryFn: async () => {
      const res = await api.get<{ data: ReceptionStats }>("/reception/dashboard/stats");
      return res.data.data;
    },
    refetchInterval: 15000 // refresh stats every 15 seconds
  });
}

// ── Patient Hooks ──
export function usePatientsSearch(query: string) {
  return useQuery({
    queryKey: ["reception", "patients", "search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const res = await api.get<{ data: { patients: PatientSearchResult[] } }>("/reception/patients/search", {
        params: { query }
      });
      return res.data.data.patients;
    }
  });
}

export function usePatientsList(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: ["reception", "patients", "list", params],
    queryFn: async () => {
      const res = await api.get<{ data: PatientSearchResult[]; pagination: { total: number; totalPages: number } }>("/reception/patients/list", {
        params
      });
      return res.data;
    }
  });
}

export function useRegisterPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post<any>("/reception/patients", payload);
      return res.data.patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception", "patients"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "stats"] });
    }
  });
}

// ── Appointment Hooks ──
export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/reception/appointments", payload);
      return res.data.data; // returns appointment & invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception", "stats"] });
    }
  });
}

export function useCheckDuplicateAppointment(
  patientId: string,
  doctorId: string,
  date: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["reception", "duplicate-check", patientId, doctorId, date],
    queryFn: async () => {
      const res = await api.get<{ data: { isDuplicate: boolean; message?: string; existingAppointment?: any } }>(
        "/reception/appointments/check-duplicate",
        { params: { patientId, doctorId, date } }
      );
      return res.data.data;
    },
    enabled: enabled && !!patientId && !!doctorId && !!date,
    staleTime: 0,           // Always fresh — booking-critical data
    gcTime: 0,
    retry: false,
  });
}

// ── Billing Hooks ──
export function usePayBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { invoiceId: string; amount: number; paymentMethod: string; mixedDetails?: any }) => {
      const res = await api.post("/reception/billing/pay", payload);
      return res.data.data; // returns payment, invoice, receipt, token
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "queues"] });
    }
  });
}

// ── Queue Hooks ──
export function useReceptionQueue(date?: string) {
  return useQuery({
    queryKey: ["reception", "queues", date],
    queryFn: async () => {
      const res = await api.get<{ data: { tokens: QueueToken[] } }>("/reception/queues/today", {
        params: { date }
      });
      return res.data.data.tokens;
    },
    refetchInterval: 10000 // Poll queue every 10 seconds for TV updates
  });
}

// ── Doctors Hooks ──
export function useDoctorsAvailability() {
  return useQuery({
    queryKey: ["reception", "doctors"],
    queryFn: async () => {
      const res = await api.get<{ data: { doctors: any[] } }>("/reception/doctors/availability");
      return res.data.data.doctors;
    }
  });
}

// ── Rooms Hooks ──
export function useRoomsAvailability() {
  return useQuery({
    queryKey: ["reception", "rooms"],
    queryFn: async () => {
      const res = await api.get<{ data: { availability: RoomAvailability[] } }>("/reception/rooms/availability");
      return res.data.data.availability;
    }
  });
}

// ── Inpatient (IP) Hooks ──
export function useAdmissionRequests() {
  return useQuery({
    queryKey: ["reception", "admissions", "requests"],
    queryFn: async () => {
      const res = await api.get<{ data: { requests: AdmissionRequest[] } }>("/admission-requests", {
        params: { status: "Pending" }
      });
      return res.data.data.requests;
    },
    refetchInterval: 10000 // Poll for new admission alerts
  });
}

export function useAdmissions(status: "admitted" | "discharged" = "admitted") {
  return useQuery({
    queryKey: ["reception", "admissions", "list", status],
    queryFn: async () => {
      const res = await api.get<{ data: { admissions: InpatientAdmission[] } }>("/reception/admissions", {
        params: { status }
      });
      return res.data.data.admissions;
    }
  });
}

export function useRejectAdmissionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/admission-requests/${id}/reject`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception", "admissions", "requests"] });
    }
  });
}

export function useAdmitPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/reception/admissions", payload);
      return res.data.data.admission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception", "admissions"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "stats"] });
    }
  });
}

export function useTransferPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { admissionId: string; newRoomId: string; newBedId: string; notes?: string }) => {
      const res = await api.post("/reception/admissions/transfer", payload);
      return res.data.data.admission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception", "admissions"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
    }
  });
}

export function useRequestDischarge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { admissionId: string; notes: string }) => {
      const res = await api.post(`/reception/admissions/${payload.admissionId}/discharge`, { notes: payload.notes });
      return res.data.data.admission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception", "admissions"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "rooms"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "stats"] });
    }
  });
}

// ── Notifications Hooks ──
export function useReceptionNotifications() {
  return useQuery({
    queryKey: ["reception", "notifications"],
    queryFn: async () => {
      const res = await api.get<{ data: { notifications: any[] } }>("/reception/notifications");
      return res.data.data.notifications;
    },
    refetchInterval: 10000
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/reception/notifications/${id}/read`);
      return res.data.data.notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "admissions", "requests"] });
    }
  });
}

// ── Simulated Doctor Hooks ──
export function useSimulateCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (queueId: string) => {
      const res = await api.post(`/reception/queues/${queueId}/call`);
      return res.data.data.token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception", "queues"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "stats"] });
    }
  });
}

export function useSimulateComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { queueId: string; outcome: "op" | "ip"; notes: string; ward?: string; roomType?: string }) => {
      const res = await api.post(`/reception/queues/${payload.queueId}/complete`, {
        outcome: payload.outcome,
        notes: payload.notes,
        ward: payload.ward,
        roomType: payload.roomType
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception", "queues"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "admissions", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "stats"] });
    }
  });
}

// ── Reports Hooks ──
export function useExportReports() {
  return useQuery({
    queryKey: ["reception", "reports"],
    enabled: false, // only run manually on click
    queryFn: async () => {
      const res = await api.get<{ data: any }>("/reception/reports/summary");
      return res.data.data;
    }
  });
}

// ── Audit Log Hooks ──
export function useAuditLogs() {
  return useQuery({
    queryKey: ["reception", "audit-logs"],
    queryFn: async () => {
      const res = await api.get<{ data: { logs: any[] } }>("/reception/audit-logs");
      return res.data.data.logs;
    }
  });
}

export function useOPHistory(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: ["reception", "op-history", params],
    queryFn: async () => {
      const res = await api.get<{ data: any[]; pagination: { total: number; totalPages: number } }>("/reception/op/history", {
        params
      });
      return res.data;
    }
  });
}

export function usePatientDetails(id: string | undefined) {
  return useQuery({
    queryKey: ["reception", "patients", "one", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<{ data: { patient: any } }>(`/patients/${id}`);
      return res.data.data.patient;
    }
  });
}

// ──────────────────────────────────────────────────────────────
// Data-Consistent Hooks (same queries as dashboard stats)
// Dashboard count ALWAYS equals table row count
// ──────────────────────────────────────────────────────────────

/**
 * Pending invoices — mirrors getStats pendingPayments count.
 * GET /reception/billing/pending-invoices
 */
export function usePendingInvoices() {
  return useQuery({
    queryKey: ["reception", "billing", "pending-invoices"],
    queryFn: async () => {
      const res = await api.get<{ data: { invoices: any[]; total: number } }>("/reception/billing/pending-invoices");
      return res.data.data;
    },
    refetchInterval: 30000
  });
}

/**
 * Payment history — optionally filtered to today.
 * GET /reception/billing/payment-history?date=today
 * Mirrors getStats todayCollections when date=today.
 */
export function usePaymentHistory(filter?: "today" | "all") {
  return useQuery({
    queryKey: ["reception", "billing", "payment-history", filter],
    queryFn: async () => {
      const params: any = {};
      if (filter === "today") params.date = "today";
      const res = await api.get<{ data: { payments: any[]; total: number; totalAmount: number } }>("/reception/billing/payment-history", { params });
      return res.data.data;
    },
    refetchInterval: 30000
  });
}

/**
 * Completed (paid) invoices — mirrors getStats completedPayments count.
 * GET /reception/billing/completed-invoices
 */
export function useCompletedInvoices() {
  return useQuery({
    queryKey: ["reception", "billing", "completed-invoices"],
    queryFn: async () => {
      const res = await api.get<{ data: { invoices: any[]; total: number } }>("/reception/billing/completed-invoices");
      return res.data.data;
    },
    refetchInterval: 30000
  });
}

/**
 * Today's patient registrations — mirrors getStats todayRegistrations count.
 * GET /reception/patients/today
 */
export function useTodayRegistrations() {
  return useQuery({
    queryKey: ["reception", "patients", "today"],
    queryFn: async () => {
      const res = await api.get<{ data: { patients: any[]; total: number } }>("/reception/patients/today");
      return res.data.data;
    },
    refetchInterval: 30000
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, reason, remarks, refundRequired }: { appointmentId: string; reason: string; remarks: string; refundRequired: string }) => {
      const res = await api.post(`/reception/appointments/${appointmentId}/cancel`, {
        reason,
        remarks,
        refundRequired
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception"] });
    }
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appointmentId,
      newDate,
      newTime,
      doctorId,
      departmentId,
      reason,
      remarks
    }: {
      appointmentId: string;
      newDate: string;
      newTime: string;
      doctorId: string;
      departmentId: string;
      reason: string;
      remarks: string;
    }) => {
      const res = await api.post(`/reception/appointments/${appointmentId}/reschedule`, {
        newDate,
        newTime,
        doctorId,
        departmentId,
        reason,
        remarks
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception"] });
    }
  });
}

export function usePatientDetail(patientId: string) {
  return useQuery({
    queryKey: ["reception", "patient-detail", patientId],
    queryFn: async () => {
      const res = await api.get<{ data: { patient: any, currentConsultation: any } }>(`/reception/patients/${patientId}`);
      return res.data.data;
    },
    enabled: !!patientId
  });
}

