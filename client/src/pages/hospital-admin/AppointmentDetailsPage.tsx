import { Link, useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAppointment, useUpdateAppointment } from "../../features/appointments";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Appointment } from "../../types/domain";

const STATUS_FLOW: Appointment["status"][] = ["scheduled", "checked_in", "in_consultation", "completed"];

const STATUS_TONE: Record<Appointment["status"], "success" | "info" | "warning" | "danger" | "neutral"> = {
  scheduled: "info",
  checked_in: "warning",
  in_consultation: "warning",
  completed: "success",
  cancelled: "neutral",
  no_show: "danger",
};

export function AppointmentDetailsPage() {
  const { id } = useParams();
  const { data: appointment, isLoading } = useAppointment(id);
  const updateAppointment = useUpdateAppointment(id ?? "");

  if (isLoading || !appointment) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const patient = typeof appointment.patient === "object" ? appointment.patient : null;
  const doctor = typeof appointment.doctor === "object" ? appointment.doctor : null;
  const department = typeof appointment.department === "object" && appointment.department ? appointment.department : null;
  const currentIndex = STATUS_FLOW.indexOf(appointment.status);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        <Link to="/admin/appointments" className="hover:text-navy-700">
          Appointments
        </Link>{" "}
        &gt; {appointment.referenceId}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-800">{patient?.name ?? "Unknown patient"}</h3>
          <p className="text-sm text-slate-500">Patient ID: {patient?._id.slice(-8).toUpperCase()}</p>
          {(patient as unknown as { allergies?: string })?.allergies && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
              <p className="text-sm text-red-600">{(patient as unknown as { allergies?: string }).allergies}</p>
            </div>
          )}
          <Link to={`/admin/patients/${patient?._id}`} className="mt-4 inline-block text-sm font-medium text-navy-700 hover:underline">
            View Full Patient Record
          </Link>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Appointment Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs uppercase text-slate-400">Scheduled Time</div>
              <div className="font-semibold text-slate-800">{appointment.time}</div>
              <div className="text-xs text-slate-400">{new Date(appointment.date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-400">Assigned Doctor</div>
              <div className="font-semibold text-slate-800">{doctor?.name ?? "—"}</div>
              <div className="text-xs text-slate-400">{department?.name ?? ""}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-400">Type</div>
              <div className="font-semibold text-slate-800">{appointment.type}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-400">Status</div>
              <Badge tone={STATUS_TONE[appointment.status]}>{appointment.status.replace("_", " ")}</Badge>
            </div>
          </div>
          {appointment.notes && <p className="mt-4 text-sm text-slate-600">{appointment.notes}</p>}
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-base font-semibold text-slate-800">Consultation Tracking</h3>
        <div className="flex items-center">
          {STATUS_FLOW.map((step, i) => (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    i <= currentIndex ? "bg-navy-700 text-white" : "border-2 border-slate-200 text-slate-300"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-xs font-medium ${i <= currentIndex ? "text-navy-700" : "text-slate-400"}`}>{step.replace("_", " ")}</span>
              </div>
              {i < STATUS_FLOW.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${i < currentIndex ? "bg-navy-700" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
