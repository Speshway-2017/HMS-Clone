import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
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
import { usePatientProfileMe, usePatientInvoices, usePatientReports, useUpdatePatient, useUpdatePatientProfileMe } from "../../features/patients";
import { useAppointments, useCreateAppointment, useUpdateAppointment } from "../../features/appointments";
import { useDoctors } from "../../features/doctors";

// Mock Fallback Data for rich preview experience
const MOCK_RADIOLOGY_REPORTS = [
  {
    id: "RAD-2026-001",
    title: "Chest X-Ray PA View",
    modality: "X-Ray",
    date: "2026-07-20",
    doctor: "Dr. Sarah Jenkins (Radiologist)",
    status: "Finalized",
    findings: "Clear lung fields bilaterally. Normal cardiac silhouette. No pleural effusion or pneumothorax observed.",
    impression: "Normal Chest Radiograph.",
    imageUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "RAD-2026-002",
    title: "Brain MRI Scan (T1/T2 Weighted)",
    modality: "MRI",
    date: "2026-07-10",
    doctor: "Dr. Rajesh Sharma (Neuroradiologist)",
    status: "Finalized",
    findings: "Normal brain parenchyma. Ventricles and sulci are unremarkable for age. No intracranial hemorrhage or mass effect.",
    impression: "Unremarkable Brain MRI study.",
    imageUrl: "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "RAD-2026-003",
    title: "Knee Joint Ultrasound Scan",
    modality: "Ultrasound",
    date: "2026-06-15",
    doctor: "Dr. Anita Roy (Radiologist)",
    status: "Finalized",
    findings: "Minimal joint effusion in the suprapatellar bursa. Intact patellar tendon and collateral ligaments.",
    impression: "Mild suprapatellar bursitis.",
    imageUrl: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80"
  }
];

const MOCK_PRESCRIPTIONS = [
  {
    id: "RX-88401",
    doctorName: "Dr. Vikram Seth",
    specialty: "Cardiology",
    date: "2026-07-25",
    diagnosis: "Primary Essential Hypertension",
    medicines: [
      { name: "Amlovas 5mg Tablet", dosage: "5 mg", frequency: "1-0-0 (Morning)", timing: "After Food", duration: "30 Days", instructions: "Take with water every morning." },
      { name: "Telma 40mg Tablet", dosage: "40 mg", frequency: "0-0-1 (Night)", timing: "After Food", duration: "30 Days", instructions: "Avoid sodium-heavy meals." },
      { name: "Ecosprin 75mg", dosage: "75 mg", frequency: "0-1-0 (Afternoon)", timing: "After Lunch", duration: "30 Days", instructions: "Take post meal." }
    ],
    advice: "Monitor BP daily in the morning and evening. Maintain low-sodium diet and 30 min daily walk.",
    status: "Active"
  },
  {
    id: "RX-88219",
    doctorName: "Dr. Meera Patel",
    specialty: "General Medicine",
    date: "2026-06-12",
    diagnosis: "Acute Bronchitis & Viral Fever",
    medicines: [
      { name: "Augmentin 625 Duo", dosage: "625 mg", frequency: "1-0-1 (BD)", timing: "After Food", duration: "5 Days", instructions: "Complete full antibiotic course." },
      { name: "Dolo 650mg Tablet", dosage: "650 mg", frequency: "1-1-1 (TDS)", timing: "As needed", duration: "3 Days", instructions: "Take if body temperature > 100°F." },
      { name: "Ascoril LS Cough Syrup", dosage: "10 ml", frequency: "1-1-1 (TDS)", timing: "After Food", duration: "5 Days", instructions: "Warm water gargles twice daily." }
    ],
    advice: "Drink plenty of warm fluids. Take 3 days complete bed rest.",
    status: "Completed"
  }
];

const MOCK_INSURANCE_DATA = {
  provider: "Star Health & Allied Insurance",
  policyNumber: "SH-8892-4410-2026",
  policyType: "Comprehensive Family Floater",
  sumInsured: 500000,
  balanceCoverage: 425000,
  validUntil: "2027-03-31",
  tpAName: "Family Health Plan TPA Pvt. Ltd.",
  claims: [
    { id: "CLM-99201", date: "2026-06-14", hospital: "City General Hospital", category: "OPD Consultation & Diagnostics", amount: 12500, approvedAmount: 11000, status: "Approved", remarks: "Settled via Cashless Direct TPA" },
    { id: "CLM-99482", date: "2026-07-22", hospital: "Metropolitan Super Specialty", category: "Lab Investigation Suite", amount: 4800, approvedAmount: 4800, status: "Approved", remarks: "100% Co-pay Approved" },
    { id: "CLM-99810", date: "2026-07-28", hospital: "Metropolitan Super Specialty", category: "Pre-Authorization IPD Daycare", amount: 25000, approvedAmount: 0, status: "Under Review", remarks: "Awaiting TPA desk pre-authorization" }
  ]
};

