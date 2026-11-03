import { useState } from "react";
import { Link } from "react-router-dom";
import { useDoctorInpatients, useAddInpatientNotes } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { BedDouble, FileText, AlertTriangle, Search, ChevronDown, Plus } from "lucide-react";
import toast from "react-hot-toast";

export function InpatientsPage() {
  const { data: inpatients, isLoading, isError, refetch } = useDoctorInpatients();
  const addNotesMutation = useAddInpatientNotes();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>("");
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  const [diagError, setDiagError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const handleOpenNotes = (patientId: string, name: string) => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(name);
    setIsNotesOpen(true);
    setDiagnosis("");
    setNotes("");
    setDiagError(null);
    setNotesError(null);
    setIsSubmitting(false);
    setActiveDropdownId(null);
  };

  const handleNotesSubmit = async () => {
    let hasError = false;

    // Validate Diagnosis/Round Subject
    const dTrimmed = diagnosis.trim();
    if (!dTrimmed) {
      setDiagError("Diagnosis/Round Subject is required");
      hasError = true;
    } else if (dTrimmed.length > 200) {
      setDiagError("Diagnosis/Round Subject exceeds the maximum allowed length");
      hasError = true;
    } else if (!/[a-zA-Z0-9]/.test(dTrimmed) || /<[^>]*>|javascript:/i.test(dTrimmed)) {
      setDiagError("Please enter valid data");
      hasError = true;
    } else {
      setDiagError(null);
    }

    // Validate Daily Progress Notes
    const nTrimmed = notes.trim();
    if (!nTrimmed) {
      setNotesError("Daily Progress Notes is required");
      hasError = true;
    } else if (nTrimmed.length > 2000) {
      setNotesError("Daily Progress Notes exceeds the maximum allowed length");
      hasError = true;
    } else if (!/[a-zA-Z0-9]/.test(nTrimmed) || /<script\b|javascript:/i.test(nTrimmed)) {
      setNotesError("Please enter valid data");
      hasError = true;
    } else {
      setNotesError(null);
    }

    if (hasError || !selectedPatientId) return;

    try {
      setIsSubmitting(true);
      await addNotesMutation.mutateAsync({
        patientId: selectedPatientId,
        notes: nTrimmed,
        diagnosis: dTrimmed,
      });
      toast.success("Progress notes added successfully");
      setIsNotesOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to add progress notes";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
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

  const filteredInpatients = (inpatients || []).filter((adm: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const pName = (adm.patient?.name || "").toLowerCase();
    const uhid = (adm.patient?.uhid || "").toLowerCase();
    const ipNum = (adm.admissionNumber || "").toLowerCase();
    const diag = (adm.admissionReason || "").toLowerCase();
    return pName.includes(q) || uhid.includes(q) || ipNum.includes(q) || diag.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-sans">Current Inpatients</h1>
          <p className="text-sm text-slate-500 font-sans">List of admitted patients assigned to your care.</p>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, UHID, IP #..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-navy-500 font-sans"
          />
        </div>
      </div>

      {inpatients && inpatients.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <BedDouble className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600 font-sans">No Inpatients Admitted</h3>
          <p className="text-xs text-slate-400 font-sans">You currently have no admitted patients under your care.</p>
        </Card>
      ) : filteredInpatients.length === 0 ? (
        <Card className="flex h-48 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <Search className="mb-2 h-8 w-8 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600 font-sans">No Matching Inpatients</h3>
          <p className="text-xs text-slate-400 font-sans">No admitted patients matched your search filter "{searchQuery}".</p>
        </Card>
      ) : (
        <>
          {/* Card-based layout for mobile and tablet */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
            {filteredInpatients.map((adm: any) => {
              const patient = adm.patient as any;
              const patientName = patient?.name || "Unknown Patient";
              const uhid = patient?.uhid || "—";
              const roomNo = adm.room?.roomNumber || "—";
              const bedNo = adm.bed?.bedNumber || "—";
              const admDate = new Date(adm.admissionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              const isDropdownOpen = activeDropdownId === adm._id;

              return (
                <Card key={adm._id} className="p-4 space-y-3 border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate font-sans">{patientName}</h4>
                      <p className="text-xs text-slate-400 font-medium font-sans">
                        {patient?.age ? `${patient.age} yrs · ${patient.gender || ""}` : ""}
                      </p>
                    </div>
                    <Badge tone="info">{adm.admissionNumber}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-50 pt-2 font-medium font-sans">
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">UHID</span>
                      <span className="text-slate-700 font-mono">{uhid}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">Ward / Bed</span>
                      <span className="text-slate-700 truncate block">{adm.ward || "General"} (R: {roomNo} · B: {bedNo})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">Admission Date</span>
                      <span className="text-slate-700">{admDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase text-[9px] block">Diagnosis</span>
                      <span className="text-slate-700 truncate block">{adm.admissionReason || "Observation"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                    <Link to={`/doctor/patients?search=${encodeURIComponent(patientName)}`} className="flex-1 min-w-[90px]">
                      <button className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors font-sans">
                        Open Patient
                      </button>
                    </Link>
                    <button
                      onClick={() => handleOpenNotes(patient._id, patientName)}
                      className="flex-1 min-w-[90px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-medium transition-colors font-sans"
                    >
                      <FileText className="h-3.5 w-3.5" /> Daily Notes
                    </button>
                    <div className="relative flex-1 min-w-[80px]">
                      <button
                        onClick={() => setActiveDropdownId(isDropdownOpen ? null : adm._id)}
                        className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors font-sans"
                      >
                        Orders <ChevronDown className="h-3 w-3" />
                      </button>
                      {isDropdownOpen && (
                        <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 text-left py-1 font-sans">
                          <Link
                            to={`/doctor/prescriptions/new?patientId=${patient._id}`}
                            onClick={() => setActiveDropdownId(null)}
                            className="block px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                          >
                            <Plus className="h-3 w-3" /> New Prescription
                          </Link>
                          <Link
                            to={`/doctor/laboratory/new?patientId=${patient._id}`}
                            onClick={() => setActiveDropdownId(null)}
                            className="block px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                          >
                            <Plus className="h-3 w-3" /> Create Lab Order
                          </Link>
                        </div>
                      )}
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">IP Number</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">UHID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Ward / Room / Bed</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Admission Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Diagnosis</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredInpatients.map((adm: any) => {
                  const patient = adm.patient as any;
                  const patientName = patient?.name || "Unknown Patient";
                  const uhid = patient?.uhid || "—";
                  const roomNo = adm.room?.roomNumber || "—";
                  const bedNo = adm.bed?.bedNumber || "—";
                  const admDate = new Date(adm.admissionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  const isDropdownOpen = activeDropdownId === adm._id;

                  return (
                    <tr key={adm._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 font-mono">{adm.admissionNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 font-sans">{patientName}</div>
                        <div className="text-xs text-slate-400 font-sans">{patient?.age ? `${patient.age} yrs · ${patient.gender || ""}` : ""}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{uhid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-sans">
                        <div>{adm.ward || "General"}</div>
                        <div className="text-xs text-slate-400">Room: {roomNo} · Bed: {bedNo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-sans">{admDate}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate font-sans">{adm.admissionReason || "Observation"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium font-sans">
                        <div className="flex gap-2 justify-end">
                          <Link to={`/doctor/patients?search=${encodeURIComponent(patientName)}`}>
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors font-sans">
                              Open Patient
                            </button>
                          </Link>
                          <button
                            onClick={() => handleOpenNotes(patient._id, patientName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-medium transition-colors font-sans"
                          >
                            <FileText className="h-3.5 w-3.5" /> Daily Notes
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActiveDropdownId(isDropdownOpen ? null : adm._id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors font-sans"
                            >
                              Orders <ChevronDown className="h-3 w-3" />
                            </button>
                            {isDropdownOpen && (
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 text-left py-1 font-sans">
                                <Link
                                  to={`/doctor/prescriptions/new?patientId=${patient._id}`}
                                  onClick={() => setActiveDropdownId(null)}
                                  className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                                >
                                  <Plus className="h-3.5 w-3.5" /> New Prescription
                                </Link>
                                <Link
                                  to={`/doctor/laboratory/new?patientId=${patient._id}`}
                                  onClick={() => setActiveDropdownId(null)}
                                  className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Create Lab Order
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Daily Notes Modal */}
      {isNotesOpen && (
        <Modal title={`Add Daily Progress Notes - ${selectedPatientName}`} isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 font-sans">
                  Diagnosis/Round Subject <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono font-sans">{diagnosis.length}/200</span>
              </div>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => {
                  setDiagnosis(e.target.value);
                  if (diagError) setDiagError(null);
                }}
                placeholder="e.g. Daily Ward Round / Fever Monitoring"
                maxLength={250}
                className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-none font-sans ${
                  diagError
                    ? "border-rose-400 bg-rose-50/20 focus:border-rose-500"
                    : "border-slate-200 bg-white focus:border-navy-500"
                }`}
              />
              {diagError && (
                <p className="mt-1 text-xs font-medium text-rose-500 font-sans">{diagError}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 font-sans">
                  Daily Progress Notes <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono font-sans">{notes.length}/2000</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (notesError) setNotesError(null);
                }}
                placeholder="Enter patient vitals, stability, or medication updates..."
                rows={4}
                maxLength={2500}
                className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-none resize-none font-sans ${
                  notesError
                    ? "border-rose-400 bg-rose-50/20 focus:border-rose-500"
                    : "border-slate-200 bg-white focus:border-navy-500"
                }`}
              />
              {notesError && (
                <p className="mt-1 text-xs font-medium text-rose-500 font-sans">{notesError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4 font-sans">
              <button
                type="button"
                onClick={() => setIsNotesOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNotesSubmit}
                disabled={isSubmitting || addNotesMutation.isPending}
                className="px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSubmitting || addNotesMutation.isPending ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
