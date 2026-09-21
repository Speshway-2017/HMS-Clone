import { useDoctorTodaySurgeries } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Scissors, AlertTriangle } from "lucide-react";

export function SurgeriesPage() {
  const { data: surgeries, isLoading, isError, refetch } = useDoctorTodaySurgeries();

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
        <AlertTriangle className="mb-2 h-10 w-10 text-red-400" />
        <h3 className="text-sm font-semibold text-red-600">Failed to load surgeries</h3>
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
        <h1 className="text-2xl font-bold text-slate-900">Today's Surgeries</h1>
        <p className="text-sm text-slate-500">Scheduled operations and surgeries assigned to you today.</p>
      </div>

      {surgeries && surgeries.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <Scissors className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Surgeries Scheduled</h3>
          <p className="text-xs text-slate-400">You don't have any surgeries scheduled for today.</p>
        </Card>
      ) : (
        <>
          {/* Card-based layout for mobile and tablet */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
            {surgeries?.map((appt) => {
              const patient = appt.patient as any;
              const patientName = patient?.name || "Unknown Patient";
              const uhid = patient?.uhid || "—";

              return (
                <Card key={appt._id} className="p-4 space-y-3 border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{patientName}</h4>
                      <p className="text-xs text-slate-400 font-medium">
                        {patient?.age ? `${patient.age} yrs · ${patient.gender}` : ""}
                      </p>
                    </div>
                    <Badge tone={appt.status === "completed" ? "success" : appt.status === "in_consultation" ? "warning" : "info"}>
                      {appt.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-50 pt-2 font-medium">
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">UHID</span>
                      <span className="text-slate-700 font-mono">{uhid}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">Scheduled Time</span>
                      <span className="text-slate-700">{appt.time}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">Surgical Procedure</span>
                      <span className="text-slate-700 block">{appt.notes || "Surgical Procedure"}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Table layout for desktops */}
          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">UHID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Surgical Procedure</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {surgeries?.map((appt) => {
                  const patient = appt.patient as any;
                  const patientName = patient?.name || "Unknown Patient";
                  const uhid = patient?.uhid || "—";

                  return (
                    <tr key={appt._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{patientName}</div>
                        <div className="text-xs text-slate-400">{patient?.age ? `${patient.age} yrs · ${patient.gender}` : ""}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{uhid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{appt.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge tone={appt.status === "completed" ? "success" : appt.status === "in_consultation" ? "warning" : "info"}>
                          {appt.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{appt.notes || "Surgical Procedure"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