const MOCK_TELEHEALTH_SESSIONS = [
  {
    id: "VID-2026-901",
    doctorName: "Dr. Rajesh Sharma",
    specialty: "Neurology",
    date: "2026-07-29",
    time: "16:00 (Today)",
    status: "Ready to Join",
    meetingUrl: "#",
    notes: "Follow-up discussion for EEG results & migraine symptoms."
  },
  {
    id: "VID-2026-882",
    doctorName: "Dr. Ananya Verma",
    specialty: "Dermatology",
    date: "2026-08-02",
    time: "11:30 AM",
    status: "Scheduled",
    meetingUrl: "#",
    notes: "Virtual skin allergy checkup."
  }
];

const MOCK_NOTIFICATIONS = [
  { id: "N1", title: "Upcoming Video Consult", message: "Your consultation with Dr. Rajesh Sharma starts today at 4:00 PM.", time: "10 mins ago", type: "reminders", read: false, priority: "high" },
  { id: "N2", title: "Medicine Dosage Alert", message: "Time to take Telma 40mg (1 Tablet) after lunch.", time: "1 hour ago", type: "alerts", read: false, priority: "normal" },
  { id: "N3", title: "Lab Report Ready", message: "Your Blood Lipid Profile diagnostic report is ready for viewing.", time: "3 hours ago", type: "updates", read: true, priority: "normal" },
  { id: "N4", title: "Hospital Invoice Issued", message: "Invoice #INV-8831 for OPD Charges (₹1,450) is ready for payment.", time: "1 day ago", type: "alerts", read: true, priority: "normal" },
  { id: "N5", title: "Daily Health Reminder", message: "Track your blood pressure daily and stay hydrated with at least 2.5L water.", time: "2 days ago", type: "updates", read: true, priority: "low" }
];

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
  const { data: apptResponse, isLoading: isApptsLoading } = useAppointments({ limit: 100 });
  const { data: invoices, isLoading: isInvoicesLoading } = usePatientInvoices();
  const { data: reports, isLoading: isReportsLoading } = usePatientReports();
  const { data: doctorsRes } = useDoctors({});

  const createAppointmentMutation = useCreateAppointment();
  const updatePatientMutation = useUpdatePatient(patient?._id || "");
  const updatePatientMeMutation = useUpdatePatientProfileMe();

  const doctors = doctorsRes?.data || [];
  const appointments = apptResponse?.data || [];

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
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingType, setBookingType] = useState<"Consultation" | "Video Consultation">("Consultation");
  const [bookingNotes, setBookingNotes] = useState("");

  // Reschedule & Cancel Appt States
  const [rescheduleApptId, setRescheduleApptId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const [cancelApptId, setCancelApptId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const updateApptMutation = useUpdateAppointment(rescheduleApptId || cancelApptId || "");

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
  const [claimsList, setClaimsList] = useState(MOCK_INSURANCE_DATA.claims);

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
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
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
    if (!selectedDoctorId || !bookingDate || !bookingTime) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const selectedDoctor = doctors.find((doc: any) => doc._id === selectedDoctorId);
      await createAppointmentMutation.mutateAsync({
        patient: patient?._id,
        doctor: selectedDoctorId,
        department: typeof selectedDoctor?.department === "object" && selectedDoctor?.department ? (selectedDoctor.department as any)._id : selectedDoctor?.department,
        date: bookingDate,
        time: bookingTime,
        type: bookingType,
        status: "scheduled",
        notes: bookingNotes
      });

      toast.success(`${bookingType} scheduled successfully!`);
      setIsBookModalOpen(false);
      setSelectedDoctorId("");
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment.");
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

  const isLoading = isPatientLoading || isApptsLoading || isInvoicesLoading || isReportsLoading;

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
              className={`relative flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                isActive
                  ? "bg-navy-700 text-white shadow-md"
                  : "text-slate-600 hover:text-navy-700 hover:bg-slate-100/80"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-indigo-200" : "text-slate-400"}`} />
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge !== 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    isActive ? "bg-white text-navy-800" : "bg-indigo-100 text-indigo-700"
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
              value={MOCK_PRESCRIPTIONS[0].medicines.length + MOCK_PRESCRIPTIONS[1].medicines.length}
              icon={<Pill className="h-5 w-5 text-emerald-500" />}
            />
            <KpiCard
              label="Diagnostic & Scans"
              value={(reports?.length || 0) + MOCK_RADIOLOGY_REPORTS.length}
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
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                isEditingProfile ? "bg-slate-200 text-slate-700" : "bg-navy-700 text-white hover:bg-navy-800 shadow"
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
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                    isEditingProfile ? "border-navy-500 bg-white focus:ring-2 focus:ring-navy-200" : "bg-slate-50 text-slate-700"
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
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                    isEditingProfile ? "border-navy-500 bg-white focus:ring-2 focus:ring-navy-200" : "bg-slate-50 text-slate-700"
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
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                    isEditingProfile ? "border-navy-500 bg-white focus:ring-2 focus:ring-navy-200" : "bg-slate-50 text-slate-700"
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
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                    isEditingProfile ? "border-navy-500 bg-white focus:ring-2 focus:ring-navy-200" : "bg-slate-50 text-slate-700"
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Gender</label>
                <select
                  disabled={!isEditingProfile}
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                    isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
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
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                    isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
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
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                    isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
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
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                    isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
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
                    className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                      isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
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
                    className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                      isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
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
                    className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                      isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
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
                    className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                      isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
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
                    className={`w-full rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                      isEditingProfile ? "border-navy-500 bg-white" : "bg-slate-50 text-slate-700"
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
      {/* 3. APPOINTMENT BOOKING & MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === "appointments" && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" /> Consultations & Appointments Manager
              </h3>
              <p className="text-xs text-slate-500">Book, view, reschedule, or cancel your hospital and video appointments.</p>
            </div>
            <button
              onClick={() => setIsBookModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-navy-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800 shadow"
            >
              <Plus className="h-4 w-4" /> Book New Appointment
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Calendar className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No appointment records found.</p>
              <button
                onClick={() => setIsBookModalOpen(true)}
                className="mt-3 rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white"
              >
                Book Your First Consultation
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-y">
                  <tr>
                    <th className="px-4 py-3">Reference ID</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {appointments.map((a) => {
                    const isUpcoming = a.status === "scheduled" || a.status === "pending_payment";
                    return (
                      <tr key={a._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5 font-extrabold text-navy-700">{a.referenceId || "REF-" + a._id.slice(-6).toUpperCase()}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">
                          Dr. {typeof a.doctor === "object" ? (a.doctor as any).name : a.doctor}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">
                          {typeof a.department === "object" && a.department ? (a.department as any).name : "General Medicine"}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800">{new Date(a.date).toLocaleDateString("en-IN")}</p>
                          <p className="text-[10px] text-slate-400">{a.time}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone={a.type?.toLowerCase().includes("video") ? "info" : "neutral"}>
                            {a.type || "Consultation"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            tone={
                              a.status === "completed"
                                ? "success"
                                : a.status === "scheduled"
                                ? "info"
                                : a.status === "cancelled"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {a.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          {isUpcoming && (
                            <>
                              <button
                                onClick={() => {
                                  setRescheduleApptId(a._id);
                                  setRescheduleDate(a.date.split("T")[0]);
                                  setRescheduleTime(a.time);
                                }}
                                className="rounded px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => {
                                  setCancelApptId(a._id);
                                }}
                                className="rounded px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold"
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
                                  doctorName: typeof a.doctor === "object" ? (a.doctor as any).name : a.doctor,
                                  time: a.time,
                                  date: new Date(a.date).toLocaleDateString("en-IN")
                                });
                              }}
                              className="rounded px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold"
                            >
                              Join Call
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">OPD Consultation</span>
                      <h4 className="text-base font-extrabold text-slate-800">Primary Essential Hypertension</h4>
                    </div>
                    <Badge tone="info">25 July 2026</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p><span className="font-semibold text-slate-500">Attending Physician:</span> Dr. Vikram Seth</p>
                    <p><span className="font-semibold text-slate-500">Department:</span> Cardiology</p>
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-medium text-slate-700 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Doctor Advice</p>
                      Patient presented with mild morning headaches. Blood pressure logged at 145/90 mmHg. Started on daily antihypertensive therapy. Advice 30-min walk daily.
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">OPD Consultation</span>
                      <h4 className="text-base font-extrabold text-slate-800">Acute Bronchitis & Viral Fever</h4>
                    </div>
                    <Badge tone="info">12 June 2026</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p><span className="font-semibold text-slate-500">Attending Physician:</span> Dr. Meera Patel</p>
                    <p><span className="font-semibold text-slate-500">Department:</span> General Medicine</p>
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-medium text-slate-700 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Doctor Advice</p>
                      Cough for 4 days with low grade fever. Prescribed 5 days course of antibiotics and cough syrup. Rest for 3 days.
                    </div>
                  </div>
                </div>
              </>
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
            {MOCK_PRESCRIPTIONS.map((rx) => (
              <div key={rx.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start border-b pb-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-navy-700">{rx.id}</span>
                        <Badge tone={rx.status === "Active" ? "success" : "neutral"}>{rx.status}</Badge>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-800 mt-1">{rx.diagnosis}</h4>
                      <p className="text-xs text-slate-500">{rx.doctorName} ({rx.specialty}) · {rx.date}</p>
                    </div>
                    <button
                      onClick={() => setSelectedPrescriptionRx(rx)}
                      className="flex items-center gap-1.5 rounded-lg border border-navy-600 px-3 py-1.5 text-xs font-bold text-navy-700 hover:bg-navy-50 transition-all"
                    >
                      <Download className="h-3.5 w-3.5" /> Download RX PDF
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prescribed Medicines ({rx.medicines.length})</p>
                    {rx.medicines.map((med, idx) => (
                      <div key={idx} className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-extrabold text-slate-800">{med.name}</p>
                          <p className="text-[11px] text-slate-500">{med.dosage} · {med.timing} · {med.duration}</p>
                          <p className="text-[10px] text-slate-400 italic mt-0.5">{med.instructions}</p>
                        </div>
                        <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
                          {med.frequency}
                        </span>
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
            ))}
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
            {[
              {
                id: "LAB-2026-101",
                testName: "Complete Blood Count (CBC)",
                category: "Hematology",
                date: "2026-07-24",
                doctor: "Dr. Sunita Rao",
                status: "Normal",
                notes: "Hemoglobin 14.2 g/dL, Platelets 250,000 /uL. All parameters within reference limits."
              },
              {
                id: "LAB-2026-102",
                testName: "Lipid Profile Panel",
                category: "Biochemistry",
                date: "2026-07-22",
                doctor: "Dr. Vikram Seth",
                status: "Borderline",
                notes: "Total Cholesterol 210 mg/dL (Slightly Elevated). HDL 48 mg/dL, LDL 135 mg/dL."
              },
              {
                id: "LAB-2026-103",
                testName: "HbA1c & Fasting Blood Sugar",
                category: "Diabetology",
                date: "2026-06-20",
                doctor: "Dr. Meera Patel",
                status: "Normal",
                notes: "HbA1c: 5.6% (Non-diabetic range). Fasting Blood Sugar: 92 mg/dL."
              },
              ...(reports || [])
            ].map((rep: any, idx: number) => (
              <div
                key={rep.id || rep._id || idx}
                onClick={() => setSelectedReport(rep)}
                className="group rounded-2xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <FileText className="h-5 w-5" />
                    </div>
                    <Badge tone={rep.status === "Critical" ? "danger" : rep.status === "Borderline" ? "warning" : "success"}>
                      {rep.status || "Verified"}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800">{rep.testName}</h4>
                  <p className="text-xs text-slate-400">{rep.category || "Laboratory Speciality"} · {rep.date || new Date(rep.createdAt || Date.now()).toLocaleDateString("en-IN")}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-600">Doctor: {rep.doctor || rep.doctor?.name || "Lab Desk"}</p>
                </div>
                <div className="mt-4 border-t pt-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-navy-700 group-hover:underline flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> View Report Details
                  </span>
                  <Download className="h-4 w-4 text-slate-400 group-hover:text-navy-700" />
                </div>
              </div>
            ))}
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
            {MOCK_RADIOLOGY_REPORTS.map((rad) => (
              <div
                key={rad.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setSelectedRadiology(rad)}>
                    <img src={rad.imageUrl} alt={rad.title} className="h-full w-full object-cover opacity-85 hover:opacity-100 hover:scale-105 transition-all duration-300" />
                    <div className="absolute top-3 left-3">
                      <span className="rounded-md bg-navy-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white">
                        {rad.modality}
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <span className="rounded-md bg-black/60 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-white flex items-center gap-1">
                        <Eye className="h-3 w-3" /> DICOM Preview
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-extrabold text-slate-800">{rad.title}</h4>
                      <Badge tone="success">{rad.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{rad.doctor} · {rad.date}</p>
                    <p className="text-xs font-medium text-slate-600 line-clamp-2 mt-2">{rad.impression}</p>
                  </div>
                </div>
                <div className="p-5 pt-0">
                  <button
                    onClick={() => setSelectedRadiology(rad)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-navy-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800 transition-all shadow"
                  >
                    Open DICOM Viewer <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
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
                {[
                  {
                    _id: "INV-2026-8831",
                    billingType: "OPD Consultation & Pharmacy",
                    totals: { total: 1800, insuranceCovered: 350, patientBalance: 1450 },
                    insuranceCoveragePercent: 20,
                    dueDate: "2026-08-05",
                    status: "pending"
                  },
                  {
                    _id: "INV-2026-7721",
                    billingType: "Radiology & MRI Imaging",
                    totals: { total: 4500, insuranceCovered: 4500, patientBalance: 0 },
                    insuranceCoveragePercent: 100,
                    dueDate: "2026-07-15",
                    status: "paid"
                  },
                  ...(invoices || [])
                ].map((inv: any) => (
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
          <div className="rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-indigo-900 p-6 text-white shadow-md">
            <div className="flex flex-col gap-6 md:flex-row md:items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Policy Provider</span>
                <h4 className="text-xl font-extrabold mt-0.5">{MOCK_INSURANCE_DATA.provider}</h4>
                <p className="text-xs text-indigo-200 mt-1">Policy No: <span className="font-mono font-bold">{MOCK_INSURANCE_DATA.policyNumber}</span> · {MOCK_INSURANCE_DATA.policyType}</p>
                <p className="text-xs text-indigo-300 mt-1">TPA Name: {MOCK_INSURANCE_DATA.tpAName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-md text-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-indigo-200">Sum Insured</p>
                  <p className="text-base font-extrabold">₹{MOCK_INSURANCE_DATA.sumInsured.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-300">Remaining Balance</p>
                  <p className="text-base font-extrabold text-emerald-300">₹{MOCK_INSURANCE_DATA.balanceCoverage.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          </div>

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
                  {claimsList.map((clm) => (
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
                  ))}
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
            {MOCK_TELEHEALTH_SESSIONS.map((sess) => (
              <div key={sess.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                      <Video className="h-5 w-5" />
                    </div>
                    <Badge tone={sess.status === "Ready to Join" ? "success" : "info"}>{sess.status}</Badge>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-800">{sess.doctorName}</h4>
                  <p className="text-xs text-slate-500">{sess.specialty} · {sess.date} ({sess.time})</p>
                  <p className="text-xs text-slate-600 mt-2 font-medium bg-slate-50 p-3 rounded-lg border">{sess.notes}</p>
                </div>
                <div className="mt-6 pt-4 border-t">
                  <button
                    onClick={() => setActiveVideoCall(sess)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow"
                  >
                    <Video className="h-4 w-4" /> Join Live Video Room
                  </button>
                </div>
              </div>
            ))}
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
                className={`px-3 py-1.5 rounded-lg uppercase tracking-wider text-[10px] ${
                  notificationFilter === f ? "bg-navy-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                  className={`rounded-xl p-4 border transition-all flex items-start justify-between ${
                    n.read ? "bg-slate-50 border-slate-200" : "bg-gradient-to-r from-amber-50/60 to-orange-50/30 border-amber-200 shadow-sm"
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
                    onClick={() => setBookingType("Consultation")}
                    className={`p-2.5 rounded-lg border text-center font-bold transition-all ${
                      bookingType === "Consultation" ? "border-navy-700 bg-navy-50 text-navy-800" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    In-Person Hospital Visit
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType("Video Consultation")}
                    className={`p-2.5 rounded-lg border text-center font-bold transition-all ${
                      bookingType === "Video Consultation" ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-600"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Preferred Date *</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-lg border px-3.5 py-2 outline-none focus:border-navy-500 font-medium text-xs"
                  />
                </div>
                <div>
                  <label className="block mb-1">Preferred Time Slot *</label>
                  <input
                    type="time"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full rounded-lg border px-3.5 py-2 outline-none focus:border-navy-500 font-medium text-xs"
                  />
                </div>
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
                    className={`p-2.5 rounded-lg border text-center font-bold ${
                      paymentMethod === "upi" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200"
                    }`}
                  >
                    <QrCode className="h-4 w-4 mx-auto mb-1" /> UPI QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-2.5 rounded-lg border text-center font-bold ${
                      paymentMethod === "card" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200"
                    }`}
                  >
                    <CreditCard className="h-4 w-4 mx-auto mb-1" /> Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("netbanking")}
                    className={`p-2.5 rounded-lg border text-center font-bold ${
                      paymentMethod === "netbanking" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200"
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
    </div>
  );
}

export default PatientDashboard;
