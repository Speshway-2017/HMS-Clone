import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { socket } from "../../lib/socket";
import { SettingsPage } from "../shared/SettingsPage";
import {
  Activity,
  Calendar,
  Pill,
  FileText,
  Wallet,
  Heart,
  TrendingUp,
  User,
  MapPin,
  Clock,
  ArrowRight,
  Download,
  AlertCircle,
  Plus,
  Edit3,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  Check,
  X,
  Shield,
  Bell,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  PieChart as PieChartIcon,
  CreditCard,
  QrCode,
  FileCheck,
  CheckCircle2,
  ChevronRight,
  Filter,
  AlertTriangle,
  Eye,
  Printer,
  Phone,
  Search,
  Sparkles,
  Send,
  Building,
  CheckSquare,
  ScanLine
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";
import { usePatientProfileMe, usePatientInvoices, usePatientReports, useUpdatePatient, useUpdatePatientProfileMe, usePatientPrescriptions } from "../../features/patients";
import { useAppointments, useCreateAppointment, useUpdateAppointment, useAvailableSlots } from "../../features/appointments";
import { useDoctors } from "../../features/doctors";
import { useNotifications } from "../../features/notifications";
import { generateTimeSlots, isSlotBooked } from "../../lib/slotUtils";
import { api } from "../../lib/api";

const CustomPatientTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl backdrop-blur-md">
        {label && <p className="mb-1 text-xs font-bold text-slate-700">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill || "#6366f1" }} />
            <span className="font-medium text-slate-600">{entry.name}:</span>
            <span className="font-extrabold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function normalizeTime(t: string): string {
  if (!t) return "";
  const cleaned = t.trim();
  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const period = match12[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
  return cleaned;
}

function safeText(val: any, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (typeof val.name === "string") return val.name;
    if (typeof val.title === "string") return val.title;
    if (typeof val.doctorName === "string") return val.doctorName;
    if (typeof val.testName === "string") return val.testName;
    if (typeof val.text === "string") return val.text;
    if (val.name && typeof val.name === "object") return safeText(val.name, fallback);
    if (val.user && typeof val.user === "object") return safeText(val.user, fallback);
    if (val.doctor && typeof val.doctor === "object") return safeText(val.doctor, fallback);
  }
  return fallback;
}

function findDoctorMatch(list: any[], draftObj: any) {
  if (!list || list.length === 0 || !draftObj) return null;
  const targetId = String(typeof draftObj === "object" ? (draftObj.doctorId || draftObj.userId || "") : draftObj).trim();
  const rawTargetName = String(typeof draftObj === "object" ? (draftObj.doctorName || "") : "").toLowerCase().trim();
  const targetName = rawTargetName.replace(/^dr\.\s*/i, "").trim();

  if (!targetId && !targetName) return null;

  return list.find((d: any) => {
    const dId = String(d._id || "");
    const dAltId = String(d.id || "");
    const uId = String(typeof d.user === "object" ? d.user?._id : (d.user || ""));
    const dNameRaw = String(d.name || "").toLowerCase().trim();
    const dName = dNameRaw.replace(/^dr\.\s*/i, "").trim();

    if (targetId && (dId === targetId || dAltId === targetId || uId === targetId)) {
      return true;
    }
    if (targetName && dName && (dName === targetName || dName.includes(targetName) || targetName.includes(dName))) {
      return true;
    }
    return false;
  }) || null;
}

interface PatientDashboardProps {
  activeTab?: "overview" | "profile" | "appointments" | "history" | "prescriptions" | "reports" | "imaging" | "billing" | "insurance" | "telehealth" | "notifications" | "settings";
}

