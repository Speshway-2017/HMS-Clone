import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { socket } from "../../lib/socket";
import {
  Video, Phone, Clock, User, CheckCircle2, Search
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { KpiCard } from "../../components/ui/KpiCard";
import { useDoctorProfileMe } from "../../features/doctors";
import { useAppointments, useUpdateAppointment, mapAppointmentTypeForDisplay } from "../../features/appointments";
import { ConsultationWorkspacePage } from "./ConsultationWorkspacePage";

const STATUS_BADGE: Record<string, { tone: "success" | "warning" | "info" | "neutral" | "danger"; label: string }> = {
  in_call:   { tone: "success",  label: "In Call"   },
  waiting:   { tone: "warning",  label: "Waiting"   },
  scheduled: { tone: "info",     label: "Scheduled" },
  completed: { tone: "neutral",  label: "Completed" },
};

export function TelemedicinePage() {
  const { data: doctorProfile } = useDoctorProfileMe();

  const { data: appointmentsData, isLoading } = useAppointments(
    { doctor: doctorProfile?._id },
    { enabled: !!doctorProfile?._id }
  );

  const appointments = appointmentsData?.data || [];

  // Filter all online / video consultation appointments
  const videoConsultationAppointments = appointments.filter((a: any) => {
    const t = String(a.type || "").toLowerCase();
    return t.includes("video") || t.includes("online") || t === "video consultation";
  });

  // Search & Queue Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [queueTab, setQueueTab] = useState<"active" | "completed">("active");

  const allTeleConsultations = videoConsultationAppointments.map((a, index) => {
    const p = a.patient as any;
    const isFirst = index === 0;

    return {
      id: a._id,
      name: p?.name || "Unknown Patient",
      uhid: p?.uhid || "HMS-PT-100",
      age: p?.age || 35,
      gender: p?.gender || "—",
      phone: p?.phone || "—",
      waitTime: isFirst ? "Now" : `${index * 15} min`,
      status: a.status === "completed" ? "completed" : isFirst ? "in_call" : "waiting",
      type: mapAppointmentTypeForDisplay(a.type),
      chief: a.notes || "Tele-consultation check-up",
      location: p?.address ? p.address.split(",").slice(-1)[0].trim() : "Local",
      scheduled: a.time,
      dateStr: new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      duration: "15 min",
      platform: "Video",
      meetingLink: a.meetingLink || ""
    };
  });

  const activeQueue = allTeleConsultations.filter((t) => t.status !== "completed");
  const completedQueue = allTeleConsultations.filter((t) => t.status === "completed");

  const currentList = queueTab === "active" ? activeQueue : completedQueue;

  const filteredQueue = currentList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      item.uhid.toLowerCase().includes(q) ||
      item.chief.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q)
    );
  });

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Google Meet Consultation Link State
  const [googleMeetUrl, setGoogleMeetUrl] = useState("");
  const [submittedMeetUrl, setSubmittedMeetUrl] = useState("");
  const [isLinkSubmitted, setIsLinkSubmitted] = useState(false);

  useEffect(() => {
    if (activeQueue.length > 0 && !selectedPatientId) {
      setSelectedPatientId(activeQueue[0].id);
    } else if (allTeleConsultations.length > 0 && !selectedPatientId) {
      setSelectedPatientId(allTeleConsultations[0].id);
    }
  }, [allTeleConsultations, activeQueue, selectedPatientId]);

  const selectedPatient = allTeleConsultations.find((p) => p.id === selectedPatientId) || activeQueue[0] || allTeleConsultations[0];
  const updateAppointment = useUpdateAppointment(selectedPatient?.id || "");

  useEffect(() => {
    if (selectedPatient) {
      const link = (selectedPatient as any).meetingLink || "";
      if (link) {
        setGoogleMeetUrl(link);
        setSubmittedMeetUrl(link);
        setIsLinkSubmitted(true);
      } else {
        setGoogleMeetUrl("");
        setSubmittedMeetUrl("");
        setIsLinkSubmitted(false);
      }
    }
  }, [selectedPatient?.id]);

  const handleLinkSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!googleMeetUrl.trim()) {
      toast.error("Please enter a valid Google Meet link.");
      return;
    }
    const formattedUrl = googleMeetUrl.startsWith("http") ? googleMeetUrl.trim() : `https://${googleMeetUrl.trim()}`;

    try {
      if (selectedPatient?.id) {
        await updateAppointment.mutateAsync({
          id: selectedPatient.id,
          meetingLink: formattedUrl,
          notes: `[Google Meet Link]: ${formattedUrl}\n${selectedPatient.chief || ""}`
        } as any);
        const doctorName = doctorProfile?.name ? `Dr. ${doctorProfile.name}` : "Doctor";
        socket.emit("start_google_meet_session", {
          roomId: selectedPatient.id,
          appointmentId: selectedPatient.id,
          doctorName: doctorName,
          meetUrl: formattedUrl
        });
      }
      setSubmittedMeetUrl(formattedUrl);
      setIsLinkSubmitted(true);
      toast.success("Google Meet link submitted!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit meeting link.");
    }
  };

  const handleEndMeeting = async () => {
    if (!selectedPatient?.id) return;
    try {
      await updateAppointment.mutateAsync({
        id: selectedPatient.id,
        status: "completed"
      } as any);

      socket.emit("end_telemedicine_session", {
        roomId: selectedPatient.id,
        appointmentId: selectedPatient.id
      });

      toast.success(`Consultation for ${selectedPatient.name} marked as completed!`);
      setIsLinkSubmitted(false);
      setGoogleMeetUrl("");
      setSubmittedMeetUrl("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete consultation.");
    }
  };

  const handleStartMeeting = () => {
    const targetUrl = submittedMeetUrl || googleMeetUrl;
    if (!targetUrl) {
      toast.error("Please enter and submit a meeting link first.");
      return;
    }
    if (selectedPatient) {
      const doctorName = doctorProfile?.name ? `Dr. ${doctorProfile.name}` : "Doctor";
      socket.emit("start_google_meet_session", {
        roomId: selectedPatient.id,
        appointmentId: selectedPatient.id,
        doctorName: doctorName,
        meetUrl: targetUrl
      });
    }
    toast.success("Redirecting to Google Meet...");
    window.open(targetUrl, "_blank");
  };

  const handleSelect = (patient: any) => {
    setSelectedPatientId(patient.id);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Telemedicine & Video Consultations</h1>
          <p className="text-xs text-slate-500 mt-1">Conduct live HD video consultations, manage patient queues, and write e-prescriptions & clinical notes in real time.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Sessions" value={allTeleConsultations.length} icon={<Video className="h-5 w-5 text-indigo-600" />} emphasis />
        <KpiCard label="In Call" value={activeQueue.filter((t) => t.status === "in_call").length} icon={<Phone className="h-5 w-5 text-emerald-600" />} />
        <KpiCard label="Waiting" value={activeQueue.filter((t) => t.status === "waiting").length} icon={<Clock className="h-5 w-5 text-amber-600" />} />
        <KpiCard label="Completed Today" value={completedQueue.length} icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />} />
      </div>

      {/* Queue Search & Selection Workspace Bar */}
      <Card className="p-5 border border-slate-200 bg-white shadow-sm rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Sub Tabs: Active Queue vs Completed */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full scrollbar-none flex-nowrap shrink-0">
            <button
              onClick={() => setQueueTab("active")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                queueTab === "active"
                  ? "bg-emerald-700 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Video className="h-4 w-4" /> Active Patient Queue ({activeQueue.length})
            </button>
            <button
              onClick={() => setQueueTab("completed")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                queueTab === "completed"
                  ? "bg-emerald-700 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Previous / Completed ({completedQueue.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, UHID, or complaint..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-400 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Patient Queue Cards */}
        {filteredQueue.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center text-slate-400">
            <User className="h-8 w-8 text-slate-300 mb-1" />
            <p className="text-xs font-semibold">No consultations found matching "{searchQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
            {filteredQueue.map((patient) => {
              const isSelected = selectedPatient?.id === patient.id;
              return (
                <div
                  key={patient.id}
                  onClick={() => handleSelect(patient)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-navy-500/30"
                      : "border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 truncate">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-white shadow-sm shrink-0">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate">{patient.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{patient.age}y · {patient.gender}</p>
                      </div>
                    </div>
                    <Badge tone={STATUS_BADGE[patient.status]?.tone || "neutral"}>
                      {STATUS_BADGE[patient.status]?.label || patient.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-indigo-600">{patient.scheduled || patient.dateStr}</span>
                    <span className="text-slate-400 font-mono text-[10px] truncate max-w-[100px]">{patient.uhid}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Main Selected Patient Workspace (Full Width) */}
      {selectedPatient ? (
        <div className="space-y-6">
          {/* Google Meet Consultation Link Card */}
          <Card className="p-5 border border-slate-200 bg-white shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Google Meet Consultation Room</h3>
                  <p className="text-[11px] text-slate-500">
                    Attending Patient: <span className="font-bold text-slate-800">{selectedPatient.name}</span> ({selectedPatient.age}y · {selectedPatient.gender} · {selectedPatient.uhid})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://meet.google.com/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline flex items-center gap-1"
                >
                  + Generate Link on Google Meet
                </a>
                {selectedPatient && selectedPatient.status !== "completed" && (
                  <button
                    onClick={handleEndMeeting}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-extrabold text-white transition-all shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> End Meeting
                  </button>
                )}
              </div>
            </div>

            {/* Form: Input Field & Submit Button */}
            <form onSubmit={handleLinkSubmit} className="flex gap-2">
              <input
                type="text"
                value={googleMeetUrl}
                onChange={(e) => {
                  setGoogleMeetUrl(e.target.value);
                  if (isLinkSubmitted) setIsLinkSubmitted(false);
                }}
                placeholder="Paste Google Meet URL (e.g. https://meet.google.com/abc-defg-hij)"
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-400 bg-slate-50/50"
              />
              <Button
                type="submit"
                variant="primary"
                className="px-6 text-xs font-bold whitespace-nowrap rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
              >
                Submit
              </Button>
            </form>

            {/* Display Option After Submitting: Start Meeting Option */}
            {isLinkSubmitted && submittedMeetUrl && (
              <div className="mt-3.5 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-emerald-950">Google Meet Link Ready for Patient</span>
                      <Badge tone="success">LIVE SESSION READY</Badge>
                    </div>
                    <p className="text-[11px] text-emerald-800 font-mono mt-0.5 truncate max-w-md">
                      {submittedMeetUrl}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleStartMeeting}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-5 py-2.5 text-xs font-black text-white transition-all shadow-md active:scale-95 whitespace-nowrap"
                  >
                    <Video className="h-4 w-4" /> Start Meeting
                  </button>
                  {selectedPatient && selectedPatient.status !== "completed" && (
                    <button
                      onClick={handleEndMeeting}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2.5 text-xs font-black text-white transition-all shadow-md active:scale-95 whitespace-nowrap"
                    >
                      <CheckCircle2 className="h-4 w-4" /> End Meeting
                    </button>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Full Width Consultation Workspace Container */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
            <ConsultationWorkspacePage appointmentIdOverride={selectedPatient.id} isEmbedded={true} />
          </div>
        </div>
      ) : (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <Video className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Telemedicine Consultations Found</h3>
          <p className="text-xs text-slate-400">There are no tele-consultation appointments scheduled for you right now.</p>
        </Card>
      )}
    </div>
  );
}
