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
  Download 
} from "lucide-react";
import { useDoctor } from "../../features/doctors";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

export function DoctorProfilePage() {
  const { id } = useParams();
  const { data, isLoading } = useDoctor(id);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
        <Link to="/admin/doctors" className="flex items-center gap-1 hover:text-navy-700 font-bold transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Doctors
        </Link>
        <span className="text-slate-300">|</span>
        <Link to="/admin" className="hover:text-navy-700 transition-colors">Dashboard</Link>
        <span className="text-slate-300">/</span>
        <Link to="/admin/doctors" className="hover:text-navy-700 transition-colors">Doctors</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-bold">{doctor.name}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {doctor.photoUrl ? (
            <img src={doctor.photoUrl} alt={doctor.name} className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-navy-100 text-xl font-semibold text-navy-700">
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

        <Card className="bg-navy-50">
          <div className="flex items-center gap-2 text-navy-700">
            <Users2 className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Patients Treated</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-navy-800">{stats.patientsTreated}</div>
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
            <History className="h-5 w-5 text-navy-700" />
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
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-navy-500"
              placeholder="Search by name or UHID..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-navy-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-navy-500"
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
                      ? "border-navy-200 bg-navy-50/10 shadow-sm" 
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  {/* Summary Bar */}
                  <div 
                    onClick={() => setExpandedPatientId(isExpanded ? null : patient._id)}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center font-bold text-xs">
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
                                      <span>{appointment.timeSlot}</span>
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
                                      <Stethoscope className="h-3.5 w-3.5 text-navy-700" /> Clinical Assessment
                                    </h5>
                                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
                                      <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Chief Complaint</span>
                                        <span className="text-slate-800 font-semibold">{prescription?.chiefComplaint || "No complaint specified"}</span>
                                      </div>
                                      <div className="border-t border-slate-100 pt-1.5 mt-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Diagnosis</span>
                                        <span className="text-slate-800 font-bold text-navy-800">{prescription?.diagnosis || "No diagnosis logged"}</span>
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
                                      <FlaskConical className="h-3.5 w-3.5 text-navy-700" /> Ordered Investigations
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
                                    <Pill className="h-3.5 w-3.5 text-navy-700" /> Prescribed Medications
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
                                    <FileCheck2 className="h-3.5 w-3.5 text-navy-700" /> Completed Diagnostic Reports
                                  </h5>
                                  {reports.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {reports.map((report: any) => (
                                        <div key={report._id} className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col justify-between gap-3">
                                          <div>
                                            <div className="flex justify-between items-start">
                                              <span className="font-bold text-slate-800 text-xs">{report.testName}</span>
                                              <Badge tone="success">{report.status.replace("_", " ")}</Badge>
                                            </div>
                                            <p className="text-[9px] text-slate-400 mt-0.5">
                                              Uploaded: {new Date(report.uploadedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                            </p>
                                            {report.observations && (
                                              <p className="mt-2 text-slate-700 text-[11px] leading-relaxed">
                                                <strong className="text-[9px] font-bold text-slate-400 uppercase block">Observations</strong>
                                                {report.observations}
                                              </p>
                                            )}
                                            {report.remarks && (
                                              <p className="mt-1 text-slate-500 text-[10px] italic">
                                                Remarks: {report.remarks}
                                              </p>
                                            )}
                                          </div>

                                          {report.files && report.files.length > 0 && (
                                            <div className="border-t border-slate-100 pt-2 flex flex-wrap gap-1.5">
                                              {report.files.map((file: any, fIdx: number) => (
                                                <a 
                                                  key={fIdx}
                                                  href={file.secure_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 hover:border-navy-500 hover:text-navy-700 rounded px-2 py-0.5 text-[9px] font-bold shadow-sm transition-colors"
                                                >
                                                  <Download className="h-2.5 w-2.5" />
                                                  {file.original_filename || `File_${fIdx + 1}`}
                                                </a>
                                              ))}
                                            </div>
                                          )}
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
    </div>
  );
}
