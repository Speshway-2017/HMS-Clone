import { useState, useEffect } from "react";
import {
  Video, Phone, Clock, User, FileText, Mic, MicOff,
  VideoOff, PhoneOff, MessageSquare, Monitor, CheckCircle2, CalendarClock,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { KpiCard } from "../../components/ui/KpiCard";
import { useDoctorProfileMe } from "../../features/doctors";
import { useAppointments, useUpdateAppointment, mapAppointmentTypeForDisplay } from "../../features/appointments";

const STATUS_BADGE: Record<string, { tone: "success" | "warning" | "info" | "neutral" | "danger"; label: string }> = {
  in_call:   { tone: "success",  label: "In Call"   },
  waiting:   { tone: "warning",  label: "Waiting"   },
  scheduled: { tone: "info",     label: "Scheduled" },
  completed: { tone: "neutral",  label: "Completed" },
};

export function TelemedicinePage() {
  const { data: doctorProfile } = useDoctorProfileMe();
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: appointmentsData, isLoading } = useAppointments(
    { doctor: doctorProfile?._id, from: todayStr, to: todayStr },
    { enabled: !!doctorProfile?._id }
  );

  const appointments = appointmentsData?.data || [];

  const teleQueue = appointments.map((a, index) => {
    const p = a.patient as any;
    const isFirst = index === 0;

    return {
      id: a._id,
      name: p?.name || "Unknown Patient",
      age: p?.age || 35,
      gender: p?.gender || "—",
      waitTime: isFirst ? "Now" : `${index * 15} min`,
      status: isFirst ? "in_call" : "waiting",
      type: mapAppointmentTypeForDisplay(a.type),
      chief: a.notes || "Tele-consultation check-up",
      location: p?.address ? p.address.split(",").slice(-1)[0].trim() : "Local",
      scheduled: a.time,
      duration: "15 min",
      platform: "Video"
    };
  });

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (teleQueue.length > 0 && !selectedPatientId) {
      setSelectedPatientId(teleQueue[0].id);
      setNotes(teleQueue[0].chief);
    }
  }, [teleQueue, selectedPatientId]);

  const selectedPatient = teleQueue.find((p) => p.id === selectedPatientId) || teleQueue[0];
  const updateAppointment = useUpdateAppointment(selectedPatient?.id || "");

  const handleSelect = (patient: any) => {
    setSelectedPatientId(patient.id);
    setNotes(patient.chief);
    setInCall(false);
  };

  const handleSaveNotes = async () => {
    if (!selectedPatient) return;
    try {
      await updateAppointment.mutateAsync({ notes, status: "completed" });
      setInCall(false);
    } catch (err) {
      console.error("Failed to save telemedicine notes", err);
    }
  };

  const pastConsultations = appointments
    .filter((a) => a.status === "completed")
    .map((a) => {
      const p = a.patient as any;
      return {
        date: new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        patient: p?.name || "Unknown Patient",
        diagnosis: a.notes || "Check-up",
        duration: "15 min"
      };
    });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Telemedicine</h1>
        <p className="text-sm text-slate-500">Video consultations, remote patient management and teleconsultation notes.</p>
      </div>

      {teleQueue.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <Video className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Telemedicine Calls</h3>
          <p className="text-xs text-slate-400">There are no tele-consultation appointments scheduled for you today.</p>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Today's Sessions"  value={teleQueue.length}                                          icon={<Video className="h-5 w-5" />} emphasis />
            <KpiCard label="In Call"           value={inCall ? 1 : 0}                                              icon={<Phone className="h-5 w-5" />} />
            <KpiCard label="Waiting"           value={teleQueue.filter(t => t.status === "waiting").length}      icon={<Clock className="h-5 w-5" />} />
            <KpiCard label="Completed Today"   value={pastConsultations.length}                                  icon={<CheckCircle2 className="h-5 w-5" />} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Patient Queue */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Today's Queue</h3>
              {teleQueue.map((patient) => {
                const isSelected = selectedPatient?.id === patient.id;
                return (
                  <div
                    key={patient.id}
                    onClick={() => handleSelect(patient)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all hover:shadow-sm ${
                      isSelected
                        ? "border-navy-400 bg-navy-50 shadow-sm"
                        : patient.status === "in_call" && inCall
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-100 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700">
                          {patient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        {patient.id === selectedPatient?.id && inCall && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{patient.name}</p>
                        <p className="text-xs text-slate-400">{patient.age}y · {patient.type}</p>
                      </div>
                      <Badge tone={STATUS_BADGE[patient.status]?.tone || "neutral"}>
                        {STATUS_BADGE[patient.status]?.label || patient.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-1">{patient.chief}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        {patient.platform === "Video" ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                        {patient.platform}
                      </span>
                      <span>{patient.scheduled} · {patient.duration}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main Panel — Video + Notes */}
            {selectedPatient && (
              <div className="space-y-4 lg:col-span-2">
                {/* Video Screen */}
                <Card className="p-0 overflow-hidden">
                  {/* Video Area */}
                  <div className="relative h-72 bg-slate-900 flex items-center justify-center">
                    {inCall ? (
                      <>
                        <div className="text-center">
                          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-navy-700 text-3xl font-bold text-white mb-3">
                            {selectedPatient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <p className="text-white font-semibold">{selectedPatient.name}</p>
                          <p className="text-slate-400 text-sm">{selectedPatient.location} · Connected</p>
                          <p className="text-emerald-400 text-xs mt-1 flex items-center justify-center gap-1">
                            <span className="animate-pulse">●</span> 03:42 — In Call
                          </p>
                        </div>
                        {/* Self-video */}
                        <div className="absolute bottom-3 right-3 h-20 w-28 rounded-lg bg-slate-700 flex items-center justify-center">
                          <User className="h-8 w-8 text-slate-500" />
                          <span className="absolute bottom-1 right-1 text-xs text-slate-400">You</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-navy-900 mb-3">
                          <Video className="h-10 w-10 text-slate-600" />
                        </div>
                        <p className="text-slate-400">Click &quot;Start Call&quot; to begin the session</p>
                        <p className="text-slate-500 text-sm mt-1">Patient: {selectedPatient.name} · {selectedPatient.scheduled}</p>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-800">
                    <div className="flex items-center gap-1">
                      <Badge tone={STATUS_BADGE[selectedPatient.status]?.tone || "neutral"}>{selectedPatient.name}</Badge>
                      <span className="text-xs text-slate-400 ml-2">{selectedPatient.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMicOn(!micOn)}
                        className={`rounded-full p-2 transition-colors ${micOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-700"}`}
                      >
                        {micOn ? <Mic className="h-4 w-4 text-white" /> : <MicOff className="h-4 w-4 text-white" />}
                      </button>
                      <button
                        onClick={() => setCamOn(!camOn)}
                        className={`rounded-full p-2 transition-colors ${camOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-700"}`}
                      >
                        {camOn ? <Video className="h-4 w-4 text-white" /> : <VideoOff className="h-4 w-4 text-white" />}
                      </button>
                      <button className="rounded-full bg-slate-700 p-2 hover:bg-slate-600">
                        <Monitor className="h-4 w-4 text-white" />
                      </button>
                      <button className="rounded-full bg-slate-700 p-2 hover:bg-slate-600">
                        <MessageSquare className="h-4 w-4 text-white" />
                      </button>
                      {inCall ? (
                        <button
                          onClick={() => setInCall(false)}
                          className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                          <PhoneOff className="h-4 w-4" /> End Call
                        </button>
                      ) : (
                        <button
                          onClick={() => setInCall(true)}
                          className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                          <Video className="h-4 w-4" /> Start Call
                        </button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Consultation Notes & Patient Info */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-navy-700" /> Consultation Notes
                    </h3>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={5}
                      placeholder={`Notes for ${selectedPatient.name}...`}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button variant="primary" className="text-xs py-1.5" onClick={handleSaveNotes}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Save Notes
                      </Button>
                    </div>
                  </Card>

                  <Card>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Patient Details</h3>
                    <div className="space-y-2">
                      {[
                        { label: "Name",         value: selectedPatient.name },
                        { label: "Age/Gender",   value: `${selectedPatient.age}y · ${selectedPatient.gender}` },
                        { label: "Location",     value: selectedPatient.location },
                        { label: "Appointment",  value: selectedPatient.scheduled },
                        { label: "Type",         value: selectedPatient.type },
                        { label: "Chief Complaint", value: selectedPatient.chief },
                      ].map((f) => (
                        <div key={f.label} className="flex justify-between text-xs">
                          <span className="text-slate-400 font-medium">{f.label}</span>
                          <span className="text-slate-700 font-semibold text-right max-w-32 truncate">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Past Tele-consultations */}
                <Card>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Recent Tele-consultations</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Date</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Patient</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Diagnosis</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastConsultations.map((c, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2.5 text-slate-500">{c.date}</td>
                          <td className="py-2.5 font-medium text-slate-800">{c.patient}</td>
                          <td className="py-2.5 text-slate-600 max-w-32 truncate">{c.diagnosis}</td>
                          <td className="py-2.5 text-slate-500">{c.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pastConsultations.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No completed sessions today.</p>
                  )}
                </Card>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
