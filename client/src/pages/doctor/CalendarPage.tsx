import { useState } from "react";
import { useDoctorCalendar } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { CalendarClock, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { mapAppointmentTypeForDisplay } from "../../features/appointments";

export function CalendarPage() {
  const { data: appointments, isLoading, isError, refetch } = useDoctorCalendar();
  const [viewType, setViewType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewType === "daily") newDate.setDate(newDate.getDate() - 1);
    else if (viewType === "weekly") newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === "daily") newDate.setDate(newDate.getDate() + 1);
    else if (viewType === "weekly") newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200"></div>
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200"></div>
        <div className="h-[400px] w-full animate-pulse rounded bg-slate-200 mt-6"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-red-200 bg-red-50">
        <AlertTriangle className="mb-2 h-10 w-10 text-red-400" />
        <h3 className="text-sm font-semibold text-red-600">Failed to load calendar</h3>
        <p className="text-xs text-red-400">Please try reloading the page or check your connection.</p>
        <button onClick={() => refetch()} className="mt-4 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">
          Retry
        </button>
      </Card>
    );
  }

  // Filter appointments for the visible view (simple mockup implementation based on dates)
  const formatHeader = () => {
    if (viewType === "daily") {
      return currentDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (viewType === "weekly") {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar Schedule</h1>
          <p className="text-sm text-slate-500">Manage and view your consultations schedule.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg w-fit shrink-0">
          {(["daily", "weekly", "monthly"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setViewType(view)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                viewType === view ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation & Header */}
      <Card className="flex items-center justify-between p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
        <button onClick={handlePrev} className="p-2 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shrink-0">
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        </button>
        <h2 className="text-xs sm:text-base font-bold text-slate-800 text-center mx-2">{formatHeader()}</h2>
        <button onClick={handleNext} className="p-2 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shrink-0">
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>
      </Card>

      {/* Calendar Grid mockup */}
      <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
        {appointments && appointments.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
            <CalendarClock className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">No Appointments</p>
            <p className="text-xs text-slate-400">There are no consultations scheduled in this date range.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Schedule Overview ({appointments?.length} active)</h3>
            <div className="space-y-3">
              {appointments?.slice(0, 10).map((appt) => {
                const patient = appt.patient as any;
                const patientName = patient?.name || "Unknown Patient";
                const apptDate = new Date(appt.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

                return (
                  <div key={appt._id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                        {patientName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{patientName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {mapAppointmentTypeForDisplay(appt.type)} · {appt.notes || "Routine Visit"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-700">{appt.time}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{apptDate}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
