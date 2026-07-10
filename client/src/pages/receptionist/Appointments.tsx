import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatINR } from "../../lib/currency";
import { Calendar, User, Search, Stethoscope, FolderHeart, Clock, Plus, List } from "lucide-react";
import {
  useBookAppointment,
  useReceptionQueue,
  useDoctorsAvailability,
  usePatientsSearch
} from "../../features/receptionist";
import { useDepartments } from "../../features/departments";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";

// Validation schema matching server controller expectations
const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  departmentId: z.string().min(1, "Department is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time slot is required"),
  type: z.enum(["Consultation", "Walk-in", "Emergency"]).default("Consultation"),
  notes: z.string().optional().default("")
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface Props {
  activeTab?: "new" | "today" | "calendar";
}

export function AppointmentsPage({ activeTab = "today" }: Props) {
  const [tab, setTab] = useState<"new" | "today" | "calendar">(activeTab);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const [patientQuery, setPatientQuery] = useState("");
  const navigate = useNavigate();

  // Queries & Mutations
  const bookMutation = useBookAppointment();
  const { data: doctors } = useDoctorsAvailability();
  const { data: departmentsResponse } = useDepartments();
  const { data: searchPatients } = usePatientsSearch(patientQuery);
  const { data: todayAppointments, isLoading: listLoading } = useReceptionQueue();

  const departments = departmentsResponse || [];

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      departmentId: "",
      date: new Date().toISOString().split("T")[0],
      time: "",
      type: "Consultation",
      notes: ""
    }
  });

  const selectedPatientId = watch("patientId");
  const selectedDeptId = watch("departmentId");

  // Available slots mockup logic
  const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
  const selectedDate = watch("date");

  const getFilteredSlots = () => {
    if (!selectedDate) return slots;
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate === todayStr) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      return slots.filter((slot) => {
        const [hourStr, minStr] = slot.split(":");
        const slotHour = parseInt(hourStr, 10);
        const slotMin = parseInt(minStr, 10);
        if (slotHour > currentHour) return true;
        if (slotHour === currentHour && slotMin > currentMin) return true;
        return false;
      });
    }
    return slots;
  };
  const filteredSlots = getFilteredSlots();

  const handleBook = async (data: any) => {
    try {
      const result = await bookMutation.mutateAsync(data);
      const total = result?.billing?.total ?? result?.invoice?.totals?.total ?? 0;
      const invoiceId = result?.invoice?._id;
      reset();
      setPatientQuery("");
      if (invoiceId) {
        navigate(`/receptionist/billing/consultation?invoiceId=${invoiceId}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to book appointment.";
      alert(msg);
    }
  };

  const columns = [
    {
      header: "Token #",
      render: (row: any) => <span className="font-mono text-xs font-semibold text-slate-800">{row.tokenNumber || "N/A"}</span>
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-medium text-slate-900">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.patient?.uhid}</div>
        </div>
      )
    },
    {
      header: "Doctor / Specialization",
      render: (row: any) => (
        <div>
          <div className="font-medium text-slate-900">{row.doctor?.name}</div>
          <div className="text-[10px] text-slate-400">{row.doctor?.specialization}</div>
        </div>
      )
    },
    {
      header: "Department",
      render: (row: any) => <span className="text-xs">{row.department?.name || "N/A"}</span>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Outpatient Bookings</h1>
          <p className="text-sm text-slate-500">Manage consultant appointment scheduling and queues.</p>
        </div>

        {/* Tab triggers */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setTab("today")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "today" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <List className="h-3.5 w-3.5" /> Today's Queue
          </button>
          <button
            onClick={() => setTab("new")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "new" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> Book Appointment
          </button>
          <button
            onClick={() => setTab("calendar")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "calendar" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> Calendar View
          </button>
        </div>
      </div>

      {/* Today's Queue list */}
      {tab === "today" && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-800">Today's Appointment Queue</h2>
          {listLoading ? (
            <div className="py-8 text-center text-slate-400">Loading appointments...</div>
          ) : (
            <DataTable columns={columns} rows={todayAppointments || []} rowKey={(row) => row._id} />
          )}
        </Card>
      )}

      {/* Booking Form */}
      {tab === "new" && (
        <form onSubmit={handleSubmit(handleBook)} className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left panel: Patient and Doctor Selector */}
          <div className="md:col-span-2 space-y-6">
            <Card className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="h-4.5 w-4.5" /> Patient Selection
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient by UHID, phone, or name..."
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                />
              </div>

              {searchPatients && searchPatients.length > 0 && (
                <div className="rounded-lg border border-slate-150 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {searchPatients.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => {
                        setValue("patientId", p._id);
                        setPatientQuery(`${p.name} (${p.uhid})`);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                        selectedPatientId === p._id ? "bg-navy-50 font-semibold" : ""
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        <div className="text-slate-450 font-mono text-[10px]">{p.uhid} — {p.phone}</div>
                      </div>
                      {selectedPatientId === p._id && <span className="text-[10px] bg-navy-600 text-white rounded px-1.5 py-0.5">Selected</span>}
                    </button>
                  ))}
                </div>
              )}
              {errors.patientId && <p className="text-xs text-red-500 font-medium">{errors.patientId.message as any}</p>}
            </Card>

            <Card className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Stethoscope className="h-4.5 w-4.5" /> Doctor & Department selection
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Department"
                  required
                  {...register("departmentId")}
                  hint={errors.departmentId?.message as any}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept: any) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </SelectField>

                <SelectField
                  label="Consultant Doctor"
                  required
                  {...register("doctorId")}
                  hint={errors.doctorId?.message as any}
                >
                  <option value="">Select Doctor</option>
                  {doctors
                    ?.filter((d: any) => !selectedDeptId || (d.department?._id === selectedDeptId || d.department === selectedDeptId))
                    .map((doc: any) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.name} ({doc.specialization})
                      </option>
                    ))}
                </SelectField>
              </div>
            </Card>

            <Card className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="h-4.5 w-4.5" /> Schedule slot details
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <InputField
                  label="Appointment Date"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  {...register("date")}
                  hint={errors.date?.message as any}
                />

                <SelectField
                  label="Available Slot"
                  required
                  {...register("time")}
                  hint={errors.time?.message as any}
                >
                  <option value="">Select Slot</option>
                  {filteredSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </SelectField>

                <SelectField
                  label="Appointment Type"
                  required
                  {...register("type")}
                  hint={errors.type?.message as any}
                >
                  <option value="Consultation">Regular Consult</option>
                  <option value="Walk-in">Walk-in Visit</option>
                  <option value="Emergency">Emergency Visit</option>
                </SelectField>
              </div>

              <TextareaField label="Chief Complaints / Notes" {...register("notes")} rows={2} />
            </Card>
          </div>

          {/* Right Panel: Booking Summary */}
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FolderHeart className="h-4.5 w-4.5" /> Booking Summary
              </h3>
              <div className="space-y-2 text-xs border-b border-slate-100 pb-3">
                <div className="flex justify-between text-slate-500">
                  <span>Patient selected:</span>
                  <span className="font-semibold text-slate-800">{selectedPatientId ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Booking Type:</span>
                  <span className="font-semibold text-slate-800">{watch("type")}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Registration Fee:</span>
                  <span className="font-semibold text-slate-800">{formatINR(watch("type") === "Emergency" ? 200 : 100)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Consultation Fee:</span>
                  <span className="font-semibold text-slate-800">{formatINR(watch("type") === "Emergency" ? 500 : 300)}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-sm text-slate-800">
                <span>Total Consultation Bill:</span>
                <span>{formatINR(watch("type") === "Emergency" ? 700 : 400)}</span>
              </div>
              <p className="text-[10px] text-slate-450 italic mt-2">Note: Confirmed bookings generate a bill, which must be processed before calling the patient.</p>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={bookMutation.isPending}>
                  {bookMutation.isPending ? "Booking..." : "Confirm & Open Billing"}
                </Button>
              </div>
            </Card>
          </div>
        </form>
      )}

      {/* Calendar View Mockup */}
      {tab === "calendar" && (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base font-semibold text-slate-850">OP Scheduling Calendar</h2>
            <div className="text-sm font-semibold text-navy-700">{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 border-b border-slate-100 pb-2">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>
          <div className="grid grid-cols-7 gap-2 mt-2 h-80">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className={`rounded-lg border border-slate-100 p-2 text-left hover:bg-slate-50 cursor-pointer ${i === 9 ? "bg-navy-50/50 border-navy-200" : ""}`}>
                <div className="font-bold text-slate-700">{i + 1}</div>
                {i === 9 && (
                  <div className="mt-1 rounded bg-navy-600 p-1 text-[8px] font-bold text-white text-center">
                    {todayAppointments?.length || 0} Slots
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
