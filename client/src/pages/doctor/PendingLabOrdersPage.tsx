import { useDoctorPendingLabOrders } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { FlaskConical, AlertTriangle, Clock } from "lucide-react";

export function PendingLabOrdersPage() {
  const { data: labOrders, isLoading, isError, refetch } = useDoctorPendingLabOrders();

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
        <h3 className="text-sm font-semibold text-red-600">Failed to load lab orders</h3>
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
        <h1 className="text-2xl font-bold text-slate-900">Pending Lab Orders</h1>
        <p className="text-sm text-slate-500">List of laboratory test requests waiting for processing.</p>
      </div>

      {labOrders && labOrders.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <FlaskConical className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Pending Lab Orders</h3>
          <p className="text-xs text-slate-400">You don't have any laboratory investigations currently pending.</p>
        </Card>
      ) : (
        <>
          {/* Card-based layout for mobile and tablet */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
            {labOrders?.map((order) => {
              const patient = order.patient as any;
              const patientName = patient?.name || "Unknown Patient";
              const dateStr = new Date(order.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

              return (
                <Card key={order._id} className="p-4 space-y-3 border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{patientName}</h4>
                      <p className="text-xs text-slate-400 font-medium">
                        {patient?.age ? `${patient.age} yrs · ${patient.gender}` : ""}
                      </p>
                    </div>
                    <Badge tone={order.priority === "STAT" ? "danger" : order.priority === "Urgent" ? "warning" : "info"}>
                      {order.priority}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-50 pt-2 font-medium">
                    <div className="col-span-2">
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block mb-1">Requested Tests</span>
                      <div className="flex flex-wrap gap-1">
                        {order.tests.map((test, index) => (
                          <span key={index} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700">
                            {test}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">Sample / Status</span>
                      <span className="text-slate-700 block">{order.sampleStatus}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">Result Status</span>
                      <Badge tone={order.status === "completed" ? "success" : order.status === "rejected" ? "danger" : "neutral"}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">Requested Date</span>
                      <span className="text-slate-700">{dateStr}</span>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Requested Tests</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sample Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Results / Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Requested Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {labOrders?.map((order) => {
                  const patient = order.patient as any;
                  const patientName = patient?.name || "Unknown Patient";
                  const dateStr = new Date(order.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

                  return (
                    <tr key={order._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{patientName}</div>
                        <div className="text-xs text-slate-400">{patient?.age ? `${patient.age} yrs · ${patient.gender}` : ""}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          {order.tests.map((test, index) => (
                            <span key={index} className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700">
                              {test}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge tone={order.priority === "STAT" ? "danger" : order.priority === "Urgent" ? "warning" : "info"}>
                          {order.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-slate-400 animate-pulse" />
                          {order.sampleStatus}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge tone={order.status === "completed" ? "success" : order.status === "rejected" ? "danger" : "neutral"}>
                          {order.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{dateStr}</td>
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
