import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Plus, Receipt } from "lucide-react";
import { usePatient, useAddMedicalHistory } from "../../features/patients";
import { useInvoices } from "../../features/invoices";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { InputField } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";

export function PatientDetailsPage() {
  const { id } = useParams();
  const { data: patient, isLoading } = usePatient(id);
  const { data: invoices } = useInvoices({ patient: id });
  const addEntry = useAddMedicalHistory(id ?? "");
  const [isModalOpen, setModalOpen] = useState(false);
  const [entry, setEntry] = useState({ date: "", visitType: "", doctorName: "", department: "", diagnosis: "", notes: "" });

  if (isLoading || !patient) {
    return <p className="text-slate-400">Loading...</p>;
  }

  async function handleAddEntry(e: FormEvent) {
    e.preventDefault();
    await addEntry.mutateAsync(entry);
    setEntry({ date: "", visitType: "", doctorName: "", department: "", diagnosis: "", notes: "" });
    setModalOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
            <Badge tone="info">Patient</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {patient.gender}, {patient.age} yrs • Blood Type {patient.bloodGroup || "—"}
          </p>
        </div>
      </div>

      {patient.allergies && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
          <div>
            <div className="text-sm font-semibold text-red-700">Allergy Alert</div>
            <p className="text-sm text-red-600">{patient.allergies}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Medical History</h3>
            </div>
            {patient.medicalHistory.length === 0 ? (
              <p className="text-sm text-slate-400">No visit history recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {patient.medicalHistory.map((entry) => (
                  <div key={entry._id} className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">
                        {new Date(entry.date).toLocaleDateString()} — {entry.visitType}
                      </span>
                      <Badge tone={entry.status === "Critical" ? "danger" : "success"}>{entry.status}</Badge>
                    </div>
                    <div className="mb-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-400">Attending Doctor </span>
                        <span className="font-medium text-slate-700">{entry.doctorName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Department </span>
                        <span className="font-medium text-slate-700">{entry.department}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">
                      <strong>Diagnosis:</strong> {entry.diagnosis}
                    </p>
                    {entry.notes && (
                      <p className="mt-1 text-sm text-slate-600">
                        <strong>Notes:</strong> {entry.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 text-base font-semibold text-slate-800">Insurance</h3>
            <div className="space-y-1 text-sm">
              <div className="text-slate-500">Provider</div>
              <div className="font-medium text-slate-800">{patient.insuranceProvider || "—"}</div>
              <div className="pt-2 text-slate-500">Policy Number</div>
              <div className="font-medium text-slate-800">{patient.insurancePolicyNumber || "—"}</div>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-700" />
              <h3 className="text-base font-semibold text-slate-800">Invoices</h3>
            </div>
            {invoices?.data.length === 0 && <p className="text-sm text-slate-400">No invoices yet.</p>}
            <div className="space-y-2">
              {invoices?.data.map((inv) => (
                <Link key={inv._id} to={`/admin/finance/invoices/${inv._id}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50">
                  <span className="text-slate-600">{new Date(inv.issuedAt).toLocaleDateString()}</span>
                  <Badge tone={inv.status === "paid" ? "success" : inv.status === "overdue" ? "danger" : "warning"}>{inv.status}</Badge>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal title="Add Medical History Entry" isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleAddEntry} className="space-y-3">
          <InputField label="Date" type="date" required value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />
          <InputField label="Visit Type" value={entry.visitType} onChange={(e) => setEntry({ ...entry, visitType: e.target.value })} placeholder="e.g. Annual Physical" />
          <InputField label="Doctor" value={entry.doctorName} onChange={(e) => setEntry({ ...entry, doctorName: e.target.value })} />
          <InputField label="Department" value={entry.department} onChange={(e) => setEntry({ ...entry, department: e.target.value })} />
          <InputField label="Diagnosis" value={entry.diagnosis} onChange={(e) => setEntry({ ...entry, diagnosis: e.target.value })} />
          <InputField label="Notes" value={entry.notes} onChange={(e) => setEntry({ ...entry, notes: e.target.value })} />
          <Button type="submit" variant="primary" className="w-full justify-center" disabled={addEntry.isPending}>
            {addEntry.isPending ? "Saving..." : "Add Entry"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
