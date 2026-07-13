import { Link, useNavigate } from "react-router-dom";
import { useDoctorTodayAppointments } from "../../features/doctorDashboard";
import { useUpdateAppointment } from "../../features/appointments";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { CalendarClock, Stethoscope, History } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_BADGES: Record<string, { tone: "success" | "warning" | "info" | "neutral" | "danger"; label: string }> = {
  completed: { tone: "success", label: "Completed" },
  in_consultation: { tone: "warning", label: "In Consultation" },
  checked_in: { tone: "info", label: "Checked In" },
  scheduled: { tone: "neutral", label: "Scheduled" },
  cancelled: { tone: "danger", label: "Cancelled" },
  no_show: { tone: "danger", label: "No Show" },
};

export function TodayAppointmentsPage() {
  const navigate = useNavigate();
  const { data: appointments, isLoading, isError, refetch } = useDoctorTodayAppointments();

  const handleStartConsultation = async (apptId: string) => {
    try {
      // Create mutation dynamically since apptId changes
      const res = await apiStartConsultation(apptId);
      if (res) {
        toast.success("Consultation started");
        navigate(`/doctor/consultation/${apptId}`);
      }
    } catch (err) {
      toast.error("Failed to start consultation");
    }
  };

  // Helper for starting consultation inline
  const apiStartConsultation = async (id: string) => {
    const { api } = await import("../../lib/api");
    const res = await api.post(`/doctors/dashboard/appointments/${id}/start`);
    refetch();
    return res.data;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200"></div>
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200"></div>
        <div className="space-y-2 mt-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 w-full animate-pulse rounded bg-slate-200"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-red-200 bg-red-50">
        <CalendarClock className="mb-2 h-10 w-10 text-red-400" />
        <h3 className="text-sm font-semibold text-red-600">Failed to load appointments</h3>
        <p className="text-xs text-red-400">Please try reloading the page or check your connection.</p>
        <button onClick={() => refetch()} className="mt-4 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Today's Appointments</h1>
        <p className="text-sm text-slate-500">List of scheduled consultations for today.</p>
      </div>

      {appointments && appointments.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <CalendarClock className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Appointments Today</h3>
          <p className="text-xs text-slate-400">You don't have any appointments scheduled for today.</p>
        </Card>
      ) : (
        <div className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Details</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">UHID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Token</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason for Visit</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {appointments?.map((appt) => {
                const patient = appt.patient as any;
                const patientName = patient?.name || "Unknown Patient";
                const uhid = patient?.uhid || "—";
                const token = appt.referenceId || appt._id.slice(-6);

                return (
                  <tr key={appt._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{patientName}</div>
                      <div className="text-xs text-slate-400">{patient?.age ? `${patient.age} yrs · ${patient.gender}` : ""}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{uhid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{appt.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{token}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge tone={STATUS_BADGES[appt.status]?.tone || "neutral"}>
                        {STATUS_BADGES[appt.status]?.label || appt.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{appt.notes || "General Consultation"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2 justify-end">
                        {appt.status !== "completed" && appt.status !== "cancelled" && (
                          <button
                            onClick={() => handleStartConsultation(appt._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <Stethoscope className="h-3.5 w-3.5" /> Start Consult
                          </button>
                        )}
                        <Link to={`/doctor/patients?search=${patientName}`}>
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors">
                            <History className="h-3.5 w-3.5" /> View History
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
