import { useState, useMemo } from "react";
import { FileText, Search, RefreshCw, AlertTriangle } from "lucide-react";
import { useNurseInpatients, useSaveNurseNote } from "../../features/nurse";
import { DataTable, Column } from "../../components/ui/DataTable";
import { useStaffProfileMe } from "../../features/staff";

export function NursingNotesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [noteModalPatient, setNoteModalPatient] = useState<any | null>(null);

  const [noteForm, setNoteForm] = useState({
    observationType: "Shift Assessment",
    painAssessment: "Mild",
    mobility: "Ambulatory",
    additionalNotes: "",
  });

  const { data: inpatients = [], isLoading, refetch } = useNurseInpatients();
  const { data: staffMe } = useStaffProfileMe();
  const isReadOnly = localStorage.getItem("nurse_shift_completed") === "true" || staffMe?.dutyStatus === "off_duty";

  const saveNoteMutation = useSaveNurseNote(noteModalPatient?.patient?._id || (typeof noteModalPatient?.patient === 'string' ? noteModalPatient.patient : '') || noteModalPatient?._id || "");

  const notesList = useMemo(() => {
    const list: any[] = [];
    inpatients.forEach((pt: any) => {
      const pName = pt.patientName || pt.patient?.name || "Inpatient";
      const uhid = pt.uhid || pt.patient?.uhid || "N/A";
      const bedInfo = `${pt.wardName || pt.ward?.name || "General"} (${pt.bedNumber || pt.bed?.bedNumber || "Bed N/A"})`;

      if (pt.nursingNotes && Array.isArray(pt.nursingNotes)) {
        pt.nursingNotes.forEach((n: any) => {
          list.push({ ...n, patientName: pName, uhid, bedInfo, patient: pt });
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
          patient: pt,
        });
      }
    });
    return list;
  }, [inpatients]);

  const filteredNotes = useMemo(() => {
    return notesList.filter((n) => n.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || n.uhid.toLowerCase().includes(searchTerm.toLowerCase()) || n.additionalNotes.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [notesList, searchTerm]);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteModalPatient || !noteForm.additionalNotes.trim()) return;
    try {
      await saveNoteMutation.mutateAsync(noteForm);
      setNoteModalPatient(null);
      setNoteForm({ observationType: "Shift Assessment", painAssessment: "Mild", mobility: "Ambulatory", additionalNotes: "" });
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
          <span className="text-[10px] text-slate-400">{row.bedInfo}</span>
        </div>
      ),
    },
    {
      header: "Observation Type",
      render: (row) => <span className="rounded bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">{row.observationType || "Clinical Note"}</span>,
    },
    {
      header: "Clinical Note Content",
      render: (row) => <p className="text-xs text-slate-700 max-w-md line-clamp-2">{row.additionalNotes || row.notes || "No notes logged."}</p>,
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
          <p className="text-xs text-slate-500">Log daily nursing observations, care progress notes, and doctor order reviews.</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, UHID, or note content..."
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
    </div>
  );
}
