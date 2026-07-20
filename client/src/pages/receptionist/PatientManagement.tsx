import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import {
  Search,
  Plus,
  List,
  UserCheck,
  Shield,
  Clipboard,
  Camera,
  Copy,
  Printer,
  Calendar,
  User,
  CheckCircle2,
  Loader2,
  Building,
  Activity,
  History,
  Info,
  FlaskConical,
  Scan,
  Pill,
  Receipt,
  Eye,
  Download,
  FileText,
  Heart,
  FileCheck,
  AlertTriangle
} from "lucide-react";
import {
  useRegisterPatient,
  usePatientsSearch,
  usePatientsList,
  usePatientDetails,
  useTodayRegistrations,
  useAdmitPatient,
  useRoomsAvailability,
  useDoctorsAvailability,
  useAdmissions
} from "../../features/receptionist";
import { usePrescriptions } from "../../features/doctorDashboard";
import { useInvoices } from "../../features/invoices";
import { usePatientReports } from "../../features/laboratory";
import { useMyHospital } from "../../features/hospitals";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Modal } from "../../components/ui/Modal";
import { formatINR } from "../../lib/currency";

interface HistoryGroup {
  id: string;
  date: Date;
  dateFormatted: string;
  doctorName: string;
  department: string;
  consultation: {
    diagnosis: string;
    notes: string;
    status: string;
  } | null;
  prescriptions: {
    diagnosis: string;
    notes: string;
    status: string;
  }[];
  labs: {
    diagnosis: string;
    notes: string;
    status: string;
  }[];
  radiology: {
    diagnosis: string;
    notes: string;
    status: string;
  }[];
  certificates: {
    diagnosis: string;
    notes: string;
    status: string;
  }[];
  inpatientNotes: {
    diagnosis: string;
    notes: string;
    status: string;
  }[];
  others: any[];
}

function groupHistoryByConsultation(historyList: any[]): HistoryGroup[] {
  if (!historyList || historyList.length === 0) return [];

  const map = new Map<string, HistoryGroup>();

  historyList.forEach((item) => {
    const dateVal = item.date ? new Date(item.date) : new Date();
    const dateStr = dateVal.toLocaleDateString("en-IN");
    const docName = String(item.doctorName || "Attending Doctor").trim();
    const key = `hist-${dateStr}-${docName}`;

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        date: dateVal,
        dateFormatted: dateVal.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        doctorName: docName,
        department: item.department || "",
        consultation: null,
        prescriptions: [],
        labs: [],
        radiology: [],
        certificates: [],
        inpatientNotes: [],
        others: []
      });
    }

    const group = map.get(key)!;
    if (!group.department && item.department) {
      group.department = item.department;
    }

    const vType = String(item.visitType).toLowerCase();
    const cleanItem = {
      diagnosis: item.diagnosis || "",
      notes: item.notes || "",
      status: item.status || "Completed"
    };

    if (vType.includes("consultation")) {
      group.consultation = cleanItem;
    } else if (vType.includes("prescription")) {
      group.prescriptions.push(cleanItem);
    } else if (vType.includes("lab")) {
      group.labs.push(cleanItem);
    } else if (vType.includes("radiology")) {
      group.radiology.push(cleanItem);
    } else if (vType.includes("certificate")) {
      group.certificates.push(cleanItem);
    } else if (vType.includes("inpatient") || vType.includes("rounds")) {
      group.inpatientNotes.push(cleanItem);
    } else {
      group.others.push(item);
    }
  });

  return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

interface PrescriptionGroup {
  id: string;
  date: Date;
  dateFormatted: string;
  doctorName?: string;
  prescriptions: any[];
}

function groupPrescriptionsByConsultation(rxList: any[]): PrescriptionGroup[] {
  if (!rxList || rxList.length === 0) return [];

  const map = new Map<string, PrescriptionGroup>();

  rxList.forEach((rx) => {
    let key = "";
    let dateVal: Date;
    let docName: string | undefined = rx.doctor?.name;

    if (rx.appointment && typeof rx.appointment === "object" && rx.appointment._id) {
      key = `rx-app-${rx.appointment._id}`;
      dateVal = new Date(rx.appointment.date || rx.createdAt);
      if (rx.appointment.doctor?.name) docName = rx.appointment.doctor.name;
    } else {
      dateVal = rx.createdAt ? new Date(rx.createdAt) : new Date();
      const dateStr = dateVal.toLocaleDateString("en-IN");
      key = `rx-date-${dateStr}-${docName || ""}`;
    }

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        date: dateVal,
        dateFormatted: dateVal.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        doctorName: docName,
        prescriptions: [],
      });
    }

    const group = map.get(key)!;
    group.prescriptions.push(rx);
    if (!group.doctorName && docName) group.doctorName = docName;
  });

  return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

interface ReportConsultationGroup {
  id: string;
  date: Date;
  dateFormatted: string;
  appointmentRef?: string;
  chiefComplaint?: string;
  doctorName?: string;
  reports: any[];
}

function groupReportsByConsultation(reportsList: any[]): ReportConsultationGroup[] {
  if (!reportsList || reportsList.length === 0) return [];

  const map = new Map<string, ReportConsultationGroup>();

  reportsList.forEach((r) => {
    let key = "";
    let dateObj: Date;
    let ref: string | undefined;
    let complaint: string | undefined;
    let docName: string | undefined;

    if (r.appointment && typeof r.appointment === "object" && (r.appointment._id || r.appointment.referenceId)) {
      key = r.appointment._id ? r.appointment._id.toString() : r.appointment.referenceId;
      dateObj = new Date(r.appointment.date || r.uploadedAt || r.createdAt);
      ref = r.appointment.referenceId;
      complaint = r.appointment.chiefComplaint || r.appointment.diagnosis;
      docName = r.appointment.doctor?.name || (r.doctor && typeof r.doctor === "object" ? r.doctor.name : undefined);
    } else {
      const dateVal = r.uploadedAt || r.createdAt;
      const uploadDateStr = dateVal ? new Date(dateVal).toLocaleDateString("en-IN") : "Unknown Date";
      key = `date-${uploadDateStr}`;
      dateObj = dateVal ? new Date(dateVal) : new Date();
      docName = r.doctor && typeof r.doctor === "object" ? r.doctor.name : r.uploadedBy?.name;
    }

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        date: dateObj,
        dateFormatted: dateObj.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }),
        appointmentRef: ref,
        chiefComplaint: complaint,
        doctorName: docName,
        reports: [],
      });
    }

    const group = map.get(key)!;
    group.reports.push(r);
    if (!group.doctorName && docName) group.doctorName = docName;
    if (!group.chiefComplaint && complaint) group.chiefComplaint = complaint;
  });

  return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

// Zod Validation Schema with Preprocess to convert age safely and avoid NaN errors
const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(5, "Phone is required"),
  age: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || isNaN(Number(val)) ? 0 : Number(val)),
    z.number().min(0, "Age must be positive")
  ),
  gender: z.string().min(1, "Gender is required"),
  bloodGroup: z.string().default(""),
  address: z.string().default(""),
  allergies: z.string().default(""),
  insuranceProvider: z.string().default(""),
  insurancePolicyNumber: z.string().default(""),
  emergencyContact: z.object({
    name: z.string().default(""),
    phone: z.string().default(""),
    relation: z.string().default(""),
  })
});

type RegisterFormData = z.infer<typeof registerSchema>;

const getFlatErrors = (errs: any): { field: string; message: string }[] => {
  const flat: { field: string; message: string }[] = [];
  const recurse = (obj: any, prefix = "") => {
    if (!obj) return;
    if (obj.message && typeof obj.message === "string") {
      flat.push({ field: prefix, message: obj.message });
      return;
    }
    for (const [key, value] of Object.entries(obj)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object") {
        recurse(value, nextPrefix);
      }
    }
  };
  recurse(errs);
  return flat;
};

interface Props {
  activeTab?: "new" | "search" | "list";
}

