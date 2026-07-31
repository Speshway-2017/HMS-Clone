import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { socket } from "../../lib/socket";
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
  CheckSquare
} from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";
import { usePatientProfileMe, usePatientInvoices, usePatientReports, useUpdatePatient, useUpdatePatientProfileMe, usePatientPrescriptions } from "../../features/patients";
import { useAppointments, useCreateAppointment, useUpdateAppointment } from "../../features/appointments";
import { useDoctors } from "../../features/doctors";
import { useNotifications } from "../../features/notifications";
import { api } from "../../lib/api";



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

export function PatientDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<
    "overview" | "profile" | "appointments" | "history" | "prescriptions" | "reports" | "imaging" | "billing" | "insurance" | "telehealth" | "notifications"
  >((tabFromUrl as any) || "overview");

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl as any);
    }
  }, [tabFromUrl]);

  const changeTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
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
  const prescriptions = prescriptionsRes || [];
  
  // Real notifications list from backend or empty array
  const rawNotifications = notificationsData?.data?.notifications || [];
  // Conformed notifications mapping to support the local actions and priority fields
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (rawNotifications.length > 0) {
      setNotifications(
        rawNotifications.map((n: any) => ({
          id: n.id || n._id,
          title: n.title,
          message: n.message,
          time: new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: n.type === "appointment" ? "reminders" : n.type === "invoice" ? "alerts" : "updates",
          read: n.read ?? false,
          priority: n.severity === "critical" ? "high" : "normal"
        }))
      );
    } else {
      setNotifications([]);
    }
  }, [rawNotifications]);

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

  const labReports = reports?.filter((r: any) => r.requestType === "Laboratory") || [];
  const radiologyReports = reports?.filter((r: any) => r.requestType === "Radiology") || [];

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

  // Reception-style Appointments Sub-tab & Calendar State
  const [apptSubTab, setApptSubTab] = useState<"scheduled" | "book" | "calendar" | "completed">("scheduled");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [apptSearchQuery, setApptSearchQuery] = useState("");
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [selectedCalendarDayAppts, setSelectedCalendarDayAppts] = useState<{ day: number; appts: any[] } | null>(null);
  const [viewApptSlip, setViewApptSlip] = useState<any | null>(null);

  // Payment & Billing Checkout Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<"UPI" | "Card" | "NetBanking" | "Cash">("UPI");
  const [upiIdInput, setUpiIdInput] = useState("");
  const [cardNumberInput, setCardNumberInput] = useState("");
  const [cardExpiryInput, setCardExpiryInput] = useState("");
  const [cardCvvInput, setCardCvvInput] = useState("");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Dynamic 15-min slot generator & past-slot filter for TODAY ("before slots should not be visible")
  const generate15MinSlots = (from: string, to: string, duration: number = 15, breakTime?: string) => {
    const slots: string[] = [];
    const [startH, startM] = from.split(":").map(Number);
    const [endH, endM] = to.split(":").map(Number);

    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    let breakStart = -1;
    let breakEnd = -1;
    if (breakTime) {
      const [breakH, breakM] = breakTime.split(":").map(Number);
      breakStart = breakH * 60 + breakM;
      breakEnd = breakStart + 60;
    }

    while (current + duration <= end) {
      if (breakStart !== -1 && current >= breakStart && current < breakEnd) {
        current += duration;
        continue;
      }
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push(timeStr);
      current += duration;
    }
    return slots;
  };

  const getAvailableTimeSlots = (dateStr: string, doctorId?: string) => {
    const selectedDoc = doctors?.find((d: any) => d._id === doctorId);
    let from = "09:00";
    let to = "17:00";
    let duration = 15;
    let breakTime = "13:00";

    if (selectedDoc) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dateObj = new Date(dateStr || new Date());
      const dayName = days[dateObj.getDay()];
      const daySchedule = selectedDoc.workingHours?.find((wh: any) => wh.day === dayName);

      if (daySchedule && !daySchedule.active) {
        return [];
      }
      if (daySchedule?.from && daySchedule.from !== "—") from = daySchedule.from;
      if (daySchedule?.to && daySchedule.to !== "—") to = daySchedule.to;
      if (selectedDoc.consultationSettings?.slotDuration) duration = selectedDoc.consultationSettings.slotDuration;
      if (selectedDoc.consultationSettings?.breakTime) breakTime = selectedDoc.consultationSettings.breakTime;
    }

    let generated = generate15MinSlots(from, to, duration, breakTime);

    // CRITICAL REQUIREMENT: "before slots should not be visible"
    // For TODAY, filter out all time slots before current time!
    const todayStr = new Date().toISOString().split("T")[0];
    const targetDateStr = dateStr || todayStr;
    if (targetDateStr === todayStr) {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      generated = generated.filter((slot) => {
        const [h, m] = slot.split(":").map(Number);
        return h > currentH || (h === currentH && m > currentM);
      });
    }

    return generated;
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

  // Prescriptions RX Print Modal State
  const [selectedPrescriptionRx, setSelectedPrescriptionRx] = useState<any>(null);

  // Billing Payment Modal State
  const [payInvoice, setPayInvoice] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paidReceipt, setPaidReceipt] = useState<any>(null);

  // Insurance Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimAmount, setClaimAmount] = useState("");
  const [claimCategory, setClaimCategory] = useState("OPD Consultation");
  const [claimNotes, setClaimNotes] = useState("");
  const [claimsList, setClaimsList] = useState<any[]>([]);

  // Video Consultation Telehealth Call Room State
  const [activeVideoCall, setActiveVideoCall] = useState<any>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: "Dr. Rajesh Sharma", text: "Hello! Welcome to our telehealth session. How are you feeling today?", time: "16:00" }
  ]);
  const [chatInput, setChatInput] = useState("");

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
    if (!timeToUse) {
      const availSlots = getAvailableTimeSlots(dateToUse, docId);
      if (availSlots.length > 0) {
        timeToUse = availSlots[0];
        setBookingTime(timeToUse);
      } else {
        toast.error("No available time slots for the selected date. (All past slots for today are hidden). Please pick a future date.");
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
      toast.error(err.message || "Failed to reschedule appointment.");
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
      toast.error(err.message || "Failed to cancel appointment.");
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
    if (!chatInput.trim()) return;
    const newMsg = {
      sender: patient?.name || "Patient",
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setChatMessages([...chatMessages, newMsg]);
    setChatInput("");
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isLoading = isPatientLoading || isApptsLoading || isInvoicesLoading || isReportsLoading || isPrescriptionsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
        <p className="text-sm font-semibold text-slate-500">Loading Patient Portal Dashboard...</p>
      </div>
    );
  }

  // Calculated values
  const pendingInvoices = invoices?.filter((inv) => inv.status === "pending" || inv.status === "partially_paid") || [];
  const totalBalance = pendingInvoices.reduce((sum, inv) => sum + (inv.totals?.patientBalance || 0), 0);
  const scheduledAppointments = appointments.filter((a) => a.status === "scheduled" || a.status === "pending_payment");
  const nextAppointment = scheduledAppointments[0];
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 pb-12">
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
            Welcome back, {patient?.name ?? user?.name} 👋
          </h1>
          <p className="mt-1 text-xs text-indigo-200/80">
            Manage consultations, prescriptions, lab reports, radiology imaging, billing, and join video doctor appointments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-navy-800 hover:bg-indigo-50 transition-all shadow-md active:scale-95"
          >
            <Plus className="h-4 w-4 text-navy-700" /> Book Appointment
          </button>
          <button
            onClick={() => changeTab("telehealth")}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500/30 border border-indigo-300/30 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500/50 transition-all active:scale-95"
          >
            <Video className="h-4 w-4 text-indigo-300" /> Video Consult
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm scrollbar-none">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "profile", label: "Profile", icon: User },
          { id: "appointments", label: "Appointments", icon: Calendar, badge: scheduledAppointments.length },
          { id: "history", label: "Medical History", icon: Heart },
          { id: "prescriptions", label: "Prescriptions", icon: Pill },
          { id: "reports", label: "Lab Reports", icon: FileText, badge: reports?.length },
          { id: "imaging", label: "Radiology & Scans", icon: ImageIcon },
          { id: "billing", label: "Billing & Pay", icon: Wallet, badge: pendingInvoices.length ? `₹${totalBalance}` : undefined },
          { id: "insurance", label: "Insurance", icon: Shield },
          { id: "telehealth", label: "Video Consult", icon: Video },
          { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotificationsCount || undefined }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => changeTab(t.id as any)}
              className={`relative flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-xs font-bold rounded-lg transition-all ${isActive
                  ? "bg-navy-700 text-white shadow-md"
                  : "text-slate-600 hover:text-navy-700 hover:bg-slate-100/80"
                }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-indigo-200" : "text-slate-400"}`} />
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge !== 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${isActive ? "bg-white text-navy-800" : "bg-indigo-100 text-indigo-700"
                    }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW TAB */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Upcoming Consultations"
              value={scheduledAppointments.length}
              icon={<Calendar className="h-5 w-5 text-indigo-500" />}
              emphasis
            />
            <KpiCard
              label="Prescribed Medicines"
              value={prescriptions.reduce((sum, rx) => sum + (rx.medications?.length || 0), 0)}
              icon={<Pill className="h-5 w-5 text-emerald-500" />}
            />
            <KpiCard
              label="Diagnostic & Scans"
              value={reports?.length || 0}
              icon={<FileText className="h-5 w-5 text-blue-500" />}
            />
            <KpiCard
              label="Pending Payables"
              value={`₹${totalBalance.toLocaleString("en-IN")}`}
              icon={<Wallet className="h-5 w-5 text-amber-500" />}
            />
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
                  <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-blue-50/30 p-5 shadow-sm">
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
                    <div className="text-right">
                      <p className="text-base font-extrabold text-navy-700">
                        {new Date(nextAppointment.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-xs font-bold text-slate-500">{nextAppointment.time}</p>
                      <Badge tone="info" className="mt-1">Confirmed</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                    <p className="text-xs font-semibold">No upcoming appointments right now</p>
                    <button onClick={() => setIsBookModalOpen(true)} className="mt-2 text-xs font-bold text-navy-700 hover:underline">
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

          {/* Sub-tab Navigation (Receptionist style) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
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
                            {isUpcoming && (
                              <>
                                <button
                                  onClick={() => {
                                    setRescheduleApptId(a._id);
                                    setRescheduleDate(a.date.split("T")[0]);
                                    setRescheduleTime(a.time);
                                  }}
                                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
                                >
                                  Reschedule
                                </button>
                                <button
                                  onClick={() => setCancelApptId(a._id)}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {a.type?.toLowerCase().includes("video") && isUpcoming && (
                              <button
                                onClick={() => {
                                  setActiveVideoCall({
                                    id: a._id,
                                    doctorName: docName,
                                    time: a.time,
                                    date: new Date(a.date).toLocaleDateString("en-IN")
                                  });
                                }}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Video className="h-3.5 w-3.5" /> Join Call
                              </button>
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
                          const isSelected = activeSelectedDoc ? (activeSelectedDoc._id === doc._id || activeSelectedDoc.id === doc.id || (activeSelectedDoc.user && (activeSelectedDoc.user._id === doc.user?._id || activeSelectedDoc.user === doc.user))) : false;
                          const status = doc.status || "on_duty";
                          return (
                            <div
                              key={doc._id || doc.id}
                              onClick={() => setSelectedDoctorId(doc._id || doc.id || doc.user?._id || doc.user)}
                              className={`relative cursor-pointer rounded-2xl border p-4 transition-all ${isSelected
                                  ? "border-navy-700 bg-indigo-50/40 ring-2 ring-navy-600 shadow-md scale-[1.02]"
                                  : "border-slate-200 bg-white hover:border-navy-300 hover:shadow-sm"
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-indigo-800 text-white font-extrabold text-lg shadow-sm shrink-0">
                                  {doc.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-extrabold text-slate-800 truncate">Dr. {doc.name}</h4>
                                    {isSelected && <CheckCircle2 className="h-5 w-5 text-navy-700 shrink-0" />}
                                  </div>
                                  <p className="text-xs font-semibold text-indigo-600 truncate">{doc.specialization || "General Specialist"}</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{doc.qualification || "MD, MBBS"}</p>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px] font-semibold">
                                <span className="text-slate-600">Fee: ₹{(doc.consultationSettings as any)?.fee || doc.fee || 500}</span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${status === "on_duty"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : status === "on_leave"
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${status === "on_duty" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                                  {status === "on_duty" ? "On Duty" : status === "on_leave" ? "On Leave" : "Available"}
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
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 pt-1">
                            {slots.map((slot) => {
                              const isSelected = bookingTime === slot || (!!bookingTime && !!slot && normalizeTime(bookingTime) === normalizeTime(slot));
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
                              {activeDoc ? `Dr. ${activeDoc.name}` : "Auto-assigned"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-1 border-b border-slate-100">
                            <span className="text-slate-500">Department:</span>
                            <span className="font-bold text-indigo-600">
                              {activeDoc ? (typeof activeDoc.department === "object" && activeDoc.department ? activeDoc.department.name : activeDoc.department || activeDoc.specialization) : "General Medicine"}
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
        <Card className="p-6 space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" /> Clinical History & Consultation Logs
            </h3>
            <p className="text-xs text-slate-500">Comprehensive timeline of your hospital visits, diagnoses, and medical records.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {patient?.medicalHistory && patient.medicalHistory.length > 0 ? (
              patient.medicalHistory.map((entry, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{entry.visitType || "OPD Consultation"}</span>
                      <h4 className="text-base font-extrabold text-slate-800">{entry.diagnosis || "Regular Consultation"}</h4>
                    </div>
                    <Badge tone="info">{new Date(entry.date).toLocaleDateString("en-IN")}</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p><span className="font-semibold text-slate-500">Attending Physician:</span> Dr. {entry.doctorName}</p>
                    <p><span className="font-semibold text-slate-500">Department:</span> {entry.department || "General OPD"}</p>
                    {entry.notes && (
                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-medium text-slate-700 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Clinical Notes & Treatment Advice</p>
                        {entry.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed rounded-xl bg-slate-50">
                <Heart className="h-12 w-12 text-slate-300 mb-2" />
                <p className="text-sm font-semibold">No medical history records found.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. DIGITAL PRESCRIPTIONS TAB */}
      {/* ========================================================================= */}
      {activeTab === "prescriptions" && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-600" /> Digital Prescriptions & Pharmacy Records
              </h3>
              <p className="text-xs text-slate-500">Access prescribed medicines, dosage timings, and download digital RX copies.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {prescriptions.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed rounded-xl bg-slate-50">
                <Pill className="h-12 w-12 text-slate-300 mb-2" />
                <p className="text-sm font-semibold">No digital prescriptions found.</p>
              </div>
            ) : (
              prescriptions.map((rx) => {
                const docName = typeof rx.doctor === "object" ? (rx.doctor as any)?.name : "Specialist";
                const specialty = typeof rx.doctor === "object" ? (rx.doctor as any)?.specialization : "";
                const dateStr = new Date(rx.createdAt).toLocaleDateString("en-IN");
                const rxNumber = rx.prescriptionNumber || rx._id;
                return (
                  <div key={rx._id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start border-b pb-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-navy-700">{rxNumber}</span>
                            <Badge tone={rx.status === "Dispensed" || rx.status === "Completed" ? "success" : "neutral"}>{rx.status}</Badge>
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-800 mt-1">{rx.diagnosis || "Consultation Diagnosis"}</h4>
                          <p className="text-xs text-slate-500">Dr. {docName} {specialty && `(${specialty})`} · {dateStr}</p>
                        </div>
                        {rx.pdfUrl && (
                          <a
                            href={rx.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-navy-600 px-3 py-1.5 text-xs font-bold text-navy-700 hover:bg-navy-50 transition-all"
                          >
                            <Download className="h-3.5 w-3.5" /> Download RX PDF
                          </a>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prescribed Medicines ({rx.medications?.length || 0})</p>
                        {rx.medications?.map((med: any, idx: number) => (
                          <div key={idx} className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-extrabold text-slate-800">{med.name}</p>
                              <p className="text-[11px] text-slate-500">{med.strength || med.dosage || "N/A"} · {med.duration || "N/A"}</p>
                              {med.instructions && (
                                <p className="text-[10px] text-slate-400 italic mt-0.5">{med.instructions}</p>
                              )}
                            </div>
                            {med.frequency && (
                              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
                                {med.frequency}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {rx.advice && (
                        <div className="mt-4 rounded-xl bg-indigo-50/50 p-3 text-xs font-medium text-indigo-900 border border-indigo-100">
                          <span className="font-bold text-indigo-700">Special Instructions: </span> {rx.advice}
                        </div>
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
                const docName = typeof rep.doctor === "object" ? rep.doctor?.name : "Pathologist";
                const dateStr = new Date(rep.createdAt || rep.uploadedAt).toLocaleDateString("en-IN");
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
                          {rep.status === "report_uploaded" ? "Uploaded" : rep.status || "Verified"}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-800">{rep.testName}</h4>
                      <p className="text-xs text-slate-400">{rep.category || "Laboratory Speciality"} · {dateStr}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-600">Doctor: Dr. {docName}</p>
                    </div>
                    <div className="mt-4 border-t pt-3 flex items-center justify-between text-xs">
                      <span className="font-bold text-navy-700 group-hover:underline flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> View Report Details
                      </span>
                      {rep.files?.[0]?.secure_url && (
                        <a
                          href={rep.files[0].secure_url}
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
                const docName = typeof rad.doctor === "object" ? rad.doctor?.name : "Radiologist";
                const imgUrl = rad.files?.[0]?.secure_url || "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80";
                const dateStr = new Date(rad.createdAt || rad.uploadedAt).toLocaleDateString("en-IN");
                return (
                  <div
                    key={rad._id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setSelectedRadiology(rad)}>
                        <img src={imgUrl} alt={rad.testName} className="h-full w-full object-cover opacity-85 hover:opacity-100 hover:scale-105 transition-all duration-300" />
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
                          <h4 className="text-sm font-extrabold text-slate-800">{rad.testName}</h4>
                          <Badge tone="success">{rad.status === "report_uploaded" ? "Uploaded" : rad.status}</Badge>
                        </div>
                        <p className="text-xs text-slate-500">Dr. {docName} · {dateStr}</p>
                        <p className="text-xs font-medium text-slate-600 line-clamp-2 mt-2">{rad.observations || rad.remarks || "No findings summary."}</p>
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
        <Card className="p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-500" /> Hospital Billing & Secure Payments
              </h3>
              <p className="text-xs text-slate-500">Pay hospital invoices online via UPI, Credit Card, or Netbanking and download receipts.</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-4 py-2 border border-amber-200 flex items-center gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-600">Total Outstanding Balance</p>
                <p className="text-base font-extrabold text-amber-900">₹{totalBalance.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-y">
                <tr>
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Service Category</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Insurance Coverage</th>
                  <th className="px-4 py-3">Your Pay Balance</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(invoices || []).map((inv: any) => (
                  <tr key={inv._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{inv._id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-3.5 font-semibold">{inv.billingType || "Medical Services"}</td>
                    <td className="px-4 py-3.5 font-bold">₹{inv.totals?.total}</td>
                    <td className="px-4 py-3.5 text-indigo-700 font-bold">{inv.insuranceCoveragePercent || 0}%</td>
                    <td className="px-4 py-3.5 font-extrabold text-amber-600">₹{inv.totals?.patientBalance}</td>
                    <td className="px-4 py-3.5 text-slate-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "N/A"}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={inv.status === "paid" ? "success" : inv.status === "pending" ? "warning" : "danger"}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {inv.status !== "paid" ? (
                        <button
                          onClick={() => setPayInvoice(inv)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow"
                        >
                          Pay ₹{inv.totals?.patientBalance}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setPaidReceipt({
                              receiptNo: `RCP-88910`,
                              invoiceId: inv._id,
                              amount: inv.totals?.total || 4500,
                              date: "2026-07-15",
                              method: "INSURANCE / UPI",
                              patientName: patient?.name || user?.name
                            });
                          }}
                          className="rounded-lg border px-3 py-1.5 text-xs font-bold text-navy-700 hover:bg-slate-50"
                        >
                          Receipt PDF
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!invoices || invoices.length === 0) && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Wallet className="h-12 w-12 text-slate-300 mb-2" />
                        <p className="text-sm font-semibold">No billing invoices found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Video className="h-5 w-5 text-indigo-600" /> Online Doctor Video Consultations
              </h3>
              <p className="text-xs text-slate-500">Join real-time HD video appointments with your attending physicians.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {(() => {
              const videoAppointments = appointments.filter(
                (a) => a.type?.toLowerCase().includes("video") && (a.status === "scheduled" || a.status === "pending_payment")
              );
              if (videoAppointments.length === 0) {
                return (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed rounded-xl bg-slate-50">
                    <Video className="h-12 w-12 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold">No upcoming video consultations found.</p>
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
                    <div className="mt-6 pt-4 border-t">
                      <button
                        onClick={() => setActiveVideoCall({
                          id: sess._id,
                          doctorName: `Dr. ${docName}`,
                          time: sess.time,
                          date: dateStr
                        })}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow"
                      >
                        <Video className="h-4 w-4" /> Join Live Video Room
                      </button>
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
        <Card className="p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" /> Health Notification Center
              </h3>
              <p className="text-xs text-slate-500">Appointment reminders, pill dosage alerts, and hospital updates.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setNotifications(notifications.map((n) => ({ ...n, read: true })));
                  toast.success("Marked all notifications as read.");
                }}
                className="rounded-lg border px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Mark All Read
              </button>
              <button
                onClick={() => setNotifications([])}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="flex gap-2 border-b pb-3 text-xs font-bold">
            {(["all", "reminders", "alerts", "updates"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setNotificationFilter(f)}
                className={`px-3 py-1.5 rounded-lg uppercase tracking-wider text-[10px] ${notificationFilter === f ? "bg-navy-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {notifications
              .filter((n) => notificationFilter === "all" || n.type === notificationFilter)
              .map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl p-4 border transition-all flex items-start justify-between ${n.read ? "bg-slate-50 border-slate-200" : "bg-gradient-to-r from-amber-50/60 to-orange-50/30 border-amber-200 shadow-sm"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-slate-800">{n.title}</h4>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-2 block">{n.time}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications(notifications.filter((item) => item.id !== n.id))}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BOOK APPOINTMENT MODAL */}
      {/* ========================================================================= */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-800">Request New Consultation</h3>
              <button onClick={() => setIsBookModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
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
                        const isSelected = bookingTime === slot;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
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
      {/* MODAL 4: RADIOLOGY DICOM VIEWER MODAL */}
      {/* ========================================================================= */}
      {selectedRadiology && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-slate-900 p-6 text-white shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-indigo-400" /> {selectedRadiology.title}
                </h3>
                <p className="text-xs text-slate-400">{selectedRadiology.doctor} · Study Date: {selectedRadiology.date}</p>
              </div>
              <button onClick={() => setSelectedRadiology(null)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Viewer Window */}
              <div className="lg:col-span-2 space-y-3">
                {/* DICOM Control Toolbar */}
                <div className="flex items-center justify-between rounded-lg bg-slate-800 p-2 text-xs font-bold text-slate-300">
                  <div className="flex gap-2">
                    <button onClick={() => setDicomZoom((z) => Math.min(z + 0.2, 2.5))} className="p-1.5 rounded hover:bg-slate-700">
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDicomZoom((z) => Math.max(z - 0.2, 0.6))} className="p-1.5 rounded hover:bg-slate-700">
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDicomRotation((r) => (r + 90) % 360)} className="p-1.5 rounded hover:bg-slate-700">
                      <RotateCw className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setDicomZoom(1); setDicomRotation(0); }} className="p-1.5 rounded hover:bg-slate-700">
                      <RefreshCw className="h-4 w-4" /> Reset
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400">Zoom: {Math.round(dicomZoom * 100)}%</span>
                </div>

                <div className="relative h-[360px] rounded-xl bg-black overflow-hidden flex items-center justify-center border border-slate-800">
                  <img
                    src={selectedRadiology.imageUrl}
                    alt={selectedRadiology.title}
                    style={{
                      transform: `scale(${dicomZoom}) rotate(${dicomRotation}deg)`,
                      transition: "transform 0.2s ease"
                    }}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

              {/* Radiologist Impression & Findings Panel */}
              <div className="space-y-4 text-xs">
                <div className="rounded-xl bg-slate-800 p-4 border border-slate-700">
                  <p className="text-[10px] font-bold uppercase text-indigo-400">Radiologist Impression</p>
                  <p className="mt-1 font-extrabold text-white text-sm">{selectedRadiology.impression}</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-4 border border-slate-700 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Detailed Findings</p>
                  <p className="text-slate-300 leading-relaxed font-medium">{selectedRadiology.findings}</p>
                </div>
                <button
                  onClick={() => toast.success("Radiology DICOM Study downloaded.")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  <Download className="h-4 w-4" /> Download DICOM Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PRINTABLE RX PRESCRIPTION MODAL */}
      {/* ========================================================================= */}
      {selectedPrescriptionRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border text-slate-800">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-navy-800">Metropolitan Hospital RX</h3>
                <p className="text-xs text-slate-500">Prescription No: {selectedPrescriptionRx.id}</p>
              </div>
              <button onClick={() => setSelectedPrescriptionRx(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-3">
                <p><span className="text-slate-400">Patient:</span> {patient?.name || user?.name}</p>
                <p><span className="text-slate-400">UHID:</span> {patient?.uhid || "HMS-PT-88201"}</p>
                <p><span className="text-slate-400">Doctor:</span> {selectedPrescriptionRx.doctorName}</p>
                <p><span className="text-slate-400">Date:</span> {selectedPrescriptionRx.date}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Prescribed Medicines</p>
                <div className="space-y-2">
                  {selectedPrescriptionRx.medicines.map((m: any, idx: number) => (
                    <div key={idx} className="border-b pb-2">
                      <div className="flex justify-between font-extrabold text-slate-800">
                        <span>{m.name} ({m.dosage})</span>
                        <span className="text-emerald-700">{m.frequency}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{m.timing} · Duration: {m.duration} · {m.instructions}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-6">
              <button onClick={() => setSelectedPrescriptionRx(null)} className="rounded-lg px-4 py-2 border font-bold text-xs">
                Close
              </button>
              <button
                onClick={() => {
                  toast.success("Printing prescription document...");
                  window.print();
                }}
                className="rounded-lg bg-navy-700 px-4 py-2 text-white font-bold text-xs hover:bg-navy-800 flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print RX
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: BILL PAYMENT GATEWAY SIMULATOR MODAL */}
      {/* ========================================================================= */}
      {payInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
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
      {/* MODAL 9: LIVE VIDEO CONSULTATION ROOM OVERLAY */}
      {/* ========================================================================= */}
      {activeVideoCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4">
          <div className="w-full max-w-5xl rounded-3xl bg-slate-900 p-6 text-white shadow-2xl border border-slate-800 flex flex-col h-[85vh]">
            {/* Call Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Live Telehealth Session with {activeVideoCall.doctorName}</h3>
                  <p className="text-xs text-slate-400">Secure End-to-End Encrypted Consultation · Duration: <span className="font-mono text-emerald-400 font-bold">{formatTimer(callTimer)}</span></p>
                </div>
              </div>
              <button
                onClick={() => setActiveVideoCall(null)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold hover:bg-rose-700 transition-all flex items-center gap-1.5"
              >
                <PhoneOff className="h-4 w-4" /> End Call
              </button>
            </div>

            {/* Video Main Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 flex-1 overflow-hidden">
              {/* Main Doctor Screen */}
              <div className="lg:col-span-2 relative rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center">
                {!isVideoOff ? (
                  <img
                    src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=80"
                    alt="Doctor Video"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <VideoOff className="h-16 w-16 mb-2" />
                    <p className="text-xs font-bold">Your Video is Turned Off</p>
                  </div>
                )}
                {/* Doctor Name Badge */}
                <div className="absolute top-4 left-4 rounded-lg bg-black/60 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {activeVideoCall.doctorName} (HD)
                </div>

                {/* Self View PIP Thumbnail */}
                <div className="absolute bottom-4 right-4 h-32 w-48 rounded-xl bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-lg">
                  <div className="h-full w-full bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-bold">
                    <span>You ({patient?.name?.split(" ")[0] || "Patient"})</span>
                  </div>
                </div>

                {/* Floating Call Controls Bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-slate-900/90 backdrop-blur-md px-5 py-2.5 border border-slate-700 shadow-xl">
                  <button
                    onClick={() => setIsMicMuted(!isMicMuted)}
                    className={`p-3 rounded-full transition-all ${isMicMuted ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}
                  >
                    {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={`p-3 rounded-full transition-all ${isVideoOff ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => {
                      setIsScreenSharing(!isScreenSharing);
                      toast.success(isScreenSharing ? "Stopped screen share" : "Sharing screen with doctor");
                    }}
                    className={`p-3 rounded-full transition-all ${isScreenSharing ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}
                  >
                    <Sparkles className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setActiveVideoCall(null)}
                    className="p-3 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-all"
                  >
                    <PhoneOff className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Doctor Chatbox Side Panel */}
              <div className="flex flex-col rounded-2xl bg-slate-950 border border-slate-800 p-4">
                <h4 className="text-xs font-extrabold text-slate-300 border-b border-slate-800 pb-3 mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-400" /> Consultation Live Chat
                </h4>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                  {chatMessages.map((m, idx) => (
                    <div key={idx} className={`rounded-xl p-3 ${m.sender === (patient?.name || "Patient") ? "bg-indigo-600/40 ml-4 border border-indigo-500/30" : "bg-slate-800 mr-4"}`}>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-slate-200">{m.sender}</span>
                        <span>{m.time}</span>
                      </div>
                      <p className="text-slate-200 font-medium">{m.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChatMessage} className="mt-3 flex gap-2 border-t border-slate-800 pt-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to doctor..."
                    className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-medium"
                  />
                  <button type="submit" className="rounded-xl bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 10: OFFICIAL APPOINTMENT SLIP MODAL */}
      {/* ========================================================================= */}
      {viewApptSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border text-slate-800">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
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

            <div className="flex justify-end gap-2 pt-4 border-t mt-6">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
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
      {/* MODAL 11: CALENDAR DAY CONSULTATIONS POPUP MODAL */}
      {/* ========================================================================= */}
      {selectedCalendarDayAppts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border text-slate-800">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-base font-extrabold text-slate-800">
                Scheduled Consultations for Day {selectedCalendarDayAppts.day}
              </h3>
              <button onClick={() => setSelectedCalendarDayAppts(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {selectedCalendarDayAppts.appts.map((a) => {
                const docName = typeof a.doctor === "object" ? (a.doctor as any).name : a.doctor;
                return (
                  <div key={a._id} className="rounded-xl border p-3 bg-slate-50 text-xs font-semibold">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Dr. {docName}</span>
                      <span className="text-indigo-600 font-extrabold">{a.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Ref: {a.referenceId || "REF-1002"} · {a.type}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t mt-4">
              <button onClick={() => setSelectedCalendarDayAppts(null)} className="rounded-lg bg-navy-700 px-4 py-2 text-white font-bold text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;
