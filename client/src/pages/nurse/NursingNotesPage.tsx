import { useState, useMemo } from "react";
import { FileText, Search, RefreshCw, AlertTriangle, Send, CheckCircle2, Plus, X, Loader2, User } from "lucide-react";
import toast from "react-hot-toast";
import { useNurseInpatients, useSaveNurseNote, useSendNoteToDoctor } from "../../features/nurse";
import { DataTable, Column } from "../../components/ui/DataTable";
import { useStaffProfileMe } from "../../features/staff";

export function NursingNotesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [sendingNoteId, setSendingNoteId] = useState<string | null>(null);
  const [sentNotesMap, setSentNotesMap] = useState<Record<string, boolean>>({});

  const [noteForm, setNoteForm] = useState({
    observationType: "Shift Assessment",
    painAssessment: "Mild",
    mobility: "Ambulatory",
    additionalNotes: "",
  });

  const { data: inpatients = [], isLoading, refetch } = useNurseInpatients();
  const { data: staffMe } = useStaffProfileMe();
  const isReadOnly = localStorage.getItem("nurse_shift_completed") === "true" || staffMe?.dutyStatus === "off_duty";

  const saveNoteMutation = useSaveNurseNote(selectedPatientId);
  const sendNoteToDoctorMutation = useSendNoteToDoctor();

  const notesList = useMemo(() => {
    const list: any[] = [];
    inpatients.forEach((pt: any) => {
      const pName = pt.patientName || pt.patient?.name || "Inpatient";
      const uhid = pt.uhid || pt.patient?.uhid || "N/A";
      const bedInfo = `${pt.wardName || pt.ward?.name || "General"} (${pt.bedNumber || pt.bed?.bedNumber || "Bed N/A"})`;
      const docName = pt.admittingDoctor?.name || (typeof pt.admittingDoctor === "string" ? pt.admittingDoctor : null) || pt.doctorName || pt.doctor?.name || "Assigned Doctor";

      if (pt.nursingNotes && Array.isArray(pt.nursingNotes)) {
        pt.nursingNotes.forEach((n: any) => {
          list.push({ ...n, patientName: pName, uhid, bedInfo, doctorName: docName, patient: pt });
        });
      } else {
        list.push({
          _id: `note-${pt._id}`,
          observationType: "Routine Check",
          additionalNotes: pt.observationNotes || "Patient resting comfortably. Vitals checked and stable.",
          createdAt: pt.updatedAt || new Date().toISOString(),
          loggedByName: "Staff Nurse",
          patientName: pName,
          uhid,
          bedInfo,
          doctorName: docName,
          patient: pt,
        });
      }
    });
    return list;
  }, [inpatients]);

  const filteredNotes = useMemo(() => {
    return notesList.filter((n) =>
      n.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.additionalNotes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [notesList, searchTerm]);

  // Handler to send an existing note to the patient's assigned doctor
  const handleSendToDoctor = async (row: any) => {
    const ptId = row.patient?.patient?._id || (typeof row.patient?.patient === 'string' ? row.patient.patient : '') || row.patient?._id || "";
    const noteContent = row.additionalNotes || row.notes || "Clinical observation recorded.";
    const obsType = row.observationType || "Shift Assessment";
    const docName = row.doctorName || "Assigned Doctor";

    if (!ptId) {
      toast.error("Patient information not found.");
      return;
    }

    setSendingNoteId(row._id);
    try {
      const res = await sendNoteToDoctorMutation.mutateAsync({
        patientId: ptId,
        noteContent,
        observationType: obsType
      });

      setSentNotesMap((prev) => ({ ...prev, [row._id]: true }));
      toast.success(`Note sent to ${res?.doctorName || docName} successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send note to doctor.");
    } finally {
      setSendingNoteId(null);
    }
  };

  // Handler to save and send a new note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Please select a patient.");
      return;
    }
    if (!noteForm.additionalNotes.trim()) {
      toast.error("Please enter clinical note content.");
      return;
    }

    try {
      await saveNoteMutation.mutateAsync(noteForm);

      // Automatically send note to assigned doctor as well
      await sendNoteToDoctorMutation.mutateAsync({
        patientId: selectedPatientId,
        noteContent: noteForm.additionalNotes,
        observationType: noteForm.observationType
      });

      toast.success("Nursing note saved and sent to assigned doctor!");
      setIsAddModalOpen(false);
      setSelectedPatientId("");
      setNoteForm({ observationType: "Shift Assessment", painAssessment: "Mild", mobility: "Ambulatory", additionalNotes: "" });
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error saving nursing note.");
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Patient / Location",
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.patientName}</p>
          <p className="text-xs text-slate-500 font-mono">UHID: {row.uhid}</p>
          <span className="text-[10px] text-slate-400">{row.bedInfo}</span>
        </div>
      ),
    },
    {
      header: "Attending Doctor",
      render: (row) => (
        <div>
          <p className="text-xs font-bold text-navy-800">{row.doctorName || "Dr. Assigned"}</p>
          <span className="text-[10px] text-slate-400 font-medium">Primary Consultant</span>
        </div>
      ),
    },
    {
      header: "Observation Type",
      render: (row) => <span className="rounded bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">{row.observationType || "Clinical Note"}</span>,
    },
    {
      header: "Clinical Note Content",
      render: (row) => <p className="text-xs text-slate-700 max-w-xs line-clamp-2">{row.additionalNotes || row.notes || "No notes logged."}</p>,
    },
    {
      header: "Nurse / Timestamp",
      render: (row) => (
        <div>
          <p className="text-xs font-bold text-slate-800">{row.loggedByName || "Staff Nurse"}</p>
          <p className="text-[10px] text-slate-400">{new Date(row.createdAt || Date.now()).toLocaleString()}</p>
        </div>
      ),
    },
    {
      header: "Action / Send to Doctor",
      render: (row) => {
        const docName = row.doctorName || "Assigned Doctor";
        const noteId = row._id;
        const isSending = sendingNoteId === noteId;
        const isSent = sentNotesMap[noteId];

        return (
          <div className="flex flex-col items-start gap-1">
            {isSent ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Sent to {docName}
              </span>
            ) : (
              <button
                disabled={isSending || isReadOnly}
                onClick={() => handleSendToDoctor(row)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy-600 hover:bg-navy-700 text-white font-bold text-xs px-3 py-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                title={`Send note directly to ${docName}`}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send to {docName}
                  </>
                )}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Read-Only Status Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-semibold text-amber-800 flex items-center gap-2 mb-4 animate-fadeIn">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 animate-pulse" />
          <div>
            <p className="font-bold text-amber-900">Shift Handed Over / Completed</p>
            <p className="text-[11px] text-amber-705 mt-0.5">Your shift has been successfully completed. You are now in read-only mode. Recording new patient clinical observations is disabled.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Nurse</span>
            <span>/</span>
            <span className="text-slate-700">Nursing Notes</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Nursing Clinical Notes</h1>
          <p className="text-xs text-slate-500">Log daily nursing observations, care progress notes, and dispatch real-time notes to assigned doctors.</p>
        </div>

        <button
          disabled={isReadOnly}
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-navy-700 hover:bg-navy-800 text-white font-extrabold text-xs px-4 py-2.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Log & Send Note to Doctor
        </button>
      </div>

      {/* Main Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, doctor, UHID, or note content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-navy-900 focus:outline-none"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={filteredNotes}
          rowKey={(r: any) => r._id || Math.random().toString()}
          emptyMessage="No nursing clinical notes logged yet."
        />
      </div>

      {/* Add & Send Note Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-navy-50 text-navy-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Log Clinical Note & Send to Doctor</h3>
                  <p className="text-xs text-slate-500">Note will automatically dispatch to the patient's assigned doctor</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Inpatient Patient *
                </label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold focus:border-navy-500 bg-white outline-none cursor-pointer"
                >
                  <option value="">Select Inpatient Patient...</option>
                  {inpatients.map((pt: any) => {
                    const pId = pt.patient?._id || (typeof pt.patient === 'string' ? pt.patient : '') || pt._id;
                    const pName = pt.patientName || pt.patient?.name || "Inpatient";
                    const uhid = pt.uhid || pt.patient?.uhid || "";
                    const docName = pt.admittingDoctor?.name || (typeof pt.admittingDoctor === "string" ? pt.admittingDoctor : null) || pt.doctorName || pt.doctor?.name || "Assigned Doctor";
                    return (
                      <option key={pId} value={pId}>
                        {pName} ({uhid}) — Doctor: {docName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observation Type
                </label>
                <select
                  value={noteForm.observationType}
                  onChange={(e) => setNoteForm({ ...noteForm, observationType: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold focus:border-navy-500 bg-white outline-none cursor-pointer"
                >
                  <option value="Shift Assessment">Shift Assessment</option>
                  <option value="Routine Check">Routine Check</option>
                  <option value="Vitals Alert">Vitals Alert</option>
                  <option value="Doctor Order Review">Doctor Order Review</option>
                  <option value="Medication Note">Medication Note</option>
                  <option value="Critical Care Log">Critical Care Log</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Clinical Note Content *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter detailed nursing clinical observation or progress note..."
                  value={noteForm.additionalNotes}
                  onChange={(e) => setNoteForm({ ...noteForm, additionalNotes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium focus:border-navy-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveNoteMutation.isPending}
                  className="px-5 py-2.5 bg-navy-700 hover:bg-navy-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {saveNoteMutation.isPending ? "Sending..." : "Save & Send to Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
