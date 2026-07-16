import { useState, useEffect } from "react";
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
  Info
} from "lucide-react";
import {
  useRegisterPatient,
  usePatientsSearch,
  usePatientsList,
  usePatientDetails,
  useTodayRegistrations,
  useAdmitPatient,
  useRoomsAvailability,
  useDoctorsAvailability
} from "../../features/receptionist";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { formatINR } from "../../lib/currency";

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
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-455 block uppercase tracking-wider text-[9px] font-bold">Advance Deposit Paid</span>
                  <span className="font-bold text-slate-800">{formatINR(successData.admissionSlip?.advancePaid)}</span>
                </div>
                {successData.admissionSlip?.advancePaid > 0 && (
                  <div className="text-right">
                    <span className="text-slate-455 block uppercase tracking-wider text-[9px] font-bold">Receipt Number</span>
                    <span className="font-semibold text-slate-700 font-mono">{successData.admissionSlip?.receiptNumber}</span>
                  </div>
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
            {patient.status !== "admitted" ? (
              <Button
                onClick={() => {
                  setAttenderName(patient.emergencyContact?.name || "");
                  setAttenderPhone(patient.emergencyContact?.phone || "");
                  setInsuranceProvider(patient.insuranceProvider || "");
                  setInsurancePolicyNumber(patient.insurancePolicyNumber || "");
                  setIsConvertOpen(true);
                }}
                className="flex items-center gap-1 text-xs bg-indigo-700 hover:bg-indigo-800"
              >
                <Building className="h-4 w-4" /> Convert OP to IP
              </Button>
            ) : (
              <span className="inline-flex items-center rounded-md bg-red-50 border border-red-200 text-red-700 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                ADMITTED INPATIENT
              </span>
            )}
            <Button variant="secondary" onClick={() => window.print()} className="flex items-center gap-1 text-xs">
              <Printer className="h-4 w-4" /> Print Card
            </Button>
            <Button onClick={() => navigate(`/receptionist/appointments/new?patientId=${patient._id}`)} className="flex items-center gap-1 text-xs">
              <Calendar className="h-4 w-4" /> Book Appointment
            </Button>
          </div>
        </div>

        {/* Dynamic Printable Patient Card ID Mockup */}
        <div className="hidden print:block bg-white text-black p-8 rounded-2xl border-4 border-slate-900 max-w-md mx-auto space-y-6">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-slate-950">HMS Enterprise</h2>
              <p className="text-[10px] uppercase font-bold text-slate-500">Hospital Registry Card</p>
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
                  <span className="font-bold text-slate-850">{patient.bloodGroup || "N/A"}</span>
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
                  <span className="text-slate-450">Blood Group:</span>
                  <span className="font-semibold text-slate-800">{patient.bloodGroup || "N/A"}</span>
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
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History className="h-4.5 w-4.5" /> Medical History Ledger
              </h3>
              {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {patient.medicalHistory.map((item: any, i: number) => (
                    <div key={i} className="border border-slate-100 rounded-xl p-3 bg-slate-50 relative">
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-slate-800 text-xs">{item.visitType}</div>
                        <span className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5"><span className="font-semibold">Diagnosis:</span> {item.diagnosis}</p>
                      <p className="text-[10px] text-slate-450 mt-1"><span className="font-medium text-slate-500">Doctor:</span> {item.doctorName} ({item.department})</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">No medical history logged for this patient file.</p>
              )}
            </Card>

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

        {/* Convert OP to IP Inpatient Dialog Modal */}
        {isConvertOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
            <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building className="h-5 w-5 text-indigo-700" /> Convert OP to Inpatient (IP) Admission
                  </h2>
                  <p className="text-xs text-slate-550 mt-0.5 font-medium">Receptionist-initiated admission record conversion based on Doctor verbal instructions.</p>
                </div>
                <button onClick={() => setIsConvertOpen(false)} className="text-slate-400 hover:text-slate-600 font-semibold text-lg">
                  &times;
                </button>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-6">
                
                {/* 1. Read-Only Patient Metadata Grid */}
                <div className="bg-slate-50 rounded-xl border border-slate-150 p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Auto-filled Patient Details (Readonly)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold">Universal ID (UHID)</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{patient.uhid}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Patient Name</span>
                      <span className="font-bold text-slate-800">{patient.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Age / Gender</span>
                      <span className="font-semibold text-slate-800">{patient.age} Yrs / {patient.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Phone Number</span>
                      <span className="font-semibold text-slate-800 font-mono">{patient.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Blood Group</span>
                      <span className="font-semibold text-slate-850">{patient.bloodGroup || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Last Consulting Doctor</span>
                      <span className="font-semibold text-slate-800">
                        {patient.medicalHistory && patient.medicalHistory.length > 0
                          ? patient.medicalHistory[0].doctorName
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Last Visit Date</span>
                      <span className="font-semibold text-slate-800">
                        {patient.medicalHistory && patient.medicalHistory.length > 0
                          ? new Date(patient.medicalHistory[0].date).toLocaleDateString("en-IN")
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Diagnosis (if available)</span>
                      <span className="font-semibold text-slate-800 italic truncate max-w-[150px]" title={patient.medicalHistory && patient.medicalHistory.length > 0 ? patient.medicalHistory[0].diagnosis : ""}>
                        {patient.medicalHistory && patient.medicalHistory.length > 0
                          ? patient.medicalHistory[0].diagnosis
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Admission Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Admission Reason & Admitting Doctor */}
                  <Card className="space-y-4">
                    <h3 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-450">
                      Admission Details
                    </h3>
                    
                    <InputField
                      label="Admission Reason / Clinical Indication *"
                      required
                      placeholder="e.g. High fever with severe dehydration, verbal orders from physician"
                      value={admissionReason}
                      onChange={(e) => setAdmissionReason(e.target.value)}
                    />

                    <SelectField
                      label="Select Admitting Doctor *"
                      required
                      value={selectedDocId}
                      onChange={(e: any) => setSelectedDocId(e.target.value)}
                    >
                      <option value="">Choose Admitting Physician</option>
                      {doctors?.map((doc: any) => (
                        <option key={doc._id} value={doc._id}>
                          Dr. {doc.name} ({doc.specialization})
                        </option>
                      ))}
                    </SelectField>

                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="Priority Level"
                        required
                        value={priority}
                        onChange={(e: any) => setPriority(e.target.value)}
                      >
                        <option value="Routine">Routine</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Emergency">Emergency</option>
                      </SelectField>

                      <InputField
                        label="Admission Date"
                        type="date"
                        required
                        value={admissionDate}
                        onChange={(e) => setAdmissionDate(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Admission Time"
                        type="time"
                        required
                        value={admissionTime}
                        onChange={(e) => setAdmissionTime(e.target.value)}
                      />
                    </div>
                  </Card>

                  {/* Right Column: Ward Bed Room Selector */}
                  <Card className="space-y-4">
                    <h3 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-450">
                      Bed Grid & Ward Assignment
                    </h3>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <SelectField
                        label="Ward"
                        required
                        value={ward}
                        onChange={(e) => {
                          setWard(e.target.value);
                          setSelectedRoomId("");
                          setSelectedBedId("");
                        }}
                      >
                        <option value="">Select Ward</option>
                        {uniqueWards.map((w: string) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </SelectField>

                      <SelectField
                        label="Room"
                        required
                        value={selectedRoomId}
                        onChange={(e) => {
                          setSelectedRoomId(e.target.value);
                          setSelectedBedId("");
                        }}
                      >
                        <option value="">Room</option>
                        {rooms
                          ?.filter((r: any) => !ward || r.wardName === ward)
                          .map((r: any) => (
                            <option key={r._id} value={r._id}>Room {r.roomNumber} ({r.roomType})</option>
                          ))}
                      </SelectField>

                      <SelectField
                        label="Bed"
                        required
                        value={selectedBedId}
                        onChange={(e) => setSelectedBedId(e.target.value)}
                      >
                        <option value="">Bed</option>
                        {rooms
                          ?.find((r: any) => r._id === selectedRoomId)
                          ?.beds.filter((b: any) => !b.isOccupied)
                          .map((b: any) => (
                            <option key={b._id} value={b._id}>Bed {b.bedNumber}</option>
                          ))}
                      </SelectField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Attender Name"
                        required
                        value={attenderName}
                        onChange={(e) => setAttenderName(e.target.value)}
                      />
                      <InputField
                        label="Attender Phone"
                        required
                        value={attenderPhone}
                        onChange={(e) => setAttenderPhone(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Insurance"
                        value={insuranceProvider}
                        onChange={(e) => setInsuranceProvider(e.target.value)}
                      />
                      <InputField
                        label="Policy No"
                        value={insurancePolicyNumber}
                        onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                      />
                    </div>
                  </Card>

                </div>

                {/* 3. Financial Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="space-y-4">
                    <h3 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-455">
                      Advance Deposition (INR)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Advance Deposit (₹) *"
                        type="number"
                        required
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                      />
                      <SelectField
                        label="Payment Method"
                        required
                        value={paymentMethod}
                        onChange={(e: any) => setPaymentMethod(e.target.value)}
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card Swipe</option>
                      </SelectField>
                    </div>
                  </Card>

                  <Card className="space-y-4">
                    <h3 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-455">
                      Audit Checks & Signoff
                    </h3>
                    
                    <TextareaField
                      label="Remarks / Notes"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={1}
                    />

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="verbalCheck"
                        required
                        checked={verbalApproval}
                        onChange={(e) => setVerbalApproval(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                      />
                      <label htmlFor="verbalCheck" className="text-xs text-indigo-900 font-bold select-none cursor-pointer">
                        Doctor Verbal Order verified & confirmed *
                      </label>
                    </div>
                  </Card>
                </div>

                {/* Submit Controls */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button type="button" variant="secondary" onClick={() => setIsConvertOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={admitMutation.isPending}>
                    {admitMutation.isPending ? "Admitting..." : "Confirm & Admit Patient"}
                  </Button>
                </div>

              </form>

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
                <div className="flex flex-col items-center gap-4">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Patient preview" className="h-32 w-32 rounded-lg object-cover border border-slate-200 shadow-sm" />
                  ) : (
                    <div className="flex h-32 w-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
                      <Camera className="h-8 w-8" />
                      <span className="text-[10px] mt-1">No photo captured</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" onClick={triggerWebcamSimulation} variant="secondary" className="text-xs px-2.5 py-1.5 flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" /> Webcam Capture
                    </Button>
                  </div>
                </div>
              </Card>

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
                    <span className="text-slate-450 block uppercase tracking-wider text-[10px] font-bold">Registration Date</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(registeredPatient.createdAt || Date.now()).toLocaleDateString("en-US", {
                        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
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
