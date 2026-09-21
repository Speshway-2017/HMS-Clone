import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Stethoscope, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Activity,
  Award,
  ShieldCheck,
  Building2,
  Sparkles,
  Lock,
  LogIn,
  UserCheck,
  Menu,
  X
} from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { usePublicHospital } from "../../features/hospitals";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

function normalizeTime(t: string): string {
  if (!t) return "";
  let clean = t.trim().toLowerCase();
  if (clean.includes("am") || clean.includes("pm")) {
    const isPm = clean.includes("pm");
    clean = clean.replace("am", "").replace("pm", "").trim();
    const parts = clean.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  const parts = clean.split(":");
  if (parts.length >= 2) {
    return `${String(parts[0]).padStart(2, "0")}:${parts[1]}`;
  }
  return clean;
}

function formatSlotDisplay(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, "0")}:${mStr} ${ampm}`;
}

const generateSlotsFromDoctorSettings = (doctor: any, dateStr: string): string[] => {
  if (!doctor) {
    return ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
  }

  let from = "09:00";
  let to = "17:00";

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dateObj = new Date(dateStr);
  const dayName = days[dateObj.getDay()];

  const daySchedule = doctor.workingHours?.find(
    (wh: any) => wh.day?.toLowerCase() === dayName.toLowerCase()
  );

  if (daySchedule && daySchedule.active === false) {
    return []; // Doctor is off duty on this day
  }

  if (daySchedule?.from && daySchedule.from !== "—") {
    from = daySchedule.from;
  }
  if (daySchedule?.to && daySchedule.to !== "—") {
    to = daySchedule.to;
  }

  const duration = doctor.consultationSettings?.slotDuration ?? 15;
  const breakTime = doctor.consultationSettings?.breakTime ?? "13:00";

  const slots: string[] = [];
  const [startH, startM] = from.split(":").map(Number);
  const [endH, endM] = to.split(":").map(Number);

  let current = (isNaN(startH) ? 9 : startH) * 60 + (isNaN(startM) ? 0 : startM);
  const end = (isNaN(endH) ? 17 : endH) * 60 + (isNaN(endM) ? 0 : endM);

  let breakStart = -1;
  let breakEnd = -1;
  if (breakTime && breakTime.includes(":")) {
    const [bH, bM] = breakTime.split(":").map(Number);
    breakStart = bH * 60 + bM;
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

  const todayStr = new Date().toISOString().split("T")[0];
  if (dateStr === todayStr) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    return slots.filter((slot) => {
      const [h, m] = slot.split(":").map(Number);
      return h * 60 + m > currentMins;
    });
  }

  return slots.length > 0
    ? slots
    : ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
};

export function PublicDoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: hospital } = usePublicHospital();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [bookingDate, setBookingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "Male",
    age: "",
    chiefComplaint: "",
  });

  // Auto-fill logged in patient info
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const [bookingSuccessData, setBookingSuccessData] = useState<any | null>(null);

  // Fetch Public Doctor Details
  const { data: doctor, isLoading, isError } = useQuery({
    queryKey: ["public", "doctor", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get("/hospitals/public/doctors");
      const list = res.data.data.doctors as any[];
      const found = list.find((d) => d._id === id);
      if (found) return found;
      return list[0];
    },
  });

  // Query Booked Slots for this doctor on selected date
  const { data: bookedSlots = [] } = useQuery({
    queryKey: ["public", "booked-slots", id, bookingDate],
    enabled: !!id && !!bookingDate,
    queryFn: async () => {
      try {
        const res = await api.get("/hospitals/public/appointments/booked-slots", {
          params: { doctorId: id, date: bookingDate },
        });
        return res.data?.data?.bookedSlots || [];
      } catch {
        return [];
      }
    },
  });

  const generatedSlots = generateSlotsFromDoctorSettings(doctor, bookingDate);

  const isSlotBooked = (slot: string): boolean => {
    const normSlot = normalizeTime(slot);
    return bookedSlots.some((b: string) => normalizeTime(b) === normSlot);
  };

  // Auto select first available slot when date/doctor/bookedSlots changes
  useEffect(() => {
    const available = generatedSlots.filter((s) => !isSlotBooked(s));
    if (available.length > 0) {
      setSelectedSlot(available[0]);
    } else {
      setSelectedSlot("");
    }
  }, [bookingDate, doctor, bookedSlots]);

  // Appointment Booking Mutation
  const appointmentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        doctorId: id,
        departmentId: typeof doctor?.department === "object" ? doctor.department?._id : "",
        date: bookingDate,
        time: selectedSlot,
      };
      const res = await api.post("/hospitals/public/appointments", payload);
      return res.data.data.appointment;
    },
    onSuccess: (data) => {
      toast.success(`Appointment with Dr. ${doctor?.name || "Doctor"} booked successfully!`);
      sessionStorage.removeItem("pendingAppointmentDraft");
      navigate("/patient?tab=appointments", { replace: true });
    },
  });

  const handleLoginWithDraft = () => {
    const draft = {
      doctorId: doctor?._id || id,
      userId: typeof doctor?.user === "object" ? doctor.user?._id : (doctor?.user || ""),
      doctorName: doctor?.name || "Specialist Doctor",
      departmentId: typeof doctor?.department === "object" ? doctor.department?._id : "",
      departmentName: typeof doctor?.department === "object" ? doctor.department?.name : (doctor?.department || ""),
      date: bookingDate,
      time: selectedSlot,
      chiefComplaint: form.chiefComplaint,
    };
    sessionStorage.setItem("pendingAppointmentDraft", JSON.stringify(draft));
    navigate(`/login?redirect=/patient?tab=appointments`);
  };

  const handleRegisterWithDraft = () => {
    const draft = {
      doctorId: doctor?._id || id,
      userId: typeof doctor?.user === "object" ? doctor.user?._id : (doctor?.user || ""),
      doctorName: doctor?.name || "Specialist Doctor",
      departmentId: typeof doctor?.department === "object" ? doctor.department?._id : "",
      departmentName: typeof doctor?.department === "object" ? doctor.department?.name : (doctor?.department || ""),
      date: bookingDate,
      time: selectedSlot,
      chiefComplaint: form.chiefComplaint,
    };
    sessionStorage.setItem("pendingAppointmentDraft", JSON.stringify(draft));
    navigate(`/register`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      alert("Please select an available time slot.");
      return;
    }
    const draft = {
      doctorId: doctor?._id || id,
      userId: typeof doctor?.user === "object" ? doctor.user?._id : (doctor?.user || ""),
      doctorName: doctor?.name || "Specialist Doctor",
      departmentId: typeof doctor?.department === "object" ? doctor.department?._id : "",
      departmentName: typeof doctor?.department === "object" ? doctor.department?.name : (doctor?.department || ""),
      date: bookingDate,
      time: selectedSlot,
      chiefComplaint: form.chiefComplaint,
    };
    sessionStorage.setItem("pendingAppointmentDraft", JSON.stringify(draft));

    if (!user) {
      navigate(`/login?redirect=/patient?tab=appointments`);
    } else {
      navigate(`/patient?tab=appointments`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-semibold">
        Loading doctor profile & schedule slots...
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800">Doctor Profile Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">The requested doctor could not be found.</p>
        <Button variant="primary" onClick={() => navigate("/#doctors")}>
          Return to Doctors Directory
        </Button>
      </div>
    );
  }

  const deptName = typeof doctor.department === "object" && doctor.department ? doctor.department.name : "General Medicine";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-20">
      
      {/* --- GLASSMORPHIC NAV BAR --- */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-xl transition-all duration-300">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 lg:px-8">
          
          {/* Logo / Hospital Name */}
          <Link
            to="/"
            className="flex cursor-pointer items-center gap-3 text-lg lg:text-xl font-extrabold tracking-tight text-navy-900 shrink-0"
          >
            {hospital?.logoUrl ? (
              <img src={hospital.logoUrl} alt={hospital.name} className="h-9 w-9 rounded-lg object-cover shadow-sm" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-navy-700 to-navy-900 text-white shadow-md">
                <Activity className="h-5 w-5" />
              </div>
            )}
            <span className="bg-gradient-to-r from-navy-900 to-navy-700 bg-clip-text text-transparent">
              {hospital?.name || "Speshway Hospitals"}
            </span>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden items-center gap-5 xl:gap-8 text-sm font-semibold text-slate-600 lg:flex shrink-0">
            {[
              { path: "/", label: "Home" },
              { path: "/#about", label: "About Us" },
              { path: "/#departments", label: "Departments" },
              { path: "/#doctors", label: "Doctors", active: true },
              { path: "/#services", label: "Services" },
              { path: "/#blog", label: "Blog" },
              { path: "/#contact", label: "Contact Us" }
            ].map((nav) => (
              <button
                key={nav.label}
                onClick={() => navigate(nav.path)}
                className={`transition-colors hover:text-navy-700 relative py-1 ${
                  nav.active
                    ? "text-navy-700 font-bold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-navy-700"
                    : ""
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>

          {/* Nav Actions */}
          <div className="hidden items-center gap-3 shrink-0 lg:flex">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Hi, {user.name}</span>
                <Link to="/patient">
                  <Button variant="secondary" className="text-xs py-2 px-4">
                    Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to={`/login?redirect=/doctors/${id}`}>
                <button className="text-sm font-bold text-slate-700 transition-colors hover:text-navy-700">
                  Login
                </button>
              </Link>
            )}
            <button
              onClick={() => {
                const el = document.getElementById("booking-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-1.5 rounded-lg bg-navy-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:bg-navy-800 hover:shadow-md active:scale-95 whitespace-nowrap"
            >
              Book Appointment
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white p-6 shadow-xl lg:hidden transition-all duration-200 ease-in-out">
            <div className="flex flex-col gap-4 text-base font-semibold">
              {[
                { path: "/", label: "Home" },
                { path: "/#about", label: "About Us" },
                { path: "/#departments", label: "Departments" },
                { path: "/#doctors", label: "Doctors" },
                { path: "/#services", label: "Services" },
                { path: "/#blog", label: "Blog" },
                { path: "/#contact", label: "Contact Us" }
              ].map((nav) => (
                <button
                  key={nav.label}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(nav.path);
                  }}
                  className="text-left py-2 transition-all duration-250 hover:text-navy-700"
                >
                  {nav.label}
                </button>
              ))}
              <hr className="my-2 border-slate-100" />
              <div className="flex flex-col gap-3">
                {user ? (
                  <Link to="/patient" className="w-full">
                    <Button variant="secondary" className="w-full py-2.5">
                      Dashboard ({user.name})
                    </Button>
                  </Link>
                ) : (
                  <Link to={`/login?redirect=/doctors/${id}`} className="w-full">
                    <Button variant="secondary" className="w-full py-2.5">
                      Login
                    </Button>
                  </Link>
                )}
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    const el = document.getElementById("booking-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  variant="primary"
                  className="w-full py-2.5 bg-navy-700"
                >
                  Book Appointment
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Sub-header Breadcrumb */}
      <div className="bg-slate-100/70 border-b border-slate-200/80 px-6 py-2.5">
        <div className="mx-auto max-w-[1600px] flex items-center justify-between">
          <Link to="/#doctors" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-navy-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Doctors Directory
          </Link>
          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            Doctors Directory / <strong className="text-slate-800">{doctor.name}</strong> Profile & OPD Consultation
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 pt-8 space-y-8">
        
        {/* Doctor Header Banner Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start">
          {doctor.photoUrl ? (
            <img src={doctor.photoUrl} alt={doctor.name} className="h-32 w-32 rounded-2xl object-cover border border-slate-200 shadow-md shrink-0" />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-navy-700 text-white font-bold text-4xl shadow-md shrink-0">
              <Stethoscope className="h-16 w-16" />
            </div>
          )}

          <div className="space-y-3 text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="inline-block rounded-full bg-navy-50 px-3 py-0.5 text-xs font-bold text-navy-700 uppercase tracking-wider">
                  {deptName}
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 mt-1">{doctor.name}</h1>
                <p className="text-sm font-semibold text-slate-600">{doctor.specialization || "Senior Consultant Physician"}</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center md:text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">OPD Consultation Fee</span>
                <span className="text-2xl font-black text-navy-700">₹{String((doctor as any)?.consultationSettings?.fee || doctor.consultationFee || doctor.department?.consultationFee || 500).replace(/[^0-9.]/g, "") || "500"}</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-navy-600" />
                <span>Qualifications: <strong className="text-slate-800">{doctor.qualifications || "MD / MBBS"}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-navy-600" />
                <span>Department: <strong className="text-slate-800">{deptName}</strong></span>
              </div>
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="h-4 w-4 fill-amber-500" />
                <span>{doctor.rating ?? 5.0} / 5.0 Rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout: Doctor Info & Interactive OPD Slot Booking */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Column: Doctor Biography & Practice Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-navy-700" /> About Doctor
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {doctor.bio || `${doctor.name} is a dedicated clinical specialist with extensive expertise in ${deptName}. Committed to delivering compassionate, patient-centered clinical diagnostics and outpatient OPD consultations.`}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> OPD Practice Standards
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Verified Medical License
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Instant OPD Token & Registration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> 100% Confidential Health Records
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Visualized OPD Time Slot Selection & Patient Form */}
          <div className="lg:col-span-8 space-y-6">
            <div id="booking-section" className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 shadow-sm space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-navy-700" /> Schedule OPD Appointment
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Select date and available time slot to confirm your consultation slot.</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Slot Feed
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Date Selection & Visual Time Slots */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">1. Select Preferred Consultation Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full max-w-xs rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-800 focus:border-navy-600 focus:outline-none shadow-sm"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        2. Visualized Available Time Slots for {bookingDate} *
                      </label>
                      <div className="flex items-center gap-3 text-[10px] font-bold">
                        <span className="flex items-center gap-1 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Available</span>
                        <span className="flex items-center gap-1 text-navy-700"><span className="h-2 w-2 rounded-full bg-navy-700" /> Selected</span>
                        <span className="flex items-center gap-1 text-rose-500"><span className="h-2 w-2 rounded-full bg-rose-400" /> Booked</span>
                      </div>
                    </div>

                    {generatedSlots.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-500">
                        Doctor is off-duty or has no OPD consultation hours on the selected date ({bookingDate}).
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                        {generatedSlots.map((slot) => {
                          const isBooked = isSlotBooked(slot);
                          const isSelected = selectedSlot === slot;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setSelectedSlot(slot)}
                              className={`flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 text-xs font-bold shadow-sm transition-all focus:outline-none ${
                                isBooked
                                  ? "border-rose-100 bg-rose-50 text-rose-450 line-through cursor-not-allowed opacity-80"
                                  : isSelected
                                  ? "border-navy-700 bg-navy-700 text-white ring-2 ring-navy-100 scale-105 shadow-md"
                                  : "border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 active:scale-95"
                              }`}
                            >
                              <span>{formatSlotDisplay(slot)}</span>
                              {isBooked ? (
                                <span className="text-[8px] font-extrabold tracking-tight mt-0.5 opacity-90 text-rose-500">BOOKED</span>
                              ) : isSelected ? (
                                <span className="text-[8px] font-extrabold tracking-tight mt-0.5 text-emerald-300">SELECTED</span>
                              ) : (
                                <span className="text-[8px] font-semibold tracking-tight mt-0.5 text-emerald-600">OPEN</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 3. Patient Information & Login Protection */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Patient Information</h4>

                  {!user ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center space-y-4 shadow-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                        <Lock className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-extrabold text-slate-900">Patient Login Required</h3>
                        <p className="text-xs text-slate-600 max-w-md mx-auto">
                          You must be logged in to your patient account to confirm and schedule an OPD consultation with {doctor.name}.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleLoginWithDraft}
                          className="w-full sm:w-auto bg-navy-700 hover:bg-navy-800 text-xs px-6 py-2.5 font-bold flex items-center justify-center gap-2"
                        >
                          <LogIn className="h-4 w-4" /> Login to Book Appointment ({selectedSlot ? formatSlotDisplay(selectedSlot) : "Slot"})
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleRegisterWithDraft}
                          className="w-full sm:w-auto text-xs px-6 py-2.5 font-bold"
                        >
                          Register as a Patient
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80 text-xs font-semibold text-emerald-800">
                        <span className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-emerald-600" /> Logged in as: <strong>{user.name}</strong> ({user.email})
                        </span>
                        <span className="text-[10px] uppercase font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                          {user.role}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Full Patient Name *</label>
                          <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Rahul Sharma"
                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-navy-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number *</label>
                          <input
                            type="tel"
                            required
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="10-digit mobile number"
                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-navy-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="name@example.com"
                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-navy-600 focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                            <select
                              value={form.gender}
                              onChange={(e) => setForm({ ...form, gender: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-navy-600 focus:outline-none"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                            <input
                              type="number"
                              value={form.age}
                              onChange={(e) => setForm({ ...form, age: e.target.value })}
                              placeholder="e.g. 35"
                              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-navy-600 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Health Symptoms / Reason for Consultation</label>
                        <textarea
                          rows={2}
                          value={form.chiefComplaint}
                          onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                          placeholder="Briefly describe health concerns or reason for visiting the doctor..."
                          className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-navy-600 focus:outline-none"
                        />
                      </div>

                      {/* Submit Action */}
                      <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={appointmentMutation.isPending || !selectedSlot}
                          className="w-full sm:w-auto px-8 py-3 bg-navy-700 hover:bg-navy-800 text-sm font-bold shadow-md"
                        >
                          {appointmentMutation.isPending
                            ? "Securing Appointment Slot..."
                            : `Confirm Booking for ${selectedSlot ? formatSlotDisplay(selectedSlot) : "Select Slot"}`}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </form>

            </div>
          </div>

        </div>
      </main>

      {/* Booking Confirmation Success Modal */}
      {bookingSuccessData && (
        <Modal
          title="OPD Appointment Booking Confirmed!"
          isOpen={!!bookingSuccessData}
          onClose={() => {
            setBookingSuccessData(null);
            navigate("/#doctors");
          }}
        >
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900">Consultation Confirmed</h3>
              <p className="text-xs text-slate-500">Your OPD slot has been secured in the hospital system.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2 font-medium">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-400 font-semibold">Appointment Reference Token:</span>
                <span className="font-mono font-bold text-navy-700">{bookingSuccessData.referenceId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-400 font-semibold">Assigned Doctor:</span>
                <span className="font-bold text-slate-800">{doctor.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-400 font-semibold">Date & Selected Time Slot:</span>
                <span className="font-bold text-slate-800">{bookingSuccessData.date?.split("T")[0]} at {bookingSuccessData.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Consultation Fee:</span>
                <span className="font-bold text-emerald-700">₹{String((doctor as any)?.consultationSettings?.fee || doctor.consultationFee || doctor.department?.consultationFee || 500).replace(/[^0-9.]/g, "") || "500"}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => {
                  setBookingSuccessData(null);
                  navigate("/#doctors");
                }}
                className="w-full bg-navy-700"
              >
                Done / Return to Doctors
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
