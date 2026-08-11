import { useDoctorPendingPrescriptions, useCompletePrescription } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Pill, CheckCircle, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export function PendingPrescriptionsPage() {
  const { data: prescriptions, isLoading, isError, refetch } = useDoctorPendingPrescriptions();
  const completeMutation = useCompletePrescription();

  const handleComplete = async (id: string) => {
    try {
      await completeMutation.mutateAsync(id);
      toast.success("Prescription marked as completed");
      refetch();
    } catch (err) {
      toast.error("Failed to update prescription status");
    }
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
        <AlertTriangle className="mb-2 h-10 w-10 text-red-400" />
        <h3 className="text-sm font-semibold text-red-600">Failed to load prescriptions</h3>
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
        <h1 className="text-2xl font-bold text-slate-900">Pending Prescriptions</h1>
        <p className="text-sm text-slate-500">List of prescriptions waiting for pharmacy fulfillment.</p>
      </div>

      {prescriptions && prescriptions.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <Pill className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Pending Prescriptions</h3>
          <p className="text-xs text-slate-400">All prescriptions are completed and dispensed.</p>
        </Card>
      ) : (
        <>
          {/* Card-based layout for mobile and tablet */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
            {prescriptions?.map((presc) => {
              const patient = presc.patient as any;
              const patientName = patient?.name || "Unknown Patient";

              return (
                <Card key={presc._id} className="p-4 space-y-3 border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{patientName}</h4>
                      <p className="text-xs text-slate-400 font-medium">
                        {patient?.age ? `${patient.age} Y · ${patient.gender}` : ""}
                      </p>
                    </div>
                    <Badge tone="warning">Pending Fulfillment</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 text-xs border-t border-slate-50 pt-2 font-medium">
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">Diagnosis</span>
                      <span className="text-slate-700">{presc.diagnosis}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block mb-1">Medicines</span>
                      <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                        {(presc.medications || presc.medicines || []).map((m, idx) => (
                          <li key={idx}>
                            <span className="font-semibold">{m.name}</span> — {m.dosage} ({m.frequency} for {m.duration})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-50">
                    <button
                      onClick={() => handleComplete(presc._id)}
                      disabled={completeMutation.isPending}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Complete Prescription
                    </button>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnosis</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Medicines</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {prescriptions?.map((presc) => {
                  const patient = presc.patient as any;
                  const patientName = patient?.name || "Unknown Patient";

                  return (
                    <tr key={presc._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{patientName}</div>
                        <div className="text-xs text-slate-400">{patient?.age ? `${patient.age} Y · ${patient.gender}` : ""}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{presc.diagnosis}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <ul className="list-disc list-inside">
                          {(presc.medications || presc.medicines || []).map((m, idx) => (
                            <li key={idx}>
                              <span className="font-semibold">{m.name}</span> — {m.dosage} ({m.frequency} for {m.duration})
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge tone="warning">Pending Fulfillment</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleComplete(presc._id)}
                          disabled={completeMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Complete Prescription
                        </button>
                      </td>
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
