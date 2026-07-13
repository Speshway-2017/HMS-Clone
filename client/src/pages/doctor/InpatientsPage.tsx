import { useState } from "react";
import { Link } from "react-router-dom";
import { useDoctorInpatients, useAddInpatientNotes } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { TextareaField, InputField } from "../../components/ui/Field";
import { BedDouble, Plus, Stethoscope, FileText, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export function InpatientsPage() {
  const { data: inpatients, isLoading, isError, refetch } = useDoctorInpatients();
  const addNotesMutation = useAddInpatientNotes();

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>("");
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  const handleOpenNotes = (patientId: string, name: string) => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(name);
    setIsNotesOpen(true);
    setDiagnosis("");
    setNotes("");
  };

  const handleNotesSubmit = async () => {
    if (!selectedPatientId || !notes.trim()) return;
    try {
      await addNotesMutation.mutateAsync({
        patientId: selectedPatientId,
        notes,
        diagnosis: diagnosis || "Inpatient Round Notes",
      });
      toast.success("Progress notes added successfully");
      setIsNotesOpen(false);
    } catch (err) {
      toast.error("Failed to add progress notes");
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
        <h3 className="text-sm font-semibold text-red-600">Failed to load inpatients</h3>
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
        <h1 className="text-2xl font-bold text-slate-900">Current Inpatients</h1>
        <p className="text-sm text-slate-500">List of admitted patients assigned to your care.</p>
      </div>

      {inpatients && inpatients.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <BedDouble className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Inpatients Admitted</h3>
          <p className="text-xs text-slate-400">You currently have no admitted patients under your care.</p>
        </Card>
      ) : (
        <div className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">UHID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ward/Room/Bed</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Admission Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnosis</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {inpatients?.map((adm) => {
                const patient = adm.patient as any;
                const patientName = patient?.name || "Unknown Patient";
                const uhid = patient?.uhid || "—";
                const roomNo = adm.room?.roomNumber || "—";
                const bedNo = adm.bed?.bedNumber || "—";
                const admDate = new Date(adm.admissionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

                return (
                  <tr key={adm._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 font-mono">{adm.admissionNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{patientName}</div>
                      <div className="text-xs text-slate-400">{patient?.age ? `${patient.age} yrs · ${patient.gender}` : ""}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{uhid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div>{adm.ward}</div>
                      <div className="text-xs text-slate-400">Room: {roomNo} · Bed: {bedNo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{admDate}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{adm.admissionReason || "Observation"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2 justify-end">
                        <Link to={`/doctor/patients?search=${patientName}`}>
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors">
                            Open Patient
                          </button>
                        </Link>
                        <button
                          onClick={() => handleOpenNotes(patient._id, patientName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" /> Daily Notes
                        </button>
                        <div className="relative group">
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors">
                            Orders
                          </button>
                          <div className="absolute right-0 mt-1 hidden w-40 bg-white border border-slate-200 rounded-lg shadow-lg group-hover:block z-10 text-left">
                            <Link
                              to={`/doctor/prescriptions/new?patientId=${patient._id}`}
                              className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              New Prescription
                            </Link>
                            <Link
                              to={`/doctor/laboratory/new?patientId=${patient._id}`}
                              className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              Create Lab Order
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Daily Notes Modal */}
      {isNotesOpen && (
        <Modal title={`Add Daily Progress Notes - ${selectedPatientName}`} isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)}>
          <div className="space-y-4">
            <InputField
              label="Diagnosis/Round Subject"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Daily Ward Round / Fever Monitoring"
            />
            <TextareaField
              label="Daily Progress Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter patient vitals, stability, or medication updates..."
              rows={4}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsNotesOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleNotesSubmit}
                disabled={addNotesMutation.isPending || !notes.trim()}
                className="px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-medium"
              >
                Save Notes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
