import { useState } from "react";
import {
  FileText, Search, Eye, Download, Edit3, X, CheckCircle2, History
} from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { TextareaField } from "../../components/ui/Field";
import { useCompletedReports, useEditReport, DiagnosticReport } from "../../features/laboratory";

const getDownloadUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("res.cloudinary.com")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
};

export function LaboratoryCompletedReports() {
  const { data: reports = [], isLoading, refetch } = useCompletedReports();
  const editReportMutation = useEditReport();

  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<DiagnosticReport | null>(null);
  const [editingReport, setEditingReport] = useState<DiagnosticReport | null>(null);

  // Edit form state
  const [editObservations, setEditObservations] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const filteredReports = reports.filter(r => {
    const ptName = r.patient?.name || "";
    const uhid = r.patient?.uhid || "";
    const docName = r.doctor?.name || "";
    const reqId = r.requestId || r._id || "";
    const test = r.testName || "";
    const q = search.toLowerCase().trim();

    return (
      ptName.toLowerCase().includes(q) ||
      uhid.toLowerCase().includes(q) ||
      docName.toLowerCase().includes(q) ||
      reqId.toLowerCase().includes(q) ||
      test.toLowerCase().includes(q)
    );
  });

  const handleOpenEdit = (rep: DiagnosticReport) => {
    setEditingReport(rep);
    setEditObservations(rep.observations || "");
    setEditRemarks(rep.remarks || "");
    setEditFile(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    const formData = new FormData();
    formData.append("observations", editObservations);
    formData.append("remarks", editRemarks);
    if (editFile) {
      formData.append("file", editFile);
    }

    try {
      setIsSubmittingEdit(true);
      await editReportMutation.mutateAsync({ reportId: editingReport._id, formData });
      toast.success(`Report updated to Version ${(editingReport.version || 1) + 1}!`);
      setEditingReport(null);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update report.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Completed Reports Module
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Archived final lab & radiology diagnostic reports. Edit wrong uploads and view complete report version history.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-semibold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">
          Total Completed: {reports.length} Reports
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, UHID, doctor, test name, or request ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-navy-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Reports Table */}
      <Card className="p-0 overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <FileText className="h-10 w-10 text-slate-300 mb-2" />
            <p className="font-semibold text-sm text-slate-600">No completed reports found.</p>
            <p className="text-xs text-slate-400 mt-0.5">Uploaded diagnostic reports will appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Patient Details</th>
                  <th className="px-4 py-3">Request / Visit ID</th>
                  <th className="px-4 py-3">Tests / Modality</th>
                  <th className="px-4 py-3">Ordering Doctor</th>
                  <th className="px-4 py-3">Completed By & Date</th>
                  <th className="px-4 py-3">Status / Ver.</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReports.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 text-xs">{r.patient?.name || "Patient"}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {r.patient?.uhid ? `UHID: ${r.patient.uhid}` : "Walk-in"} · {r.patient?.age || "N/A"}Yrs
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] font-bold text-blue-600">
                        #{String(r.requestId || r._id).slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold text-[10px]">
                        {r.testName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      Dr. {r.doctor?.name || "Attending Doctor"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{r.uploadedBy?.name || "Lab Staff"}</div>
                      <div className="text-[9px] text-slate-400">
                        {new Date(r.uploadedAt || (r as any).createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Badge tone="success" className="text-[9px]">COMPLETED</Badge>
                        {(r.version || 1) > 1 && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            v{r.version}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          onClick={() => setSelectedReport(r)}
                          className="text-xs py-1 px-2 text-navy-700 hover:bg-navy-50"
                          title="View Full Report"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                        {r.files && r.files.length > 0 && (
                          <a
                            href={getDownloadUrl(r.files[0].secure_url)}
                            download={r.files[0].original_filename || `${r.testName || "Report"}.pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-xs py-1 px-2 font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition"
                            title="Download attachment"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" /> PDF
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenEdit(r)}
                          className="text-xs py-1 px-2 text-amber-700 hover:bg-amber-50 border border-amber-200"
                          title="Edit / Replace Report"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* View Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-navy-900 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Diagnostic Report View</h3>
                <p className="text-xs text-slate-300 font-mono">
                  {selectedReport.testName} · Version {selectedReport.version || 1}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs text-slate-700">
              {/* Patient & Doctor Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Patient Information</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedReport.patient?.name || "Patient"}</div>
                  <div className="text-slate-500 mt-0.5">UHID: {selectedReport.patient?.uhid || "N/A"}</div>
                  <div className="text-slate-500">{selectedReport.patient?.age} Yrs · {selectedReport.patient?.gender}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Ordering Doctor</span>
                  <div className="font-bold text-slate-900 text-sm">Dr. {selectedReport.doctor?.name || "Doctor"}</div>
                  <div className="text-slate-500 mt-0.5">{selectedReport.doctor?.specialization || "General Medicine"}</div>
                  <div className="text-slate-400 text-[10px] mt-1">Completed By: {selectedReport.uploadedBy?.name || "Lab Staff"}</div>
                </div>
              </div>

              {/* Observations */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide mb-1">Observations & Clinical Findings</h4>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedReport.observations || "No specific observations logged."}
                </div>
              </div>

              {/* Remarks */}
              {selectedReport.remarks && (
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide mb-1">Technical Remarks & Recommendations</h4>
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedReport.remarks}
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide mb-2">Uploaded Attachments & Files</h4>
                {selectedReport.files && selectedReport.files.length > 0 ? (
                  <div className="space-y-2">
                    {selectedReport.files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-slate-800 text-xs">{file.original_filename}</span>
                        </div>
                        <a
                          href={getDownloadUrl(file.secure_url)}
                          download={file.original_filename || "report.pdf"}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                        >
                          <Download className="h-3.5 w-3.5" /> Open / Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">No attachment files uploaded.</div>
                )}
              </div>

              {/* Version History */}
              {selectedReport.versions && selectedReport.versions.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <History className="h-4 w-4 text-amber-600" /> Report Version History
                  </h4>
                  <div className="space-y-2">
                    {selectedReport.versions.map((ver, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Version {ver.version}</span>
                          <span className="text-slate-400 font-normal">
                            {new Date(ver.editedAt).toLocaleDateString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-slate-600 italic">"{ver.observations}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <form onSubmit={handleSaveEdit}>
              <div className="bg-amber-900 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-amber-300" />
                    Edit Diagnostic Report (v{(editingReport.version || 1) + 1})
                  </h3>
                  <p className="text-xs text-amber-200">
                    Patient: {editingReport.patient?.name} · Test: {editingReport.testName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800">
                  ⚠️ Editing this report will preserve the previous version (Version {editingReport.version || 1}) in the report history audit trail and update the active report version to Version {(editingReport.version || 1) + 1}.
                </div>

                <TextareaField
                  label="Update Observations & Findings"
                  required
                  rows={3}
                  value={editObservations}
                  onChange={(e) => setEditObservations(e.target.value)}
                />

                <TextareaField
                  label="Update Technical Remarks"
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Replace Attachment File (Optional)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/jpg"
                    onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                    className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100 transition-all cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Leave empty to keep existing attachment file ({editingReport.files?.[0]?.original_filename || "N/A"}).
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmittingEdit}
                  onClick={() => setEditingReport(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5"
                >
                  {isSubmittingEdit ? "Updating..." : `Save Version ${(editingReport.version || 1) + 1}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
