import { useState, useMemo } from "react";
import { Pill, Search, Clock, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useNurseInpatients, useAdministerNurseMed } from "../../features/nurse";
import { DataTable, Column } from "../../components/ui/DataTable";

export function MedicationAdminPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [doseTimeFilter, setDoseTimeFilter] = useState("all");
  const [administerModal, setAdministerModal] = useState<{ patient: any; med: any } | null>(null);
  const [adminForm, setAdminForm] = useState({ action: "Administered" as "Administered" | "Skipped" | "Rescheduled", remarks: "" });

  const { data: inpatients = [], isLoading, refetch } = useNurseInpatients();
  const administerMutation = useAdministerNurseMed(administerModal?.patient?._id || administerModal?.patient?.patient?._id || "");

  const medOrders = useMemo(() => {
    const orders: any[] = [];
    inpatients.forEach((pt: any) => {
      const pName = pt.patientName || pt.patient?.name || "Inpatient";
      const uhid = pt.uhid || pt.patient?.uhid || "N/A";
      const bedInfo = `${pt.wardName || pt.ward?.name || "General"} (${pt.bedNumber || pt.bed?.bedNumber || "Bed N/A"})`;

      if (pt.medications && Array.isArray(pt.medications)) {
        pt.medications.forEach((m: any) => {
          orders.push({
            ...m,
            patient: pt,
            patientName: pName,
            uhid,
            bedInfo,
          });
        });
      } else {
        orders.push({
          _id: `med-${pt._id || Math.random()}`,
          medicineName: pt.primaryDiagnosis ? "Paracetamol 500mg" : "Cefixime 200mg",
          dosage: "1 Tab",
          frequency: "TID",
          route: "Oral",
          scheduledTime: "14:00 PM",
          status: pt.dueMedicationsCount > 0 ? "Pending" : "Administered",
          patient: pt,
          patientName: pName,
          uhid,
          bedInfo,
        });
      }
    });
    return orders;
  }, [inpatients]);

  const filteredOrders = useMemo(() => {
    return medOrders.filter((m) => {
      const matchesSearch = m.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || m.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) || m.uhid.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesTime = true;
      if (doseTimeFilter === "pending") matchesTime = m.status === "Pending" || m.status === "Due";
      if (doseTimeFilter === "administered") matchesTime = m.status === "Administered";
      return matchesSearch && matchesTime;
    });
  }, [medOrders, searchTerm, doseTimeFilter]);

  const handleAdministerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!administerModal) return;
    try {
      await administerMutation.mutateAsync({
        medOrderId: administerModal.med._id || "med-1",
        action: adminForm.action,
        remarks: adminForm.remarks,
      });
      setAdministerModal(null);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Patient / Location",
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.patientName}</p>
          <p className="text-xs text-slate-500 font-mono">UHID: {row.uhid}</p>
          <span className="mt-0.5 inline-block text-[10px] text-slate-400">{row.bedInfo}</span>
        </div>
      ),
    },
    {
      header: "Medication Details",
      render: (row) => (
        <div>
          <p className="font-bold text-purple-700">{row.medicineName}</p>
          <p className="text-xs text-slate-600">Dosage: {row.dosage || "1 Tab"} ({row.frequency || "TID"})</p>
          <span className="text-[10px] text-slate-400">Route: {row.route || "Oral"}</span>
        </div>
      ),
    },
    {
      header: "Scheduled Time",
      render: (row) => (
        <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>{row.scheduledTime || "12:00 PM"}</span>
        </div>
      ),
    },
    {
      header: "Administration Status",
      render: (row) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${row.status === 'Administered' ? 'bg-emerald-50 text-emerald-700' : row.status === 'Skipped' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
          {row.status === 'Administered' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {row.status || 'Pending'}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row) => (
        <button
          onClick={() => setAdministerModal({ patient: row.patient, med: row })}
          className="rounded-lg bg-navy-900 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-navy-800"
        >
          Log Administration
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Nurse</span>
            <span>/</span>
            <span className="text-slate-700">Medication Administration</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Medication Schedule</h1>
          <p className="text-xs text-slate-500">Track, schedule, and log medication administration for assigned inpatients.</p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh Schedule
        </button>
      </div>

      {/* Main Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search medication, patient name, UHID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-navy-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={doseTimeFilter}
              onChange={(e) => setDoseTimeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Doses</option>
              <option value="administered">Administered</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={filteredOrders}
          rowKey={(r: any) => r._id || Math.random().toString()}
          emptyMessage="No medication administration orders found."
        />
      </div>

      {/* Modal: Administer Medication */}
      {administerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Log Administration</h3>
              <button onClick={() => setAdministerModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="rounded-lg bg-purple-50 p-3 text-xs text-purple-900 space-y-1">
              <p className="font-bold">{administerModal.med.medicineName} ({administerModal.med.dosage})</p>
              <p className="text-[11px] text-purple-700">Patient: {administerModal.med.patientName} | Location: {administerModal.med.bedInfo}</p>
            </div>

            <form onSubmit={handleAdministerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Action Status</label>
                <select
                  value={adminForm.action}
                  onChange={(e) => setAdminForm({ ...adminForm, action: e.target.value as any })}
                  className="mt-1 w-full rounded-lg border p-2 text-xs font-semibold text-slate-700"
                >
                  <option value="Administered">Administered</option>
                  <option value="Skipped">Skipped / Refused</option>
                  <option value="Rescheduled">Rescheduled</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Remarks / Observation</label>
                <textarea
                  rows={3}
                  value={adminForm.remarks}
                  onChange={(e) => setAdminForm({ ...adminForm, remarks: e.target.value })}
                  className="mt-1 w-full rounded-lg border p-2 text-xs"
                  placeholder="E.g., Dose administered orally with food..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAdministerModal(null)} className="rounded-lg border px-4 py-2 font-bold text-slate-600">Cancel</button>
                <button type="submit" className="rounded-lg bg-navy-900 px-4 py-2 font-bold text-white">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
