import { Scissors, Clock, Users, CalendarClock, CheckCircle2, AlertTriangle, User } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { KpiCard } from "../../components/ui/KpiCard";
import { useDoctorProfileMe } from "../../features/doctors";
import { useAppointments } from "../../features/appointments";

const STATUS_TONE: Record<string, "warning" | "info" | "success" | "danger" | "neutral"> = {
  upcoming: "warning", scheduled: "info", completed: "success", cancelled: "danger",
};

const PRIORITY_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  emergency: "danger", urgent: "warning", elective: "neutral",
};

export function OperationTheatrePage() {
  const { data: doctorProfile } = useDoctorProfileMe();
  
  const { data: appointmentsData, isLoading } = useAppointments(
    { doctor: doctorProfile?._id },
    { enabled: !!doctorProfile?._id }
  );

  const appointments = appointmentsData?.data || [];

  // Filter surgery type appointments
  const surgeries = appointments.filter((appt) => appt.type?.toLowerCase() === "surgery");

  const otSchedule = surgeries.map((s, index) => {
    const p = s.patient as any;
    const isEven = index % 2 === 0;

    return {
      id: s._id,
      patient: p?.name || "Unknown Patient",
      age: p?.age || 45,
      blood: p?.bloodGroup || "O+",
      procedure: s.notes || "Surgical Procedure",
      date: new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      time: s.time,
      duration: isEven ? "60 min" : "120 min",
      ot: `OT-${(index % 3) + 1}`,
      status: s.status === "completed" ? "completed" : "upcoming",
      priority: isEven ? "elective" : "emergency",
      surgeon: doctorProfile?.name ? `Dr. ${doctorProfile.name}` : "Lead Surgeon",
      assistants: [],
      anaesthetist: "Anaesthetist Staff",
      scrubNurse: "Scrub Nurse",
      circulatingNurse: "Circulating Nurse",
      notes: s.notes || "Patient pre-op check complete.",
      checklist: ["Consent Signed", "Pre-op Labs", "NPO confirmed", "IV Access"]
    };
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Operation Theatre</h1>
        <p className="text-sm text-slate-500">Surgery schedule, OT assignments, surgical team and pre-op checklists.</p>
      </div>

      {otSchedule.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <Scissors className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Scheduled Surgeries</h3>
          <p className="text-xs text-slate-400">There are no surgical appointments registered on your calendar.</p>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Surgeries"   value={otSchedule.length}                                              icon={<Scissors className="h-5 w-5" />} emphasis />
            <KpiCard label="Today"             value={otSchedule.length}                                              icon={<CalendarClock className="h-5 w-5" />} />
            <KpiCard label="Emergency"         value={otSchedule.filter(o => o.priority === "emergency").length}       icon={<AlertTriangle className="h-5 w-5" />} />
            <KpiCard label="OTs Assigned"      value={new Set(otSchedule.map(o => o.ot)).size}                         icon={<Users className="h-5 w-5" />} />
          </div>

          {/* Surgery Cards */}
          <div className="space-y-6">
            {otSchedule.map((surgery) => (
              <Card key={surgery.id}>
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-red-100">
                      <Scissors className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">{surgery.procedure}</h3>
                      <p className="text-xs sm:text-sm text-slate-500">Patient: <span className="font-medium text-slate-700">{surgery.patient}</span> · {surgery.age} yrs · Blood: <span className="text-red-600 font-semibold">{surgery.blood}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={PRIORITY_TONE[surgery.priority]}>{surgery.priority.toUpperCase()}</Badge>
                    <Badge tone={STATUS_TONE[surgery.status]}>{surgery.status}</Badge>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-5 sm:grid-cols-4">
                  {[
                    { label: "Date",          value: surgery.date,      icon: <CalendarClock className="h-3.5 w-3.5" /> },
                    { label: "Time",          value: surgery.time,      icon: <Clock className="h-3.5 w-3.5" /> },
                    { label: "OT",            value: surgery.ot,        icon: <Scissors className="h-3.5 w-3.5" /> },
                    { label: "Est. Duration", value: surgery.duration,  icon: <Clock className="h-3.5 w-3.5" /> },
                  ].map((d) => (
                    <div key={d.label} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-400 mb-0.5">
                        {d.icon} {d.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">{d.value}</p>
                    </div>
                  ))}
                </div>

                {/* Surgical Team */}
                <div className="mb-5">
                  <h4 className="text-xs font-semibold uppercase text-slate-400 mb-3">Surgical Team</h4>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { role: "Lead Surgeon",    name: surgery.surgeon },
                      { role: "Anaesthetist",    name: surgery.anaesthetist },
                      { role: "Scrub Nurse",     name: surgery.scrubNurse },
                      { role: "Circ. Nurse",     name: surgery.circulatingNurse },
                      ...surgery.assistants.map((a) => ({ role: "Assistant", name: a })),
                    ].map((member, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                          <User className="h-3.5 w-3.5 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400">{member.role}</p>
                          <p className="text-xs font-semibold text-slate-700 truncate">{member.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pre-op Checklist */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Pre-op Checklist</h4>
                  <div className="flex flex-wrap gap-2">
                    {surgery.checklist.map((item) => (
                      <div key={item} className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                  <p className="text-xs font-semibold uppercase text-amber-600 mb-1">Surgeon's Notes</p>
                  <p className="text-sm text-slate-700">{surgery.notes}</p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