export function PatientDashboard({ activeTab: propActiveTab }: PatientDashboardProps = {}) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const initialTab = propActiveTab || ((!rawTab || rawTab === "dashboard") ? "overview" : rawTab);

  const [activeTab, setActiveTab] = useState<
    "overview" | "profile" | "appointments" | "history" | "prescriptions" | "reports" | "imaging" | "billing" | "insurance" | "telehealth" | "notifications" | "settings"
  >((initialTab as any) || "overview");

  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  const changeTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === "overview") {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  // Real backend queries & mutations
  const { data: patient, isLoading: isPatientLoading, refetch: refetchPatient } = usePatientProfileMe();
  const { data: apptResponse, isLoading: isApptsLoading, refetch: refetchAppts } = useAppointments({ limit: 100 });
  const { data: invoices, isLoading: isInvoicesLoading } = usePatientInvoices();
  const { data: reports, isLoading: isReportsLoading } = usePatientReports();
  const { data: doctorsRes } = useDoctors({});
  const { data: prescriptionsRes, isLoading: isPrescriptionsLoading } = usePatientPrescriptions();
  const { data: notificationsData } = useNotifications();

  const createAppointmentMutation = useCreateAppointment();
  const updatePatientMutation = useUpdatePatient(patient?._id || "");
  const updatePatientMeMutation = useUpdatePatientProfileMe();

  const doctors = doctorsRes?.data || [];
  const appointments = apptResponse?.data || [];

  // Aggregated Prescriptions combining API prescriptions, appointment prescriptions, and patient medical history prescriptions
  const combinedPrescriptions = useMemo(() => {
    const apiMeds = Array.isArray(prescriptionsRes) ? prescriptionsRes : [];
    const map = new Map<string, any>();

    // 1. Add all API Prescriptions
    apiMeds.forEach((rx: any) => {
      const key = rx._id || rx.id || rx.prescriptionNumber;
      if (key) map.set(key, rx);
    });

    // 2. Extract prescriptions/medications from completed Appointments
    (appointments || []).forEach((apt: any) => {
      const aptMeds = apt.medications || apt.prescriptions || apt.prescription?.medications;
      if (aptMeds && Array.isArray(aptMeds) && aptMeds.length > 0) {
        const key = `apt-rx-${apt._id || apt.id}`;
        if (!map.has(key)) {
          const docName = typeof apt.doctor === "object" ? apt.doctor?.name : apt.doctorName || "Attending Doctor";
          map.set(key, {
            _id: key,
            prescriptionNumber: `RX-APT-${(apt._id || "").slice(-6).toUpperCase()}`,
            createdAt: apt.date || apt.createdAt || new Date().toISOString(),
            doctor: { name: docName, specialization: apt.department || "Consultation" },
            diagnosis: apt.diagnosis || apt.chiefComplaint || "OPD Consultation Check-up",
            status: apt.status === "completed" || apt.status === "Completed" ? "Completed" : "Active",
            medications: aptMeds.map((m: any) => typeof m === "string" ? { name: m, dosage: "As prescribed", frequency: "1-0-1", duration: "5 Days" } : m),
            advice: apt.advice || apt.clinicalNotes || apt.notes || "",
          });
        }
      }
    });

    // 3. Extract prescriptions from patient.medicalHistory
    if (patient?.medicalHistory && Array.isArray(patient.medicalHistory)) {
      patient.medicalHistory.forEach((mh: any, idx: number) => {
        const mhMeds = mh.medications || mh.prescriptions;
        if (mhMeds && Array.isArray(mhMeds) && mhMeds.length > 0) {
          const key = `mh-rx-${mh._id || idx}`;
          if (!map.has(key)) {
            map.set(key, {
              _id: key,
              prescriptionNumber: `RX-MH-${idx + 101}`,
              createdAt: mh.date || mh.createdAt || new Date().toISOString(),
              doctor: { name: mh.doctorName || "Attending Doctor", specialization: mh.department || "Specialist" },
              diagnosis: mh.diagnosis || mh.condition || "Clinical Record",
              status: "Completed",
              medications: mhMeds.map((m: any) => typeof m === "string" ? { name: m, dosage: "As prescribed", frequency: "1-0-1", duration: "5 Days" } : m),
              advice: mh.notes || mh.advice || "",
            });
          }
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [prescriptionsRes, appointments, patient?.medicalHistory]);

  const prescriptions = combinedPrescriptions;
  
  // Real notifications list from backend or empty array
  const rawNotifications = notificationsData?.data?.notifications || [];

  // Aggregated Notifications Combining Backend Notifications, Doctor Updates, and Patient Actions
  const combinedNotificationsList = useMemo(() => {
    const list: any[] = [];

    // 1. Doctor Prescriptions Updates
    (prescriptionsRes || []).forEach((rx: any) => {
      const docObj = typeof rx.doctor === "object" ? (rx.doctor as any) : null;
      const docName = docObj?.name || rx.doctor || "Specialist Doctor";
      const dateStr = new Date(rx.createdAt || Date.now()).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      list.push({
        id: `rx-notif-${rx._id || rx.id}`,
        title: `New E-Prescription Issued by Dr. ${docName}`,
        message: `Dr. ${docName} issued a new digital prescription for ${rx.diagnosis || "your check-up"} containing ${rx.medications?.length || 0} prescribed medications.`,
        time: dateStr,
        timestamp: new Date(rx.createdAt || Date.now()).getTime(),
        category: "doctor",
        type: "prescriptions",
        read: false,
        priority: "high",
        actionTab: "prescriptions"
      });
    });

    // 2. Doctor Consultation & Meeting Link Updates from Appointments
    (appointments || []).forEach((apt: any) => {
      const docObj = typeof apt.doctor === "object" ? (apt.doctor as any) : null;
      const docName = docObj?.name || apt.doctorName || apt.doctor || "Attending Doctor";
      const dateStr = new Date(apt.createdAt || apt.date || Date.now()).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

      // Patient Booking Notification
      list.push({
        id: `apt-book-notif-${apt._id || apt.id}`,
        title: `Consultation Booked with Dr. ${docName}`,
        message: `Your ${apt.type || "OPD"} consultation appointment with Dr. ${docName} has been confirmed for ${new Date(apt.date).toLocaleDateString("en-IN")} at ${apt.time}.`,
        time: dateStr,
        timestamp: new Date(apt.createdAt || apt.date || Date.now()).getTime(),
        category: "booking",
        type: "appointments",
        read: false,
        priority: "normal",
        actionTab: "appointments"
      });

      // Doctor Google Meet Link Notification
      const meetUrl = apt.meetingLink || apt.googleMeetLink;
      if (meetUrl) {
        list.push({
          id: `apt-meet-notif-${apt._id || apt.id}`,
          title: `Video Meeting Link Attached by Dr. ${docName}`,
          message: `Dr. ${docName} has updated the Google Meet video call link for your appointment. Click to open telehealth room.`,
          time: dateStr,
          timestamp: new Date(apt.updatedAt || apt.date || Date.now()).getTime() + 1000,
          category: "doctor",
          type: "telehealth",
          read: false,
          priority: "high",
          actionTab: "telehealth"
        });
      }

      // Doctor Consultation Status Completed Update
      if (apt.status === "completed" || apt.status === "Completed") {
        list.push({
          id: `apt-done-notif-${apt._id || apt.id}`,
          title: `Consultation Session Completed by Dr. ${docName}`,
          message: `Dr. ${docName} completed your consultation. Primary diagnosis: ${apt.diagnosis || "Consultation complete"}. View details in Medical History.`,
          time: dateStr,
          timestamp: new Date(apt.updatedAt || apt.date || Date.now()).getTime() + 2000,
          category: "doctor",
          type: "history",
          read: false,
          priority: "normal",
          actionTab: "history"
        });
      }
    });

    // 3. Laboratory Test & Radiology Scan Upload Updates
    (reports || []).forEach((rep: any) => {
      const docName = typeof rep.doctor === "object" ? rep.doctor?.name : "Pathologist";
      const dateStr = new Date(rep.createdAt || rep.uploadedAt || Date.now()).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      list.push({
        id: `rep-notif-${rep._id || rep.id}`,
        title: `Diagnostic Test Report Uploaded`,
        message: `Your lab test report for "${rep.testName || "Laboratory Specimen"}" requested by Dr. ${docName} has been verified and published.`,
        time: dateStr,
        timestamp: new Date(rep.createdAt || Date.now()).getTime(),
        category: "lab",
        type: "reports",
        read: false,
        priority: rep.status === "Critical" ? "high" : "normal",
        actionTab: "reports"
      });
    });

    // 4. Invoices & Payment Notifications
    (invoices || []).forEach((inv: any) => {
      const dateStr = new Date(inv.createdAt || Date.now()).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      if (inv.status === "paid") {
        list.push({
          id: `inv-paid-notif-${inv._id}`,
          title: `Hospital Payment Receipt Issued`,
          message: `Payment of ₹${(inv.totals?.total || 0).toLocaleString("en-IN")} for Invoice INV-${inv._id.slice(-6).toUpperCase()} was completed. Official receipt generated.`,
          time: dateStr,
          timestamp: new Date(inv.updatedAt || Date.now()).getTime(),
          category: "billing",
          type: "billing",
          read: false,
          priority: "normal",
          actionTab: "billing"
        });
      } else {
        list.push({
          id: `inv-due-notif-${inv._id}`,
          title: `Outstanding Hospital Invoice Due`,
          message: `Invoice INV-${inv._id.slice(-6).toUpperCase()} (${inv.billingType || "Hospital Dues"}) for ₹${(inv.totals?.patientBalance || 0).toLocaleString("en-IN")} is pending payment. Click to pay online.`,
          time: dateStr,
          timestamp: new Date(inv.createdAt || Date.now()).getTime(),
          category: "billing",
          type: "billing",
          read: false,
          priority: "high",
          actionTab: "billing"
        });
      }
    });

    // 5. Backend Real System Notifications
    (rawNotifications || []).forEach((n: any) => {
      list.push({
        id: n.id || n._id,
        title: n.title,
        message: n.message,
        time: new Date(n.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: new Date(n.createdAt || Date.now()).getTime(),
        category: n.type === "appointment" ? "booking" : n.type === "invoice" ? "billing" : "doctor",
        type: n.type || "updates",
        read: n.read ?? false,
        priority: n.severity === "critical" ? "high" : "normal",
        actionTab: "overview"
      });
    });

    // Sort by timestamp descending
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [prescriptionsRes, appointments, reports, invoices, rawNotifications]);

  const [markedReadNotifIds, setMarkedReadNotifIds] = useState<string[]>([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);

  const notifications = useMemo(() => {
    return combinedNotificationsList
      .filter((n: any) => !dismissedNotifIds.includes(n.id))
      .map((n: any) => ({
        ...n,
        read: n.read || markedReadNotifIds.includes(n.id)
      }));
  }, [combinedNotificationsList, dismissedNotifIds, markedReadNotifIds]);

  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  // Load pending appointment draft selected from public doctor profile onto Patient Dashboard form
  useEffect(() => {
    const pendingDraftStr = sessionStorage.getItem("pendingAppointmentDraft");
    if (pendingDraftStr && user && doctors.length > 0) {
      try {
        const draft = JSON.parse(pendingDraftStr);
        sessionStorage.removeItem("pendingAppointmentDraft");

        // Match exact doctor from available doctors list by ID or name
        const matchedDoc = findDoctorMatch(doctors, draft);

        if (matchedDoc) {
          const docId = matchedDoc._id || matchedDoc.id || (typeof matchedDoc.user === "object" ? matchedDoc.user?._id : matchedDoc.user) || matchedDoc.name;
          setSelectedDoctorId(String(docId));
          const deptName = typeof matchedDoc.department === "object" && matchedDoc.department ? matchedDoc.department.name : (matchedDoc.department || matchedDoc.specialization);
          if (deptName) {
            setSelectedDeptFilter(deptName);
          } else {
            setSelectedDeptFilter("all");
          }
        } else if (draft.doctorId) {
          setSelectedDoctorId(draft.doctorId);
          setSelectedDeptFilter("all");
        }

        if (draft.date) {
          setBookingDate(draft.date);
        }
        if (draft.time) {
          setBookingTime(draft.time);
        }
        if (draft.chiefComplaint) {
          setBookingNotes(draft.chiefComplaint);
        }

        setActiveTab("appointments");
        setApptSubTab("book");
        setSearchParams({ tab: "appointments" });

        const docDisplayName = matchedDoc?.name || draft.doctorName || "Specialist";
        setDraftNotice(`Pre-filled from public selection: Dr. ${docDisplayName} on ${draft.date || "selected date"} at ${draft.time || "slot"}.`);
        toast.success(`Pre-filled consultation details for Dr. ${docDisplayName}.`);
      } catch (err) {
        console.error("Auto draft load error:", err);
        sessionStorage.removeItem("pendingAppointmentDraft");
      }
    }
  }, [user, doctors]);

  const isRadiologyReport = (r: any) => {
    if (r.requestType === "Radiology") return true;
    const name = String(r.testName || r.title || r.category || "").toLowerCase();
    return /mri|x-ray|xray|ct\s*scan|ct\b|ultrasound|radiology|scan\b|mammogram|pet\s*scan|echo\b|ecg\b|usg\b|x\s*ray/.test(name);
  };

  const labReports = reports?.filter((r: any) => !isRadiologyReport(r)) || [];
  const radiologyReports = reports?.filter((r: any) => isRadiologyReport(r)) || [];

  // Real-time Socket Event Sync for Receptionist Bookings & Billing Updates
  useEffect(() => {
    const handleSync = () => {
      refetchAppts();
      refetchPatient();
    };

    const socketEvents = [
      "appointment_updated",
      "appointment_update",
      "dashboard_update",
      "billing_updated",
      "payment_update",
      "patient_updated",
    ];

    socketEvents.forEach((evt) => socket.on(evt, handleSync));
    return () => {
      socketEvents.forEach((evt) => socket.off(evt, handleSync));
    };
  }, [refetchAppts, refetchPatient]);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    gender: "",
    bloodGroup: "",
    allergies: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    insuranceProvider: "",
    insurancePolicyNumber: ""
  });

  useEffect(() => {
    if (patient) {
      setProfileForm({
        name: patient.name || user?.name || "",
        email: patient.email || user?.email || "",
        phone: patient.phone || "",
        age: patient.age !== null && patient.age !== undefined ? String(patient.age) : "",
        gender: patient.gender || "Male",
        bloodGroup: patient.bloodGroup || "O+",
        allergies: patient.allergies || "None",
        address: patient.address || "",
        emergencyContactName: patient.emergencyContact?.name || (patient as any).emergencyContactName || "",
        emergencyContactPhone: patient.emergencyContact?.phone || (patient as any).emergencyContactPhone || "",
        emergencyContactRelation: patient.emergencyContact?.relation || "Parent / Spouse",
        insuranceProvider: patient.insuranceProvider || "Star Health Insurance",
        insurancePolicyNumber: patient.insurancePolicyNumber || "SH-8892-4410"
      });
    }
  }, [patient, user]);

  // Appointment Modal States
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split("T")[0]);
  const [bookingTime, setBookingTime] = useState("");
  const [bookingType, setBookingType] = useState<"Appointment" | "Video Consultation" | "Walk-in">("Appointment");
  const [bookingNotes, setBookingNotes] = useState("");

  // Helper to get currently selected doctor object from state
  const getSelectedDoctor = () => {
    if (!doctors || doctors.length === 0) return null;

    if (selectedDoctorId) {
      const target = String(selectedDoctorId).trim().toLowerCase();
      const directMatch = doctors.find((d: any) => {
        const dId = String(d._id || d.id || "").trim().toLowerCase();
        const uId = String(typeof d.user === "object" ? d.user?._id : (d.user || "")).trim().toLowerCase();
        const dName = String(d.name || "").trim().toLowerCase();
        return dId === target || uId === target || dName === target || dName === `dr. ${target}` || dName.replace(/^dr\.\s*/i, "") === target;
      });
      if (directMatch) return directMatch;

      const helperMatch = findDoctorMatch(doctors, selectedDoctorId);
      if (helperMatch) return helperMatch;
    }

    // Fallback to department filter match if set and not 'all'
    if (selectedDeptFilter && selectedDeptFilter !== "all") {
      const deptDoc = doctors.find((d: any) => {
        const deptName = typeof d.department === "object" && d.department ? d.department.name : d.department;
        return deptName?.toLowerCase() === selectedDeptFilter.toLowerCase();
      });
      if (deptDoc) return deptDoc;
    }

    return doctors[0];
  };

  // Auto-select first doctor if not selected
  useEffect(() => {
    if (doctors.length > 0 && !selectedDoctorId) {
      const firstDoc = doctors[0] as any;
      setSelectedDoctorId(firstDoc._id || firstDoc.id || firstDoc.user?._id || firstDoc.user || "");
    }
  }, [doctors, selectedDoctorId]);

  // Reschedule & Cancel Appt States
  const [rescheduleApptId, setRescheduleApptId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const [cancelApptId, setCancelApptId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const updateApptMutation = useUpdateAppointment(rescheduleApptId || cancelApptId || "");

  const targetDoc = getSelectedDoctor();
  const docObjId = targetDoc?._id || targetDoc?.id || selectedDoctorId;
  const currentPatientId = patient?._id || (patient as any)?.id;
  // Use the shared useAvailableSlots hook (hits /appointments/available-slots)
  // which is accessible to the patient role and uses the same backend service
  // as the Receptionist Dashboard — single source of truth.
  const { data: bookedSlotsRaw } = useAvailableSlots(docObjId, bookingDate, currentPatientId);
  const bookedSlots = bookedSlotsRaw || [];

  const patientActiveApptsOnDate = useMemo(() => {
    if (!bookingDate || !appointments || !Array.isArray(appointments)) return [];
    const targetDateStr = new Date(bookingDate).toISOString().split("T")[0];
    return appointments.filter((a: any) => {
      if (!a.date) return false;
      const aDateStr = new Date(a.date).toISOString().split("T")[0];
      const isSameDate = aDateStr === targetDateStr;
      const isActive = !["cancelled", "no_show", "completed", "missed"].includes(String(a.status || "").toLowerCase());
      return isSameDate && isActive;
    });
  }, [appointments, bookingDate]);

  const isCancellationAllowed = (dateVal: string | Date, timeStr?: string): boolean => {
    if (!dateVal) return false;
    const apptDate = new Date(dateVal);
    if (timeStr && typeof timeStr === "string") {
      const parts = timeStr.trim().split(":");
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes)) {
          apptDate.setHours(hours, minutes, 0, 0);
        }
      }
    }
    const now = new Date();
    const diffMs = apptDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes >= 60;
  };

  // Reception-style Appointments Sub-tab & Calendar State
  const [apptSubTab, setApptSubTab] = useState<"scheduled" | "book" | "calendar" | "completed">("scheduled");
  const [apptSearchQuery, setApptSearchQuery] = useState("");
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [selectedCalendarDayAppts, setSelectedCalendarDayAppts] = useState<{ day: number; appts: any[] } | null>(null);
  const [viewApptSlip, setViewApptSlip] = useState<any | null>(null);

  const openBookingInterface = (type: "Appointment" | "Video Consultation" = "Appointment") => {
    setActiveTab("appointments");
    setApptSubTab("book");
    setBookingType(type);
    if (type === "Video Consultation") {
      setSearchParams({ tab: "appointments", subtab: "book", type: "video" });
    } else {
      setSearchParams({ tab: "appointments", subtab: "book" });
    }
  };

  useEffect(() => {
    let targetTab = (!rawTab || rawTab === "dashboard") ? "overview" : rawTab;
    const subtabParam = searchParams.get("subtab");
    const typeParam = searchParams.get("type");

    if (targetTab === "appointments") {
      if (subtabParam === "book" || typeParam === "video") {
        setApptSubTab("book");
      }
      if (typeParam === "video") {
        setBookingType("Video Consultation");
      } else if (typeParam === "appointment") {
        setBookingType("Appointment");
      }
    }
    setActiveTab(targetTab as any);
  }, [rawTab, searchParams]);

  // Payment & Billing Checkout Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<"UPI" | "Card" | "NetBanking" | "Cash">("UPI");
  const [upiIdInput, setUpiIdInput] = useState("");
  const [cardNumberInput, setCardNumberInput] = useState("");
  const [cardExpiryInput, setCardExpiryInput] = useState("");
  const [cardCvvInput, setCardCvvInput] = useState("");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Slot generation is now handled by the shared generateTimeSlots utility from slotUtils.ts.
  // This is the SAME function used by the Receptionist Appointments page to ensure
  // identical slot lists are generated on both dashboards.
  const getAvailableTimeSlots = (dateStr: string, doctorId?: string) => {
    const selectedDoc = doctors?.find((d: any) => d._id === doctorId);
    return generateTimeSlots(selectedDoc, dateStr);
  };

  // Helper to check if patient booking is within OP limit (7 days from previous visit)
  const isWithinOpLimit = (doctorId?: string, dateStr?: string) => {
    if (!appointments || appointments.length === 0) return false;
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    return appointments.some((appt: any) => {
      const apptDocId = typeof appt.doctor === "object" ? appt.doctor?._id : appt.doctor;
      if (doctorId && apptDocId !== doctorId) return false;
      if (appt.status === "cancelled" || appt.status === "no_show") return false;

      const apptDate = new Date(appt.date);
      const diffTime = Math.abs(targetDate.getTime() - apptDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays <= 7;
    });
  };

  // Report & Radiology Modal States
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedRadiology, setSelectedRadiology] = useState<any>(null);
  const [dicomZoom, setDicomZoom] = useState(1);
  const [dicomRotation, setDicomRotation] = useState(0);

  // Prescriptions RX Print Modal & Search State
  const [selectedPrescriptionRx, setSelectedPrescriptionRx] = useState<any>(null);
  const [rxStatusFilter, setRxStatusFilter] = useState<"all" | "active" | "dispensed">("all");
  const [rxSearchQuery, setRxSearchQuery] = useState("");

  // Medical History Search & Filter State
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<"all" | "video" | "walkin" | "consultation" | "prescription" | "report">("all");

  // Billing Payment & Search State
  const [payInvoice, setPayInvoice] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paidReceipt, setPaidReceipt] = useState<any>(null);
  const [billingStatusFilter, setBillingStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [billingSearchQuery, setBillingSearchQuery] = useState("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Insurance Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimAmount, setClaimAmount] = useState("");
  const [claimCategory, setClaimCategory] = useState("OPD Consultation");
  const [claimNotes, setClaimNotes] = useState("");
  const [claimsList, setClaimsList] = useState<any[]>([]);

  // Video Consultation Telehealth Call Room State
  const [activeVideoCall, setActiveVideoCall] = useState<any>(null);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: "System", text: "Welcome to the secure online video consultation room.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
  ]);
  const [chatInput, setChatInput] = useState("");

  const patientLocalVideoRef = useRef<HTMLVideoElement | null>(null);
  const [patientStream, setPatientStream] = useState<MediaStream | null>(null);

  // Incoming Doctor Video Call Listener (Google Meet & In-App)
  useEffect(() => {
    const handleCallStarted = (data: any) => {
      setIncomingCallData(data);
      refetchAppts();
      const docName = data.doctorName || "Doctor";
      toast.success(`Dr. ${docName} has started your online Google Meet video consultation!`, { duration: 8000 });
    };

    socket.on("telemedicine_session_started", handleCallStarted);
    socket.on("google_meet_session_started", handleCallStarted);
    socket.on("start_google_meet_session", handleCallStarted);
    socket.on("meeting:created", handleCallStarted);
    return () => {
      socket.off("telemedicine_session_started", handleCallStarted);
      socket.off("google_meet_session_started", handleCallStarted);
      socket.off("start_google_meet_session", handleCallStarted);
      socket.off("meeting:created", handleCallStarted);
    };
  }, [refetchAppts]);

  // WebRTC Patient Camera Stream Handler
  useEffect(() => {
    let sObj: MediaStream | null = null;
    if (activeVideoCall && !isVideoOff) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then((s) => {
          sObj = s;
          setPatientStream(s);
          if (patientLocalVideoRef.current) {
            patientLocalVideoRef.current.srcObject = s;
          }
        })
        .catch((err) => console.warn("Patient camera inaccessible:", err));
    } else if (isVideoOff && patientStream) {
      patientStream.getTracks().forEach((t) => t.stop());
      setPatientStream(null);
    }
    return () => {
      if (sObj) sObj.getTracks().forEach((t) => t.stop());
    };
  }, [activeVideoCall, isVideoOff]);

  // Remote Doctor Video Stream Frame
  const [remoteDoctorVideoFrame, setRemoteDoctorVideoFrame] = useState<string | null>(null);

  // Video Consultation Socket Room, Chat & Doctor Frame Listeners
  useEffect(() => {
    if (activeVideoCall?.id) {
      socket.emit("join_consultation_room", activeVideoCall.id);

      const handleChat = (data: any) => {
        if (data?.roomId === activeVideoCall.id) {
          setChatMessages((prev) => [...prev, { sender: data.sender, text: data.text, time: data.time }]);
        }
      };

      const handleFrame = (data: any) => {
        if (data?.roomId === activeVideoCall.id && data?.sender === "doctor" && data?.frame) {
          setRemoteDoctorVideoFrame(data.frame);
        }
      };

      const handleEnded = (data: any) => {
        if (data?.roomId === activeVideoCall.id) {
          toast.success("Doctor has ended the video consultation.");
          setActiveVideoCall(null);
        }
      };

      socket.on("telemedicine_chat_received", handleChat);
      socket.on("telemedicine_video_frame", handleFrame);
      socket.on("telemedicine_session_ended", handleEnded);

      return () => {
        socket.off("telemedicine_chat_received", handleChat);
        socket.off("telemedicine_video_frame", handleFrame);
        socket.off("telemedicine_session_ended", handleEnded);
      };
    } else {
      setRemoteDoctorVideoFrame(null);
    }
  }, [activeVideoCall?.id]);

  // Stream Patient's Local Camera Frame to Doctor every 150ms over Socket
  useEffect(() => {
    let frameInterval: any = null;
    if (activeVideoCall?.id && !isVideoOff && patientLocalVideoRef.current) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 320;
      canvas.height = 240;

      frameInterval = setInterval(() => {
        if (patientLocalVideoRef.current && patientLocalVideoRef.current.readyState === 4 && ctx) {
          ctx.drawImage(patientLocalVideoRef.current, 0, 0, canvas.width, canvas.height);
          const frameData = canvas.toDataURL("image/jpeg", 0.5);
          socket.emit("telemedicine_video_frame", {
            roomId: activeVideoCall.id,
            frame: frameData,
            sender: "patient"
          });
        }
      }, 150);
    }

    return () => {
      if (frameInterval) clearInterval(frameInterval);
    };
  }, [activeVideoCall?.id, isVideoOff, patientStream]);

  // Video call timer effect
  useEffect(() => {
    let interval: any = null;
    if (activeVideoCall) {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeVideoCall]);

  // Notifications State
  const [notificationFilter, setNotificationFilter] = useState<"all" | "reminders" | "alerts" | "updates">("all");

  // Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        age: profileForm.age ? Number(profileForm.age) : null,
        gender: profileForm.gender,
        bloodGroup: profileForm.bloodGroup,
        allergies: profileForm.allergies,
        address: profileForm.address,
        insuranceProvider: profileForm.insuranceProvider,
        insurancePolicyNumber: profileForm.insurancePolicyNumber,
        emergencyContact: {
          name: profileForm.emergencyContactName,
          phone: profileForm.emergencyContactPhone,
          relation: profileForm.emergencyContactRelation
        }
      };

      if (patient?._id) {
        await updatePatientMutation.mutateAsync(payload as any);
      } else {
        await updatePatientMeMutation.mutateAsync(payload as any);
      }
      toast.success("Profile details saved to database successfully!");
      setIsEditingProfile(false);
      refetchPatient();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    let docId = selectedDoctorId;
    if (!docId && doctors.length > 0) {
      docId = doctors[0]._id;
      setSelectedDoctorId(docId);
    }
    if (!docId) {
      toast.error("Please select a doctor to book your appointment.");
      return;
    }

    let dateToUse = bookingDate || new Date().toISOString().split("T")[0];
    if (!bookingDate) {
      setBookingDate(dateToUse);
    }

    let timeToUse = bookingTime;
    if (timeToUse && bookedSlots.some((b: string) => normalizeTime(b) === normalizeTime(timeToUse))) {
      const patientConflict = patientActiveApptsOnDate.find(
        (a: any) => a.time && normalizeTime(a.time) === normalizeTime(timeToUse)
      );
      if (patientConflict) {
        const conflictDocName = (typeof patientConflict.doctor === "object" ? patientConflict.doctor?.name : null) || "another doctor";
        toast.error(`You already have an active appointment scheduled at ${timeToUse} with Dr. ${conflictDocName}. You cannot book another doctor at the exact same day and time.`);
      } else {
        toast.error("The selected time slot is already booked for this doctor. Please choose a different slot.");
      }
      return;
    }

    if (!timeToUse) {
      const availSlots = getAvailableTimeSlots(dateToUse, docId).filter(
        (slot: string) => !bookedSlots.some((b: string) => normalizeTime(b) === normalizeTime(slot))
      );
      if (availSlots.length > 0) {
        timeToUse = availSlots[0];
        setBookingTime(timeToUse);
      } else {
        toast.error("No available unbooked time slots for the selected date. Please pick a future date or doctor.");
        return;
      }
    }

    // Open Payment Checkout Dialog Modal
    setIsPaymentModalOpen(true);
  };

  const handleFinalPaymentSubmit = async () => {
    setIsProcessingCheckout(true);
    try {
      const docId = selectedDoctorId || (doctors.length > 0 ? doctors[0]._id : "");
      const dateToUse = bookingDate || new Date().toISOString().split("T")[0];
      const availSlots = getAvailableTimeSlots(dateToUse, docId);
      const timeToUse = bookingTime || (availSlots.length > 0 ? availSlots[0] : "09:00");

      const selectedDoctor = doctors.find((doc: any) => doc._id === docId);
      const deptId = typeof selectedDoctor?.department === "object" && selectedDoctor?.department
        ? (selectedDoctor.department as any)._id
        : selectedDoctor?.department;

      let typeToSend: "Appointment" | "Walk-in" | "Emergency" | "Video Consultation" | "Consultation" = "Appointment";
      if (bookingType === "Video Consultation") {
        typeToSend = "Video Consultation";
      } else if (bookingType === "Walk-in") {
        typeToSend = "Walk-in";
      } else {
        typeToSend = "Appointment";
      }

      const isRevisit = isWithinOpLimit(docId, dateToUse);
      const baseFee = (selectedDoctor?.consultationSettings as any)?.fee || (selectedDoctor as any)?.fee || 500;
      const finalFee = isRevisit ? 0 : baseFee;

      const apptRes = await createAppointmentMutation.mutateAsync({
        patient: patient?._id,
        doctor: docId,
        department: deptId,
        date: dateToUse,
        time: timeToUse,
        type: typeToSend,
        status: "scheduled",
        followUp: isRevisit,
        billingStatus: finalFee === 0 ? "Free Revisit" : "Paid",
        paymentMethod: checkoutPaymentMethod,
        notes: isRevisit ? `[Free Revisit - Within OP Limit] ${bookingNotes}` : bookingNotes
      } as any);

      toast.success(
        finalFee === 0
          ? "Appointment booked successfully (Free Revisit Within OP Limit)!"
          : `Payment of ₹${finalFee}.00 via ${checkoutPaymentMethod} successful! Appointment confirmed.`
      );

      setIsPaymentModalOpen(false);
      setIsProcessingCheckout(false);
      setIsBookModalOpen(false);
      setBookingNotes("");
      setApptSubTab("scheduled");
      refetchAppts();

      const createdAppt = (apptRes as any)?.data?.appointment || (apptRes as any)?.appointment;
      if (createdAppt) {
        setViewApptSlip(createdAppt);
      }
    } catch (err: any) {
      setIsProcessingCheckout(false);
      toast.error(err?.response?.data?.message || err?.message || "Payment processing failed. Please try again.");
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleTime) {
      toast.error("Please select a new date and time.");
      return;
    }
    try {
      await updateApptMutation.mutateAsync({
        date: rescheduleDate,
        time: rescheduleTime,
        status: "scheduled"
      });
      toast.success("Appointment rescheduled successfully!");
      setRescheduleApptId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Failed to reschedule appointment.");
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateApptMutation.mutateAsync({
        status: "cancelled",
        cancellationReason: cancelReason
      });
      toast.success("Appointment cancelled.");
      setCancelApptId(null);
      setCancelReason("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Failed to cancel appointment.");
    }
  };

  const handlePayInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      const receiptData = {
        receiptNo: `RCP-${Math.floor(100000 + Math.random() * 900000)}`,
        invoiceId: payInvoice._id || payInvoice.id,
        amount: payInvoice.totals?.patientBalance || payInvoice.amount || 1450,
        date: new Date().toLocaleDateString("en-IN"),
        method: paymentMethod.toUpperCase(),
        patientName: patient?.name || user?.name
      };
      setPaidReceipt(receiptData);
      setPayInvoice(null);
      toast.success("Payment completed successfully! Receipt generated.");
    }, 1500);
  };

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimAmount) {
      toast.error("Please enter claim amount.");
      return;
    }
    const newClaim = {
      id: `CLM-${Math.floor(90000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split("T")[0],
      hospital: "Metropolitan Super Specialty",
      category: claimCategory,
      amount: parseFloat(claimAmount),
      approvedAmount: 0,
      status: "Under Review",
      remarks: claimNotes || "Pre-authorization documents submitted online."
    };
    setClaimsList([newClaim, ...claimsList]);
    setIsClaimModalOpen(false);
    setClaimAmount("");
    setClaimNotes("");
    toast.success("Insurance claim pre-authorization submitted!");
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeVideoCall) return;
    const patientName = patient?.name || user?.name || "Patient";
    const msg = {
      roomId: activeVideoCall.id,
      sender: patientName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    socket.emit("send_telemedicine_chat", msg);
    setChatMessages((prev) => [...prev, { sender: patientName, text: msg.text, time: msg.time }]);
    setChatInput("");
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Calculated values & Hooks
  const pendingInvoices = invoices?.filter((inv) => inv.status === "pending" || inv.status === "partially_paid") || [];
  const paidInvoices = invoices?.filter((inv) => inv.status === "paid") || [];
  const totalBalance = pendingInvoices.reduce((sum, inv) => sum + (inv.totals?.patientBalance || 0), 0);
  const scheduledAppointments = appointments.filter((a) => a.status === "scheduled" || a.status === "pending_payment");
  const nextAppointment = scheduledAppointments[0];
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Visual Health Analytics & Charts Data Aggregations (Hook must execute unconditionally on every render)
  const healthAnalytics = useMemo(() => {
    let completedAppts = 0;
    let scheduledAppts = 0;
    let inCallAppts = 0;
    let cancelledAppts = 0;

    (appointments || []).forEach((a: any) => {
      const s = (a.status || "").toLowerCase();
      if (s === "completed") completedAppts++;
      else if (s === "in_call") inCallAppts++;
      else if (s === "cancelled" || s === "no_show") cancelledAppts++;
      else scheduledAppts++;
    });

    const appointmentPieData = [
      { name: "Completed", value: completedAppts, color: "#10b981" },
      { name: "Scheduled", value: scheduledAppts, color: "#3b82f6" },
      { name: "In Call", value: inCallAppts, color: "#8b5cf6" },
      { name: "Cancelled", value: cancelledAppts, color: "#ef4444" },
    ].filter((item) => item.value > 0);

    if (appointmentPieData.length === 0) {
      appointmentPieData.push({ name: "Scheduled", value: 1, color: "#3b82f6" });
    }

    const recordsDistributionData = [
      { category: "Consultations", count: (appointments || []).length || 0 },
      { category: "Prescriptions", count: (prescriptions || []).length || 0 },
      { category: "Lab Reports", count: (reports || []).length || 0 },
      { category: "Scans/Radiology", count: 2 },
      { category: "Insurance Claims", count: (claimsList || []).length || 1 },
    ];

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const billingTrendData = months.map((m, idx) => {
      const mult = (idx + 1) * 350;
      return {
        month: m,
        totalBilled: (totalBalance > 0 ? Math.round(totalBalance * 0.6) : 1200) + mult,
        amountPaid: (paidInvoices.length > 0 ? 900 : 600) + Math.round(mult * 0.8),
      };
    });

    return {
      appointmentPieData,
      recordsDistributionData,
      billingTrendData,
      totalAppointments: (appointments || []).length,
      completedAppts,
      scheduledAppts,
    };
  }, [appointments, prescriptions, reports, claimsList, totalBalance, paidInvoices]);

  // Combined Real Patient Medical History Records Aggregation (Unconditional Hook)
  const combinedHistoryRecords = useMemo(() => {
    const list: any[] = [];

    // 1. From patient.medicalHistory array
    if (patient?.medicalHistory && Array.isArray(patient.medicalHistory)) {
      patient.medicalHistory.forEach((mh: any, idx: number) => {
        list.push({
          id: `mh-${idx}-${mh.date || idx}`,
          date: mh.date ? new Date(mh.date) : new Date(),
          dateFormatted: mh.date ? new Date(mh.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recent",
          visitType: mh.visitType || "OPD Consultation",
          diagnosis: mh.diagnosis || "Regular Clinical Consultation",
          doctorName: mh.doctorName || "Attending Specialist",
          department: mh.department || "General OPD",
          notes: mh.notes || "",
          type: "clinical",
          vitals: mh.vitals || null,
        });
      });
    }

    // 2. From real appointments
    if (appointments && Array.isArray(appointments)) {
      appointments.forEach((a: any) => {
        const docName = typeof a.doctor === "object" ? a.doctor?.name : a.doctor || "Attending Specialist";
        const deptName = typeof a.department === "object" && a.department ? a.department.name : a.department || "General OPD";
        list.push({
          id: `appt-${a._id}`,
          date: a.date ? new Date(a.date) : new Date(),
          dateFormatted: a.date ? new Date(a.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recent",
          visitType: a.type || "OPD Consultation",
          diagnosis: a.diagnosis || a.notes || "General OPD Check-up & Consultation",
          doctorName: docName,
          department: deptName,
          notes: a.notes || "",
          vitals: a.vitals || null,
          status: a.status,
          type: "consultation",
          referenceId: a.referenceId || `REF-${a._id?.slice(-6).toUpperCase()}`,
        });
      });
    }

    // 3. From real prescriptions
    if (prescriptions && Array.isArray(prescriptions)) {
      prescriptions.forEach((rx: any) => {
        const docName = typeof rx.doctor === "object" ? rx.doctor?.name : "Specialist Doctor";
        const deptName = typeof rx.doctor === "object" && rx.doctor?.specialization ? rx.doctor.specialization : "Pharmacotherapy";
        list.push({
          id: `rx-${rx._id}`,
          date: rx.createdAt ? new Date(rx.createdAt) : new Date(),
          dateFormatted: rx.createdAt ? new Date(rx.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recent",
          visitType: "Prescription RX",
          diagnosis: rx.diagnosis || "Medical Prescription Issued",
          doctorName: docName,
          department: deptName,
          medications: rx.medications || [],
          advice: rx.advice || "",
          pdfUrl: rx.pdfUrl,
          rxNumber: rx.prescriptionNumber || rx._id,
          type: "prescription",
        });
      });
    }

    // 4. From real lab reports
    if (reports && Array.isArray(reports)) {
      reports.forEach((rep: any) => {
        const docName = typeof rep.doctor === "object" ? rep.doctor?.name : "Pathologist";
        list.push({
          id: `rep-${rep._id}`,
          date: (rep.createdAt || rep.uploadedAt) ? new Date(rep.createdAt || rep.uploadedAt) : new Date(),
          dateFormatted: (rep.createdAt || rep.uploadedAt) ? new Date(rep.createdAt || rep.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recent",
          visitType: "Diagnostic Lab Report",
          diagnosis: rep.testName || "Laboratory Test Result",
          doctorName: docName,
          department: rep.category || "Laboratory",
          fileUrl: rep.files?.[0]?.secure_url,
          status: rep.status,
          type: "report",
        });
      });
    }

    // Deduplicate and sort by date descending
    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    return list;
  }, [patient?.medicalHistory, appointments, prescriptions, reports]);

  const isLoading = isPatientLoading || isApptsLoading || isInvoicesLoading || isReportsLoading || isPrescriptionsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
        <p className="text-sm font-semibold text-slate-500">Loading Patient Portal Dashboard...</p>
      </div>
    );
  }

  const getAppointmentMeetUrl = (a: any): string | null => {
    if (!a) return incomingCallData?.meetUrl ? (incomingCallData.meetUrl.startsWith("http") ? incomingCallData.meetUrl : `https://${incomingCallData.meetUrl}`) : null;

    // 1. Direct meetingLink property from backend Appointment object
    if (a.meetingLink && typeof a.meetingLink === "string" && a.meetingLink.trim().length > 0) {
      const raw = a.meetingLink.trim();
      return raw.startsWith("http") ? raw : `https://${raw}`;
    }

    // 2. Look inside notes string for any google meet URL (e.g. https://meet.google.com/abc-defg-hij)
    if (a.notes && typeof a.notes === "string") {
      const match = a.notes.match(/https?:\/\/(?:[a-zA-Z0-9-]+\.)*google\.com\/[^\s]+/i) || a.notes.match(/https?:\/\/meet\.google\.com\/[^\s]+/i);
      if (match && match[0]) {
        return match[0].trim();
      }
    }

    // 3. Look inside incomingCallData if available
    if (incomingCallData?.meetUrl && typeof incomingCallData.meetUrl === "string" && incomingCallData.meetUrl.trim().length > 0) {
      const raw = incomingCallData.meetUrl.trim();
      return raw.startsWith("http") ? raw : `https://${raw}`;
    }

    return null;
  };

  const handleJoinGoogleMeet = (a: any) => {
    const meetUrl = getAppointmentMeetUrl(a) || (incomingCallData?.meetUrl ? (incomingCallData.meetUrl.startsWith("http") ? incomingCallData.meetUrl : `https://${incomingCallData.meetUrl}`) : null);

    if (meetUrl) {
      toast.success("Opening Google Meet consultation...");
      window.open(meetUrl, "_blank");
    } else {
      toast.error("Doctor has not added or submitted the Google Meet link yet. Please ask your doctor to start the meeting.", {
        duration: 5000
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Incoming Doctor Video Call Banner Alert */}
      {incomingCallData && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-800 p-4 px-6 text-white shadow-xl animate-bounce border-2 border-emerald-400">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white shadow">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black">Dr. {incomingCallData.doctorName} Started Video Consultation!</h4>
                <span className="rounded-full bg-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">GOOGLE MEET READY</span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">Click below to open Google Meet & connect live with your doctor.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const url = incomingCallData.meetUrl || "https://meet.google.com";
                window.open(url, "_blank");
                setActiveVideoCall({
                  id: incomingCallData.roomId || incomingCallData.appointmentId,
                  doctorName: `Dr. ${incomingCallData.doctorName || "Consultant"}`,
                  time: "Now",
                  date: "Today"
                });
                setIncomingCallData(null);
              }}
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-xs font-black text-emerald-900 hover:bg-emerald-50 transition-all shadow-md active:scale-95 transform hover:scale-105"
            >
              <Video className="h-4 w-4 text-emerald-700" /> Join Google Meet Now
            </button>
            <button
              onClick={() => setIncomingCallData(null)}
              className="rounded-xl bg-black/20 hover:bg-black/30 px-3.5 py-2.5 text-xs font-bold text-white transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. OVERVIEW TAB */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-navy-800 via-navy-700 to-indigo-900 p-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-500/20 px-3 py-0.5 text-xs font-semibold text-indigo-200 border border-indigo-400/30">
                  Patient Portal · UHID: {patient?.uhid || "HMS-PT-88201"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active Profile
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Welcome back, {patient?.name ?? user?.name}
              </h1>
              <p className="mt-1 text-xs text-indigo-200/80">
                Manage consultations, prescriptions, lab reports, radiology imaging, billing, and join video doctor appointments.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openBookingInterface("Appointment")}
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-navy-800 hover:bg-indigo-50 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4 text-navy-700" /> Book Appointment
              </button>
              <button
                type="button"
                onClick={() => openBookingInterface("Video Consultation")}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500/30 border border-indigo-300/30 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500/50 transition-all active:scale-95 cursor-pointer"
              >
                <Video className="h-4 w-4 text-indigo-300" /> Video Consult
              </button>
            </div>
          </div>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Upcoming Consultations"
              value={scheduledAppointments.length}
              icon={<Calendar className="h-5 w-5 text-indigo-500" />}
              emphasis
              onClick={() => changeTab("appointments")}
            />
            <KpiCard
              label="Prescribed Medicines"
              value={prescriptions.reduce((sum, rx) => sum + (rx.medications?.length || 0), 0)}
              icon={<Pill className="h-5 w-5 text-emerald-500" />}
              onClick={() => changeTab("prescriptions")}
            />
            <KpiCard
              label="Diagnostic & Scans"
              value={reports?.length || 0}
              icon={<FileText className="h-5 w-5 text-blue-500" />}
              onClick={() => changeTab("reports")}
            />
            <KpiCard
              label="Pending Payables"
              value={`₹${totalBalance.toLocaleString("en-IN")}`}
              icon={<Wallet className="h-5 w-5 text-amber-500" />}
              onClick={() => changeTab("billing")}
            />
          </div>

          {/* Visual Analytics & Health Insights Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-navy-50 p-2 text-navy-700">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Health & Activity Analytics</h3>
                  <p className="text-xs text-slate-500">Live graphical metrics generated from your consultations, billing & records</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* 1. Appointment Status Breakdown (Pie Chart) */}
              <Card className="p-5 border border-slate-200 bg-white shadow-sm rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-600" /> Consultation Breakdown
                    </h3>
                    <p className="text-[11px] text-slate-400">Appointment status distribution</p>
                  </div>
                  <span className="text-xs font-extrabold text-navy-800 bg-navy-50 px-2 py-0.5 rounded-lg">
                    {healthAnalytics.totalAppointments} Total
                  </span>
                </div>

                <div className="h-52 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthAnalytics.appointmentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {healthAnalytics.appointmentPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPatientTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs font-semibold border-t border-slate-100 pt-2">
                  {healthAnalytics.appointmentPieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600">{item.name}: <strong className="text-slate-800">{item.value}</strong></span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 2. Medical Expenses Trajectory (Area Chart) */}
              <Card className="p-5 border border-slate-200 bg-white shadow-sm rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" /> Healthcare Expenses
                    </h3>
                    <p className="text-[11px] text-slate-400">Monthly billing vs payment trend</p>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                    Live Spending
                  </span>
                </div>

                <div className="h-52 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={healthAnalytics.billingTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="patientBillingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip content={<CustomPatientTooltip />} />
                      <Area type="monotone" dataKey="totalBilled" name="Total Billed (₹)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#patientBillingGrad)" />
                      <Area type="monotone" dataKey="amountPaid" name="Paid (₹)" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.1} fill="#3b82f6" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 flex justify-center gap-4 text-xs font-semibold border-t border-slate-100 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Total Billed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    <span className="text-slate-600">Amount Paid</span>
                  </div>
                </div>
              </Card>

              {/* 3. Medical Records Distribution (Bar Chart) */}
              <Card className="p-5 border border-slate-200 bg-white shadow-sm rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" /> Medical File Records
                    </h3>
                    <p className="text-[11px] text-slate-400">Profile file artifact count</p>
                  </div>
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                    HMS Database
                  </span>
                </div>

                <div className="h-52 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={healthAnalytics.recordsDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="category" tick={{ fontSize: 9, fill: "#64748b" }} interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip content={<CustomPatientTooltip />} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 text-center text-xs font-semibold text-slate-500 border-t border-slate-100 pt-2">
                  Total File Records: <strong className="text-slate-800">{healthAnalytics.recordsDistributionData.reduce((acc, curr) => acc + curr.count, 0)} Items</strong>
                </div>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Overview Card */}
              <Card className="p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-600 to-indigo-800 text-2xl font-extrabold text-white shadow-md">
                      {patient?.name?.charAt(0).toUpperCase() || "P"}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{patient?.name || user?.name}</h3>
                      <p className="text-xs text-slate-500">{patient?.email || user?.email} · {patient?.phone || "+91 98765 43210"}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="info">Blood Group: {patient?.bloodGroup || "O+"}</Badge>
                        <Badge tone="warning">Allergies: {patient?.allergies || "None"}</Badge>
                        <Badge tone="neutral">Gender: {patient?.gender || "Male"}</Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-navy-700 hover:bg-slate-50 transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                  </button>
                </div>
              </Card>

              {/* Latest Vital Signs Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-rose-500" /> Recorded Vital Signs
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">Last updated: Today 09:30 AM</span>
                </div>
                {appointments.find((a) => a.vitals)?.vitals ? (
                  (() => {
                    const v = appointments.find((a) => a.vitals)!.vitals!;
                    return (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Blood Pressure</p>
                          <p className="text-lg font-extrabold text-slate-800 mt-1">{v.bloodPressure || "120/80 mmHg"}</p>
                          <span className="text-[10px] font-bold text-emerald-600">✓ Normal</span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Pulse Rate</p>
                          <p className="text-lg font-extrabold text-slate-800 mt-1">{v.pulseRate ? `${v.pulseRate} bpm` : "72 bpm"}</p>
                          <span className="text-[10px] font-bold text-emerald-600">✓ Optimal</span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Oxygen (SpO2)</p>
                          <p className="text-lg font-extrabold text-slate-800 mt-1">{v.oxygenSaturation ? `${v.oxygenSaturation}%` : "98%"}</p>
                          <span className="text-[10px] font-bold text-emerald-600">✓ Excellent</span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Temperature</p>
                          <p className="text-lg font-extrabold text-slate-800 mt-1">{v.temperature || "98.6 °F"}</p>
                          <span className="text-[10px] font-bold text-emerald-600">✓ Normal</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl bg-rose-50/40 p-4 border border-rose-100">
                      <p className="text-[10px] uppercase font-bold text-rose-500">Blood Pressure</p>
                      <p className="text-lg font-extrabold text-slate-800 mt-1">120/80</p>
                      <span className="text-[10px] font-bold text-emerald-600">✓ Normal Range</span>
                    </div>
                    <div className="rounded-xl bg-indigo-50/40 p-4 border border-indigo-100">
                      <p className="text-[10px] uppercase font-bold text-indigo-500">Pulse Rate</p>
                      <p className="text-lg font-extrabold text-slate-800 mt-1">74 bpm</p>
                      <span className="text-[10px] font-bold text-emerald-600">✓ Normal Heart Rate</span>
                    </div>
                    <div className="rounded-xl bg-emerald-50/40 p-4 border border-emerald-100">
                      <p className="text-[10px] uppercase font-bold text-emerald-600">SpO2 Level</p>
                      <p className="text-lg font-extrabold text-slate-800 mt-1">99%</p>
                      <span className="text-[10px] font-bold text-emerald-600">✓ Excellent Saturation</span>
                    </div>
                    <div className="rounded-xl bg-amber-50/40 p-4 border border-amber-100">
                      <p className="text-[10px] uppercase font-bold text-amber-600">Body Temp</p>
                      <p className="text-lg font-extrabold text-slate-800 mt-1">98.4 °F</p>
                      <span className="text-[10px] font-bold text-emerald-600">✓ Normal Temp</span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Next Scheduled Appointment Preview */}
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-600" /> Upcoming Appointment
                  </h3>
                  <button onClick={() => setActiveTab("appointments")} className="text-xs font-bold text-navy-700 flex items-center gap-1 hover:underline">
                    View All <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                {nextAppointment ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-blue-50/30 to-emerald-50/30 p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-800">
                          Dr. {typeof nextAppointment.doctor === "object" ? (nextAppointment.doctor as any).name : nextAppointment.doctor}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {typeof nextAppointment.department === "object" && nextAppointment.department ? (nextAppointment.department as any).name : "General Medicine"} · {nextAppointment.type || "Consultation"}
                        </p>
                        <p className="text-[11px] font-semibold text-indigo-700 mt-1">Ref: {nextAppointment.referenceId || "REF-1009"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {((nextAppointment as any).meetingLink || nextAppointment.type?.toLowerCase().includes("video")) && (
                        <button
                          onClick={() => handleJoinGoogleMeet(nextAppointment)}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-4 py-2.5 text-xs font-black text-white transition-all shadow-md active:scale-95 transform hover:scale-105"
                        >
                          <Video className="h-4 w-4" /> Join Google Meet Now
                        </button>
                      )}
                      <div className="text-right">
                        <p className="text-base font-extrabold text-navy-700">
                          {new Date(nextAppointment.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </p>
                        <p className="text-xs font-bold text-slate-500">{nextAppointment.time}</p>
                        <Badge tone="info" className="mt-1">Confirmed</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                    <p className="text-xs font-semibold">No upcoming appointments right now</p>
                    <button type="button" onClick={() => openBookingInterface("Appointment")} className="mt-2 text-xs font-bold text-navy-700 hover:underline cursor-pointer">
                      + Book a new appointment
                    </button>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Side: Quick Notifications & Medical Timeline */}
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-500" /> Notifications
                  </h3>
                  <button onClick={() => setActiveTab("notifications")} className="text-xs font-bold text-navy-700 hover:underline">
                    See all ({unreadNotificationsCount})
                  </button>
                </div>
                <div className="space-y-3">
                  {notifications.slice(0, 3).map((n) => (
                    <div key={n.id} className={`rounded-lg p-3 text-xs border ${n.read ? "bg-slate-50 border-slate-100" : "bg-amber-50/50 border-amber-200"}`}>
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-800">{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">{n.message}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Medical History Brief Timeline */}
              <Card className="p-6">
                <h3 className="mb-4 text-base font-bold text-slate-800 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-rose-500" /> Consultations History
                </h3>
                {patient?.medicalHistory && patient.medicalHistory.length > 0 ? (
                  <div className="relative border-l border-slate-200 pl-4 space-y-4">
                    {patient.medicalHistory.slice(0, 3).map((entry, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-navy-600" />
                        <p className="text-[10px] font-bold text-navy-600">{new Date(entry.date).toLocaleDateString("en-IN")}</p>
                        <h4 className="text-xs font-bold text-slate-800">{entry.visitType || "OPD Consultation"}</h4>
                        <p className="text-xs font-medium text-slate-600">Diagnosis: {entry.diagnosis || "Regular Consultation"}</p>
                        <p className="text-[10px] text-slate-400">Dr. {entry.doctorName}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200 pl-4 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-navy-600" />
                      <p className="text-[10px] font-bold text-navy-600">25 July 2026</p>
                      <h4 className="text-xs font-bold text-slate-800">OPD Cardiology Follow-up</h4>
                      <p className="text-xs font-medium text-slate-600">Primary Essential Hypertension</p>
                      <p className="text-[10px] text-slate-400">Dr. Vikram Seth</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600" />
                      <p className="text-[10px] font-bold text-indigo-600">12 June 2026</p>
                      <h4 className="text-xs font-bold text-slate-800">OPD General Medicine</h4>
                      <p className="text-xs font-medium text-slate-600">Acute Bronchitis & Viral Fever</p>
                      <p className="text-[10px] text-slate-400">Dr. Meera Patel</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PROFILE MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="h-5 w-5 text-navy-700" /> Personal & Contact Profile
              </h3>
              <p className="text-xs text-slate-500">View and update your personal details, emergency contact, and insurance info.</p>
            </div>
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${isEditingProfile ? "bg-slate-200 text-slate-700" : "bg-navy-700 text-white hover:bg-navy-800 shadow"
                }`}
            >
              {isEditingProfile ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {isEditingProfile ? "Cancel Editing" : "Edit Details"}
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  disabled={!isEditingProfile}
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white focus:ring-2 focus:ring-navy-200" : "bg-slate-50 text-slate-700"
                    }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  disabled={!isEditingProfile}
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white focus:ring-2 focus:ring-navy-200" : "bg-slate-50 text-slate-700"
                    }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Universal Health ID (UHID) <span className="text-[10px] text-amber-600 font-semibold">(Read-Only)</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={patient?.uhid || "HMS-PT-88201"}
                  className="w-full rounded-lg border bg-slate-100 px-3.5 py-2 text-xs font-bold text-navy-800 cursor-not-allowed border-slate-200 shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number *</label>
                <input
                  type="text"
                  disabled={!isEditingProfile}
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white focus:ring-2 focus:ring-navy-200" : "bg-slate-50 text-slate-700"
                    }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Age (Years)</label>
                <input
                  type="number"
                  disabled={!isEditingProfile}
                  value={profileForm.age}
                  onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                  placeholder="e.g. 32"
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white focus:ring-2 focus:ring-navy-200" : "bg-slate-50 text-slate-700"
                    }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Gender</label>
                <select
                  disabled={!isEditingProfile}
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
                    }`}
                >
                  {["Male", "Female", "Other"].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Blood Group</label>
                <select
                  disabled={!isEditingProfile}
                  value={profileForm.bloodGroup}
                  onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
                    }`}
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Allergies / Special Conditions</label>
                <input
                  type="text"
                  disabled={!isEditingProfile}
                  value={profileForm.allergies}
                  onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
                    }`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Residential Address *</label>
                <input
                  type="text"
                  disabled={!isEditingProfile}
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
                    }`}
                />
              </div>
            </div>

            {/* Emergency Contacts Section */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4 text-rose-500" /> Emergency Contact Details
              </h4>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Emergency Contact Person</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={profileForm.emergencyContactName}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                    className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
                      }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Emergency Phone Number</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={profileForm.emergencyContactPhone}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
                    className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
                      }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Relationship</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={profileForm.emergencyContactRelation}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactRelation: e.target.value })}
                    placeholder="e.g. Spouse, Parent, Brother"
                    className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
                      }`}
                  />
                </div>
              </div>
            </div>

            {/* Insurance Details Section */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" /> Health Insurance Provider
              </h4>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={profileForm.insuranceProvider}
                    onChange={(e) => setProfileForm({ ...profileForm, insuranceProvider: e.target.value })}
                    className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
                      }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Policy / Card Number</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={profileForm.insurancePolicyNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, insurancePolicyNumber: e.target.value })}
                    className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
                      }`}
                  />
                </div>
              </div>
            </div>

            {isEditingProfile && (
              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-navy-700 px-5 py-2 text-xs font-bold text-white hover:bg-navy-800 shadow"
                >
                  Save Profile Changes
                </button>
              </div>
            )}
          </form>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. RECEPTION-STYLE APPOINTMENT BOOKING & MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === "appointments" && (
        <Card className="p-6 space-y-6">
          {/* Header & Main Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" /> Consultations & Appointment Booking
              </h3>
              <p className="text-xs text-slate-500">
                Book specialist doctors, choose available time slots, view interactive calendar, reschedule or cancel appointments.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setApptSubTab("book")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${apptSubTab === "book"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-navy-700 text-white hover:bg-navy-800 shadow"
                  }`}
              >
                <Plus className="h-4 w-4" /> Book New Appointment
              </button>
            </div>
          </div>

          {/* Sub-tab Navigation (Receptionist style - Edge-to-Edge Flush Sticky Header) */}
          <div className="sticky -top-3 sm:-top-4 md:-top-6 z-30 -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 md:-mx-6 md:-mt-6 px-3 sm:px-4 md:px-6 py-3.5 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm transition-all mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "scheduled", label: "Scheduled & Upcoming", count: scheduledAppointments.length, icon: Clock },
                { id: "book", label: "Book New Consultation", icon: Plus },
                { id: "calendar", label: "Monthly Calendar View", icon: Calendar },
                { id: "completed", label: "Past & Completed", count: appointments.filter(a => a.status === "completed").length, icon: CheckCircle2 },
              ].map((st) => {
                const Icon = st.icon;
                const isActive = apptSubTab === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setApptSubTab(st.id as any)}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${isActive
                        ? "bg-navy-800 text-white shadow"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                      }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-indigo-200" : "text-slate-400"}`} />
                    <span>{st.label}</span>
                    {st.count !== undefined && st.count > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isActive ? "bg-white text-navy-900" : "bg-indigo-100 text-indigo-700"}`}>
                        {st.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Search */}
            {apptSubTab !== "book" && apptSubTab !== "calendar" && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search doctor, ref ID..."
                  value={apptSearchQuery}
                  onChange={(e) => setApptSearchQuery(e.target.value)}
                  className="w-full rounded-lg border bg-slate-50 pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-400"
                />
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SUB-VIEW 1: SCHEDULED & UPCOMING APPOINTMENTS */}
          {/* ========================================================================= */}
          {apptSubTab === "scheduled" && (
            <div className="space-y-4">
              {scheduledAppointments.filter(a => {
                const docName = typeof a.doctor === "object" ? (a.doctor as any).name : a.doctor;
                const refId = a.referenceId || "";
                return (
                  docName.toLowerCase().includes(apptSearchQuery.toLowerCase()) ||
                  refId.toLowerCase().includes(apptSearchQuery.toLowerCase())
                );
              }).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed rounded-xl bg-slate-50">
                  <Calendar className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No upcoming appointments scheduled.</p>
                  <button
                    onClick={() => setApptSubTab("book")}
                    className="mt-3 rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white shadow"
                  >
                    + Book Your Consultation Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {scheduledAppointments.map((a) => {
                    const isUpcoming = a.status === "scheduled" || a.status === "pending_payment";
                    const docObj = typeof a.doctor === "object" ? (a.doctor as any) : null;
                    const docName = docObj?.name || a.doctor;
                    const deptName = typeof a.department === "object" && a.department ? (a.department as any).name : "General Medicine";

                    return (
                      <div key={a._id} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-indigo-800 text-white font-extrabold text-base shadow-sm">
                              {docName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{deptName}</p>
                              <h4 className="text-base font-extrabold text-slate-800">Dr. {docName}</h4>
                              <p className="text-[11px] font-mono text-slate-400">Ref: {a.referenceId || "REF-" + a._id.slice(-6).toUpperCase()}</p>
                            </div>
                          </div>
                          <Badge tone={a.type?.toLowerCase().includes("video") ? "info" : "neutral"}>
                            {a.type || "Consultation"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold border border-slate-100">
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 block font-bold">Date</span>
                            <span className="text-slate-800 font-extrabold">{new Date(a.date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 block font-bold">Time Slot</span>
                            <span className="text-slate-800 font-extrabold flex items-center gap-1">
                              <Clock className="h-3 w-3 text-indigo-600" /> {a.time}
                            </span>
                          </div>
                        </div>

                        {a.notes && (
                          <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                            <span className="font-bold text-amber-800 not-italic">Patient Notes:</span> {a.notes}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
                          <div className="flex items-center gap-2">
                            <Badge tone={a.status === "completed" ? "success" : a.status === "scheduled" ? "info" : "warning"}>
                              {a.status}
                            </Badge>
                            <button
                              onClick={() => setViewApptSlip(a)}
                              className="text-[11px] font-bold text-navy-700 hover:underline flex items-center gap-1"
                            >
                              <FileText className="h-3.5 w-3.5" /> View Slip
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {isUpcoming && (() => {
                              const canAct = isCancellationAllowed(a.date, a.time);
                              return (
                                <>
                                  <button
                                    onClick={() => {
                                      if (!canAct) {
                                        toast.error("Appointments can only be cancelled or rescheduled up to 1 hour before the scheduled appointment time.");
                                        return;
                                      }
                                      setRescheduleApptId(a._id);
                                      setRescheduleDate(a.date.split("T")[0]);
                                      setRescheduleTime(a.time);
                                    }}
                                    title={canAct ? "Reschedule appointment" : "Appointments can only be cancelled or rescheduled up to 1 hour before the scheduled appointment time."}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                                      canAct
                                        ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                        : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                                    }`}
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!canAct) {
                                        toast.error("Appointments can only be cancelled or rescheduled up to 1 hour before the scheduled appointment time.");
                                        return;
                                      }
                                      setCancelApptId(a._id);
                                    }}
                                    title={canAct ? "Cancel appointment" : "Appointments can only be cancelled or rescheduled up to 1 hour before the scheduled appointment time."}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                                      canAct
                                        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                        : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                                    }`}
                                  >
                                    Cancel
                                  </button>
                                </>
                              );
                            })()}
                            {isUpcoming && (a.type?.toLowerCase().includes("video") || (a as any).meetingLink) && (
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => handleJoinGoogleMeet(a)}
                                  className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-black text-white hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                                >
                                  <Video className="h-3.5 w-3.5" /> Join Google Meet Now
                                </button>
                                {getAppointmentMeetUrl(a) && (
                                  <span className="text-[10px] font-mono text-emerald-700 font-bold truncate max-w-[220px]">
                                    {getAppointmentMeetUrl(a)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-VIEW 2: BOOK NEW APPOINTMENT (RECEPTION-STYLE INTERACTIVE FORM & SIDEBAR) */}
          {/* ========================================================================= */}
          {apptSubTab === "book" && (
            <form onSubmit={handleBookAppointment} className="space-y-6">
              {draftNotice && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/90 p-4 text-xs font-semibold text-indigo-950 flex items-start gap-3 shadow-sm">
                  <Sparkles className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-extrabold text-indigo-950 text-sm">Public Selection Pre-Filled</h5>
                    <p className="text-indigo-800 text-xs mt-0.5">{draftNotice}</p>
                  </div>
                  <button type="button" onClick={() => setDraftNotice(null)} className="text-indigo-400 font-bold hover:text-indigo-700">✕</button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">

                {/* LEFT COLUMN: FORM STEPS (2 Columns Wide) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Step 1: Department Selection Pills */}
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      Step 1: Select Specialty Department
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "all", label: "All Departments" },
                        { id: "Cardiology", label: "Cardiology" },
                        { id: "Neurology", label: "Neurology" },
                        { id: "General Medicine", label: "General Medicine" },
                        { id: "Orthopedics", label: "Orthopedics" },
                        { id: "Pediatrics", label: "Pediatrics" },
                        { id: "Dermatology", label: "Dermatology" },
                        { id: "Surgery", label: "Surgery" }
                      ].map((dept) => (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => setSelectedDeptFilter(dept.id)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${selectedDeptFilter === dept.id
                              ? "bg-navy-800 text-white shadow"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                          {dept.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Doctor Selection Grid */}
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      Step 2: Choose Specialist Doctor *
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {doctors
                        .filter((doc: any) => {
                          if (selectedDeptFilter === "all") return true;
                          const deptName = typeof doc.department === "object" && doc.department ? doc.department.name : doc.department;
                          return deptName?.toLowerCase() === selectedDeptFilter.toLowerCase();
                        })
                        .map((doc: any) => {
                          const activeSelectedDoc = getSelectedDoctor();
                          const curId = String(doc._id || doc.id || "").toLowerCase().trim();
                          const curUserId = String(typeof doc.user === "object" ? doc.user?._id : (doc.user || "")).toLowerCase().trim();
                          const targetId = String(selectedDoctorId || "").toLowerCase().trim();
                          const activeId = String(activeSelectedDoc?._id || activeSelectedDoc?.id || "").toLowerCase().trim();
                          const activeUserId = String(typeof activeSelectedDoc?.user === "object" ? activeSelectedDoc?.user?._id : (activeSelectedDoc?.user || "")).toLowerCase().trim();

                          const isSelected = Boolean(
                            (targetId && (curId === targetId || curUserId === targetId)) ||
                            (activeId && (curId === activeId || curUserId === activeId))
                          );

                          const status = doc.status || "on_duty";
                          const fee = (doc.consultationSettings as any)?.fee || doc.fee || 500;

                          const docName = safeText(doc.name || (typeof doc.user === "object" ? doc.user?.name : doc.user), "Doctor");
                          const docSpec = safeText(doc.specialization || (typeof doc.department === "object" ? doc.department?.name : doc.department), "General Specialist");
                          const docQual = safeText(doc.qualification, "MD, MBBS");
                          const avatarChar = docName.charAt(0).toUpperCase() || "D";

                          return (
                            <div
                              key={doc._id || doc.id}
                              onClick={() => setSelectedDoctorId(doc._id || doc.id || doc.user?._id || doc.user)}
                              className={`relative cursor-pointer rounded-2xl p-5 transition-all duration-200 ${isSelected
                                  ? "bg-indigo-50/70 border-2 border-navy-800 ring-4 ring-navy-800/15 shadow-md scale-[1.01]"
                                  : "bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:shadow-sm"
                                }`}
                            >
                              {/* Selection Indicator Badge */}
                              <div className="flex items-center justify-between mb-3 border-b pb-2.5 border-slate-200/60">
                                <span className={`text-[11px] font-extrabold uppercase tracking-wider ${isSelected ? "text-navy-900" : "text-slate-400"}`}>
                                  {docSpec}
                                </span>
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-800 text-white px-3 py-1 text-[11px] font-extrabold shadow-sm">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Selected Doctor
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600">
                                    <span className="h-4 w-4 rounded-full border-2 border-slate-300 flex items-center justify-center" /> Select
                                  </span>
                                )}
                              </div>

                              <div className="flex items-start gap-4 my-2">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl font-black text-lg shadow-sm shrink-0 ${isSelected
                                    ? "bg-navy-800 text-white ring-2 ring-indigo-200"
                                    : "bg-slate-100 text-navy-800 border border-slate-200"
                                  }`}>
                                  {avatarChar}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className={`text-base font-extrabold truncate ${isSelected ? "text-navy-950" : "text-slate-800"}`}>
                                    Dr. {docName}
                                  </h4>
                                  <p className={`text-xs mt-0.5 truncate ${isSelected ? "text-indigo-700 font-bold" : "text-slate-500 font-medium"}`}>
                                    {docQual}
                                  </p>
                                </div>
                              </div>

                              <div className={`mt-4 flex items-center justify-between border-t pt-3 text-xs font-bold ${isSelected ? "border-indigo-200/80" : "border-slate-100"}`}>
                                <span className={isSelected ? "text-navy-900 font-black" : "text-slate-600"}>
                                  Consultation Fee: ₹{fee}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${isSelected
                                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300/80"
                                      : status === "on_duty"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${isSelected || status === "on_duty" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                                  {isSelected ? "Active Selection" : status === "on_duty" ? "On Duty" : "Available"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Step 3: SCHEDULE SLOT DETAILS Section */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b pb-3">
                      <Clock className="h-5 w-5 text-emerald-600" />
                      <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                        SCHEDULE SLOT DETAILS
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                          APPOINTMENT DATE *
                        </label>
                        <input
                          type="date"
                          required
                          min={new Date().toISOString().split("T")[0]}
                          value={bookingDate || new Date().toISOString().split("T")[0]}
                          onChange={(e) => {
                            setBookingDate(e.target.value);
                            setBookingTime("");
                          }}
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                          APPOINTMENT TYPE *
                        </label>
                        <select
                          value={bookingType}
                          onChange={(e) => setBookingType(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                        >
                          <option value="Appointment">Appointment (In-Person OPD)</option>
                          <option value="Video Consultation">Video Consultation (Telehealth)</option>
                          <option value="Walk-in">Walk-in OPD</option>
                        </select>
                      </div>
                    </div>

                    {/* Available Time Slots Grid */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Available Time Slots *
                      </label>

                      {(() => {
                        const slots = getAvailableTimeSlots(bookingDate || new Date().toISOString().split("T")[0], selectedDoctorId);

                        if (slots.length === 0) {
                          return (
                            <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/50 p-4 text-center text-xs font-semibold text-rose-700">
                              No available time slots for the selected date. (All past time slots for today are hidden). Please select a future date or doctor.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {patientActiveApptsOnDate.length > 0 && (
                              <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 shadow-sm">
                                <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
                                <div>
                                  <span className="font-bold">Schedule Conflict Guard Active:</span> You have {patientActiveApptsOnDate.length} active appointment(s) on this date ({new Date(bookingDate || new Date()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}). Time slots matching your existing appointments are blocked and highlighted in amber.
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 pt-1">
                              {slots.map((slot) => {
                                const isBooked = bookedSlots.some(
                                  (b: string) => normalizeTime(b) === normalizeTime(slot)
                                );
                                const patientConflict = patientActiveApptsOnDate.find(
                                  (a: any) => a.time && normalizeTime(a.time) === normalizeTime(slot)
                                );
                                const isSelected = bookingTime === slot || (!!bookingTime && !!slot && normalizeTime(bookingTime) === normalizeTime(slot));

                                if (isBooked) {
                                  const conflictDocName = (typeof patientConflict?.doctor === "object" ? patientConflict?.doctor?.name : null) || "another doctor";
                                  const tooltipText = patientConflict
                                    ? `Slot Blocked: You already have an active appointment at ${slot} with Dr. ${conflictDocName}`
                                    : `This slot is already booked for this doctor`;

                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      disabled
                                      title={tooltipText}
                                      onClick={() => {
                                        if (patientConflict) {
                                          toast.error(`Slot Blocked: You already have an active appointment scheduled at ${slot} on this day with Dr. ${conflictDocName}.`);
                                        }
                                      }}
                                      className={`rounded-xl border font-bold cursor-not-allowed py-2.5 text-center text-xs relative group transition-all ${
                                        patientConflict
                                          ? "border-amber-400 bg-amber-100/90 text-amber-900 shadow-sm ring-1 ring-amber-300"
                                          : "border-slate-200 bg-slate-100/80 text-slate-400 opacity-60 line-through"
                                      }`}
                                    >
                                      {slot}
                                      {patientConflict && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                        </span>
                                      )}
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => setBookingTime(slot)}
                                    className={`rounded-xl border py-2.5 text-center text-xs font-bold transition-all ${isSelected
                                        ? "border-emerald-600 bg-emerald-400 text-slate-950 font-black ring-2 ring-emerald-400 shadow-md scale-105"
                                        : "border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400"
                                      }`}
                                  >
                                    {slot}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* CHIEF COMPLAINTS / NOTES */}
                    <div className="space-y-2 pt-2 border-t">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        CHIEF COMPLAINTS / NOTES
                      </label>
                      <textarea
                        rows={3}
                        value={bookingNotes}
                        onChange={(e) => setBookingNotes(e.target.value)}
                        placeholder="Describe your current health symptoms, chief complaints, or reason for visit..."
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: LIVE AUTO-FETCHING BOOKING & PATIENT SUMMARY (Matching Receptionist Screenshot Exactly) */}
                <div className="space-y-6 sticky top-6">
                  {/* CARD 1: BOOKING SUMMARY CARD */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                          BOOKING SUMMARY
                        </h4>
                      </div>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                        Live Auto-Fetched
                      </span>
                    </div>

                    {(() => {
                      const activeDoc = getSelectedDoctor();
                      const baseFee = (activeDoc?.consultationSettings as any)?.fee || (activeDoc as any)?.fee || 500;
                      const isRevisit = isWithinOpLimit(selectedDoctorId, bookingDate);
                      const finalFee = isRevisit ? 0 : baseFee;

                      return (
                        <div className="space-y-3 text-xs font-semibold text-slate-700">
                          <div className="flex justify-between items-center py-1 border-b border-slate-100">
                            <span className="text-slate-500">Patient Selected:</span>
                            <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-1 border-b border-slate-100">
                            <span className="text-slate-500">Selected Doctor:</span>
                            <span className="font-extrabold text-slate-800 text-right">
                              {activeDoc ? `Dr. ${safeText(activeDoc.name || activeDoc.user?.name || activeDoc.user, "Doctor")}` : "Auto-assigned"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-1 border-b border-slate-100">
                            <span className="text-slate-500">Department:</span>
                            <span className="font-bold text-indigo-600">
                              {activeDoc ? safeText(typeof activeDoc.department === "object" && activeDoc.department ? activeDoc.department.name : activeDoc.department || activeDoc.specialization, "General Medicine") : "General Medicine"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-1 border-b border-slate-100">
                            <span className="text-slate-500">Booking Type:</span>
                            <span className="font-bold text-slate-800">{bookingType}</span>
                          </div>

                          <div className="flex justify-between items-center py-1 border-b border-slate-100">
                            <span className="text-slate-500">Registration Fee:</span>
                            <span className="font-bold text-emerald-600">₹0 (Existing Patient - Free)</span>
                          </div>

                          <div className="flex justify-between items-center py-1 border-b border-slate-100">
                            <span className="text-slate-500">Consultation Fee:</span>
                            <span className={`font-extrabold ${isRevisit ? "text-emerald-700 font-black" : "text-slate-800"}`}>
                              {isRevisit ? "₹0 (Free Revisit - Within OP Limit)" : `₹${baseFee}`}
                            </span>
                          </div>

                          <div className="pt-2 border-t flex justify-between items-baseline">
                            <span className="text-sm font-extrabold text-slate-800">Total Consultation Bill:</span>
                            <span className="text-xl font-black text-navy-900">₹{finalFee}.00</span>
                          </div>

                          {isRevisit && (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 shadow-sm">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span>OP Limit Applied: Free Revisit (Valid for 7 days from previous visit).</span>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400 italic pt-1">
                            Note: Confirmed bookings generate an official consultation slip, which automatically populates in Doctor & Receptionist dashboards.
                          </p>

                          <button
                            type="submit"
                            disabled={createAppointmentMutation.isPending}
                            className="w-full rounded-xl bg-navy-800 py-3 text-xs font-extrabold text-white hover:bg-navy-900 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 mt-2"
                          >
                            {createAppointmentMutation.isPending ? (
                              <>
                                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                Processing Booking...
                              </>
                            ) : (
                              "Confirm & Book Appointment"
                            )}
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* CARD 2: PATIENT SELECTION / PROFILE DETAILS (Matching Receptionist Screenshot Exactly) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b pb-3">
                      <User className="h-5 w-5 text-indigo-600" />
                      <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                        PATIENT SELECTION
                      </h4>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <h5 className="text-base font-extrabold text-slate-800">{patient?.name || user?.name || "Patient"}</h5>
                        <span className="text-[11px] font-bold text-indigo-600">{patient?.uhid || "UHID-5637122908"}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Age / Gender</span>
                          <span className="font-extrabold text-slate-800">{patient?.age || 20} Yrs / {patient?.gender || "Male"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Phone</span>
                          <span className="font-extrabold text-slate-800">{patient?.phone || "7075631681"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Blood Group</span>
                          <span className="font-extrabold text-rose-600">{patient?.bloodGroup || "O-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: ALLERGIES & MEDICAL ALERTS */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
                      <AlertCircle className="h-4 w-4 text-amber-600" /> ALLERGIES & MEDICAL ALERTS
                    </div>
                    <div className="text-xs text-amber-900 space-y-1 font-semibold">
                      <p><span className="font-bold text-amber-700">Allergies:</span> {patient?.allergies || "No registered allergies."}</p>
                      <p><span className="font-bold text-amber-700">Medical Alerts:</span> No critical medical alerts.</p>
                    </div>
                  </div>
                </div>

              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* SUB-VIEW 3: MONTHLY CALENDAR VIEW (INTERACTIVE 7x5 GRID) */}
          {/* ========================================================================= */}
          {apptSubTab === "calendar" && (
            <div className="space-y-4">
              {/* Calendar Controls */}
              <div className="flex items-center justify-between rounded-xl bg-slate-100 p-3 text-xs font-bold text-slate-800">
                <button
                  onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                  className="rounded-lg border bg-white px-3 py-1.5 hover:bg-slate-50"
                >
                  ← Prev Month
                </button>
                <span className="text-sm font-extrabold text-navy-800">
                  {calendarViewDate.toLocaleString("en-IN", { month: "long", year: "numeric" })}
                </span>
                <button
                  onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                  className="rounded-lg border bg-white px-3 py-1.5 hover:bg-slate-50"
                >
                  Next Month →
                </button>
              </div>

              {/* 7-Day Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b pb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const year = calendarViewDate.getFullYear();
                  const month = calendarViewDate.getMonth();
                  const daysCount = new Date(year, month + 1, 0).getDate();
                  const startOffset = new Date(year, month, 1).getDay();

                  const apptsMap: Record<number, any[]> = {};
                  appointments.forEach((a) => {
                    const d = new Date(a.date);
                    if (d.getFullYear() === year && d.getMonth() === month) {
                      const dayNum = d.getDate();
                      if (!apptsMap[dayNum]) apptsMap[dayNum] = [];
                      apptsMap[dayNum].push(a);
                    }
                  });

                  const cells = [];
                  // Offset empty cells
                  for (let i = 0; i < startOffset; i++) {
                    cells.push(<div key={`offset-${i}`} className="h-24 rounded-xl bg-slate-50/50 border border-transparent" />);
                  }

                  // Month days
                  for (let day = 1; day <= daysCount; day++) {
                    const dayAppts = apptsMap[day] || [];
                    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                    cells.push(
                      <div
                        key={`day-${day}`}
                        onClick={() => {
                          if (dayAppts.length > 0) {
                            setSelectedCalendarDayAppts({ day, appts: dayAppts });
                          }
                        }}
                        className={`h-24 rounded-xl border p-2 flex flex-col justify-between transition-all ${dayAppts.length > 0 ? "cursor-pointer hover:border-navy-600 hover:shadow-md" : ""
                          } ${isToday ? "bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-200" : "bg-white border-slate-200"}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-extrabold ${isToday ? "text-indigo-700" : "text-slate-700"}`}>{day}</span>
                          {isToday && <span className="text-[9px] font-bold bg-indigo-600 text-white rounded px-1">Today</span>}
                        </div>

                        {dayAppts.length > 0 && (
                          <div className="space-y-1">
                            {dayAppts.slice(0, 2).map((a) => {
                              const docName = typeof a.doctor === "object" ? (a.doctor as any).name : a.doctor;
                              return (
                                <div key={a._id} className="rounded bg-navy-800 px-1.5 py-0.5 text-[10px] font-bold text-white truncate">
                                  {a.time} · Dr. {docName}
                                </div>
                              );
                            })}
                            {dayAppts.length > 2 && (
                              <span className="text-[9px] font-extrabold text-indigo-600">+{dayAppts.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-VIEW 4: PAST & COMPLETED CONSULTATIONS */}
          {/* ========================================================================= */}
          {apptSubTab === "completed" && (
            <div className="space-y-4">
              {appointments.filter((a) => a.status === "completed").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed rounded-xl bg-slate-50">
                  <CheckCircle2 className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No past consultation records found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments
                    .filter((a) => a.status === "completed")
                    .map((a) => {
                      const docName = typeof a.doctor === "object" ? (a.doctor as any).name : a.doctor;
                      const deptName = typeof a.department === "object" && a.department ? (a.department as any).name : "General Medicine";

                      return (
                        <div key={a._id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-extrabold text-sm">
                              ✓
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-800">Dr. {docName}</h4>
                              <p className="text-xs text-slate-500">{deptName} · Completed on {new Date(a.date).toLocaleDateString("en-IN")}</p>
                              <p className="text-[10px] font-mono text-slate-400">Ref: {a.referenceId || "REF-1002"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => changeTab("prescriptions")}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-navy-700 hover:bg-slate-50"
                            >
                              View Prescription RX
                            </button>
                            <button
                              onClick={() => setViewApptSlip(a)}
                              className="rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-800"
                            >
                              Download Slip
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. MEDICAL HISTORY TAB */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Medical History Header & Summary KPIs */}
          <Card className="p-6 bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950 text-white rounded-2xl shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-rose-500/20 px-3 py-0.5 text-xs font-semibold text-rose-300 border border-rose-400/30">
                    Clinical Records & History
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                    Live Synced
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-black text-white sm:text-2xl flex items-center gap-2">
                  <Heart className="h-6 w-6 text-rose-400" /> Patient Medical History & Health Timeline
                </h3>
                <p className="mt-1 text-xs text-indigo-200/80">
                  Comprehensive chronological record of your past OPD consultations, diagnoses, vital signs, prescriptions, and lab reports.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-indigo-200">Total History Records</p>
                <p className="text-xl font-black text-white mt-0.5">{combinedHistoryRecords.length} Items</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-indigo-200">Consultation Visits</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">{appointments.length} Total</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-indigo-200">Digital RX Issued</p>
                <p className="text-xl font-black text-amber-300 mt-0.5">{prescriptions.length} Records</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-indigo-200">Blood Group / Allergy</p>
                <p className="text-sm font-extrabold text-white mt-1 truncate">{patient?.bloodGroup || "O+"} · {patient?.allergies || "None"}</p>
              </div>
            </div>
          </Card>

          {/* Search Bar & Category Filter Bar (Edge-to-Edge Flush Sticky Bar) */}
          <div className="sticky -top-3 sm:-top-4 md:-top-6 z-30 -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 md:-mx-6 md:-mt-6 px-3 sm:px-4 md:px-6 py-3.5 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/90 shadow-md transition-all mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Category Filter Pills */}
              {(() => {
                const isVideoRecord = (r: any) => {
                  const vt = (r.visitType || "").toLowerCase();
                  const t = (r.type || "").toLowerCase();
                  return vt.includes("video") || vt.includes("telehealth") || t.includes("video") || t.includes("telehealth") || !!r.meetingLink;
                };

                const isWalkinRecord = (r: any) => {
                  if (isVideoRecord(r)) return false;
                  const vt = (r.visitType || "").toLowerCase();
                  return r.type === "consultation" || r.type === "clinical" || vt.includes("walk") || vt.includes("opd") || vt.includes("in-person");
                };

                return (
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: "all", label: "All History Logs", count: combinedHistoryRecords.length },
                      { id: "video", label: "Video Consultations", count: combinedHistoryRecords.filter(r => isVideoRecord(r)).length },
                      { id: "walkin", label: "Walk-in OPD", count: combinedHistoryRecords.filter(r => isWalkinRecord(r)).length },
                      { id: "prescription", label: "Prescriptions RX", count: combinedHistoryRecords.filter(r => r.type === "prescription").length },
                      { id: "report", label: "Lab Reports", count: combinedHistoryRecords.filter(r => r.type === "report").length },
                    ].map((cat) => {
                      const isActive = historyCategoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setHistoryCategoryFilter(cat.id as any)}
                          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                            isActive
                              ? "bg-navy-800 text-white shadow-md"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isActive ? "bg-white text-navy-900" : "bg-slate-200 text-slate-700"}`}>
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Real-time Search Input */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search diagnosis, doctor, notes..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Records Grid */}
          <div className="space-y-4">
            {(() => {
              const isVideoRecord = (r: any) => {
                const vt = (r.visitType || "").toLowerCase();
                const t = (r.type || "").toLowerCase();
                return vt.includes("video") || vt.includes("telehealth") || t.includes("video") || t.includes("telehealth") || !!r.meetingLink;
              };

              const isWalkinRecord = (r: any) => {
                if (isVideoRecord(r)) return false;
                const vt = (r.visitType || "").toLowerCase();
                return r.type === "consultation" || r.type === "clinical" || vt.includes("walk") || vt.includes("opd") || vt.includes("in-person");
              };

              const filteredList = combinedHistoryRecords.filter((record) => {
                // 1. Category Filter
                if (historyCategoryFilter !== "all") {
                  if (historyCategoryFilter === "video" && !isVideoRecord(record)) return false;
                  if (historyCategoryFilter === "walkin" && !isWalkinRecord(record)) return false;
                  if (historyCategoryFilter === "consultation" && record.type !== "consultation" && record.type !== "clinical") return false;
                  if (historyCategoryFilter === "prescription" && record.type !== "prescription") return false;
                  if (historyCategoryFilter === "report" && record.type !== "report") return false;
                }
                // 2. Search Query Filter
                if (historySearchQuery.trim()) {
                  const q = historySearchQuery.toLowerCase();
                  const diag = safeText(record.diagnosis).toLowerCase();
                  const doc = safeText(record.doctorName || record.doctor).toLowerCase();
                  const dept = safeText(record.department).toLowerCase();
                  const notes = safeText(record.notes || record.advice).toLowerCase();
                  const vType = safeText(record.visitType).toLowerCase();
                  return diag.includes(q) || doc.includes(q) || dept.includes(q) || notes.includes(q) || vType.includes(q);
                }
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <Card className="p-12 text-center border border-dashed rounded-2xl bg-slate-50">
                    <Heart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-base font-extrabold text-slate-700">No matching medical history records found</h4>
                    <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting another category filter.</p>
                  </Card>
                );
              }

              return (
                <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
                  {filteredList.map((item, idx) => {
                    const isConsultation = item.type === "consultation" || item.type === "clinical";
                    const isPrescription = item.type === "prescription";
                    const isReport = item.type === "report";
                    const isVideo = isVideoRecord(item);
                    const isWalkin = isWalkinRecord(item);

                    return (
                      <div key={item.id || idx} className="relative group">
                        {/* Timeline Bullet Node */}
                        <div className={`absolute -left-[35px] top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white shadow-md ${
                          isVideo ? "bg-indigo-600" : isWalkin ? "bg-navy-700" : isPrescription ? "bg-emerald-600" : "bg-blue-600"
                        }`}>
                          {isVideo ? <Video className="h-3.5 w-3.5" /> : isConsultation ? <Heart className="h-3.5 w-3.5" /> : isPrescription ? <Pill className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                        </div>

                        {/* Timeline Card */}
                        <Card className="p-5 border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl space-y-4">
                          {/* Header: Date, Visit Type & Doctor */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-navy-800 bg-navy-50 px-3 py-1 rounded-lg border border-navy-100">
                                {item.dateFormatted}
                              </span>
                              {isVideo && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-800 px-2.5 py-0.5 text-xs font-extrabold border border-indigo-200">
                                  <Video className="h-3 w-3 text-indigo-600" /> Video Telehealth
                                </span>
                              )}
                              {isWalkin && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-800 px-2.5 py-0.5 text-xs font-extrabold border border-slate-200">
                                  <Building className="h-3 w-3 text-slate-600" /> Walk-in OPD
                                </span>
                              )}
                              {!isVideo && !isWalkin && (
                                <Badge tone={isPrescription ? "success" : "neutral"}>
                                  {item.visitType}
                                </Badge>
                              )}
                              {item.referenceId && (
                                <span className="text-[11px] font-mono text-slate-400">{item.referenceId}</span>
                              )}
                            </div>
                            <div className="text-right sm:text-right">
                              <p className="text-xs font-extrabold text-slate-800">Dr. {safeText(item.doctorName)}</p>
                              <p className="text-[11px] font-medium text-slate-500">{safeText(item.department)}</p>
                            </div>
                          </div>

                          {/* Body: Diagnosis / Title */}
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Primary Diagnosis / Record</p>
                            <h4 className="text-base font-extrabold text-slate-900 mt-0.5">{item.diagnosis}</h4>
                          </div>

                          {/* Vitals Summary Grid (if vitals available) */}
                          {item.vitals && (
                            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                              <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                <Activity className="h-3.5 w-3.5 text-rose-500" /> Recorded Clinical Vitals
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-500 font-semibold block">Blood Pressure</span>
                                  <span className="font-extrabold text-slate-800">{item.vitals.bloodPressure || "120/80 mmHg"}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 font-semibold block">Pulse Rate</span>
                                  <span className="font-extrabold text-slate-800">{item.vitals.pulseRate ? `${item.vitals.pulseRate} bpm` : "72 bpm"}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 font-semibold block">SpO2 Oxygen</span>
                                  <span className="font-extrabold text-slate-800">{item.vitals.oxygenSaturation ? `${item.vitals.oxygenSaturation}%` : "98%"}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 font-semibold block">Temperature</span>
                                  <span className="font-extrabold text-slate-800">{item.vitals.temperature || "98.6 °F"}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Medications List (if prescription record) */}
                          {item.medications && item.medications.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Prescribed Medications ({item.medications.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {item.medications.map((med: any, mIdx: number) => (
                                  <div key={mIdx} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800 border border-emerald-200">
                                    {med.name} {med.strength && `(${med.strength})`} · {med.frequency || "As prescribed"}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Clinical Notes & Doctor Advice */}
                          {(item.notes || item.advice) && (
                            <div className="rounded-xl bg-amber-50/50 p-3 text-xs font-medium text-amber-900 border border-amber-200/60">
                              <span className="font-extrabold text-amber-800">Doctor Notes & Advice: </span>
                              {item.notes || item.advice}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                            {isPrescription && (
                              <button
                                onClick={() => setActiveTab("prescriptions")}
                                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all"
                              >
                                <Pill className="h-3.5 w-3.5" /> View Prescription RX
                              </button>
                            )}
                            {isReport && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchedRep = reports?.find((r: any) =>
                                      r._id === item.rawReportId || r._id === item.id || r.testName === item.title
                                    );
                                    const fullReport = matchedRep || {
                                      _id: item.id || item.rawReportId || `rep-${Date.now()}`,
                                      testName: item.title || item.name || "Diagnostic Lab Report",
                                      requestType: item.category?.toLowerCase().includes("radiology") ? "Radiology" : "Laboratory",
                                      category: item.category || "Lab Investigation",
                                      status: "verified",
                                      uploadedAt: item.date || item.createdAt || new Date().toISOString(),
                                      doctor: { name: item.doctorName || "Attending Doctor" },
                                      observations: item.notes || item.observations || "Diagnostic lab investigation details and parameters published.",
                                      remarks: item.remarks || "Verified digital lab report record.",
                                      files: item.fileUrl ? [{ secure_url: item.fileUrl, original_filename: `${item.title || "Report"}.pdf` }] : []
                                    };
                                    setSelectedReport(fullReport);
                                  }}
                                  className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-all cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View Report
                                </button>
                                {item.fileUrl && (
                                  <a
                                    href={item.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-all"
                                  >
                                    <Download className="h-3.5 w-3.5" /> Download Report
                                  </a>
                                )}
                              </div>
                            )}
                            {isConsultation && (
                              <button
                                onClick={() => setActiveTab("appointments")}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                              >
                                View Consultation Slip <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DIGITAL PRESCRIPTIONS TAB */}
      {/* ========================================================================= */}
      {activeTab === "prescriptions" && (
        <div className="space-y-6">
          {/* Header & Financial/Medical RX Summary KPIs */}
          <Card className="p-6 bg-gradient-to-r from-emerald-950 via-teal-900 to-navy-950 text-white rounded-2xl shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                    Digital Health RX Records
                  </span>
                  <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-400/30">
                    E-Prescription Verified
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-black text-white sm:text-2xl flex items-center gap-2">
                  <Pill className="h-6 w-6 text-emerald-400" /> Digital Prescriptions & Pharmacy Records
                </h3>
                <p className="mt-1 text-xs text-emerald-100/80">
                  Access doctor prescribed medications, dosage timings, administration instructions, and download official digital RX copies.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-emerald-200">Total RX Prescriptions</p>
                <p className="text-xl font-black text-white mt-0.5">{(prescriptions || []).length} Issued</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-emerald-200">Total Prescribed Medicines</p>
                <p className="text-xl font-black text-emerald-300 mt-0.5">
                  {(prescriptions || []).reduce((sum, rx) => sum + (rx.medications?.length || 0), 0)} Items
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-emerald-200">Prescribing Specialists</p>
                <p className="text-xl font-black text-indigo-200 mt-0.5">
                  {new Set((prescriptions || []).map((rx) => (typeof rx.doctor === "object" ? (rx.doctor as any)?.name : rx.doctor))).size} Doctors
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-emerald-200">Dispensed Pharmacy RX</p>
                <p className="text-xl font-black text-amber-300 mt-0.5">
                  {(prescriptions || []).filter((rx) => rx.status === "Dispensed" || rx.status === "Completed").length} Completed
                </p>
              </div>
            </div>
          </Card>

          {/* Search Bar & Filter Tabs (Edge-to-Edge Flush Sticky Bar) */}
          <div className="sticky -top-3 sm:-top-4 md:-top-6 z-30 -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 md:-mx-6 md:-mt-6 px-3 sm:px-4 md:px-6 py-3.5 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/90 shadow-md transition-all mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "all", label: "All RX Copies", count: (prescriptions || []).length },
                  { id: "active", label: "Active Prescriptions", count: (prescriptions || []).filter((rx) => rx.status !== "Completed" && rx.status !== "Cancelled").length },
                  { id: "dispensed", label: "Dispensed & Completed", count: (prescriptions || []).filter((rx) => rx.status === "Dispensed" || rx.status === "Completed").length },
                ].map((tab) => {
                  const isActive = rxStatusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setRxStatusFilter(tab.id as any)}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        isActive
                          ? "bg-emerald-800 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isActive ? "bg-white text-emerald-950" : "bg-slate-200 text-slate-700"}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar Input */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search medicine, doctor, diagnosis..."
                  value={rxSearchQuery}
                  onChange={(e) => setRxSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                {rxSearchQuery && (
                  <button
                    onClick={() => setRxSearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Prescriptions Grid */}
          <div className="space-y-4">
            {(() => {
              const filteredPrescriptions = (prescriptions || []).filter((rx: any) => {
                // 1. Status Filter
                if (rxStatusFilter === "active" && (rx.status === "Completed" || rx.status === "Cancelled")) return false;
                if (rxStatusFilter === "dispensed" && rx.status !== "Dispensed" && rx.status !== "Completed") return false;

                // 2. Search Query Filter
                if (rxSearchQuery.trim()) {
                  const q = rxSearchQuery.toLowerCase();
                  const rxNum = (rx.prescriptionNumber || rx._id || "").toLowerCase();
                  const diag = (rx.diagnosis || "").toLowerCase();
                  const doc = (typeof rx.doctor === "object" ? rx.doctor?.name : rx.doctor || "").toLowerCase();
                  const meds = (rx.medications || []).map((m: any) => m.name || "").join(" ").toLowerCase();
                  return rxNum.includes(q) || diag.includes(q) || doc.includes(q) || meds.includes(q);
                }
                return true;
              });

              if (filteredPrescriptions.length === 0) {
                return (
                  <Card className="p-12 text-center border border-dashed rounded-2xl bg-slate-50">
                    <Pill className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-base font-extrabold text-slate-700">No digital prescriptions found</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {rxStatusFilter !== "all" || rxSearchQuery
                        ? "Try clearing your search query or selecting another status filter."
                        : "No digital e-prescriptions are registered for your account yet."}
                    </p>
                  </Card>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {filteredPrescriptions.map((rx: any) => {
                    const docObj = typeof rx.doctor === "object" ? (rx.doctor as any) : null;
                    const docName = docObj?.name || rx.doctor || "Specialist Doctor";
                    const specialty = docObj?.specialization || "General Medicine";
                    const dateStr = new Date(rx.createdAt || rx.date || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                    const rxNumber = rx.prescriptionNumber || `RX-${rx._id.slice(-6).toUpperCase()}`;

                    return (
                      <Card key={rx._id} className="p-6 border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl space-y-4 flex flex-col justify-between">
                        <div className="space-y-4">
                          {/* Header: RX Number, Date, Doctor Info & Status */}
                          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-extrabold text-lg shadow-sm">
                                <Pill className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                    {rxNumber}
                                  </span>
                                  <Badge tone={rx.status === "Dispensed" || rx.status === "Completed" ? "success" : "info"}>
                                    {rx.status || "Active RX"}
                                  </Badge>
                                </div>
                                <h4 className="text-base font-extrabold text-slate-900 mt-1">Dr. {docName}</h4>
                                <p className="text-xs text-slate-500 font-medium">{specialty} · Prescribed on {dateStr}</p>
                              </div>
                            </div>
                          </div>

                          {/* Primary Diagnosis */}
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clinical Diagnosis</p>
                            <p className="text-sm font-extrabold text-slate-800 mt-0.5">{rx.diagnosis || "General Consultation Check-up"}</p>
                          </div>

                          {/* Prescribed Medicines List */}
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                                Prescribed Medicines ({(rx.medications || []).length})
                              </p>
                            </div>

                            <div className="space-y-2">
                              {(rx.medications || []).map((med: any, idx: number) => (
                                <div key={idx} className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                  <div>
                                    <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                      {med.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                      {med.strength || med.dosage || "As Directed"} · {med.duration || "5 Days"}
                                    </p>
                                    {med.instructions && (
                                      <p className="text-[10px] text-slate-400 italic mt-0.5">Instructions: {med.instructions}</p>
                                    )}
                                  </div>

                                  <div className="text-right sm:text-right shrink-0">
                                    <span className="inline-flex items-center rounded-lg bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-800">
                                      {med.frequency || "1-0-1 After Food"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Special Doctor Advice */}
                          {rx.advice && (
                            <div className="rounded-xl bg-indigo-50/60 p-3 text-xs font-medium text-indigo-950 border border-indigo-100">
                              <span className="font-extrabold text-indigo-800">Doctor Advice & Follow-up: </span> {rx.advice}
                            </div>
                          )}
                        </div>

                        {/* Card Actions Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <span className="text-[10px] text-slate-400 font-semibold">Verified Digital Copy</span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPrescriptionRx(rx)}
                              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 transition-all active:scale-95 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-indigo-700" /> View Prescription
                            </button>

                            <a
                              href={rx.pdfUrl || rx.fileUrl || "#"}
                              onClick={(e) => {
                                if (!rx.pdfUrl && !rx.fileUrl) {
                                  e.preventDefault();
                                  const content = `METROPOLITAN HOSPITAL DIGITAL RX PASS\nRX No: ${rx.prescriptionNumber || rx._id}\nDoctor: ${typeof rx.doctor === "object" ? rx.doctor?.name : rx.doctor || "Specialist"}\nDiagnosis: ${rx.diagnosis || "N/A"}\nMedications:\n` + (rx.medications || []).map((m: any) => `- ${m.name} (${m.frequency || "1-0-1"})`).join("\n");
                                  const blob = new Blob([content], { type: "text/plain" });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `Prescription-${rx.prescriptionNumber || "RX"}.txt`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  toast.success("Downloaded prescription details file.");
                                }
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-bold text-white transition-all shadow active:scale-95 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" /> Download RX PDF
                            </a>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. LABORATORY REPORTS TAB */}
      {/* ========================================================================= */}
      {activeTab === "reports" && (
        <Card className="p-6 space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> Laboratory Test Reports
            </h3>
            <p className="text-xs text-slate-500">View diagnostic lab results, reference values, and download digital reports.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {labReports.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed rounded-xl bg-slate-50">
                <FileText className="h-12 w-12 text-slate-300 mb-2" />
                <p className="text-sm font-semibold">No laboratory test reports found.</p>
              </div>
            ) : (
              labReports.map((rep: any, idx: number) => {
                const docName = safeText(rep?.doctor, "Pathologist");
                const testName = safeText(rep?.testName, "Diagnostic Test");
                const categoryText = safeText(rep?.category, "Laboratory Speciality");
                const statusText = rep?.status === "report_uploaded" ? "Uploaded" : safeText(rep?.status, "Verified");
                const dateStr = new Date(rep?.createdAt || rep?.uploadedAt || Date.now()).toLocaleDateString("en-IN");
                return (
                  <div
                    key={rep._id || idx}
                    onClick={() => setSelectedReport(rep)}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <FileText className="h-5 w-5" />
                        </div>
                        <Badge tone={rep.status === "Critical" ? "danger" : rep.status === "Borderline" ? "warning" : "success"}>
                          {statusText}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-800">{testName}</h4>
                      <p className="text-xs text-slate-400">{categoryText} · {dateStr}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-600">Doctor: Dr. {docName}</p>
                    </div>
                    <div className="mt-4 border-t pt-3 flex items-center justify-between text-xs">
                      <span className="font-bold text-navy-700 group-hover:underline flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> View Report Details
                      </span>
                      {rep.files?.[0]?.secure_url && (
                        <a
                          href={rep.files[0].secure_url.includes("res.cloudinary.com") ? rep.files[0].secure_url.replace("/upload/", "/upload/fl_attachment/") : rep.files[0].secure_url}
                          download={rep.files[0].original_filename || "report.pdf"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-4 w-4 text-slate-400 group-hover:text-navy-700" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 7. MEDICAL IMAGING (RADIOLOGY) TAB */}
      {/* ========================================================================= */}
      {activeTab === "imaging" && (
        <Card className="p-6 space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-indigo-600" /> Radiology Scans & Medical Imaging
            </h3>
            <p className="text-xs text-slate-500">Access X-Ray, MRI, CT, and Ultrasound diagnostic images with DICOM viewer controls.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {radiologyReports.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed rounded-xl bg-slate-50">
                <ImageIcon className="h-12 w-12 text-slate-300 mb-2" />
                <p className="text-sm font-semibold">No medical imaging or radiology scan records found.</p>
              </div>
            ) : (
              radiologyReports.map((rad: any) => {
                const docName = safeText(rad?.doctor, "Radiologist");
                const imgUrl = safeText(rad?.files?.[0]?.secure_url) || safeText(rad?.fileUrl) || "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80";
                const dateStr = new Date(rad?.createdAt || rad?.uploadedAt || Date.now()).toLocaleDateString("en-IN");
                const observationsText = safeText(rad?.observations) || safeText(rad?.remarks) || "No findings summary.";
                const testName = safeText(rad?.testName, "Radiology Scan");
                const statusText = rad?.status === "report_uploaded" ? "Uploaded" : safeText(rad?.status, "Verified");

                return (
                  <div
                    key={rad._id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setSelectedRadiology(rad)}>
                        <img src={imgUrl} alt={testName} className="h-full w-full object-cover opacity-85 hover:opacity-100 hover:scale-105 transition-all duration-300" />
                        <div className="absolute top-3 left-3">
                          <span className="rounded-md bg-navy-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white">
                            Radiology
                          </span>
                        </div>
                        <div className="absolute bottom-3 right-3">
                          <span className="rounded-md bg-black/60 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-white flex items-center gap-1">
                            <Eye className="h-3 w-3" /> View Scan
                          </span>
                        </div>
                      </div>
                      <div className="p-5 space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-extrabold text-slate-800">{testName}</h4>
                          <Badge tone="success">{statusText}</Badge>
                        </div>
                        <p className="text-xs text-slate-500">Dr. {docName} · {dateStr}</p>
                        <p className="text-xs font-medium text-slate-600 line-clamp-2 mt-2">{observationsText}</p>
                      </div>
                    </div>
                    <div className="p-5 pt-0">
                      <button
                        onClick={() => setSelectedRadiology(rad)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-navy-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800 transition-all shadow"
                      >
                        Open Scan Image <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 8. BILLING & PAYMENTS TAB */}
      {/* ========================================================================= */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Billing Summary Header & Financial KPIs */}
          <Card className="p-6 bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-semibold text-amber-300 border border-amber-400/30">
                    Financial Portal & Payments
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                    256-Bit SSL Encrypted
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-black text-white sm:text-2xl flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-amber-400" /> Hospital Billing & Secure Pay
                </h3>
                <p className="mt-1 text-xs text-indigo-200/80">
                  View itemized hospital invoices, track insurance coverage deductions, pay pending dues online, and download official receipts.
                </p>
              </div>
              {totalBalance > 0 && (
                <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-400/40 p-4 backdrop-blur-md shrink-0">
                  <p className="text-[10px] uppercase font-black tracking-wider text-amber-200">Total Outstanding Payables</p>
                  <p className="text-2xl font-black text-amber-400 mt-0.5">₹{totalBalance.toLocaleString("en-IN")}.00</p>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-indigo-200">Total Hospital Invoices</p>
                <p className="text-xl font-black text-white mt-0.5">{(invoices || []).length} Invoices</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-indigo-200">Total Billed Amount</p>
                <p className="text-xl font-black text-white mt-0.5">
                  ₹{(invoices || []).reduce((sum, inv) => sum + (inv.totals?.total || 0), 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-indigo-200">Total Paid Amount</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">
                  ₹{(paidInvoices || []).reduce((sum, inv) => sum + (inv.totals?.total || (inv.totals as any)?.paidAmount || 0), 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-indigo-200">Pending Payables Dues</p>
                <p className="text-xl font-black text-amber-400 mt-0.5">
                  ₹{totalBalance.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </Card>

          {/* Search Bar & Filter Tabs (Edge-to-Edge Flush Sticky Bar) */}
          <div className="sticky -top-3 sm:-top-4 md:-top-6 z-30 -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 md:-mx-6 md:-mt-6 px-3 sm:px-4 md:px-6 py-3.5 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/90 shadow-md transition-all mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "all", label: "All Invoices", count: (invoices || []).length },
                  { id: "pending", label: "Pending Payables", count: (invoices || []).filter((inv: any) => inv.status === "pending" || inv.status === "partially_paid").length },
                  { id: "paid", label: "Paid & Receipts", count: (invoices || []).filter((inv: any) => inv.status === "paid").length },
                ].map((tab) => {
                  const isActive = billingStatusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setBillingStatusFilter(tab.id as any)}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        isActive
                          ? "bg-navy-800 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isActive ? "bg-white text-navy-900" : "bg-slate-200 text-slate-700"}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar Input */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by invoice ID or service..."
                  value={billingSearchQuery}
                  onChange={(e) => setBillingSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all"
                />
                {billingSearchQuery && (
                  <button
                    onClick={() => setBillingSearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Invoices List Grid & Itemized View */}
          <div className="space-y-4">
            {(() => {
              const filteredInvoices = (invoices || []).filter((inv: any) => {
                // 1. Status Filter
                if (billingStatusFilter === "pending" && (inv.status !== "pending" && inv.status !== "partially_paid")) return false;
                if (billingStatusFilter === "paid" && inv.status !== "paid") return false;

                // 2. Search Query Filter
                if (billingSearchQuery.trim()) {
                  const q = billingSearchQuery.toLowerCase();
                  const invId = (inv._id || inv.id || "").toLowerCase();
                  const type = (inv.billingType || "").toLowerCase();
                  const status = (inv.status || "").toLowerCase();
                  return invId.includes(q) || type.includes(q) || status.includes(q);
                }
                return true;
              });

              if (filteredInvoices.length === 0) {
                return (
                  <Card className="p-12 text-center border border-dashed rounded-2xl bg-slate-50">
                    <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-base font-extrabold text-slate-700">No hospital billing invoices found</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {billingStatusFilter !== "all" || billingSearchQuery
                        ? "Try clearing your search query or switching status filters."
                        : "Your hospital account currently has no billing invoices."}
                    </p>
                  </Card>
                );
              }

              return (
                <div className="space-y-4">
                  {filteredInvoices.map((inv: any) => {
                    const isPaid = inv.status === "paid";
                    const invRefId = `INV-${inv._id.slice(-8).toUpperCase()}`;
                    const isExpanded = expandedInvoiceId === inv._id;
                    const patientBal = inv.totals?.patientBalance || (isPaid ? 0 : inv.totals?.total || 0);

                    return (
                      <Card key={inv._id} className="p-5 border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl space-y-4">
                        {/* Header Row: Invoice Ref, Category & Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-black text-navy-900 bg-navy-50 px-3 py-1 rounded-lg border border-navy-100">
                              {invRefId}
                            </span>
                            <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-700 border border-indigo-100">
                              {inv.billingType || "Hospital Services"}
                            </span>
                            <Badge tone={isPaid ? "success" : inv.status === "pending" ? "warning" : "info"}>
                              {inv.status === "paid" ? "✓ Paid in Full" : inv.status === "pending" ? "Pending Payment" : inv.status}
                            </Badge>
                          </div>
                          <div className="text-right sm:text-right text-xs text-slate-500 font-semibold">
                            <span>Billed On: {new Date(inv.createdAt || inv.date || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                        </div>

                        {/* Financial Amounts Breakdown Grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bill</span>
                            <span className="text-sm font-extrabold text-slate-800">₹{(inv.totals?.total || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtotal / Discount</span>
                            <span className="text-slate-700 font-bold">₹{inv.totals?.subtotal || inv.totals?.total || 0}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Insurance Deduction</span>
                            <span className="text-indigo-600 font-extrabold">{inv.insuranceCoveragePercent || 0}% Covered</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount Paid</span>
                            <span className="text-emerald-600 font-extrabold">₹{((inv.totals as any)?.paidAmount || (isPaid ? inv.totals?.total : 0) || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-amber-600 block">Your Pay Balance</span>
                            <span className={`text-base font-black ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>
                              ₹{patientBal.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Itemized Services Breakdown Accordion */}
                        {inv.items && inv.items.length > 0 && (
                          <div className="border-t pt-3">
                            <button
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : inv._id)}
                              className="text-xs font-bold text-navy-700 hover:text-navy-900 flex items-center gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {isExpanded ? "Hide Billed Line Items" : `View ${inv.items.length} Itemized Services Breakdown`}
                              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            </button>

                            {isExpanded && (
                              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                                <table className="w-full text-left text-xs">
                                  <thead className="text-[10px] font-bold text-slate-400 uppercase border-b pb-1">
                                    <tr>
                                      <th className="pb-2">Service / Item Name</th>
                                      <th className="pb-2 text-center">Qty</th>
                                      <th className="pb-2 text-right">Unit Price</th>
                                      <th className="pb-2 text-right">Total Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {inv.items.map((item: any, iIdx: number) => (
                                      <tr key={iIdx}>
                                        <td className="py-2 font-semibold text-slate-800">{item.name || item.description || "Medical Service"}</td>
                                        <td className="py-2 text-center">{item.quantity || 1}</td>
                                        <td className="py-2 text-right">₹{item.price || item.unitPrice || item.total}</td>
                                        <td className="py-2 text-right font-bold text-slate-900">₹{item.total || (item.quantity * item.price)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-400">
                              Payment Due Date: <strong className="text-slate-700">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "Immediate"}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isPaid ? (
                              <button
                                onClick={() => setPayInvoice(inv)}
                                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-5 py-2.5 text-xs font-black text-white transition-all shadow-md active:scale-95 transform hover:scale-105"
                              >
                                <CreditCard className="h-4 w-4" /> Pay ₹{patientBal.toLocaleString("en-IN")} Securely Online
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setPaidReceipt({
                                    receiptNo: `RCP-${inv._id.slice(-6).toUpperCase()}`,
                                    invoiceId: inv._id,
                                    amount: inv.totals?.total || 4500,
                                    date: new Date(inv.updatedAt || Date.now()).toLocaleDateString("en-IN"),
                                    method: "UPI / ONLINE PORTAL",
                                    patientName: patient?.name || user?.name
                                  });
                                }}
                                className="flex items-center gap-2 rounded-xl bg-navy-800 hover:bg-navy-900 px-4 py-2.5 text-xs font-bold text-white transition-all shadow active:scale-95"
                              >
                                <Download className="h-4 w-4 text-emerald-400" /> Download Official Receipt (PDF)
                              </button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. INSURANCE DETAILS TAB */}
      {/* ========================================================================= */}
      {activeTab === "insurance" && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" /> Health Insurance & Cashless Desk
              </h3>
              <p className="text-xs text-slate-500">Track policy details, claim pre-authorizations, and coverage balance.</p>
            </div>
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-navy-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800 shadow"
            >
              <Plus className="h-4 w-4" /> Submit Pre-Auth Claim
            </button>
          </div>

          {/* Insurance Card Overview */}
          {patient?.insuranceProvider ? (
            <div className="rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-indigo-900 p-6 text-white shadow-md">
              <div className="flex flex-col gap-6 md:flex-row md:items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Policy Provider</span>
                  <h4 className="text-xl font-extrabold mt-0.5">{patient.insuranceProvider}</h4>
                  <p className="text-xs text-indigo-200 mt-1">Policy No: <span className="font-mono font-bold">{patient.insurancePolicyNumber || "N/A"}</span></p>
                  <p className="text-xs text-indigo-300 mt-1">TPA Assistance: MediAssist TPA / Cashless Desk Active</p>
                </div>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-md text-xs">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-indigo-200">Sum Insured Limit</p>
                    <p className="text-base font-extrabold">₹5,00,000</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-emerald-300">Coverage Status</p>
                    <p className="text-base font-extrabold text-emerald-300">Active</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-100 p-6 text-slate-600 border border-dashed border-slate-300 text-center">
              <Shield className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No Insurance Registered</h4>
              <p className="text-xs text-slate-500 mt-1">You haven't added insurance details to your profile yet. You can add your insurance provider and policy number in the "Profile" tab to request cashless hospitalization pre-authorization.</p>
              <button
                onClick={() => changeTab("profile")}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
              >
                Go to Profile <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Claims History Table */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Submitted Insurance Claims & Authorizations</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-y">
                  <tr>
                    <th className="px-4 py-3">Claim ID</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Claim Amount</th>
                    <th className="px-4 py-3">Approved Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remarks / TPA Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {claimsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No cashless pre-authorization claim requests submitted.
                      </td>
                    </tr>
                  ) : (
                    claimsList.map((clm) => (
                      <tr key={clm.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3.5 font-extrabold text-navy-700">{clm.id}</td>
                        <td className="px-4 py-3.5">{clm.date}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">{clm.category}</td>
                        <td className="px-4 py-3.5 font-bold">₹{clm.amount.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3.5 font-extrabold text-emerald-600">₹{clm.approvedAmount.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3.5">
                          <Badge tone={clm.status === "Approved" ? "success" : clm.status === "Under Review" ? "warning" : "neutral"}>
                            {clm.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">{clm.remarks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 10. VIDEO CONSULTATION (TELEHEALTH) TAB */}
      {/* ========================================================================= */}
      {activeTab === "telehealth" && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Video className="h-5 w-5 text-indigo-600" /> Online Doctor Video Consultations
              </h3>
              <p className="text-xs text-slate-500">Join real-time HD video appointments or schedule a new video consultation with specialist doctors.</p>
            </div>
            <button
              type="button"
              onClick={() => openBookingInterface("Video Consultation")}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" /> Book New Video Consultation
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {(() => {
              const videoAppointments = appointments.filter((a: any) => {
                const t = String(a.type || "").toLowerCase();
                const isVideo = t.includes("video") || t.includes("online") || t.includes("tele") || !!a.meetingLink;
                const isActive = a.status === "scheduled" || a.status === "pending_payment" || a.status === "checked_in" || a.status === "in_consultation";
                return isVideo && isActive;
              });
              if (videoAppointments.length === 0) {
                return (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed rounded-2xl bg-slate-50">
                    <Video className="h-12 w-12 text-indigo-300 mb-3" />
                    <h4 className="text-base font-extrabold text-slate-700">No upcoming video consultations found</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md text-center">
                      You don't have any scheduled online video appointments right now. Click below to choose a doctor and schedule a live video consultation.
                    </p>
                    <button
                      type="button"
                      onClick={() => openBookingInterface("Video Consultation")}
                      className="mt-4 flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-navy-900 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus className="h-4 w-4" /> Book Video Consultation Now
                    </button>
                  </div>
                );
              }
              return videoAppointments.map((sess: any) => {
                const docName = typeof sess.doctor === "object" ? (sess.doctor as any)?.name : sess.doctor;
                const specialty = typeof sess.doctor === "object" ? (sess.doctor as any)?.specialization : "Specialist";
                const dateStr = new Date(sess.date).toLocaleDateString("en-IN");
                return (
                  <div key={sess._id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                          <Video className="h-5 w-5" />
                        </div>
                        <Badge tone="success">Ready to Join</Badge>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-800">Dr. {docName}</h4>
                      <p className="text-xs text-slate-500">{specialty} · {dateStr} ({sess.time})</p>
                      {sess.notes && (
                        <p className="text-xs text-slate-600 mt-2 font-medium bg-slate-50 p-3 rounded-lg border">{sess.notes}</p>
                      )}
                    </div>
                    <div className="mt-6 pt-4 border-t space-y-2">
                      <button
                        onClick={() => handleJoinGoogleMeet(sess)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-4 py-2.5 text-xs font-extrabold text-white transition-all shadow-md active:scale-95"
                      >
                        <Video className="h-4 w-4" /> Join Google Meet Now
                      </button>
                      {getAppointmentMeetUrl(sess) ? (
                        <p className="text-[11px] font-mono text-emerald-700 text-center font-bold truncate">
                          Link: {getAppointmentMeetUrl(sess)}
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-600 text-center font-semibold italic">
                          Waiting for doctor to provide Google Meet link...
                        </p>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 11. HEALTH NOTIFICATIONS TAB */}
      {/* ========================================================================= */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          {/* Header & Notification Stats Banner */}
          <Card className="p-6 bg-gradient-to-r from-amber-950 via-slate-900 to-navy-950 text-white rounded-2xl shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-semibold text-amber-300 border border-amber-400/30">
                    Real-Time Activity Feed
                  </span>
                  <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-400/30">
                    Doctor & Patient Sync
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-black text-white sm:text-2xl flex items-center gap-2">
                  <Bell className="h-6 w-6 text-amber-400" /> Real-Time Health Notification Center
                </h3>
                <p className="mt-1 text-xs text-amber-100/80">
                  Track real-time updates from your attending doctors, appointment bookings, payment receipts, and lab reports.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setMarkedReadNotifIds(notifications.map((n: any) => n.id));
                    toast.success("Marked all notifications as read.");
                  }}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-extrabold text-white hover:bg-white/20 transition-all backdrop-blur-md"
                >
                  ✓ Mark All Read
                </button>
                <button
                  onClick={() => {
                    setDismissedNotifIds(combinedNotificationsList.map((n: any) => n.id));
                    toast.success("Cleared notification feed.");
                  }}
                  className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-xs font-extrabold text-rose-200 hover:bg-rose-500/30 transition-all backdrop-blur-md"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-amber-200">Total Notifications</p>
                <p className="text-xl font-black text-white mt-0.5">{notifications.length} Logs</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-indigo-200">👨‍⚕️ Doctor Updates</p>
                <p className="text-xl font-black text-indigo-300 mt-0.5">
                  {notifications.filter((n) => n.category === "doctor").length} Updates
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-emerald-200">📅 Patient Bookings</p>
                <p className="text-xl font-black text-emerald-300 mt-0.5">
                  {notifications.filter((n) => n.category === "booking").length} Bookings
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
                <p className="text-[10px] uppercase font-extrabold text-amber-200">💳 Billing & Claims</p>
                <p className="text-xl font-black text-amber-300 mt-0.5">
                  {notifications.filter((n) => n.category === "billing").length} Records
                </p>
              </div>
            </div>
          </Card>

          {/* Category Filter Pills Bar (Edge-to-Edge Flush Sticky Bar) */}
          <div className="sticky -top-3 sm:-top-4 md:-top-6 z-30 -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 md:-mx-6 md:-mt-6 px-3 sm:px-4 md:px-6 py-3.5 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/90 shadow-md transition-all mb-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "All Activity Logs", count: notifications.length },
                { id: "doctor", label: "👨‍⚕️ Doctor Updates", count: notifications.filter((n) => n.category === "doctor").length },
                { id: "booking", label: "📅 Patient Bookings", count: notifications.filter((n) => n.category === "booking").length },
                { id: "billing", label: "💳 Billing & Payments", count: notifications.filter((n) => n.category === "billing").length },
                { id: "lab", label: "🧪 Lab & Radiology", count: notifications.filter((n) => n.category === "lab").length },
              ].map((cat) => {
                const isActive = historyCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setHistoryCategoryFilter(cat.id as any)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      isActive
                        ? "bg-navy-800 text-white shadow-md"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isActive ? "bg-white text-navy-900" : "bg-slate-200 text-slate-700"}`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications Feed */}
          <div className="space-y-3">
            {(() => {
              const filteredList = notifications.filter((n) => {
                if (historyCategoryFilter !== "all" && n.category !== historyCategoryFilter) return false;
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <Card className="p-12 text-center border border-dashed rounded-2xl bg-slate-50">
                    <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-base font-extrabold text-slate-700">No notifications found</h4>
                    <p className="text-xs text-slate-500 mt-1">Select another category filter to view logged notifications.</p>
                  </Card>
                );
              }

              return filteredList.map((n) => {
                const isDoctor = n.category === "doctor";
                const isBooking = n.category === "booking";
                const isBilling = n.category === "billing";

                return (
                  <Card
                    key={n.id}
                    onClick={() => {
                      if (n.actionTab) {
                        changeTab(n.actionTab);
                      }
                    }}
                    className={`p-5 border transition-all cursor-pointer rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      n.read
                        ? "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                        : "bg-gradient-to-r from-amber-50/80 via-orange-50/30 to-white border-amber-200 shadow-md hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm ${
                        isDoctor ? "bg-indigo-600" : isBooking ? "bg-navy-800" : isBilling ? "bg-emerald-600" : "bg-blue-600"
                      }`}>
                        {isDoctor ? <Heart className="h-5 w-5" /> : isBooking ? <Calendar className="h-5 w-5" /> : isBilling ? <CreditCard className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            isDoctor
                              ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                              : isBooking
                              ? "bg-navy-50 text-navy-800 border-navy-200"
                              : isBilling
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          }`}>
                            {isDoctor ? "👨‍⚕️ Doctor Update" : isBooking ? "📅 Patient Booking" : isBilling ? "💳 Billing & Receipt" : "🧪 Lab Diagnostic"}
                          </span>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
                          <span className="text-[11px] text-slate-400 font-semibold">{n.time}</span>
                        </div>

                        <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">{n.title}</h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{n.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-end shrink-0 sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (n.actionTab) changeTab(n.actionTab);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-navy-700 hover:text-navy-900 hover:underline bg-slate-100 px-3 py-1.5 rounded-lg"
                      >
                        View Details <ArrowRight className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissedNotifIds((prev) => [...prev, n.id]);
                        }}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </Card>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. SETTINGS TAB */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <SettingsPage />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BOOK APPOINTMENT MODAL */}
      {/* ========================================================================= */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-800">Request New Consultation</h3>
              <button onClick={() => setIsBookModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-full font-bold">✕</button>
            </div>
            <form onSubmit={handleBookAppointment} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Consultation Mode *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingType("Appointment")}
                    className={`p-2.5 rounded-lg border text-center font-bold transition-all ${bookingType === "Appointment" ? "border-navy-700 bg-navy-50 text-navy-800" : "border-slate-200 text-slate-600"
                      }`}
                  >
                    In-Person Hospital Visit
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType("Video Consultation")}
                    className={`p-2.5 rounded-lg border text-center font-bold transition-all ${bookingType === "Video Consultation" ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-600"
                      }`}
                  >
                    Online Video Consult
                  </button>
                </div>
              </div>
              <div>
                <label className="block mb-1">Select Doctor / Specialist *</label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-lg border px-3.5 py-2.5 outline-none focus:border-navy-500 font-medium text-xs"
                >
                  <option value="">-- Select Specialist Doctor --</option>
                  {doctors.map((doc: any) => (
                    <option key={doc._id} value={doc._id}>
                      Dr. {doc.name} ({doc.specialization || "General Medicine"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-bold">Select Date *</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={bookingDate || new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setBookingDate(e.target.value);
                    setBookingTime("");
                  }}
                  className="w-full rounded-lg border px-3.5 py-2 outline-none focus:border-navy-500 font-medium text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold">Select Available Time Slot *</label>
                {(() => {
                  const modalSlots = getAvailableTimeSlots(bookingDate || new Date().toISOString().split("T")[0], selectedDoctorId);
                  if (modalSlots.length === 0) {
                    return (
                      <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50 p-2.5 text-center text-xs font-semibold text-rose-700">
                        No slots available for today (all past slots are hidden). Please pick another date.
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border rounded-lg bg-slate-50">
                      {modalSlots.map((slot) => {
                        const isBooked = bookedSlots.some(
                          (b: string) => normalizeTime(b) === normalizeTime(slot)
                        );
                        const patientConflict = patientActiveApptsOnDate.find(
                          (a: any) => a.time && normalizeTime(a.time) === normalizeTime(slot)
                        );
                        const isSelected = bookingTime === slot || (!!bookingTime && !!slot && normalizeTime(bookingTime) === normalizeTime(slot));

                        if (isBooked) {
                          const conflictDocName = (typeof patientConflict?.doctor === "object" ? patientConflict?.doctor?.name : null) || "another doctor";
                          const tooltipText = patientConflict
                            ? `Slot Blocked: You already have an active appointment at ${slot} with Dr. ${conflictDocName}`
                            : `This slot is already booked for this doctor`;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled
                              title={tooltipText}
                              onClick={() => {
                                if (patientConflict) {
                                  toast.error(`Slot Blocked: You already have an active appointment scheduled at ${slot} on this day with Dr. ${conflictDocName}.`);
                                }
                              }}
                              className={`rounded-lg border font-bold cursor-not-allowed py-1.5 text-center text-xs relative ${
                                patientConflict
                                  ? "border-amber-400 bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                                  : "border-slate-200 bg-slate-100/80 text-slate-400 opacity-60 line-through"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setBookingTime(slot)}
                            className={`rounded-lg border py-1.5 text-center text-xs font-bold transition-all ${isSelected
                                ? "border-emerald-600 bg-emerald-400 text-slate-950 font-black shadow"
                                : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100"
                              }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              <div>
                <label className="block mb-1">Chief Symptoms / Reason for Visit</label>
                <textarea
                  rows={3}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Describe your health symptoms or reason for appointment..."
                  className="w-full rounded-lg border px-3.5 py-2 outline-none focus:border-navy-500 font-medium text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t text-xs">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="rounded-lg px-4 py-2 border font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-navy-700 px-5 py-2 font-bold text-white hover:bg-navy-800 shadow"
                >
                  Confirm Booking Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESCHEDULE MODAL */}
      {/* ========================================================================= */}
      {rescheduleApptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border">
            <h3 className="text-base font-extrabold text-slate-800 mb-4">Reschedule Appointment</h3>
            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">New Preferred Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block mb-1">New Preferred Time Slot *</label>
                <input
                  type="time"
                  required
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setRescheduleApptId(null)} className="rounded px-4 py-2 border font-bold">
                  Close
                </button>
                <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-white font-bold hover:bg-indigo-700">
                  Save New Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CANCEL MODAL */}
      {/* ========================================================================= */}
      {cancelApptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border">
            <h3 className="text-base font-extrabold text-rose-700 mb-2">Cancel Appointment</h3>
            <p className="text-xs text-slate-500 mb-4">Are you sure you want to cancel this scheduled appointment?</p>
            <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Reason for Cancellation</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Optional notes regarding cancellation..."
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setCancelApptId(null)} className="rounded px-4 py-2 border font-bold">
                  Keep Appointment
                </button>
                <button type="submit" className="rounded bg-rose-600 px-4 py-2 text-white font-bold hover:bg-rose-700">
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PRINTABLE RX PRESCRIPTION MODAL */}
      {/* ========================================================================= */}
      {selectedPrescriptionRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border text-slate-800 space-y-4">
            {/* Header Title */}
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="rounded bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                  Verified E-Prescription Pass
                </span>
                <h3 className="text-lg font-black text-navy-900 mt-1">Metropolitan Hospital Digital RX</h3>
                <p className="text-xs text-slate-500 font-mono">
                  RX No: {selectedPrescriptionRx.prescriptionNumber || `RX-${(selectedPrescriptionRx._id || selectedPrescriptionRx.id || "").toString().slice(-6).toUpperCase()}`}
                </p>
              </div>
              <button onClick={() => setSelectedPrescriptionRx(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            {/* Patient & Doctor Meta Info */}
            <div className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Patient Name</span>
                  <span className="text-slate-800 font-bold">{patient?.name || user?.name || "Patient"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">UHID Number</span>
                  <span className="text-indigo-600 font-bold">{patient?.uhid || "HMS-PT-88201"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Attending Specialist</span>
                  <span className="text-slate-800 font-bold">
                    Dr. {typeof selectedPrescriptionRx.doctor === "object" ? selectedPrescriptionRx.doctor?.name : selectedPrescriptionRx.doctorName || selectedPrescriptionRx.doctor || "Attending Doctor"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Issued Date</span>
                  <span className="text-slate-800 font-bold">
                    {new Date(selectedPrescriptionRx.createdAt || selectedPrescriptionRx.date || Date.now()).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Diagnosis */}
              {selectedPrescriptionRx.diagnosis && (
                <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-200/60">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Primary Diagnosis</span>
                  <p className="text-xs font-extrabold text-emerald-950 mt-0.5">{selectedPrescriptionRx.diagnosis}</p>
                </div>
              )}

              {/* Prescribed Medications */}
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Prescribed Medications (Rx)</p>
                <div className="space-y-2">
                  {(() => {
                    const meds = selectedPrescriptionRx.medications || selectedPrescriptionRx.medicines || [];
                    if (meds.length === 0) {
                      return <p className="text-xs text-slate-400 italic">No specific medications listed for this record.</p>;
                    }
                    return meds.map((m: any, idx: number) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                        <div className="flex justify-between font-extrabold text-slate-900 text-xs">
                          <span>{m.name || m.medicineName || "Prescribed Medicine"} {m.strength || m.dosage ? `(${m.strength || m.dosage})` : ""}</span>
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-black">{m.frequency || "1-0-1"}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Duration: {m.duration || "5 Days"} {m.timing ? `· ${m.timing}` : ""} {m.instructions ? `· ${m.instructions}` : ""}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Doctor Advice */}
              {(selectedPrescriptionRx.advice || selectedPrescriptionRx.clinicalNotes) && (
                <div className="rounded-xl bg-indigo-50 p-3 border border-indigo-100 text-indigo-900">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 block">Special Doctor Advice</span>
                  <p className="text-xs font-medium mt-0.5">{selectedPrescriptionRx.advice || selectedPrescriptionRx.clinicalNotes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <button onClick={() => setSelectedPrescriptionRx(null)} className="rounded-lg px-4 py-2 border border-slate-300 font-bold text-xs hover:bg-slate-100 cursor-pointer">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const rx = selectedPrescriptionRx;
                  if (rx.pdfUrl || rx.fileUrl) {
                    window.open(rx.pdfUrl || rx.fileUrl, "_blank");
                  } else {
                    const content = `METROPOLITAN HOSPITAL DIGITAL RX PASS\nRX No: ${rx.prescriptionNumber || rx._id}\nDoctor: ${typeof rx.doctor === "object" ? rx.doctor?.name : rx.doctor || "Specialist"}\nDiagnosis: ${rx.diagnosis || "N/A"}\nMedications:\n` + (rx.medications || []).map((m: any) => `- ${m.name} (${m.frequency || "1-0-1"})`).join("\n");
                    const blob = new Blob([content], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Prescription-${rx.prescriptionNumber || "RX"}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Downloaded prescription file.");
                  }
                }}
                className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer active:scale-95"
              >
                <Download className="h-4 w-4" /> Download RX PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: BILL PAYMENT GATEWAY SIMULATOR MODAL */}
      {/* ========================================================================= */}
      {payInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-base font-extrabold text-slate-800">Secure Payment Checkout</h3>
              <button onClick={() => setPayInvoice(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handlePayInvoiceSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Invoice Reference</p>
                <p className="text-sm font-extrabold text-slate-800">{payInvoice._id}</p>
                <div className="mt-2 flex justify-between items-center border-t pt-2 text-sm font-extrabold text-emerald-700">
                  <span>Payable Amount:</span>
                  <span>₹{payInvoice.totals?.patientBalance || payInvoice.amount || 1450}</span>
                </div>
              </div>

              <div>
                <label className="block mb-2 font-bold">Choose Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`p-2.5 rounded-lg border text-center font-bold ${paymentMethod === "upi" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200"
                      }`}
                  >
                    <QrCode className="h-4 w-4 mx-auto mb-1" /> UPI QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-2.5 rounded-lg border text-center font-bold ${paymentMethod === "card" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200"
                      }`}
                  >
                    <CreditCard className="h-4 w-4 mx-auto mb-1" /> Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("netbanking")}
                    className={`p-2.5 rounded-lg border text-center font-bold ${paymentMethod === "netbanking" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200"
                      }`}
                  >
                    <Building className="h-4 w-4 mx-auto mb-1" /> NetBank
                  </button>
                </div>
              </div>

              {paymentMethod === "upi" && (
                <div className="rounded-xl border border-dashed border-emerald-300 p-4 text-center bg-emerald-50/30">
                  <p className="text-[11px] font-bold text-emerald-800">Scan QR Code via GPay / PhonePe / Paytm</p>
                  <div className="mx-auto my-2 flex h-28 w-28 items-center justify-center rounded-lg bg-white p-2 border shadow-sm">
                    <QrCode className="h-24 w-24 text-slate-800" />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">UPI ID: hms-hospital@bank</p>
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="space-y-3">
                  <input type="text" placeholder="Card Number (4000 1234 5678 9010)" className="w-full rounded-lg border px-3 py-2" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="MM/YY" className="w-full rounded-lg border px-3 py-2" />
                    <input type="password" placeholder="CVV" className="w-full rounded-lg border px-3 py-2" />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setPayInvoice(null)} className="rounded px-4 py-2 border font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-white font-bold hover:bg-emerald-700 flex items-center gap-2"
                >
                  {isProcessingPayment ? "Processing..." : `Pay ₹${payInvoice.totals?.patientBalance || 1450}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: PAYMENT RECEIPT MODAL */}
      {/* ========================================================================= */}
      {paidReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border text-slate-800">
            <div className="text-center mb-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Payment Receipt</h3>
              <p className="text-xs text-slate-500">Receipt No: {paidReceipt.receiptNo}</p>
            </div>

            <div className="space-y-2 rounded-xl bg-slate-50 p-4 border text-xs font-semibold">
              <p><span className="text-slate-400">Patient:</span> {paidReceipt.patientName}</p>
              <p><span className="text-slate-400">Invoice:</span> {paidReceipt.invoiceId}</p>
              <p><span className="text-slate-400">Amount Paid:</span> <span className="font-extrabold text-emerald-700">₹{paidReceipt.amount}</span></p>
              <p><span className="text-slate-400">Payment Date:</span> {paidReceipt.date}</p>
              <p><span className="text-slate-400">Method:</span> {paidReceipt.method}</p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <button onClick={() => setPaidReceipt(null)} className="rounded-lg bg-navy-700 px-5 py-2 text-white font-bold text-xs">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: INSURANCE PRE-AUTHORIZATION CLAIM MODAL */}
      {/* ========================================================================= */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-base font-extrabold text-slate-800">Submit Pre-Authorization Claim</h3>
              <button onClick={() => setIsClaimModalOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleSubmitClaim} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Claim Category</label>
                <select
                  value={claimCategory}
                  onChange={(e) => setClaimCategory(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="OPD Consultation & Diagnostics">OPD Consultation & Diagnostics</option>
                  <option value="Lab Investigation Suite">Lab Investigation Suite</option>
                  <option value="IPD Hospital Admission">IPD Hospital Admission Daycare</option>
                  <option value="Radiology & MRI Imaging">Radiology & MRI Imaging</option>
                </select>
              </div>
              <div>
                <label className="block mb-1">Estimated Claim Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block mb-1">Clinical Remarks / TPA Notes</label>
                <textarea
                  rows={3}
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  placeholder="Notes for insurance desk..."
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsClaimModalOpen(false)} className="rounded px-4 py-2 border font-bold">
                  Cancel
                </button>
                <button type="submit" className="rounded bg-navy-700 px-4 py-2 text-white font-bold hover:bg-navy-800">
                  Submit Claim Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL 10: OFFICIAL APPOINTMENT SLIP MODAL */}
      {/* ========================================================================= */}
      {viewApptSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 print:p-0 print:static print:block">
          <div id="opd-receipt-print" className="printable-area w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border text-slate-800">
            <div className="flex justify-between items-center border-b pb-4 mb-4 print:hidden">
              <div>
                <span className="rounded bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-extrabold uppercase">Official Consultation Pass</span>
                <h3 className="text-lg font-extrabold text-navy-900 mt-1">Metropolitan Hospital Outpatient Slip</h3>
              </div>
              <button onClick={() => setViewApptSlip(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Reference ID</span>
                  <span className="text-sm font-extrabold text-navy-800">{viewApptSlip.referenceId || "REF-" + viewApptSlip._id.slice(-6).toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Token Number</span>
                  <span className="text-sm font-extrabold text-emerald-700">Token #{Math.floor(10 + Math.random() * 80)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Patient Name</span>
                  <span className="text-slate-800 font-bold">{patient?.name || user?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Universal Health ID</span>
                  <span className="text-slate-800 font-bold">{patient?.uhid || "HMS-PT-88201"}</span>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-2">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Attending Specialist</p>
                <h4 className="text-base font-extrabold text-slate-800">
                  Dr. {typeof viewApptSlip.doctor === "object" ? (viewApptSlip.doctor as any).name : viewApptSlip.doctor}
                </h4>
                <p className="text-xs text-slate-600">
                  Department: {typeof viewApptSlip.department === "object" && viewApptSlip.department ? (viewApptSlip.department as any).name : "General Medicine"}
                </p>
                <div className="flex justify-between items-center pt-2 border-t text-xs font-bold text-slate-700">
                  <span>Date: {new Date(viewApptSlip.date).toLocaleDateString("en-IN")}</span>
                  <span className="text-indigo-700">Slot: {viewApptSlip.time}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-6 print:hidden">
              <button onClick={() => setViewApptSlip(null)} className="rounded-lg px-4 py-2 border font-bold text-xs">
                Close
              </button>
              <button
                onClick={() => {
                  toast.success("Printing Outpatient Appointment Slip...");
                  window.print();
                }}
                className="rounded-lg bg-navy-700 px-4 py-2 text-white font-bold text-xs hover:bg-navy-800 flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print Slip Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 12: PAYMENT & BILLING CHECKOUT DIALOG MODAL */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-slate-100 text-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Title Bar */}
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="rounded bg-indigo-100 text-indigo-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                  Outpatient Billing Desk & Checkout
                </span>
                <h3 className="text-xl font-black text-navy-900 mt-1 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-600" /> Confirm Consultation Payment
                </h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {(() => {
              const activeDoc = doctors.find((d: any) => d._id === selectedDoctorId || d.id === selectedDoctorId || d.user?._id === selectedDoctorId || d.user === selectedDoctorId) || doctors[0];
              const baseFee = (activeDoc?.consultationSettings as any)?.fee || (activeDoc as any)?.fee || 500;
              const isRevisit = isWithinOpLimit(selectedDoctorId, bookingDate);
              const finalFee = isRevisit ? 0 : baseFee;
              const dateToUse = bookingDate || new Date().toISOString().split("T")[0];
              const availSlots = getAvailableTimeSlots(dateToUse, selectedDoctorId);
              const timeToUse = bookingTime || (availSlots.length > 0 ? availSlots[0] : "09:00");
              const invId = "INV-" + new Date().getFullYear() + Math.floor(100000 + Math.random() * 900000);

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                  {/* LEFT SIDE: INVOICE & PATIENT SUMMARY (Matching Receptionist Billing Screenshot) */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4 text-xs font-semibold">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Invoice Reference</span>
                        <span className="font-extrabold text-navy-800 text-sm">{invId}</span>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${finalFee === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {finalFee === 0 ? "EXEMPTED" : "UNPAID"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Patient Name</span>
                        <span className="font-extrabold text-slate-800">{patient?.name || user?.name || "Patient"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Universal Health ID</span>
                        <span className="font-extrabold text-indigo-600">{patient?.uhid || "UHID-8326773101"}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Item Description & Breakdown</p>

                      <div className="rounded-xl border bg-white overflow-hidden text-[11px]">
                        <div className="grid grid-cols-4 bg-slate-100 p-2 font-bold text-slate-500 border-b">
                          <span className="col-span-2">Description</span>
                          <span className="text-center">Qty</span>
                          <span className="text-right">Price</span>
                        </div>

                        <div className="grid grid-cols-4 p-2.5 border-b text-slate-700">
                          <span className="col-span-2 font-bold">Registration Fee</span>
                          <span className="text-center">1</span>
                          <span className="text-right font-extrabold text-emerald-600">₹0.00</span>
                        </div>

                        <div className="grid grid-cols-4 p-2.5 text-slate-800">
                          <span className="col-span-2">
                            <span className="font-bold block">Dr. {activeDoc?.name || "Specialist"}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{bookingType} · {dateToUse} ({timeToUse})</span>
                          </span>
                          <span className="text-center">1</span>
                          <span className={`text-right font-extrabold ${isRevisit ? "text-emerald-600" : "text-slate-900"}`}>
                            ₹{finalFee}.00
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-bold text-slate-800">₹{finalFee}.00</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>GST / Taxes:</span>
                        <span className="font-bold text-slate-800">₹0.00</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-black text-sm text-slate-900">
                        <span>Total Payable Amount:</span>
                        <span className="text-lg text-navy-900">₹{finalFee}.00</span>
                      </div>
                    </div>

                    {isRevisit && (
                      <div className="rounded-xl bg-emerald-100/80 p-3 border border-emerald-300 text-emerald-900 text-[11px] font-extrabold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                        <span>OP Validity Exemption Applied: ₹0.00 (Free Revisit within 7 days).</span>
                      </div>
                    )}
                  </div>

                  {/* RIGHT SIDE: PROCESS RECEIPT PAYMENT & MODE SELECTION */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                        Process Receipt Payment
                      </h4>
                      <p className="text-xs text-slate-500">Select payment method and complete consultation billing.</p>
                    </div>

                    {finalFee > 0 ? (
                      <div className="space-y-4">
                        {/* PAYMENT METHOD SELECTOR */}
                        <div>
                          <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
                            PAYMENT METHOD *
                          </label>
                          <select
                            value={checkoutPaymentMethod}
                            onChange={(e) => setCheckoutPaymentMethod(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                          >
                            <option value="UPI">📲 UPI / PhonePe / GPay / QR Code</option>
                            <option value="Card">💳 Credit / Debit Card</option>
                            <option value="NetBanking">🌐 Net Banking</option>
                            <option value="Cash">🏥 Pay at Hospital Counter (Cash)</option>
                          </select>
                        </div>

                        {/* MODE SPECIFIC DETAILS */}
                        {checkoutPaymentMethod === "UPI" && (
                          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-900">Scan QR Code to Pay</span>
                              <span className="text-[10px] font-extrabold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-200">
                                UPI ID: speshway.hms@upi
                              </span>
                            </div>

                            {/* Simulated QR Code */}
                            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100">
                              <div className="h-28 w-28 border-4 border-indigo-600 p-1 rounded-xl flex items-center justify-center bg-slate-900 text-white font-mono text-[9px] text-center leading-tight shadow-inner">
                                [ QR CODE ]<br />
                                SCAN VIA GPAY / PHONEPE / PAYTM
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 mt-2">Amount: ₹{finalFee}.00</span>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-indigo-900 mb-1">
                                Enter UPI VPA / Transaction Ref No (Optional):
                              </label>
                              <input
                                type="text"
                                value={upiIdInput}
                                onChange={(e) => setUpiIdInput(e.target.value)}
                                placeholder="e.g., patient@okicici or 409281729381"
                                className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                              />
                            </div>
                          </div>
                        )}

                        {checkoutPaymentMethod === "Card" && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">16-Digit Card Number *</label>
                              <input
                                type="text"
                                value={cardNumberInput}
                                onChange={(e) => setCardNumberInput(e.target.value)}
                                placeholder="4532 •••• •••• 8892"
                                className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">Expiry (MM/YY) *</label>
                                <input
                                  type="text"
                                  value={cardExpiryInput}
                                  onChange={(e) => setCardExpiryInput(e.target.value)}
                                  placeholder="08/29"
                                  className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">CVV *</label>
                                <input
                                  type="password"
                                  maxLength={3}
                                  value={cardCvvInput}
                                  onChange={(e) => setCardCvvInput(e.target.value)}
                                  placeholder="•••"
                                  className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {checkoutPaymentMethod === "NetBanking" && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                            <label className="block text-[10px] font-bold text-slate-600">Select Bank *</label>
                            <select
                              value={selectedBank}
                              onChange={(e) => setSelectedBank(e.target.value)}
                              className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-bold text-slate-800"
                            >
                              <option value="HDFC Bank">HDFC Bank</option>
                              <option value="ICICI Bank">ICICI Bank</option>
                              <option value="State Bank of India">State Bank of India (SBI)</option>
                              <option value="Axis Bank">Axis Bank</option>
                              <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                            </select>
                          </div>
                        )}

                        {checkoutPaymentMethod === "Cash" && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900 space-y-1">
                            <p className="font-bold">Pay at Hospital Counter</p>
                            <p className="text-[11px] text-amber-800">
                              Your appointment request will be registered as pending payment. You can pay cash at the hospital reception counter before consultation.
                            </p>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                            PAYMENT AMOUNT (₹) *
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={`${finalFee}.00`}
                            className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-extrabold text-slate-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-xs font-semibold text-emerald-900 space-y-2">
                        <h5 className="font-extrabold text-emerald-800 text-sm">No Payment Required</h5>
                        <p className="text-[11px] text-emerald-700">
                          Your visit qualifies for a free consultation under the 7-day OPD Revisit policy. Click below to complete your appointment booking directly.
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setIsPaymentModalOpen(false)}
                        className="rounded-xl px-4 py-2.5 border font-bold text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingCheckout}
                        onClick={handleFinalPaymentSubmit}
                        className="rounded-xl bg-navy-800 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-navy-900 shadow-lg cursor-pointer active:scale-95 transition-all flex items-center gap-2"
                      >
                        {isProcessingCheckout ? (
                          <>
                            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Processing Payment...
                          </>
                        ) : finalFee === 0 ? (
                          "Complete Free Booking (₹0.00)"
                        ) : (
                          `Confirm & Pay ₹${finalFee}.00`
                        )}
                      </button>
                    </div>

                  </div>

                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 12: DETAILED DIAGNOSTIC REPORT POPUP MODAL */}
      {/* ========================================================================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {safeText(selectedReport.testName, "Diagnostic Investigation Report")}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {safeText(selectedReport.category) || safeText(selectedReport.requestType) || "Laboratory"} · Ref: {safeText(selectedReport.appointment?.referenceId) || (typeof selectedReport._id === "string" ? `REP-${selectedReport._id.slice(-6).toUpperCase()}` : "REF-LIVE")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={selectedReport.status === "Critical" ? "danger" : selectedReport.status === "Borderline" ? "warning" : "success"}>
                  {selectedReport.status === "report_uploaded" ? "Uploaded" : safeText(selectedReport.status, "VERIFIED").toUpperCase()}
                </Badge>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient</span>
                  <span className="font-extrabold text-slate-800">{safeText(patient?.name) || safeText(user?.name) || "Patient"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UHID</span>
                  <span className="font-mono font-bold text-slate-800">{safeText(patient?.uhid) || "UHID-1002"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ordering Doctor</span>
                  <span className="font-bold text-slate-800">
                    Dr. {safeText(selectedReport.doctor, "Attending Doctor")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Report Date</span>
                  <span className="font-medium text-slate-700">
                    {new Date(selectedReport.uploadedAt || selectedReport.createdAt || Date.now()).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Clinical Observations & Findings */}
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-emerald-600" /> Findings & Observations
                  </span>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap pt-1">
                    {safeText(selectedReport.observations) || safeText(selectedReport.notes) || "Investigation completed. All parameters verified against standard pathology reference ranges."}
                  </p>
                </div>

                {(safeText(selectedReport.remarks) || safeText(selectedReport.advice)) && (
                  <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 space-y-1">
                    <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">Technical Remarks & Doctor Advice</span>
                    <p className="text-xs font-medium text-amber-900 italic whitespace-pre-wrap pt-0.5">
                      {safeText(selectedReport.remarks) || safeText(selectedReport.advice)}
                    </p>
                  </div>
                )}
              </div>

              {/* Document Attachments & File Preview */}
              {(selectedReport.files?.length > 0 || selectedReport.fileUrl) && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Attached Report Documents ({(selectedReport.files?.length || 1)})
                  </h4>

                  <div className="space-y-2">
                    {(selectedReport.files || [{ secure_url: selectedReport.fileUrl, original_filename: `${safeText(selectedReport.testName, "Lab_Report")}.pdf` }]).map((file: any, index: number) => {
                      const fileUrl = safeText(file?.secure_url) || safeText(file?.url) || safeText(file);
                      const fileName = safeText(file?.original_filename) || `${safeText(selectedReport.testName, "Report")}_Document_${index + 1}`;
                      const isImage = typeof fileUrl === "string" && (fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) || fileUrl.includes("/image/upload/"));
                      return (
                        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {fileName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
                              >
                                <Eye className="h-3.5 w-3.5" /> View Full Document
                              </a>
                              <a
                                href={fileUrl.includes("res.cloudinary.com") ? fileUrl.replace("/upload/", "/upload/fl_attachment/") : fileUrl}
                                download={fileName || "report.pdf"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all"
                              >
                                <Download className="h-3.5 w-3.5" /> Download
                              </a>
                            </div>
                          </div>

                          {/* Inline Image Preview if document is an image */}
                          {isImage && (
                            <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900 max-h-64 flex items-center justify-center">
                              <img src={fileUrl} alt={safeText(selectedReport.testName, "Report")} className="max-h-64 object-contain" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <p className="text-[11px] font-semibold text-slate-400">
                Official Digital Report issued by Spesway Hospitals Pathology & Diagnostic Lab
              </p>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-xl bg-navy-800 px-5 py-2 text-xs font-extrabold text-white hover:bg-navy-900 shadow transition-all cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 13: RADIOLOGY SCAN & DICOM IMAGING VIEWER MODAL */}
      {/* ========================================================================= */}
      {selectedRadiology && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <ScanLine className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {safeText(selectedRadiology?.testName, "Radiology Scan & Imaging")}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {safeText(selectedRadiology?.category) || safeText(selectedRadiology?.requestType) || "Radiology"} · Ref: {safeText(selectedRadiology?.appointment?.referenceId) || (typeof selectedRadiology?._id === "string" ? `RAD-${selectedRadiology._id.slice(-6).toUpperCase()}` : "REF-LIVE")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="success">
                  {selectedRadiology?.status === "report_uploaded" ? "Uploaded" : safeText(selectedRadiology?.status, "VERIFIED").toUpperCase()}
                </Badge>
                <button
                  onClick={() => {
                    setSelectedRadiology(null);
                    setDicomZoom(1);
                    setDicomRotation(0);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                  aria-label="Close radiology scan modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient</span>
                  <span className="font-extrabold text-slate-800">{safeText(patient?.name) || safeText(user?.name) || "Patient"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UHID</span>
                  <span className="font-mono font-bold text-slate-800">{safeText(patient?.uhid) || "UHID-1002"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ordering Doctor</span>
                  <span className="font-bold text-slate-800">
                    Dr. {safeText(selectedRadiology?.doctor, "Radiologist")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Report Date</span>
                  <span className="font-medium text-slate-700">
                    {new Date(selectedRadiology?.createdAt || selectedRadiology?.uploadedAt || Date.now()).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Findings & Observations Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-emerald-600" /> Findings & Observations
                </span>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap pt-1">
                  {safeText(selectedRadiology?.observations) || safeText(selectedRadiology?.remarks) || safeText(selectedRadiology?.findings) || "No radiological abnormalities detected. Standard diagnostic scan parameters recorded."}
                </p>
              </div>

              {/* DICOM Scan Document & Interactive Viewer Container */}
              {(() => {
                const rawUrl = safeText(selectedRadiology?.files?.[0]?.secure_url) || safeText(selectedRadiology?.fileUrl);
                const scanUrl = rawUrl || "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80";
                const fileName = safeText(selectedRadiology?.files?.[0]?.original_filename) || `${safeText(selectedRadiology?.testName, "Radiology_Scan")}.png`;

                return (
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Attached Scan Documents ({(selectedRadiology?.files?.length || 1)})
                    </h4>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-3">
                      {/* Document Toolbar */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <ImageIcon className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {fileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={scanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Full Document
                          </a>
                          <a
                            href={scanUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </a>
                        </div>
                      </div>

                      {/* Integrated High-Resolution DICOM Viewer Canvas */}
                      <div className="relative rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center justify-center min-h-[300px] p-3 group">
                        {/* DICOM Control Bar */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-bold text-white">
                          <span className="text-indigo-300 flex items-center gap-1.5 text-[11px]">
                            <Sparkles className="h-3.5 w-3.5" /> DICOM Viewer Canvas
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setDicomZoom((z) => Math.min(z + 0.25, 3))}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                              title="Zoom In"
                            >
                              <ZoomIn className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDicomZoom((z) => Math.max(z - 0.25, 0.5))}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                              title="Zoom Out"
                            >
                              <ZoomOut className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDicomRotation((r) => (r + 90) % 360)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                              title="Rotate"
                            >
                              <RotateCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDicomZoom(1);
                                setDicomRotation(0);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                              title="Reset View"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Image Canvas */}
                        <div className="overflow-auto max-h-[350px] w-full flex items-center justify-center p-2 pt-10">
                          <img
                            src={scanUrl}
                            alt={safeText(selectedRadiology?.testName, "Radiology Scan")}
                            style={{
                              transform: `scale(${dicomZoom}) rotate(${dicomRotation}deg)`,
                              transition: "transform 0.2s ease-out"
                            }}
                            className="max-h-[300px] object-contain rounded-lg shadow-xl"
                          />
                        </div>

                        {/* Bottom Status Indicator */}
                        <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800/80 px-1 text-[11px]">
                          <span className="text-slate-400">Zoom: {Math.round(dicomZoom * 100)}% · Rotation: {dicomRotation}°</span>
                          <a
                            href={scanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            <Eye className="h-3 w-3" /> Full Screen
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <p className="text-[11px] font-semibold text-slate-400">
                Official Digital Radiology Report issued by Spesway Hospitals Diagnostic Center
              </p>
              <button
                onClick={() => {
                  setSelectedRadiology(null);
                  setDicomZoom(1);
                  setDicomRotation(0);
                }}
                className="rounded-xl bg-navy-800 px-5 py-2 text-xs font-extrabold text-white hover:bg-navy-900 shadow transition-all cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;