export function PatientManagementPage({ activeTab = "list" }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Read ?filter=today from URL (set by dashboard "Today's Registrations" card click)
  const todayFilter = new URLSearchParams(window.location.search).get("filter") === "today";

  const [tab, setTab] = useState<"new" | "search" | "list">(activeTab);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Success modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredPatient, setRegisteredPatient] = useState<any | null>(null);

  // Queries & Mutations
  const registerMutation = useRegisterPatient();
  const { data: searchResults, isFetching: searchLoading } = usePatientsSearch(searchQuery);
  const { data: listData, isLoading: listLoading } = usePatientsList({ page, limit: 10 });
  const { data: todayData, isLoading: todayLoading } = useTodayRegistrations();
  const { data: patient, isLoading: patientLoading, error: patientError } = usePatientDetails(id);
  const { data: hospitalData } = useMyHospital();

  // Redesigned right panel tabs state
  const [profileTab, setProfileTab] = useState<"history" | "prescriptions" | "billing" | "reports">("history");

  // Inpatient details and previous admissions modals
  const [isAdmissionDetailsOpen, setIsAdmissionDetailsOpen] = useState(false);
  const [isPreviousAdmissionsOpen, setIsPreviousAdmissionsOpen] = useState(false);

  // Hook calls for prescriptions, bills, and admissions histories
  const { data: prescriptions } = usePrescriptions(patient?._id ? { patient: patient._id } : undefined);
  const { data: billsData } = useInvoices(patient?._id ? { patient: patient._id } : {});
  const { data: previousAdmissions } = useAdmissions(patient?._id ? { status: "discharged", patientId: patient._id } : undefined);
  const { data: reports = [], isLoading: reportsLoading } = usePatientReports(patient?._id);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const selectedReport = reports?.find((r: any) => r._id === selectedReportId) || null;

  // Convert OP to IP specific hooks
  const { data: rooms } = useRoomsAvailability();
  const { data: doctors } = useDoctorsAvailability();
  const admitMutation = useAdmitPatient();
  const uniqueWards = Array.from(new Set(rooms?.map((r: any) => r.wardName).filter(Boolean)));

  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Form states for Convert OP to IP
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [admissionTime, setAdmissionTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [admissionReason, setAdmissionReason] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [priority, setPriority] = useState("Routine");
  const [ward, setWard] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [attenderName, setAttenderName] = useState("");
  const [attenderPhone, setAttenderPhone] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [verbalApproval, setVerbalApproval] = useState(false);
  const [remarks, setRemarks] = useState("");

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    if (!admissionReason || !admissionReason.trim()) {
      alert("Admission reason is required.");
      return;
    }
    if (!selectedDocId) {
      alert("Admitting doctor selection is mandatory.");
      return;
    }
    if (!ward || !selectedRoomId || !selectedBedId) {
      alert("Please select ward, room and bed.");
      return;
    }
    if (!attenderName || !attenderPhone) {
      alert("Attender details are required.");
      return;
    }
    if (!verbalApproval) {
      alert("You must verify doctor verbal order approval.");
      return;
    }

    try {
      const result = await admitMutation.mutateAsync({
        patientId: patient._id,
        admissionDate,
        admissionTime,
        ward,
        roomId: selectedRoomId,
        bedId: selectedBedId,
        attenderName,
        attenderPhone,
        insuranceProvider,
        insurancePolicyNumber,
        advanceAmount: parseFloat(advanceAmount),
        admissionNotes: remarks,
        paymentMethod,

        // Receptionist Initiated specific parameters
        admissionMode: "Receptionist Initiated",
        admittingDoctor: selectedDocId,
        priority,
        admissionReason,
        verbalApproval
      });

      setSuccessData(result);
      setIsConvertOpen(false);

      // Reset form states
      setAdmissionReason("");
      setSelectedDocId("");
      setPriority("Routine");
      setWard("");
      setSelectedRoomId("");
      setSelectedBedId("");
      setAttenderName("");
      setAttenderPhone("");
      setInsuranceProvider("");
      setInsurancePolicyNumber("");
      setAdvanceAmount("0");
      setPaymentMethod("Cash");
      setVerbalApproval(false);
      setRemarks("");
      
      alert("OP Patient successfully converted to Inpatient (IP) Admission!");
    } catch (err: any) {
      alert(err.message || "Failed to process admission");
    }
  };

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
    formState
  } = useForm<any>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      age: 0,
      gender: "",
      bloodGroup: "",
      address: "",
      allergies: "",
      insuranceProvider: "",
      insurancePolicyNumber: "",
      emergencyContact: { name: "", phone: "", relation: "" }
    }
  });

  const handleRegister = async (data: any) => {
    console.log("Form Values:", getValues());
    console.log("Form Errors:", formState.errors);
    try {
      const payload = { ...data, photoUrl };
      const response = await registerMutation.mutateAsync(payload);
      
      toast.success("Patient Registered Successfully");
      setRegisteredPatient(response);
      setShowSuccessModal(true);
      
      // Reset form only after successful registration
      reset();
      setPhotoUrl("");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to register patient.";
      toast.error(errMsg);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" }
          });
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err: any) {
          console.error("Camera getUserMedia error:", err);
          setCameraError("Camera access was blocked or is unavailable. Please verify device permissions.");
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Could not access webcam. Please check camera permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Failed to capture image blob.");

      const file = new File([blob], `patient-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "patient-photos");
      
      const res = await api.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.data?.url) {
        setPhotoUrl(res.data.data.url);
        toast.success("Patient photo captured and uploaded successfully!");
        stopCamera();
      } else {
        throw new Error("Invalid upload response.");
      }
    } catch (err: any) {
      console.error("Capture upload failed:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to upload captured photo.");
    } finally {
      setIsCapturing(false);
    }
  };

  const triggerWebcamSimulation = () => {
    const avatars = [
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
    ];
    const chosen = avatars[Math.floor(Math.random() * avatars.length)];
    setPhotoUrl(chosen);
    toast.success("Photo captured successfully via simulated webcam!");
  };

  // Columns for DataTable
  const columns = [
    {
      header: "UHID",
      render: (p: any) => (
        <button
          onClick={() => navigate(`/receptionist/patients/${p._id}`)}
          className="font-mono text-xs font-bold text-navy-700 hover:underline"
        >
          {p.uhid || "N/A"}
        </button>
      )
    },
    {
      header: "Patient Code",
      render: (p: any) => <span className="text-xs text-slate-500 font-semibold">{p.patientCode || "N/A"}</span>
    },
    {
      header: "Name",
      render: (p: any) => (
        <div className="flex items-center gap-2">
          {p.photoUrl ? (
            <img src={p.photoUrl} alt={p.name} className="h-7 w-7 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
              {p.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-slate-900">{p.name}</span>
        </div>
      )
    },
    {
      header: "Age / Gender",
      render: (p: any) => <span className="text-xs font-medium">{p.age} yrs / {p.gender}</span>
    },
    {
      header: "Phone",
      render: (p: any) => <span className="text-xs text-slate-600 font-mono">{p.phone}</span>
    },
    {
      header: "Registered On",
      render: (p: any) => (
        <span className="text-xs text-slate-600 font-medium">
          {p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          }) : "N/A"}
        </span>
      )
    },
    {
      header: "Status",
      render: (p: any) => {
        const isAdmitted = p.status === "admitted";
        return (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isAdmitted ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {isAdmitted ? "Inpatient (IP)" : "Outpatient (OP)"}
          </span>
        );
      }
    }
  ];

  // Render single Patient details profile console
  if (id) {
    if (patientLoading) {
      return <div className="p-8 text-center text-slate-400">Loading Patient Profile...</div>;
    }
    if (patientError || !patient) {
      return (
        <div className="p-6 max-w-xl mx-auto text-center space-y-4">
          <Info className="h-12 w-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Patient File Not Found</h2>
          <p className="text-sm text-slate-500">The requested patient ID does not exist or has been archived.</p>
          <Button onClick={() => navigate("/receptionist/patients")}>Back to Patients Registry</Button>
        </div>
      );
    }

    if (successData) {
      return (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-6 text-center space-y-2 print:hidden">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 animate-bounce" />
            <h2 className="text-xl font-bold text-slate-800">OP Patient Converted to Inpatient</h2>
            <p className="text-sm text-slate-550 max-w-lg mx-auto">
              Patient <b>{successData.wristBand?.patientName}</b> has been admitted under verbal instruction of doctor. Bed allocation and real-time dashboard notifications have been completed.
            </p>
          </div>

          <div className="max-w-xl mx-auto">
            
            {/* 1. Admission Slip Card */}
            <Card className="space-y-4 border border-slate-200 shadow-md p-6 bg-white relative">
              <div className="absolute top-4 right-4 bg-navy-50 text-navy-700 font-bold font-mono text-xs px-2 py-0.5 rounded border border-navy-100">
                ADMISSION SLIP
              </div>
              
              {/* Header */}
              <div className="text-center pb-4 border-b border-dashed border-slate-200">
                <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">{successData.admissionSlip?.hospitalName}</h3>
                <p className="text-[10px] text-slate-450 mt-0.5">INPATIENT DEPT (IPD) RECORD</p>
              </div>

              {/* Metadata fields */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Admission No</span>
                  <span className="font-bold text-indigo-700 font-mono">{successData.admissionSlip?.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">UHID / Patient ID</span>
                  <span className="font-semibold text-slate-700 font-mono">{successData.admissionSlip?.uhid}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Patient Name</span>
                  <span className="font-bold text-slate-800">{successData.admissionSlip?.patientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Age / Gender</span>
                  <span className="font-semibold text-slate-700">{successData.admissionSlip?.age} Yrs / {successData.admissionSlip?.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Ward & Room</span>
                  <span className="font-semibold text-slate-700">{successData.admissionSlip?.ward} (Room {successData.admissionSlip?.roomNumber})</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Allocated Bed</span>
                  <span className="font-semibold text-slate-700">Bed {successData.admissionSlip?.bedNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Admitting Doctor</span>
                  <span className="font-semibold text-slate-700">Dr. {successData.admissionSlip?.admittingDoctorName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Attender Name</span>
                  <span className="font-semibold text-slate-700">{successData.admissionSlip?.attenderName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Attender Phone</span>
                  <span className="font-semibold text-slate-700">{successData.admissionSlip?.attenderPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Admission Date & Time</span>
                  <span className="font-semibold text-slate-700">{successData.admissionSlip?.admissionDate} @ {successData.admissionSlip?.admissionTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Insurance Provider</span>
                  <span className="font-semibold text-slate-700">{successData.admissionSlip?.insuranceProvider}</span>
                </div>
              </div>

              {/* OP consultation references */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px] block">Previous Consultation Details</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-400 block">Consulting Doctor:</span>
                    <span className="font-semibold text-slate-755">{successData.admissionSlip?.lastConsultingDoctor}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Consulting Dept:</span>
                    <span className="font-semibold text-slate-755">{successData.admissionSlip?.lastConsultingDepartment}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Consultation Date:</span>
                    <span className="font-semibold text-slate-755">{successData.admissionSlip?.lastOpVisitDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Consultation Diagnosis:</span>
                    <span className="font-semibold text-slate-755 italic">{successData.admissionSlip?.diagnosis}</span>
                  </div>
                </div>
              </div>

              {/* Payment block */}
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-455 block uppercase tracking-wider text-[9px] font-bold">Advance Deposit Paid</span>
                  <span className="font-bold text-slate-800">{formatINR(successData.admissionSlip?.advancePaid)}</span>
                </div>
                {successData.admissionSlip?.advancePaid > 0 && (
                  <>
                    <div>
                      <span className="text-slate-455 block uppercase tracking-wider text-[9px] font-bold">Payment Method</span>
                      <span className="font-semibold text-slate-800">{successData.admissionSlip?.paymentMethod}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-455 block uppercase tracking-wider text-[9px] font-bold">Receipt Number</span>
                      <span className="font-semibold text-slate-700 font-mono">{successData.admissionSlip?.receiptNumber}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 print:hidden space-y-2">
                <Button onClick={() => window.print()} className="w-full flex items-center justify-center gap-1.5 text-xs py-2">
                  <Printer className="h-4 w-4" /> Print Admission Slip
                </Button>
                
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => { setSuccessData(null); }} variant="secondary" className="flex-1 text-xs py-1.5">
                    Back to Profile
                  </Button>
                  <Button onClick={() => navigate("/receptionist/patients")} variant="secondary" className="flex-1 text-xs py-1.5">
                    Registry list
                  </Button>
                </div>
              </div>
            </Card>

          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patient Profile Console</h1>
            <p className="text-sm text-slate-500">Clinical ledger overview, basic health cards, and hospital records.</p>
          </div>
          
          <div className="flex gap-2 items-center">
            {/* INPATIENT buttons */}
            {patient.status === "admitted" && (
              <>
                <Button
                  onClick={() => setIsAdmissionDetailsOpen(true)}
                  className="flex items-center gap-1 text-xs bg-indigo-700 hover:bg-indigo-800"
                >
                  <Building className="h-4 w-4" /> View Admission Details
                </Button>
                <Button
                  onClick={() => navigate(`/receptionist/ip?tab=transfer&admissionId=${patient.activeAdmission?._id}`)}
                  className="flex items-center gap-1 text-xs bg-sky-700 hover:bg-sky-800"
                  disabled={!patient.activeAdmission?._id}
                >
                  <Building className="h-4 w-4" /> Transfer Patient
                </Button>
                <Button
                  onClick={() => navigate(`/receptionist/ip?tab=admissions&dischargeAdmissionId=${patient.activeAdmission?._id}`)}
                  className="flex items-center gap-1 text-xs bg-red-700 hover:bg-red-800"
                  disabled={!patient.activeAdmission?._id}
                >
                  <Building className="h-4 w-4" /> Discharge Request
                </Button>
              </>
            )}

            {/* OUTPATIENT / DISCHARGED buttons */}
            {patient.status !== "admitted" && (
              <>
                <Button variant="secondary" onClick={() => window.print()} className="flex items-center gap-1 text-xs">
                  <Printer className="h-4 w-4" /> Print Card
                </Button>
                <Button onClick={() => navigate(`/receptionist/appointments/new?patientId=${patient._id}`)} className="flex items-center gap-1 text-xs bg-indigo-700 hover:bg-indigo-800">
                  <Calendar className="h-4 w-4" /> Book Appointment
                </Button>
              </>
            )}

            {/* DISCHARGED specific extra button */}
            {patient.status === "discharged" && (
              <Button
                onClick={() => setIsPreviousAdmissionsOpen(true)}
                className="flex items-center gap-1 text-xs bg-emerald-700 hover:bg-emerald-800"
              >
                <History className="h-4 w-4" /> View Previous Admissions
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Printable Patient Card ID Mockup */}
        <div id="patient-card-print" className="hidden print:block bg-white text-black p-8 rounded-2xl border-4 border-slate-900 max-w-md mx-auto space-y-6">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {hospitalData?.logoUrl && (
                  <img src={hospitalData.logoUrl} alt={hospitalData.name} className="h-6 w-6 object-contain rounded" />
                )}
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-955 truncate max-w-[200px]" title={hospitalData?.name || "HMS Enterprise"}>{hospitalData?.name || "HMS Enterprise"}</h2>
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-500 font-sans">Hospital Registry Card</p>
            </div>
            <span className="text-xs font-mono font-black border border-slate-900 px-2 py-0.5 rounded">
              {patient.patientCode}
            </span>
          </div>

          <div className="flex gap-4">
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt={patient.name} className="h-28 w-28 rounded-xl object-cover border border-slate-300" />
            ) : (
              <div className="h-28 w-28 bg-slate-100 rounded-xl border border-slate-300 flex items-center justify-center text-2xl font-bold text-slate-400">
                {patient.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-2 flex-1 text-xs">
              <div>
                <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-400">Patient Name</span>
                <span className="font-extrabold text-sm text-slate-900">{patient.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-400">Age / Gender</span>
                  <span className="font-bold text-slate-800">{patient.age} Y / {patient.gender}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-400">Blood Group</span>
                  <span className="font-bold text-slate-855">{patient.bloodGroup || "N/A"}</span>
                </div>
              </div>
              <div>
                <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-400">Phone</span>
                <span className="font-bold font-mono text-slate-800">{patient.phone}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
            <div>
              <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-400">Universal ID (UHID)</span>
              <span className="text-base font-black font-mono tracking-wider">{patient.uhid}</span>
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(patient.qrCode)}`}
              alt="Barcode QR"
              className="h-14 w-14 object-contain"
            />
          </div>
        </div>

        {/* Screen layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          {/* Left panel: Info card */}
          <div className="md:col-span-1 space-y-6">
            <Card className="space-y-4">
              <div className="text-center pb-4 border-b border-slate-100 space-y-3">
                {patient.photoUrl ? (
                  <img src={patient.photoUrl} alt={patient.name} className="mx-auto h-24 w-24 rounded-full object-cover border-2 border-navy-100 shadow-sm" />
                ) : (
                  <div className="mx-auto h-24 w-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl font-extrabold text-slate-400 border border-slate-200">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{patient.name}</h2>
                  <span className="text-[10px] font-mono font-bold bg-navy-50 text-navy-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {patient.patientCode}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-450">UHID:</span>
                  <span className="font-mono font-bold text-slate-800">{patient.uhid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Phone Number:</span>
                  <span className="font-mono font-semibold text-slate-800">{patient.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Age / Gender:</span>
                  <span className="font-semibold text-slate-800">{patient.age} yrs / {patient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-455">Blood Group:</span>
                  <span className="font-semibold text-slate-800">{patient.bloodGroup || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-455">Registered On:</span>
                  <span className="font-semibold text-slate-805">
                    {patient.createdAt ? new Date(patient.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true
                    }) : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Current Status:</span>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    patient.status === "admitted" ? "bg-red-50 text-red-700 border-red-200 animate-pulse" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {patient.status === "admitted" ? "Admitted IP" : "Outpatient"}
                  </span>
                </div>
              </div>
            </Card>

            {patient.status === "admitted" && patient.activeAdmission && (
              <Card className="bg-rose-50/40 border border-rose-100 space-y-3 p-4">
                <div className="flex justify-between items-center border-b border-rose-100 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <Building className="h-4 w-4" /> Active Admission Details
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
                    {patient.activeAdmission.admissionNumber}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Current Ward:</span>
                    <span className="font-bold text-slate-800">{patient.activeAdmission.ward}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Room Number:</span>
                    <span className="font-bold text-slate-800">Room {patient.activeAdmission.roomNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Bed Number:</span>
                    <span className="font-bold text-slate-800">Bed {patient.activeAdmission.bedNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Admitting Doctor:</span>
                    <span className="font-bold text-slate-800">Dr. {patient.activeAdmission.admittingDoctor}</span>
                  </div>
                </div>
              </Card>
            )}

            <Card className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                Insurance Details
              </h3>
              {patient.insuranceProvider ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Provider:</span>
                    <span className="font-semibold text-slate-700">{patient.insuranceProvider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Policy Number:</span>
                    <span className="font-mono font-semibold text-slate-700">{patient.insurancePolicyNumber}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No insurance files found.</p>
              )}
            </Card>
          </div>

          {/* Right panel: History and logs */}
          <div className="md:col-span-2 space-y-6">
            <Card className="space-y-4">
              {/* Tab Navigation Headers */}
              <div className="flex bg-slate-100 p-1 rounded-lg w-full overflow-x-auto gap-1">
                {([
                  { key: "history",       label: "Medical History",     icon: <History className="h-3.5 w-3.5" /> },
                  { key: "prescriptions", label: "Prescriptions",       icon: <Pill className="h-3.5 w-3.5" /> },
                  { key: "billing",       label: "Billing History",     icon: <Receipt className="h-3.5 w-3.5" /> },
                  { key: "reports",       label: "Reports",             icon: <Activity className="h-3.5 w-3.5" /> }
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setProfileTab(t.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                      profileTab === t.key ? "bg-navy-700 text-white shadow-sm" : "text-slate-650 hover:bg-slate-50"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: MEDICAL HISTORY */}
              {profileTab === "history" && (() => {
                const historyGroups = groupHistoryByConsultation(patient.medicalHistory || []);
                const labOrPharmacyDues = billsData?.data?.filter((inv: any) => 
                  (inv.billingType === "LAB" || inv.billingType === "RADIOLOGY" || inv.billingType === "PHARMACY") &&
                  inv.status !== "paid" &&
                  (inv.totals?.patientBalance > 0 || (inv.totals?.patientBalance === undefined && inv.totals?.total > 0))
                ) || [];

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <History className="h-4.5 w-4.5 text-navy-700" /> Medical History Ledger
                      </h3>
                      <span className="text-xs text-slate-400">
                        {historyGroups.length} consultations recorded
                      </span>
                    </div>

                    {/* Laboratory & Pharmacy Outstanding Dues Alert */}
                    {patient.status === "admitted" && labOrPharmacyDues.length > 0 && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3 shadow-sm">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide">
                              Outstanding Laboratory / Pharmacy Dues Detected
                            </h4>
                            <p className="text-xs text-red-750 leading-relaxed">
                              This patient is currently an Inpatient and has pending laboratory or pharmacy bills. 
                              Please ensure these dues are cleared at the respective counters before discharge validation.
                            </p>
                          </div>
                        </div>
                        <div className="divide-y divide-red-100 rounded-lg border border-red-100 bg-white text-xs">
                          {labOrPharmacyDues.map((inv: any) => {
                            const balance = inv.totals?.patientBalance ?? inv.totals?.total ?? 0;
                            return (
                              <div key={inv._id} className="flex items-center justify-between p-2.5">
                                <div>
                                  <span className="font-semibold text-slate-700">
                                    {inv.billingType === "PHARMACY" ? "Pharmacy Medication Invoice" : "Laboratory Diagnostics Invoice"}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block mt-0.5">
                                    Invoice: {inv.invoiceNumber || inv._id.substring(18).toUpperCase()} · Date: {new Date(inv.issuedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-red-600 block">₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                  <span className="inline-flex rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red-700">
                                    {inv.status.replace("_", " ")}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-b-lg font-bold text-slate-800">
                            <span>Total Laboratory & Pharmacy Dues:</span>
                            <span className="text-red-700 text-sm">
                              ₹{labOrPharmacyDues.reduce((sum, inv) => sum + (inv.totals?.patientBalance ?? inv.totals?.total ?? 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {historyGroups.length > 0 ? (
                      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                        {historyGroups.map((group, groupIdx) => {
                          const isLatest = groupIdx === 0;
                          return (
                            <div
                              key={group.id}
                              className={`rounded-xl border p-3.5 transition-all space-y-3 ${
                                isLatest
                                  ? "border-emerald-300/80 bg-gradient-to-r from-emerald-50/40 via-slate-50 to-white shadow-sm ring-1 ring-emerald-200/50"
                                  : "border-slate-200 bg-slate-50/30"
                              }`}
                            >
                              {/* Consultation Header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 mb-1">
                                <div className="flex items-center gap-2">
                                  {isLatest ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                                      <Activity className="h-3 w-3" /> Last Consultation
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                      Previous Consultation
                                    </span>
                                  )}
                                  <span className="text-xs font-bold text-slate-800">
                                    {group.dateFormatted}
                                  </span>
                                </div>
                                {group.doctorName && (
                                  <span className="text-[11px] text-slate-500">
                                    Doctor: <strong className="text-slate-700">Dr. {group.doctorName}</strong> {group.department && `(${group.department})`}
                                  </span>
                                )}
                              </div>

                              {/* Consultation Clinical Summary */}
                              {group.consultation && (
                                <div className="bg-white rounded-lg border border-slate-100 p-2.5 space-y-1 text-xs">
                                  <div className="flex items-center gap-1.5 text-navy-700 font-bold border-b border-slate-50 pb-1 mb-1">
                                    <FileText className="h-3.5 w-3.5" /> Clinical Examination Details
                                  </div>
                                  {group.consultation.diagnosis && (
                                    <p className="text-slate-700"><span className="font-semibold text-slate-500">Diagnosis:</span> {group.consultation.diagnosis}</p>
                                  )}
                                  {group.consultation.notes && (
                                    <p className="text-slate-600 whitespace-pre-wrap"><span className="font-semibold text-slate-500">Notes:</span> {group.consultation.notes}</p>
                                  )}
                                </div>
                              )}

                              {/* Prescriptions issued */}
                              {group.prescriptions.length > 0 && (
                                <div className="bg-white rounded-lg border border-slate-100 p-2.5 space-y-1 text-xs">
                                  <div className="flex items-center gap-1.5 text-indigo-700 font-bold border-b border-slate-50 pb-1 mb-1">
                                    <Pill className="h-3.5 w-3.5" /> Prescriptions Issued
                                  </div>
                                  {group.prescriptions.map((item, i) => (
                                    <div key={i} className="text-slate-655">
                                      {item.diagnosis && <p className="font-semibold text-slate-700">For: {item.diagnosis}</p>}
                                      <p className="whitespace-pre-wrap mt-0.5">{item.notes}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Laboratory investigations ordered */}
                              {group.labs.length > 0 && (
                                <div className="bg-white rounded-lg border border-slate-100 p-2.5 space-y-1 text-xs">
                                  <div className="flex items-center gap-1.5 text-blue-700 font-bold border-b border-slate-50 pb-1 mb-1">
                                    <FlaskConical className="h-3.5 w-3.5" /> Lab Investigations Ordered
                                  </div>
                                  {group.labs.map((item, i) => (
                                    <div key={i} className="text-slate-655 leading-relaxed">
                                      {item.diagnosis && <p className="font-semibold text-slate-700">Reason: {item.diagnosis}</p>}
                                      <p className="whitespace-pre-wrap mt-0.5">{item.notes}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Radiology scans ordered */}
                              {group.radiology.length > 0 && (
                                <div className="bg-white rounded-lg border border-slate-100 p-2.5 space-y-1 text-xs">
                                  <div className="flex items-center gap-1.5 text-purple-700 font-bold border-b border-slate-50 pb-1 mb-1">
                                    <Scan className="h-3.5 w-3.5" /> Radiology Studies Ordered
                                  </div>
                                  {group.radiology.map((item, i) => (
                                    <div key={i} className="text-slate-655 leading-relaxed">
                                      {item.diagnosis && <p className="font-semibold text-slate-700">Study Request: {item.diagnosis}</p>}
                                      <p className="whitespace-pre-wrap mt-0.5">{item.notes}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Inpatient rounds notes */}
                              {group.inpatientNotes.length > 0 && (
                                <div className="bg-white rounded-lg border border-slate-100 p-2.5 space-y-1 text-xs">
                                  <div className="flex items-center gap-1.5 text-amber-700 font-bold border-b border-slate-100 pb-1 mb-1">
                                    <Heart className="h-3.5 w-3.5" /> Inpatient Rounds Notes
                                  </div>
                                  {group.inpatientNotes.map((item, i) => (
                                    <div key={i} className="text-slate-650">
                                      {item.diagnosis && <p className="font-semibold text-slate-700">Diagnosis/Status: {item.diagnosis}</p>}
                                      <p className="whitespace-pre-wrap mt-0.5">{item.notes}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Certificates issued */}
                              {group.certificates.length > 0 && (
                                <div className="bg-white rounded-lg border border-slate-100 p-2.5 space-y-1 text-xs">
                                  <div className="flex items-center gap-1.5 text-rose-700 font-bold border-b border-slate-100 pb-1 mb-1">
                                    <FileCheck className="h-3.5 w-3.5" /> Medical Certificates Issued
                                  </div>
                                  {group.certificates.map((item, i) => (
                                    <div key={i} className="text-slate-655">
                                      {item.diagnosis && <p className="font-semibold text-slate-700">Purpose/Diagnosis: {item.diagnosis}</p>}
                                      <p className="whitespace-pre-wrap mt-0.5">{item.notes}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Fallback if a group somehow has no specific visit types mapped */}
                              {!group.consultation &&
                                group.prescriptions.length === 0 &&
                                group.labs.length === 0 &&
                                group.radiology.length === 0 &&
                                group.inpatientNotes.length === 0 &&
                                group.certificates.length === 0 &&
                                group.others.length > 0 && (
                                  <div className="space-y-2">
                                    {group.others.map((item: any, i: number) => (
                                      <div key={i} className="border border-slate-150 rounded-lg p-2 bg-white space-y-1 text-xs">
                                        <p className="font-semibold text-slate-800">{item.visitType || "Medical Entry"}</p>
                                        {item.diagnosis && <p className="text-slate-600"><span className="font-semibold">Diagnosis:</span> {item.diagnosis}</p>}
                                        {item.notes && <p className="text-slate-500 italic">{item.notes}</p>}
                                      </div>
                                    ))}
                                  </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4">No medical history logged for this patient file.</p>
                    )}
                  </div>
                );
              })()}

              {/* TAB 2: PRESCRIPTIONS */}
              {profileTab === "prescriptions" && (() => {
                const rxGroups = groupPrescriptionsByConsultation(prescriptions || []);

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Pill className="h-4.5 w-4.5 text-navy-700" /> Prescription History
                      </h3>
                      <span className="text-xs text-slate-400">
                        {(prescriptions || []).length} rx across {rxGroups.length} consultations
                      </span>
                    </div>

                    {rxGroups.length > 0 ? (
                      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                        {rxGroups.map((group, groupIdx) => {
                          const isLatest = groupIdx === 0;
                          return (
                            <div
                              key={group.id}
                              className={`rounded-xl border p-3.5 transition-all ${
                                isLatest
                                  ? "border-emerald-300/80 bg-gradient-to-r from-emerald-50/40 via-blue-50/20 to-white shadow-sm ring-1 ring-emerald-200/50"
                                  : "border-slate-200 bg-slate-50/30"
                              }`}
                            >
                              {/* Consultation Header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 mb-2.5">
                                <div className="flex items-center gap-2">
                                  {isLatest ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                                      <Pill className="h-3 w-3" /> Last Consultation
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                      Previous Consultation
                                    </span>
                                  )}
                                  <span className="text-xs font-bold text-slate-800">
                                    {group.dateFormatted}
                                  </span>
                                </div>
                                {group.doctorName && (
                                  <span className="text-[11px] text-slate-500">
                                    Doctor: <strong className="text-slate-700">Dr. {group.doctorName}</strong>
                                  </span>
                                )}
                              </div>

                              {/* Prescriptions in this consultation */}
                              <div className="space-y-3">
                                {group.prescriptions.map((rx: any) => (
                                  <div key={rx._id} className="border border-slate-200/80 rounded-xl p-3 bg-white space-y-2">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="font-semibold text-slate-800 text-xs">Rx Code: {rx.prescriptionNumber || rx._id.substring(18)}</span>
                                        <span className="text-[10px] text-slate-400 block">Doctor: Dr. {rx.doctor?.name || group.doctorName || "Attending Doctor"}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400">{new Date(rx.createdAt).toLocaleDateString("en-IN")}</span>
                                    </div>
                                    {rx.diagnosis && (
                                      <p className="text-xs text-slate-600"><span className="font-semibold text-slate-700">Diagnosis:</span> {rx.diagnosis}</p>
                                    )}
                                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Prescribed Medicines</span>
                                      <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-700 mt-1">
                                        {(rx.medicines || rx.medications)?.map((m: any, idx: number) => (
                                          <li key={idx}>
                                            <span className="font-semibold">{m.name}</span> {m.strength && `(${m.strength})`} — {m.dosage} ({m.frequency} for {m.duration})
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4">No prescriptions issued for this patient.</p>
                    )}
                  </div>
                );
              })()}

              {/* TAB 3: BILLING */}
              {profileTab === "billing" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <Receipt className="h-4.5 w-4.5 text-navy-700" /> Billing ledger
                  </h3>
                  {billsData && billsData.data && billsData.data.length > 0 ? (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {billsData.data.map((inv: any) => (
                        <div key={inv._id} className="border border-slate-100 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs font-semibold text-indigo-700 block">Inv No: {inv.invoiceNumber || inv._id.substring(18)}</span>
                            <span className="text-[10px] text-slate-455 block mt-0.5">Date: {new Date(inv.issuedAt).toLocaleDateString()} · Type: {inv.billingType}</span>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="font-bold text-slate-900 text-xs block">{formatINR(inv.totals?.total)}</span>
                            <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {inv.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-4">No billing transactions recorded.</p>
                  )}
                </div>
              )}

              {/* TAB 4: REPORTS */}
              {profileTab === "reports" && (() => {
                const labReports = reports.filter((r: any) => r.requestType === "Laboratory");
                const radReports = reports.filter((r: any) => r.requestType === "Radiology" || r.requestType === "Combined");

                const labGroups = groupReportsByConsultation(labReports);
                const radGroups = groupReportsByConsultation(radReports);

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Activity className="h-4.5 w-4.5 text-navy-700" /> Diagnostic Reports
                      </h3>
                      <span className="text-xs text-slate-400">
                        {reports.length} total report(s)
                      </span>
                    </div>

                    {reportsLoading ? (
                      <div className="py-8 text-center text-slate-400">Loading diagnostic reports...</div>
                    ) : reports.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4">No diagnostic reports published for this patient.</p>
                    ) : (
                      <div className="space-y-6 max-h-[420px] overflow-y-auto pr-1">
                        {/* Section 1: Laboratory Reports */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-1">
                            <FlaskConical className="h-4 w-4 text-navy-700" /> Laboratory Reports ({labReports.length})
                          </h4>
                          {labGroups.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">No laboratory reports on file.</p>
                          ) : (
                            labGroups.map((group, groupIdx) => {
                              const isLatest = groupIdx === 0;
                              return (
                                <div
                                  key={group.id}
                                  className={`rounded-xl border p-3.5 transition-all ${
                                    isLatest
                                      ? "border-emerald-300/80 bg-gradient-to-r from-emerald-50/40 via-slate-50 to-white shadow-sm ring-1 ring-emerald-200/50"
                                      : "border-slate-200 bg-slate-50/30"
                                  }`}
                                >
                                  {/* Consultation Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 mb-2.5">
                                    <div className="flex items-center gap-2">
                                      {isLatest ? (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                                          <Activity className="h-3 w-3" /> Last Consultation
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                          Previous Consultation
                                        </span>
                                      )}
                                      <span className="text-xs font-bold text-slate-800">
                                        {group.dateFormatted}
                                      </span>
                                      {group.appointmentRef && (
                                        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                                          Ref: #{group.appointmentRef}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                      {group.doctorName && (
                                        <span>Doctor: <strong className="text-slate-700">Dr. {group.doctorName}</strong></span>
                                      )}
                                      <span className="rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-semibold text-navy-800">
                                        {group.reports.length} {group.reports.length === 1 ? "Report" : "Reports"}
                                      </span>
                                    </div>
                                  </div>

                                  {group.chiefComplaint && (
                                    <div className="mb-2.5 rounded-lg border border-slate-200/60 bg-white p-2 text-xs text-slate-600">
                                      <span className="font-semibold text-slate-700">Chief Complaint / Notes:</span> {group.chiefComplaint}
                                    </div>
                                  )}

                                  {/* Reports list */}
                                  <div className="space-y-2.5">
                                    {group.reports.map((r: any) => (
                                      <div key={r._id} className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-1.5 text-xs">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1">
                                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                            <FlaskConical className="h-3.5 w-3.5 text-navy-600" /> {r.testName}
                                          </span>
                                          <span className="text-[10px] text-slate-400">{new Date(r.uploadedAt || r.createdAt).toLocaleDateString("en-IN")}</span>
                                        </div>
                                        <p className="text-slate-600 text-[11px]"><span className="font-semibold text-slate-700">Uploaded By:</span> {r.uploadedBy?.name || "Technician"}</p>
                                        {r.observations && (
                                          <p className="text-slate-600 text-[11px]"><span className="font-semibold text-slate-700">Observations:</span> {r.observations}</p>
                                        )}
                                        {r.remarks && (
                                          <p className="text-slate-500 italic text-[11px]"><span className="font-semibold text-slate-600">Remarks:</span> {r.remarks}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-100 text-[11px]">
                                          {r.files?.[0]?.secure_url && (
                                            <a
                                              href={r.files[0].secure_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
                                            >
                                              <Eye className="h-3 w-3" /> View Report
                                            </a>
                                          )}
                                          <a
                                            href={`/api/v1/diagnostic-reports/${r._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-green-700 hover:underline font-bold ml-1"
                                          >
                                            <Download className="h-3 w-3" /> Download
                                          </a>
                                          <button
                                            onClick={() => setSelectedReportId(r._id)}
                                            className="inline-flex items-center gap-1 text-navy-700 hover:underline font-bold ml-auto bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-0.5 text-[10px]"
                                          >
                                            Details
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Section 2: Radiology Reports */}
                        <div className="space-y-3 pt-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-1">
                            <Scan className="h-4 w-4 text-navy-700" /> Radiology Studies ({radReports.length})
                          </h4>
                          {radGroups.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">No radiology reports on file.</p>
                          ) : (
                            radGroups.map((group, groupIdx) => {
                              const isLatest = groupIdx === 0;
                              return (
                                <div
                                  key={group.id}
                                  className={`rounded-xl border p-3.5 transition-all ${
                                    isLatest
                                      ? "border-emerald-300/80 bg-gradient-to-r from-emerald-50/40 via-purple-50/20 to-white shadow-sm ring-1 ring-emerald-200/50"
                                      : "border-slate-200 bg-slate-50/30"
                                  }`}
                                >
                                  {/* Consultation Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 mb-2.5">
                                    <div className="flex items-center gap-2">
                                      {isLatest ? (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                                          <Activity className="h-3 w-3" /> Last Consultation
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                          Previous Consultation
                                        </span>
                                      )}
                                      <span className="text-xs font-bold text-slate-800">
                                        {group.dateFormatted}
                                      </span>
                                      {group.appointmentRef && (
                                        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                                          Ref: #{group.appointmentRef}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                      {group.doctorName && (
                                        <span>Doctor: <strong className="text-slate-700">Dr. {group.doctorName}</strong></span>
                                      )}
                                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                                        {group.reports.length} {group.reports.length === 1 ? "Report" : "Reports"}
                                      </span>
                                    </div>
                                  </div>

                                  {group.chiefComplaint && (
                                    <div className="mb-2.5 rounded-lg border border-slate-200/60 bg-white p-2 text-xs text-slate-600">
                                      <span className="font-semibold text-slate-700">Chief Complaint / Notes:</span> {group.chiefComplaint}
                                    </div>
                                  )}

                                  {/* Reports list */}
                                  <div className="space-y-2.5">
                                    {group.reports.map((r: any) => (
                                      <div key={r._id} className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-1.5 text-xs">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1">
                                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                            <Scan className="h-3.5 w-3.5 text-navy-600" /> {r.testName}
                                          </span>
                                          <span className="text-[10px] text-slate-400">{new Date(r.uploadedAt || r.createdAt).toLocaleDateString("en-IN")}</span>
                                        </div>
                                        <p className="text-slate-650 text-[11px]"><span className="font-semibold text-slate-700">Uploaded By:</span> {r.uploadedBy?.name || "Radiologist"}</p>
                                        {r.observations && (
                                          <p className="text-slate-600 text-[11px]"><span className="font-semibold text-slate-700">Findings:</span> {r.observations}</p>
                                        )}
                                        {r.remarks && (
                                          <p className="text-slate-500 italic text-[11px]"><span className="font-semibold text-slate-600">Remarks:</span> {r.remarks}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-100 text-[11px]">
                                          {r.files?.[0]?.secure_url && (
                                            <a
                                              href={r.files[0].secure_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
                                            >
                                              <Eye className="h-3 w-3" /> View Report
                                            </a>
                                          )}
                                          <a
                                            href={`/api/v1/diagnostic-reports/${r._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-green-700 hover:underline font-bold ml-1"
                                          >
                                            <Download className="h-3 w-3" /> Download
                                          </a>
                                          <button
                                            onClick={() => setSelectedReportId(r._id)}
                                            className="inline-flex items-center gap-1 text-navy-700 hover:underline font-bold ml-auto bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-0.5 text-[10px]"
                                          >
                                            Details
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card>

            {/* Detailed Report Modal */}
            {selectedReport && (
              <Modal
                title={`${selectedReport.requestType} Investigation Report`}
                isOpen={!!selectedReportId}
                onClose={() => setSelectedReportId(null)}
              >
                <div className="space-y-4">
                  {/* Patient Info */}
                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs border border-slate-200">
                    <div>
                      <p className="font-semibold text-slate-400 uppercase">Patient Name</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{patient?.name || "—"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-400 uppercase">UHID</p>
                      <p className="text-sm font-mono text-slate-800 mt-0.5">{patient?.uhid || "—"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-400 uppercase">Age / Gender</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">
                        {patient?.age ? `${patient.age} Yrs` : "—"} / {patient?.gender || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-400 uppercase">Ordering Doctor</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">Dr. {selectedReport.doctor?.name || "Attending Doctor"}</p>
                    </div>
                  </div>

                  {/* Investigation Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Investigation Details</p>
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1.5">
                      <div>
                        <span className="text-slate-400 font-semibold">Test Name:</span> <span className="font-bold text-slate-800">{selectedReport.testName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold">Status:</span> <span className="font-bold uppercase text-emerald-700">{selectedReport.status}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold">Date:</span> <span className="font-medium text-slate-700">{new Date(selectedReport.uploadedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Findings & Remarks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-400 uppercase">Findings / Observations</span>
                      <p className="text-slate-700 font-medium whitespace-pre-wrap">{selectedReport.observations || "No findings recorded."}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-400 uppercase">Technical Remarks</span>
                      <p className="text-slate-600 italic whitespace-pre-wrap">{selectedReport.remarks || "No technical remarks."}</p>
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedReport.files && selectedReport.files.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Attached Files ({selectedReport.files.length})</p>
                      <div className="flex flex-col gap-2">
                        {selectedReport.files.map((file: any, index: number) => (
                          <div key={index} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 text-xs">
                            <span className="font-semibold text-slate-700 truncate max-w-[250px]">{file.original_filename}</span>
                            <div className="flex items-center gap-2">
                              <a
                                href={file.secure_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 hover:underline text-blue-700 font-bold"
                              >
                                <Eye className="h-3.5 w-3.5" /> View Report
                              </a>
                              <a
                                href={`/api/v1/diagnostic-reports/${selectedReport._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 hover:underline text-green-700 font-bold ml-2"
                              >
                                <Download className="h-3.5 w-3.5" /> Download
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Modal>
            )}

            <Card className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clipboard className="h-4.5 w-4.5" /> Emergency Contacts
              </h3>
              {patient.emergencyContact?.name ? (
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Contact Name</span>
                    <span className="font-semibold text-slate-700">{patient.emergencyContact.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Phone Number</span>
                    <span className="font-semibold text-slate-750 font-mono">{patient.emergencyContact.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Relation</span>
                    <span className="font-semibold text-slate-700">{patient.emergencyContact.relation}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No emergency contacts saved.</p>
              )}
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => navigate("/receptionist/patients")} variant="secondary" className="text-xs px-4 py-2">
                Back to Registry
              </Button>
            </div>
          </div>
        </div>

        {/* Admission Details Modal (Inpatient) */}
        {isAdmissionDetailsOpen && patient.activeAdmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-6 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building className="h-5 w-5 text-indigo-700" /> Active Admission Details
                </h2>
                <button onClick={() => setIsAdmissionDetailsOpen(false)} className="text-slate-400 hover:text-slate-650 font-semibold text-lg">
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Admission Number</span>
                  <span className="font-bold text-slate-800 font-mono text-sm">{patient.activeAdmission.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Admission Date</span>
                  <span className="font-semibold text-slate-800">{new Date(patient.activeAdmission.admissionDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Current Ward</span>
                  <span className="font-bold text-slate-800">{patient.activeAdmission.ward}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Room & Bed Number</span>
                  <span className="font-bold text-slate-800">Room {patient.activeAdmission.roomNumber} / Bed {patient.activeAdmission.bedNumber}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block font-semibold">Admitting Doctor</span>
                  <span className="font-bold text-slate-800">Dr. {patient.activeAdmission.admittingDoctor}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setIsAdmissionDetailsOpen(false)} variant="secondary" className="text-xs">
                  Close Details
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Previous Admissions Modal (Discharged) */}
        {isPreviousAdmissionsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl space-y-6 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-700" /> Patient Previous Admissions Ledger
                </h2>
                <button onClick={() => setIsPreviousAdmissionsOpen(false)} className="text-slate-400 hover:text-slate-655 font-semibold text-lg">
                  &times;
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto pr-1">
                {previousAdmissions && previousAdmissions.length > 0 ? (
                  <div className="space-y-4">
                    {previousAdmissions.map((adm: any) => (
                      <div key={adm._id} className="border border-slate-100 rounded-xl p-3 bg-slate-50 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Admission Number</span>
                          <span className="font-mono font-bold text-slate-800">{adm.admissionNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Admission Date</span>
                          <span className="font-semibold text-slate-700">{new Date(adm.admissionDate).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Discharge Date</span>
                          <span className="font-semibold text-slate-700">{adm.dischargeDate ? new Date(adm.dischargeDate).toLocaleDateString() : "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Ward & Room</span>
                          <span className="font-semibold text-slate-750">{adm.ward} (R{adm.room?.roomNumber})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Doctor</span>
                          <span className="font-semibold text-slate-755">Dr. {adm.admittingDoctor?.name || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Discharge Reason</span>
                          <span className="font-bold text-slate-700 italic truncate max-w-[150px] block" title={adm.dischargeNotes}>{adm.dischargeNotes || "N/A"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-8">No previous admissions records found on file.</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setIsPreviousAdmissionsOpen(false)} variant="secondary" className="text-xs">
                  Close Ledger
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Management</h1>
          <p className="text-sm text-slate-500">Register new patient files, search records, or list active registry files.</p>
        </div>

        {/* Tab triggers */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setTab("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "list" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <List className="h-3.5 w-3.5" /> Patient List
          </button>
          <button
            onClick={() => setTab("search")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "search" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Search className="h-3.5 w-3.5" /> Patient Search
          </button>
          <button
            onClick={() => setTab("new")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "new" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> New Registration
          </button>
        </div>
      </div>

      {/* List Tab */}
      {tab === "list" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {todayFilter ? "Today's Registrations" : "Master Patient Registry"}
              </h2>
              {todayFilter && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Showing patients registered today · Count matches dashboard
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {todayFilter && !todayLoading && (
                <span className="rounded-full bg-navy-50 text-navy-700 border border-navy-200 text-xs font-semibold px-2.5 py-0.5">
                  {todayData?.total ?? 0} registered today
                </span>
              )}
              <Button onClick={() => window.print()} variant="secondary" className="px-3 py-1.5 text-xs">
                Print Registry
              </Button>
            </div>
          </div>

          {todayFilter ? (
            /* Today's patients — matches dashboard card count exactly */
            todayLoading ? (
              <div className="py-8 text-center text-slate-400">Loading today's registrations...</div>
            ) : (
              <DataTable columns={columns} rows={todayData?.patients || []} rowKey={(row) => row._id} emptyMessage="No patients registered today." />
            )
          ) : (
            /* Full paginated list */
            listLoading ? (
              <div className="py-8 text-center text-slate-400">Loading Patient Registry...</div>
            ) : (
              <div className="space-y-4">
                <DataTable columns={columns} rows={listData?.data || []} rowKey={(row) => row._id} />
                {listData?.pagination && listData.pagination.totalPages > 1 && (
                  <div className="mt-4 flex justify-end">
                    <Pagination
                      page={page}
                      totalPages={listData.pagination.totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </div>
            )
          )}
        </Card>
      )}

      {/* Search Tab */}
      {tab === "search" && (
        <div className="space-y-4">
          <Card>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient by UHID, phone number, name, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              />
            </div>
          </Card>

          {searchResults && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Search Results ({searchResults.length})</h2>
              <DataTable columns={columns} rows={searchResults} rowKey={(row) => row._id} />
            </Card>
          )}
        </div>
      )}

      {/* New Registration Form */}
      {tab === "new" && (
        <form
          onSubmit={handleSubmit(
            handleRegister,
            (errs) => {
              console.error("Validation failed:", errs);
              toast.error("Please correct the form errors shown at the bottom.");
            }
          )}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Left/Middle: Patient Basic details */}
            <Card className="md:col-span-2 space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" /> Basic Information
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField label="Full Name" required {...register("name")} hint={errors.name?.message as any} />
                <InputField label="Email Address" {...register("email")} hint={errors.email?.message as any} />
                <InputField label="Phone Number" required {...register("phone")} hint={errors.phone?.message as any} />
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Age" type="number" required {...register("age", { valueAsNumber: true })} hint={errors.age?.message as any} />
                  <SelectField label="Gender" required {...register("gender")} hint={errors.gender?.message as any}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </SelectField>
                </div>
                <SelectField label="Blood Group" {...register("bloodGroup")} hint={errors.bloodGroup?.message as any}>
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </SelectField>
                <InputField label="Known Allergies" {...register("allergies")} placeholder="e.g. Penicillin, Pollen" />
              </div>
              <TextareaField label="Residential Address" {...register("address")} rows={2} />
            </Card>

            {/* Right Side: Photo and Insurance */}
            <div className="space-y-6">
              <Card className="space-y-4">
                <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Camera className="h-4 w-4" /> Patient Photo
                </h3>
                <div className="space-y-3">
                  <FileUpload
                    label="Patient Photo"
                    folder="patient-photos"
                    value={photoUrl}
                    onChange={setPhotoUrl}
                  />
                  <div className="flex gap-2 justify-center border-t border-slate-100 pt-2.5">
                    <Button type="button" onClick={startCamera} variant="secondary" className="text-xs px-2.5 py-1.5 flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" /> Start Webcam
                    </Button>
                    <Button type="button" onClick={triggerWebcamSimulation} variant="secondary" className="text-[10px] px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200">
                      Simulate
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Webcam Capture Modal Overlay */}
              {isCameraOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-100 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <Camera className="h-4 w-4 text-navy-700" /> Device Webcam Capture
                      </h3>
                      <button type="button" onClick={stopCamera} className="text-slate-400 hover:text-slate-700 text-lg font-semibold">
                        &times;
                      </button>
                    </div>

                    {cameraError ? (
                      <div className="w-full p-4 rounded-xl bg-red-50 text-red-600 text-xs border border-red-200 text-center font-medium">
                        {cameraError}
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-850 relative">
                        {!cameraStream && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-405 gap-2">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="text-xs">Accessing camera stream...</span>
                          </div>
                        )}
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      </div>
                    )}

                    <div className="w-full flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <Button type="button" onClick={stopCamera} variant="secondary" className="text-xs">
                        Cancel
                      </Button>
                      {!cameraError && (
                        <Button
                          type="button"
                          onClick={capturePhoto}
                          disabled={isCapturing || !cameraStream}
                          variant="primary"
                          className="text-xs flex items-center gap-1 px-4"
                        >
                          {isCapturing ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Camera className="h-3.5 w-3.5" />
                              Capture & Save
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Card className="space-y-4">
                <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Shield className="h-4 w-4" /> Insurance Details
                </h3>
                <InputField label="Insurance Provider" {...register("insuranceProvider")} placeholder="e.g. Cigna, BlueShield" />
                <InputField label="Policy Number" {...register("insurancePolicyNumber")} placeholder="e.g. #CS-293" />
              </Card>
            </div>
          </div>

          {/* Emergency Contacts */}
          <Card className="space-y-4">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clipboard className="h-4 w-4" /> Emergency Contact Details
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InputField label="Contact Name" {...register("emergencyContact.name")} />
              <InputField label="Contact Phone" {...register("emergencyContact.phone")} />
              <InputField label="Relation" {...register("emergencyContact.relation")} placeholder="e.g. Spouse, Parent" />
            </div>
          </Card>

          {Object.keys(errors).length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-700 space-y-1">
              <div className="font-bold text-sm">Please correct the following validation errors:</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {getFlatErrors(errors).map((err, i) => (
                  <li key={i}>
                    <span className="font-semibold capitalize">{err.field.replace("_", " ")}</span>: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" onClick={() => setTab("list")} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={registerMutation.isPending} className="flex items-center gap-1.5">
              {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {registerMutation.isPending ? "Registering..." : "Submit Registration"}
            </Button>
          </div>
        </form>
      )}

      {/* Success Dialog Modal */}
      {showSuccessModal && registeredPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white text-center space-y-2">
              <div className="mx-auto h-14 w-14 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-white animate-pulse" />
              </div>
              <h3 className="text-lg font-bold">Registration Successful</h3>
              <p className="text-emerald-100 text-xs">Patient Registered Successfully</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Large UHID Card */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-150 relative overflow-hidden flex justify-between items-center">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Universal Health ID (UHID)</span>
                  <div className="text-xl font-black text-navy-800 tracking-wide font-mono">
                    {registeredPatient.uhid}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(registeredPatient.uhid);
                      toast.success("UHID copied to clipboard!");
                    }}
                    title="Copy UHID"
                    className="p-2 hover:bg-slate-250 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <Copy className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => window.print()}
                    title="Print UHID"
                    className="p-2 hover:bg-slate-250 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <Printer className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Patient Details & QR Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="sm:col-span-2 space-y-3 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">Patient Name</span>
                    <span className="font-semibold text-slate-805 text-sm">{registeredPatient.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block uppercase tracking-wider text-[10px] font-bold">Patient Code</span>
                    <span className="font-mono text-slate-700">{registeredPatient.patientCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-455 block uppercase tracking-wider text-[10px] font-bold">Registration Date &amp; Time</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(registeredPatient.createdAt || Date.now()).toLocaleString("en-US", {
                        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                      `HMS|${registeredPatient.uhid}|${registeredPatient.name}`
                    )}`}
                    alt="QR Code"
                    className="h-20 w-20 object-contain"
                  />
                  <span className="text-[9px] text-slate-400 font-semibold mt-1">Scan verification</span>
                </div>
              </div>

              {/* Action Choice Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    toast.success("Printing Patient Card...");
                    window.print();
                  }}
                  variant="secondary"
                  className="flex items-center justify-center gap-1.5 text-xs py-2 font-bold"
                >
                  <Printer className="h-4 w-4" /> Print Registration Card
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate(`/receptionist/appointments/new?patientId=${registeredPatient._id}`);
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs py-2 font-bold"
                >
                  <Calendar className="h-4 w-4" /> Book Appointment
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate(`/receptionist/patients/${registeredPatient._id}`);
                  }}
                  variant="secondary"
                  className="flex items-center justify-center gap-1.5 text-xs py-2 font-bold"
                >
                  <User className="h-4 w-4" /> Go To Patient Profile
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setTab("new");
                  }}
                  variant="ghost"
                  className="flex items-center justify-center gap-1.5 text-xs py-2 font-bold border border-slate-200 hover:bg-slate-50"
                >
                  Register Another Patient
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
