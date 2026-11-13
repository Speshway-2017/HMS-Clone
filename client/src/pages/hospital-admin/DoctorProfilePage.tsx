import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  BarChart3, 
  Star, 
  MapPin, 
  Users2, 
  ArrowLeft, 
  ChevronDown, 
  History, 
  Calendar, 
  Clock, 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  FileCheck2, 
  Download,
  Eye,
  X
} from "lucide-react";
import { useDoctor } from "../../features/doctors";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

const safeString = (val: any, fallback: string = ""): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (typeof val.name === "string") return val.name;
    if (typeof val.testName === "string") return val.testName;
  }
  return fallback;
};

export function DoctorProfilePage() {
  const { id } = useParams();
  const { data, isLoading } = useDoctor(id);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  if (isLoading || !data) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const { doctor, stats, patients = [] } = data;
  const departmentName = typeof doctor.department === "object" && doctor.department ? doctor.department.name : "Unassigned";

  // Filter patients and history based on client-side state
  const filteredPatients = patients.map((group: any) => {
    const nameMatch = group.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const uhidMatch = group.patient?.uhid?.toLowerCase().includes(searchTerm.toLowerCase());
    if (searchTerm && !nameMatch && !uhidMatch) return null;

    const filteredHistory = group.history.filter((h: any) => {
      const visitTime = new Date(h.appointment.date).getTime();

      if (startDate) {
        const startDay = new Date(startDate);
        startDay.setHours(0, 0, 0, 0);
        if (visitTime < startDay.getTime()) return false;
      }

      if (endDate) {
        const endDay = new Date(endDate);
        endDay.setHours(23, 59, 59, 999);
        if (visitTime > endDay.getTime()) return false;
      }

      return true;
    });

    if ((startDate || endDate) && filteredHistory.length === 0) return null;

    return {
      ...group,
      history: filteredHistory
    };
  }).filter(Boolean) as any[];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs / Back navigation */}
      <nav className="flex items-center gap-2.5 text-xs font-semibold text-slate-500">
        <Link to="/admin/doctors" className="flex items-center gap-1 hover:text-emerald-700 font-bold transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Doctors
        </Link>
        <span className="text-slate-300">|</span>
        <Link to="/admin" className="hover:text-emerald-700 transition-colors">Dashboard</Link>
        <span className="text-slate-300">/</span>
        <Link to="/admin/doctors" className="hover:text-emerald-700 transition-colors">Doctors</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-bold">{doctor.name}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {doctor.photoUrl ? (
            <img src={doctor.photoUrl} alt={doctor.name} className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-semibold text-emerald-700">
              {doctor.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{doctor.name}</h1>
            <p className="text-sm text-slate-500">
              {doctor.specialization || "General Practice"} • {departmentName}
            </p>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-amber-500" /> {doctor.rating}
              </span>
              <Badge tone={doctor.status === "on_duty" ? "success" : "neutral"}>{doctor.status.replace("_", " ")}</Badge>
            </div>
          </div>
        </div>
        <Link to={`/admin/doctors/${id}/performance`}>
          <Button variant="secondary">
            <BarChart3 className="h-4 w-4" /> Performance
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-2 text-base font-semibold text-slate-800">Professional Biography</h3>
          <p className="text-sm text-slate-600">{doctor.bio || "No biography on file."}</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Qualification</h4>
              <p className="text-sm text-slate-600">{doctor.qualification || "Not specified"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">License</h4>
              <p className="text-sm text-slate-600">{doctor.licenseNo || "Not specified"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">OP Expiry Limit</h4>
              <p className="text-sm text-slate-600">{doctor.opExpiryLimit !== undefined ? `${doctor.opExpiryLimit} Days` : "10 Days (Default)"}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-emerald-50">
          <div className="flex items-center gap-2 text-emerald-700">
            <Users2 className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Patients Treated</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-800">{stats.patientsTreated}</div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4" /> {doctor.email || "No email on file"}
          </div>
          <div className="mt-1 text-sm text-slate-500">{doctor.phone || "No phone on file"}</div>
        </Card>
      </div>

      {/* Patient Consultation History */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-3 mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-700" />
            Patient Consultation History
          </h3>
          
          <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            {filteredPatients.length} {filteredPatients.length === 1 ? "Patient" : "Patients"} Listed
          </span>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Search Patient</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
              placeholder="Search by name or UHID..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
            />
          </div>
          {(searchTerm || startDate || endDate) && (
            <div className="sm:col-span-4 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1 focus:outline-none"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              {searchTerm || startDate || endDate 
                ? "No clinical visits or consultations match your active filters." 
                : "No clinical visits or consultations recorded for this practitioner yet."}
            </div>
          ) : (
            filteredPatients.map((group: any) => {
              const { patient, history = [] } = group;
              const isExpanded = expandedPatientId === patient._id;

              return (
                <div 
                  key={patient._id} 
                  className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                    isExpanded 
                      ? "border-emerald-200 bg-emerald-50/10 shadow-sm" 
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  {/* Summary Bar */}
                  <div 
                    onClick={() => setExpandedPatientId(isExpanded ? null : patient._id)}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        {patient.name ? patient.name.slice(0, 2).toUpperCase() : "PA"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm">
                            {patient.name || "Unknown Patient"}
                          </h4>
                          <span className="font-mono text-[9px] font-bold bg-slate-100 border border-slate-200 text-slate-500 rounded px-1.5 py-0.5">
                            {patient.uhid || "N/A"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {patient.age ? `${patient.age} Y` : ""} {patient.gender ? `• ${patient.gender}` : ""} {patient.phone ? `• ${patient.phone}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-slate-400 text-xs">
                        {history.length} {history.length === 1 ? "Consultation" : "Consultations"}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-150 p-5 bg-white space-y-6 text-xs text-slate-750 font-medium">
                      
                      {/* Nested Visit History */}
                      <div className="space-y-4 border-l-2 border-slate-200 pl-4 ml-2">
                        {history.map((h: any, hIdx: number) => {
                          const { appointment, prescription, reports = [] } = h;
                          return (
                            <div key={appointment._id} className="relative space-y-4">
                              {/* Timeline indicator node */}
                              <div className="absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-navy-600 shadow-sm" />
                              
                              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-4">
                                {/* Visit Header details */}
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-200 pb-3 gap-2">
                                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4 text-slate-400" />
                                      <span className="font-bold text-slate-800">
                                        {new Date(appointment.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4 text-slate-400" />
                                      <span>{appointment.time || appointment.timeSlot}</span>
                                    </div>
                                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                                      {appointment.type || "OPD Consultation"}
                                    </span>
                                  </div>
                                  <Badge tone={
                                    appointment.status === "completed" ? "success" : 
                                    appointment.status === "cancelled" ? "danger" : "warning"
                                  }>
                                    {appointment.status}
                                  </Badge>
                                </div>

                                {/* Clinical Assessment & Ordered Investigations */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Assessment details */}
                                  <div className="space-y-2">
                                    <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                      <Stethoscope className="h-3.5 w-3.5 text-emerald-700" /> Clinical Assessment
                                    </h5>
                                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
                                      <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Chief Complaint</span>
                                        <span className="text-slate-800 font-semibold">{prescription?.chiefComplaint || "No complaint specified"}</span>
                                      </div>
                                      <div className="border-t border-slate-100 pt-1.5 mt-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Diagnosis</span>
                                        <span className="text-slate-800 font-bold text-emerald-800">{prescription?.diagnosis || "No diagnosis logged"}</span>
                                      </div>
                                      <div className="border-t border-slate-100 pt-1.5 mt-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Clinical Notes</span>
                                        <span className="text-slate-600 leading-relaxed">{prescription?.clinicalNotes || "No notes on file"}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Investigation details */}
                                  <div className="space-y-2">
                                    <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                      <FlaskConical className="h-3.5 w-3.5 text-emerald-700" /> Ordered Investigations
                                    </h5>
                                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-3">
                                      <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Laboratory Orders</span>
                                        {prescription?.labOrders && prescription.labOrders.length > 0 ? (
                                          <div className="flex flex-wrap gap-1.5">
                                            {prescription.labOrders.map((test: string, tIdx: number) => (
                                              <span key={tIdx} className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-700 font-semibold">{test}</span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400">None ordered</span>
                                        )}
                                      </div>
                                      <div className="border-t border-slate-100 pt-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Radiology Orders</span>
                                        {prescription?.radiologyOrders && prescription.radiologyOrders.length > 0 ? (
                                          <div className="flex flex-wrap gap-1.5">
                                            {prescription.radiologyOrders.map((test: string, tIdx: number) => (
                                              <span key={tIdx} className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-700 font-semibold">{test}</span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400">None ordered</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Medications Section */}
                                <div className="space-y-2">
                                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                    <Pill className="h-3.5 w-3.5 text-emerald-700" /> Prescribed Medications
                                  </h5>
                                  {prescription?.medications && prescription.medications.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                      <table className="min-w-full text-left border-collapse text-[11px]">
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200 text-[9px] text-slate-400 uppercase font-bold">
                                            <th className="px-3 py-2">Medication Name</th>
                                            <th className="px-3 py-2">Strength</th>
                                            <th className="px-3 py-2">Dosage</th>
                                            <th className="px-3 py-2">Frequency</th>
                                            <th className="px-3 py-2">Duration</th>
                                            <th className="px-3 py-2">Instructions</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                          {prescription.medications.map((med: any, mIdx: number) => (
                                            <tr key={mIdx}>
                                              <td className="px-3 py-2 font-bold text-slate-900">{med.name}</td>
                                              <td className="px-3 py-2 text-slate-600">{med.strength || "—"}</td>
                                              <td className="px-3 py-2 text-slate-600">{med.dosage || "—"}</td>
                                              <td className="px-3 py-2 text-slate-600">{med.frequency || "—"}</td>
                                              <td className="px-3 py-2 text-slate-600">{med.duration || "—"}</td>
                                              <td className="px-3 py-2 text-slate-500 italic">{med.instructions || "None"}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-slate-400 bg-white">
                                      No medications prescribed during this visit.
                                    </div>
                                  )}
                                </div>

                                {/* Diagnostic Reports Section */}
                                <div className="space-y-2">
                                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                    <FileCheck2 className="h-3.5 w-3.5 text-emerald-700" /> Completed Diagnostic Reports
                                  </h5>
                                  {reports.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {reports.map((report: any) => (
                                        <div key={report._id} className="border border-slate-200 rounded-lg p-3.5 bg-white flex flex-col justify-between gap-3 shadow-sm hover:border-indigo-200 transition-all">
                                          <div>
                                            <div className="flex justify-between items-start gap-2">
                                              <span className="font-extrabold text-slate-800 text-xs">{safeString(report.testName, "Diagnostic Report")}</span>
                                              <Badge tone="success">{safeString(report.status, "Verified").replace("_", " ")}</Badge>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                              Uploaded: {new Date(report.uploadedAt || report.createdAt || Date.now()).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                            </p>
                                            {report.observations && (
                                              <p className="mt-2 text-slate-700 text-[11px] leading-relaxed">
                                                <strong className="text-[9px] font-bold text-slate-400 uppercase block">Observations</strong>
                                                {safeString(report.observations)}
                                              </p>
                                            )}
                                            {report.remarks && (
                                              <p className="mt-1 text-slate-500 text-[10px] italic">
                                                Remarks: {safeString(report.remarks)}
                                              </p>
                                            )}
                                          </div>

                                          <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-2">
                                            <button
                                              onClick={() => setSelectedReport(report)}
                                              className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-extrabold transition-all cursor-pointer active:scale-95 shadow-sm"
                                            >
                                              <Eye className="h-3.5 w-3.5 text-emerald-700" /> View Report
                                            </button>
                                            {report.files && report.files.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {report.files.map((file: any, fIdx: number) => (
                                                  <a 
                                                    key={fIdx}
                                                    href={file.secure_url || file.url || file}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 rounded-lg px-2 py-1 text-[10px] font-bold shadow-sm transition-colors"
                                                  >
                                                    <Download className="h-3 w-3" />
                                                    {file.original_filename || `Download`}
                                                  </a>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-slate-400 bg-white">
                                      No diagnostic reports uploaded yet for this visit.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Diagnostic Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {safeString(selectedReport.testName, "Diagnostic Report")}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {safeString(selectedReport.requestType || selectedReport.category, "Diagnostic Investigation")} · Uploaded: {new Date(selectedReport.uploadedAt || selectedReport.createdAt || Date.now()).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="success">
                  {selectedReport.status === "report_uploaded" ? "Verified" : safeString(selectedReport.status, "Verified").toUpperCase()}
                </Badge>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Clinical Observations Section */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Stethoscope className="h-4 w-4 text-indigo-600" /> Radiologist / Pathologist Impression
                </span>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap pt-1">
                  {safeString(selectedReport.observations, "No specific clinical observations logged for this diagnostic investigation.")}
                </p>
              </div>

              {selectedReport.remarks && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-1">
                  <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">Technical Remarks & Doctor Advice</span>
                  <p className="text-xs font-medium text-amber-900 italic whitespace-pre-wrap pt-0.5">
                    {safeString(selectedReport.remarks)}
                  </p>
                </div>
              )}

              {/* Attached Files & Image Preview Canvas */}
              {selectedReport.files && selectedReport.files.length > 0 && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Attached Report Documents & Imaging ({selectedReport.files.length})
                  </h4>

                  <div className="space-y-3">
                    {selectedReport.files.map((file: any, index: number) => {
                      const fileUrl = typeof file === "string" ? file : (file.secure_url || file.url);
                      const fileName = typeof file === "object" ? (file.original_filename || `Attachment_${index + 1}`) : `Attachment_${index + 1}`;
                      const isImage = typeof fileUrl === "string" && (fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) || fileUrl.includes("/image/upload/"));

                      return (
                        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-800 truncate max-w-xs">{fileName}</span>
                            <div className="flex items-center gap-2">
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
                              >
                                <Eye className="h-3.5 w-3.5" /> Open Full Screen
                              </a>
                              <a
                                href={fileUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all"
                              >
                                <Download className="h-3.5 w-3.5" /> Download
                              </a>
                            </div>
                          </div>

                          {isImage && (
                            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 max-h-80 flex items-center justify-center shadow-inner">
                              <img src={fileUrl} alt={fileName} className="max-h-76 object-contain rounded" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <p className="text-[11px] font-semibold text-slate-400">
                Official Digital Report Record • Hospital Admin Diagnostic Portal
              </p>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-extrabold text-white hover:bg-slate-900 transition-all cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
