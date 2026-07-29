import { useState } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  Calendar,
  Pill,
  FileText,
  Wallet,
  Heart,
  TrendingUp,
  User,
  MapPin,
  Clock,
  ArrowRight,
  Download,
  AlertCircle,
  Plus
} from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";
import { usePatientProfileMe, usePatientInvoices, usePatientReports } from "../../features/patients";
import { useAppointments, useCreateAppointment } from "../../features/appointments";
import { useDoctors } from "../../features/doctors";

export function PatientDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "appointments" | "prescriptions" | "reports" | "billing">("overview");
  
  // Modal states
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Fetch real data
  const { data: patient, isLoading: isPatientLoading } = usePatientProfileMe();
  const { data: apptResponse, isLoading: isApptsLoading } = useAppointments({ limit: 100 });
  const { data: invoices, isLoading: isInvoicesLoading } = usePatientInvoices();
  const { data: reports, isLoading: isReportsLoading } = usePatientReports();
  const { data: doctorsRes } = useDoctors({});

  const createAppointmentMutation = useCreateAppointment();

  const doctors = doctorsRes?.data || [];
  const appointments = apptResponse?.data || [];

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !bookingDate || !bookingTime) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const selectedDoctor = doctors.find((doc: any) => doc._id === selectedDoctorId);
      await createAppointmentMutation.mutateAsync({
        patient: patient?._id,
        doctor: selectedDoctorId,
        department: typeof selectedDoctor?.department === "object" && selectedDoctor?.department ? (selectedDoctor.department as any)._id : selectedDoctor?.department,
        date: bookingDate,
        time: bookingTime,
        type: "Consultation",
        status: "scheduled",
        notes: bookingNotes
      });

      toast.success("Appointment requested successfully!");
      setIsBookModalOpen(false);
      setSelectedDoctorId("");
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment.");
    }
  };

  const isLoading = isPatientLoading || isApptsLoading || isInvoicesLoading || isReportsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  // Derived metrics
  const activePrescriptionsCount = patient?.medicalHistory?.length || 0;
  const pendingInvoices = invoices?.filter((inv) => inv.status === "pending" || inv.status === "partially_paid") || [];
  const totalBalance = pendingInvoices.reduce((sum, inv) => sum + (inv.totals?.patientBalance || 0), 0);
  const nextAppointment = appointments.find((a) => a.status === "scheduled");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {patient?.name ?? user?.name} 👋</h1>
          <p className="text-sm text-slate-500">UHID: {patient?.uhid || "Not Assigned"} · Access your healthcare logs</p>
        </div>
        <button
          onClick={() => setIsBookModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Book Appointment
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Upcoming Consultations"
          value={appointments.filter((a) => a.status === "scheduled").length}
          icon={<Calendar className="h-5 w-5 text-indigo-500" />}
          emphasis
        />
        <KpiCard
          label="Medical Encounters"
          value={patient?.medicalHistory?.length || 0}
          icon={<Heart className="h-5 w-5 text-rose-500" />}
        />
        <KpiCard
          label="Diagnostic Reports"
          value={reports?.length || 0}
          icon={<FileText className="h-5 w-5 text-blue-500" />}
        />
        <KpiCard
          label="Outstanding Balance"
          value={`₹${totalBalance.toLocaleString("en-IN")}`}
          icon={<Wallet className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-lg p-1 shadow-sm">
        {(["overview", "appointments", "prescriptions", "reports", "billing"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
              activeTab === tab
                ? "bg-navy-700 text-white shadow"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Profile Summary */}
            <Card className="p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-100 text-2xl font-bold text-navy-700">
                  {patient?.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-bold text-slate-800">{patient?.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                    <p><span className="font-semibold text-slate-700">Gender:</span> {patient?.gender || "—"}</p>
                    <p><span className="font-semibold text-slate-700">Age:</span> {patient?.age || "—"}</p>
                    <p><span className="font-semibold text-slate-700">Blood Group:</span> {patient?.bloodGroup || "—"}</p>
                    <p><span className="font-semibold text-slate-700">Insurance:</span> {patient?.insuranceProvider || "None"}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Vital Signs (Latest) */}
            <Card className="p-6">
              <h3 className="mb-4 text-base font-bold text-slate-800">Your Latest Vital Signs</h3>
              {appointments.find(a => a.vitals)?.vitals ? (
                (() => {
                  const v = appointments.find(a => a.vitals)!.vitals!;
                  return (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 flex items-center gap-3">
                        <Activity className="h-8 w-8 text-rose-500" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Blood Pressure</p>
                          <p className="text-lg font-bold text-slate-800">{v.bloodPressure || "—"}</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 flex items-center gap-3">
                        <Heart className="h-8 w-8 text-indigo-500" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Pulse Rate</p>
                          <p className="text-lg font-bold text-slate-800">{v.pulseRate ? `${v.pulseRate} bpm` : "—"}</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-amber-500" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Oxygen Saturation</p>
                          <p className="text-lg font-bold text-slate-800">{v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-450">
                  <AlertCircle className="h-6 w-6 mb-1 text-slate-400" />
                  <p className="text-xs font-semibold">No vitals data recorded yet</p>
                </div>
              )}
            </Card>

            {/* Upcoming Appointments preview */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-800">Next Scheduled Appointment</h3>
                {nextAppointment && (
                  <button onClick={() => setActiveTab("appointments")} className="text-xs font-semibold text-navy-700 flex items-center gap-1 hover:underline">
                    View All <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              {nextAppointment ? (
                <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {typeof nextAppointment.doctor === "object" ? (nextAppointment.doctor as any).name : nextAppointment.doctor}
                      </p>
                      <p className="text-xs text-slate-500">
                        {typeof nextAppointment.department === "object" && nextAppointment.department ? (nextAppointment.department as any).name : "General"} · {nextAppointment.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-700">
                      {new Date(nextAppointment.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </p>
                    <Badge tone="info">Scheduled</Badge>
                  </div>
                </div>
              ) : (
                <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-450">
                  <Calendar className="h-6 w-6 mb-1 text-slate-400" />
                  <p className="text-xs font-semibold">No upcoming appointments</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel: Medical Timeline */}
          <Card className="p-6 h-fit">
            <h3 className="mb-4 text-base font-bold text-slate-800">Medical History Timeline</h3>
            {patient?.medicalHistory && patient.medicalHistory.length > 0 ? (
              <div className="relative border-l border-slate-200 pl-4 space-y-6">
                {patient.medicalHistory.slice(0, 4).map((entry, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-navy-600" />
                    <p className="text-[10px] font-bold text-navy-600">{new Date(entry.date).toLocaleDateString("en-IN")}</p>
                    <h4 className="text-xs font-bold text-slate-800">{entry.visitType || "OPD Consultation"}</h4>
                    <p className="text-xs font-medium text-slate-600">Diagnosis: {entry.diagnosis || "Regular Consultation"}</p>
                    <p className="text-[10px] text-slate-400">Dr. {entry.doctorName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No clinical history recorded.</p>
            )}
          </Card>
        </div>
      )}

      {/* 2. APPOINTMENTS TAB */}
      {activeTab === "appointments" && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-800">Appointment Records</h3>
            <button
              onClick={() => setIsBookModalOpen(true)}
              className="flex items-center gap-1 rounded bg-navy-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
            >
              <Plus className="h-3 w-3" /> Book New
            </button>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No appointment records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Reference ID</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {appointments.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5 font-bold text-navy-700">{a.referenceId || "—"}</td>
                      <td className="px-4 py-3.5">
                        {typeof a.doctor === "object" ? (a.doctor as any).name : a.doctor}
                      </td>
                      <td className="px-4 py-3.5">{new Date(a.date).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3.5">{a.time}</td>
                      <td className="px-4 py-3.5">{a.type}</td>
                      <td className="px-4 py-3.5">
                        <Badge
                          tone={
                            a.status === "completed"
                              ? "success"
                              : a.status === "scheduled"
                              ? "info"
                              : a.status === "cancelled"
                              ? "danger"
                              : "neutral"
                          }
                        >
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 3. PRESCRIPTIONS TAB */}
      {activeTab === "prescriptions" && (
        <Card className="p-6">
          <h3 className="mb-4 text-base font-bold text-slate-800">Your Active & Past Prescriptions</h3>
          {patient?.medicalHistory && patient.medicalHistory.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {patient.medicalHistory.map((entry, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Prescription Details</h4>
                        <p className="text-[10px] text-slate-400">{new Date(entry.date).toLocaleDateString("en-IN")}</p>
                      </div>
                      <Badge tone="success">Active</Badge>
                    </div>
                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                      <p><span className="text-slate-450">Prescribed By:</span> Dr. {entry.doctorName}</p>
                      <p><span className="text-slate-450">Department:</span> {entry.department || "General OPD"}</p>
                      <p><span className="text-slate-450">Diagnosis:</span> {entry.diagnosis || "No diagnosis logged"}</p>
                      {entry.notes && (
                        <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] font-medium border border-slate-100 text-slate-500">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3 flex justify-end">
                    <button
                      onClick={() => toast.success("PDF Prescription Download Initiated")}
                      className="flex items-center gap-1 text-xs font-bold text-navy-700 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" /> Download RX PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">No prescriptions found.</p>
          )}
        </Card>
      )}

      {/* 4. REPORTS TAB */}
      {activeTab === "reports" && (
        <Card className="p-6">
          <h3 className="mb-4 text-base font-bold text-slate-800">Diagnostic & Lab Reports</h3>
          {!reports || reports.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No diagnostic reports uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {reports.map((rep) => (
                <div
                  key={rep._id}
                  onClick={() => setSelectedReport(rep)}
                  className="group rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-100 text-navy-700 mb-4 group-hover:bg-navy-700 group-hover:text-white transition-all">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">{rep.testName || "Investigation Study"}</h4>
                    <p className="text-[10px] text-slate-400">{new Date(rep.uploadedAt || rep.createdAt).toLocaleDateString("en-IN")}</p>
                    <p className="mt-2 text-xs text-slate-500 font-semibold truncate">Doctor: {rep.doctor?.name || "Lab Desk"}</p>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                    <Badge tone="success">Verified</Badge>
                    <span className="font-bold text-navy-700 hover:underline">View Results</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 5. BILLING TAB */}
      {activeTab === "billing" && (
        <Card className="p-6">
          <h3 className="mb-4 text-base font-bold text-slate-800">Invoices & Financial Ledger</h3>
          {!invoices || invoices.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No invoices or billing records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Invoice ID</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Ins. Coverage</th>
                    <th className="px-4 py-3">Your Balance</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{inv._id.slice(-6).toUpperCase()}</td>
                      <td className="px-4 py-3.5">{inv.billingType}</td>
                      <td className="px-4 py-3.5">₹{inv.totals?.total}</td>
                      <td className="px-4 py-3.5">{inv.insuranceCoveragePercent}%</td>
                      <td className="px-4 py-3.5 font-bold text-amber-600">₹{inv.totals?.patientBalance}</td>
                      <td className="px-4 py-3.5">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "N/A"}</td>
                      <td className="px-4 py-3.5">
                        <Badge
                          tone={
                            inv.status === "paid"
                              ? "success"
                              : inv.status === "pending"
                              ? "warning"
                              : inv.status === "overdue"
                              ? "danger"
                              : "info"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* DIALOG 1: BOOK APPOINTMENT MODAL */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Request Consultation</h3>
            <form onSubmit={handleBookAppointment} className="space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <label className="block mb-1">Select Specialist Doctor *</label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:border-navy-500 font-medium text-sm"
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map((doc: any) => (
                    <option key={doc._id} value={doc._id}>
                      Dr. {doc.name} ({doc.specialization})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Preferred Date *</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:border-navy-500 font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-1">Preferred Time *</label>
                  <input
                    type="time"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:border-navy-500 font-medium text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1">Chief Complaint / Notes</label>
                <textarea
                  rows={3}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Tell us why you want this appointment..."
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:border-navy-500 font-medium text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t text-xs">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="rounded px-4 py-2 border hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-navy-700 px-4 py-2 text-white hover:bg-navy-800"
                >
                  Book Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 2: VIEW REPORT MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedReport.testName}</h3>
                <p className="text-xs text-slate-400">Date: {new Date(selectedReport.uploadedAt || selectedReport.createdAt).toLocaleString("en-IN")}</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-xs font-semibold text-slate-600 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <p><span className="text-slate-450">Prescribing Doctor:</span> Dr. {selectedReport.doctor?.name || "Lab Desk"}</p>
                <p><span className="text-slate-450">Department:</span> Laboratory</p>
              </div>
              {selectedReport.notes && (
                <div>
                  <p className="text-slate-450 mb-1">Diagnostic Interpretation & Notes:</p>
                  <div className="rounded-lg bg-slate-50 border p-3 font-medium text-slate-600">
                    {selectedReport.notes}
                  </div>
                </div>
              )}
              {selectedReport.files && selectedReport.files.length > 0 && (
                <div>
                  <p className="text-slate-450 mb-2">Attached Reports:</p>
                  {selectedReport.files.map((file: any, idx: number) => (
                    <a
                      key={idx}
                      href={file.secure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between border rounded-lg p-3 hover:bg-slate-50 text-navy-700"
                    >
                      <span className="font-bold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        Report File #{idx + 1}
                      </span>
                      <Download className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t text-xs mt-6">
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded bg-navy-700 px-4 py-2 text-white hover:bg-navy-800"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PatientDashboard;
