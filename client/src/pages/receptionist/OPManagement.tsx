import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Search, Plus, List, ClipboardList, CheckCircle, Filter } from "lucide-react";
import {
  usePatientsSearch,
  useDoctorsAvailability,
  useBookAppointment,
  useReceptionQueue,
  useOPHistory,
  useBookedSlots
} from "../../features/receptionist";
import { useDepartments } from "../../features/departments";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { generateTimeSlots, isSlotBooked, formatSlot12Hour } from "../../lib/slotUtils";
import { Clock } from "lucide-react";
import { formatINR } from "../../lib/currency";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Props {
  activeTab?: "new" | "queue" | "history";
}

export function OPManagementPage({ activeTab = "queue" }: Props) {
  const [tab, setTab] = useState<"new" | "queue" | "history">(activeTab);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";
  const [queueFilter, setQueueFilter] = useState<string>(initialFilter);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const f = searchParams.get("filter");
    if (f) setQueueFilter(f);
  }, [searchParams]);

  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [visitType, setVisitType] = useState<"Walk-in" | "Appointment" | "Emergency">("Walk-in");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const navigate = useNavigate();

  const { data: searchPatients } = usePatientsSearch(patientQuery);
  const { data: doctors } = useDoctorsAvailability();
  const { data: departmentsResponse } = useDepartments();
  const { data: queueTokens, isLoading: queueLoading } = useReceptionQueue();
  const { data: historyData, isLoading: historyLoading } = useOPHistory({ page: historyPage, limit: 10 });
  const { data: bookedSlotsData } = useBookedSlots(selectedDocId, visitDate);
  const bookMutation = useBookAppointment();

  const departments = departmentsResponse || [];
  const bookedSlots: string[] = Array.isArray(bookedSlotsData) ? bookedSlotsData : [];
  const selectedDoctorObj = doctors?.find((d: any) => d._id === selectedDocId);
  const availableTimeSlots = selectedDocId ? generateTimeSlots(selectedDoctorObj, visitDate) : [];

  const handleCreateOPVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDocId || !selectedDeptId) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const timeToUse = selectedTimeSlot || new Date().toLocaleTimeString("en-US", { hour12: false }).substring(0, 5);
      // Booking a Walk-in appointment automatically generates the OP visit and invoice!
      const result = await bookMutation.mutateAsync({
        patientId: selectedPatientId,
        doctorId: selectedDocId,
        departmentId: selectedDeptId,
        date: visitDate,
        time: timeToUse,
        type: visitType,
        notes
      });
      toast.success(`Walk-In OP Visit Registered! Invoice Generated: ${formatINR(result.invoice.totals.total)}`);
      setSelectedPatientId("");
      setSelectedDeptId("");
      setSelectedDocId("");
      setPatientQuery("");
      setNotes("");
      setSelectedTimeSlot("");
      setVisitDate(new Date().toISOString().split("T")[0]);
      setVisitType("Walk-in");
      // Redirect to billing Consultation
      navigate(`/receptionist/billing/consultation?invoiceId=${result.invoice._id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create OP visit");
    }
  };

  const queueColumns = [
    {
      header: "Token",
      render: (row: any) => <span className="font-mono text-xs font-semibold text-slate-800">{row.tokenNumber}</span>
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.patient?.uhid}</div>
        </div>
      )
    },
    {
      header: "Doctor / Specialization",
      render: (row: any) => (
        <div>
          <div className="font-medium text-slate-900">{row.doctor?.name}</div>
          <div className="text-[10px] text-slate-450">{row.doctor?.specialization}</div>
        </div>
      )
    },
    {
      header: "Status",
      render: (row: any) => {
        const colors: Record<string, string> = {
          waiting: "bg-amber-50 text-amber-700 border-amber-200",
          called: "bg-indigo-50 text-indigo-700 border-indigo-200",
          completed: "bg-green-50 text-green-700 border-green-200",
          skipped: "bg-rose-50 text-rose-700 border-rose-200"
        };
        return (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors[row.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
            {row.status}
          </span>
        );
      }
    }
  ];

  const historyColumns = [
    {
      header: "Visit Date",
      render: (row: any) => <span className="text-xs text-slate-600">{new Date(row.visitDate).toLocaleDateString()}</span>
    },
    {
      header: "Patient (UHID)",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.patient?.uhid}</div>
        </div>
      )
    },
    {
      header: "Doctor",
      render: (row: any) => <span className="text-xs font-medium text-slate-800">{row.doctor?.name}</span>
    },
    {
      header: "Department",
      render: (row: any) => <span className="text-xs">{row.department?.name}</span>
    },
    {
      header: "Diagnosis / Clinical Notes",
      render: (row: any) => (
        <span className="block max-w-xs truncate text-xs text-slate-600" title={row.clinicalNotes}>
          {row.clinicalNotes || "No notes"}
        </span>
      )
    },
    {
      header: "Outcome Status",
      render: (row: any) => (
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          row.status === "referred_ip" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
        }`}>
          {row.status === "referred_ip" ? "Admit Refer" : "Discharged"}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Outpatient (OP) Desk</h1>
        <p className="text-sm text-slate-500">Register new outpatient consultations and browse consultation queues.</p>
      </div>

      {/* Tabs Navigation Row */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 max-w-max">
        <button
          onClick={() => setTab("queue")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            tab === "queue" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <List className="h-3.5 w-3.5" /> Active Queue
        </button>
        <button
          onClick={() => setTab("new")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            tab === "new" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Plus className="h-3.5 w-3.5" /> Register OP Visit
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            tab === "history" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" /> OP Visit History
        </button>
      </div>

      {/* Active Queue Tab */}
      {tab === "queue" && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Today's Outpatient Line</h2>
              <p className="text-xs text-slate-500 font-medium">Real-time status tracking for checked-in and waiting patients.</p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              {[
                { id: "all", label: "All Queue" },
                { id: "waiting", label: "Waiting" },
                { id: "walkin", label: "Walk-Ins" },
                { id: "checkedin", label: "Checked-In" },
                { id: "consulting", label: "In Consultation" },
                { id: "completed", label: "Completed" },
                { id: "missed", label: "Missed/Skipped" }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setQueueFilter(f.id);
                    setSearchParams({ filter: f.id });
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all shrink-0 ${
                    queueFilter === f.id
                      ? "bg-navy-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {queueLoading ? (
            <div className="py-8 text-center text-slate-400">Loading OP Queue...</div>
          ) : (
            <DataTable
              columns={queueColumns}
              rows={(queueTokens || []).filter((item: any) => {
                if (queueFilter === "all") return true;
                if (queueFilter === "waiting") return item.status === "waiting";
                if (queueFilter === "walkin") {
                  const apptType = item.appointment?.type;
                  return item.status === "waiting" && (apptType === "Walk-in" || apptType === "Walk-in Visit" || item.type === "walk-in" || !item.appointment);
                }
                if (queueFilter === "checkedin" || queueFilter === "checked_in") return item.status === "waiting" || item.status === "called" || item.status === "completed";
                if (queueFilter === "consulting") return item.status === "called";
                if (queueFilter === "completed") return item.status === "completed";
                if (queueFilter === "missed") return item.status === "skipped" || item.status === "no_show" || item.status === "missed";
                return true;
              })}
              rowKey={(row) => row._id}
            />
          )}
        </Card>
      )}

      {/* OP History Tab */}
      {tab === "history" && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-800">Consultation History Log</h2>
          {historyLoading ? (
            <div className="py-8 text-center text-slate-400">Loading history...</div>
          ) : (
            <div className="space-y-4">
              <DataTable columns={historyColumns} rows={historyData?.data || []} rowKey={(row) => row._id} />
              {historyData?.pagination && historyData.pagination.totalPages > 1 && (
                <div className="mt-4 flex justify-end">
                  <Pagination
                    page={historyPage}
                    totalPages={historyData.pagination.totalPages}
                    onPageChange={setHistoryPage}
                  />
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Register New Walk-in OP Form */}
      {tab === "new" && (
        <form onSubmit={handleCreateOPVisit} className="max-w-2xl space-y-6">
          <Card className="space-y-4">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Plus className="h-4.5 w-4.5" /> Create Walk-in Visit
            </h3>

            {/* Patient Search */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Patient Search *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type to search patients by UHID or Name..."
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                />
              </div>

              {searchPatients && searchPatients.length > 0 && (
                <div className="mt-2 rounded-lg border border-slate-150 divide-y divide-slate-100 max-h-36 overflow-y-auto">
                  {searchPatients.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(p._id);
                        setPatientQuery(`${p.name} (${p.uhid})`);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                        selectedPatientId === p._id ? "bg-navy-50 font-semibold" : ""
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        <div className="text-slate-450 font-mono text-[10px]">{p.uhid}</div>
                      </div>
                      {selectedPatientId === p._id && <span className="text-[10px] bg-navy-600 text-white rounded px-1.5 py-0.5">Selected</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Department Name *"
                required
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setSelectedDocId("");
                  setSelectedTimeSlot("");
                }}
              >
                <option value="">Select Department</option>
                {departments.map((dept: any) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </SelectField>

              <SelectField
                label="Attending Doctor *"
                required
                value={selectedDocId}
                onChange={(e) => {
                  setSelectedDocId(e.target.value);
                  setSelectedTimeSlot("");
                }}
              >
                <option value="">Select Doctor</option>
                {doctors
                  ?.filter((d: any) => !selectedDeptId || (d.department?._id === selectedDeptId || d.department === selectedDeptId))
                  .map((doc: any) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.name}
                    </option>
                  ))}
              </SelectField>
            </div>
          </Card>

          {/* Schedule Slot Details Card */}
          <Card className="space-y-4">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-navy-600" /> Schedule slot details
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField
                label="Appointment Date *"
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                value={visitDate}
                onChange={(e) => {
                  setVisitDate(e.target.value);
                  setSelectedTimeSlot("");
                }}
              />

              <SelectField
                label="Appointment Type *"
                required
                value={visitType}
                onChange={(e: any) => setVisitType(e.target.value)}
              >
                <option value="Walk-in">Walk-in</option>
                <option value="Appointment">Appointment</option>
                <option value="Emergency">Emergency</option>
              </SelectField>
            </div>

            {/* Available Time Slots Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Available Time Slots *
              </label>
              {!selectedDocId ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">
                  Please select a doctor to load available times.
                </div>
              ) : availableTimeSlots.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">
                  No slots available for this doctor on the selected date.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                  {availableTimeSlots.map((slot) => {
                    const booked = isSlotBooked(slot, bookedSlots);
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={booked}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs font-semibold shadow-xs transition-all focus:outline-none ${
                          booked
                            ? "border-rose-100 bg-rose-50 text-rose-450 line-through cursor-not-allowed opacity-60"
                            : isSelected
                            ? "border-navy-600 bg-navy-600 text-white ring-2 ring-navy-100"
                            : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 active:scale-95"
                        }`}
                      >
                        <span>{formatSlot12Hour(slot)}</span>
                        {booked && <span className="text-[8px] font-bold tracking-tight mt-0.5 opacity-80">Booked</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <TextareaField
              label="Reason for Visit / Chief Complaints"
              placeholder="e.g. Fever, Headache, Routine Checkup..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" onClick={() => setTab("queue")} variant="secondary">
              Cancel
            </Button>
            <Button type="submit">
              Register & Process Consultation Bill
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
