import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatINR } from "../../lib/currency";
import { Calendar, User, Search, Stethoscope, FolderHeart, Clock, Plus, List, AlertTriangle, RefreshCw } from "lucide-react";
import {
  useBookAppointment,
  useReceptionQueue,
  useDoctorsAvailability,
  usePatientsSearch,
  useCancelAppointment,
  useRescheduleAppointment,
  useCheckDuplicateAppointment,
  usePatientDetail
} from "../../features/receptionist";
import { useDepartments } from "../../features/departments";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import toast from "react-hot-toast";

// Validation schema for booking form
const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  departmentId: z.string().min(1, "Department is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time slot is required"),
  type: z.enum(["Consultation", "Walk-in", "Emergency"]).default("Consultation"),
  notes: z.string().optional().default("")
});

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
  const cancelMutation = useCancelAppointment();
  const rescheduleMutation = useRescheduleAppointment();
  const { data: doctors } = useDoctorsAvailability();
  const { data: departmentsResponse } = useDepartments();
  const { data: searchPatients } = usePatientsSearch(patientQuery);
  const { data: todayAppointments, isLoading: listLoading, refetch: refetchQueue } = useReceptionQueue();

  const departments = departmentsResponse || [];

  // ── Follow-up Booking State ──
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [followUpParentId, setFollowUpParentId] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");

  // ── Combined Cancel / Reschedule Modal State ──
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [dialogAction, setDialogAction] = useState<"cancel" | "reschedule">("cancel");

  // Cancel fields
  const [cancelReason, setCancelReason] = useState("Patient Requested");
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [refundRequired, setRefundRequired] = useState("No");

  // Reschedule fields
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split("T")[0]);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleDoctor, setRescheduleDoctor] = useState("");
  const [rescheduleDept, setRescheduleDept] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("Patient Requested");
  const [rescheduleRemarks, setRescheduleRemarks] = useState("");
  const [rescheduleErrors, setRescheduleErrors] = useState<Record<string, string>>({});

  const ALL_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"];

  const generateSlots = (from: string, to: string, duration: number, breakTime?: string) => {
    const slots: string[] = [];
    const [startH, startM] = from.split(":").map(Number);
    const [endH, endM] = to.split(":").map(Number);
    
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    
    let breakStart = -1;
    let breakEnd = -1;
    if (breakTime) {
      const [breakH, breakM] = breakTime.split(":").map(Number);
      breakStart = breakH * 60 + breakM;
      breakEnd = breakStart + 60; // 1 hour break
    }
    
    while (current + duration <= end) {
      if (breakStart !== -1 && current >= breakStart && current < breakEnd) {
        current += duration;
        continue;
      }
      
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push(timeStr);
      current += duration;
    }
    return slots;
  };

  const getAvailableSlots = (dateStr: string, doctorId?: string) => {
    if (!doctorId) {
      return ALL_SLOTS;
    }
    const selectedDoc = doctors?.find((d: any) => d._id === doctorId);
    if (!selectedDoc) {
      return ALL_SLOTS;
    }

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dateObj = new Date(dateStr);
    const dayName = days[dateObj.getDay()];

    const daySchedule = selectedDoc.workingHours?.find((wh: any) => wh.day === dayName);

    // If day is off duty or schedule not active, return no slots
    if (daySchedule && !daySchedule.active) {
      return [];
    }

    const from = daySchedule?.from && daySchedule.from !== "—" ? daySchedule.from : "09:00";
    const to = daySchedule?.to && daySchedule.to !== "—" ? daySchedule.to : "17:00";
    const duration = selectedDoc.consultationSettings?.slotDuration ?? 15;
    const breakTime = selectedDoc.consultationSettings?.breakTime ?? "13:00";

    let generated = generateSlots(from, to, duration, breakTime);

    const todayStr = new Date().toISOString().split("T")[0];
    if (dateStr === todayStr) {
      const now = new Date();
      generated = generated.filter((slot) => {
        const [h, m] = slot.split(":").map(Number);
        return h > now.getHours() || (h === now.getHours() && m > now.getMinutes());
      });
    }
    return generated;
  };

  const openDialog = (row: any) => {
    setSelectedAppt(row);
    setDialogAction("cancel");
    setCancelReason("Patient Requested");
    setCancelRemarks("");
    setRefundRequired("No");
    setRescheduleDate(new Date().toISOString().split("T")[0]);
    setRescheduleTime("");
    setRescheduleDoctor(row.doctor?._id || "");
    setRescheduleDept(row.department?._id || "");
    setRescheduleReason("Patient Requested");
    setRescheduleRemarks("");
    setRescheduleErrors({});
  };

  const closeDialog = () => {
    setSelectedAppt(null);
    setRescheduleErrors({});
  };

  const getAppointmentId = (row: any): string | null => {
    if (!row) return null;
    if (typeof row.appointment === "object" && row.appointment?._id) return row.appointment._id;
    if (typeof row.appointment === "string") return row.appointment;
    return null;
  };

  // Derive whether this appointment has already been rescheduled once
  const getIsAlreadyRescheduled = (row: any): boolean => {
    if (!row) return false;
    const appt = typeof row.appointment === "object" ? row.appointment : null;
    if (!appt) return false;
    const count = appt.rescheduleCount ?? appt.rescheduleHistory?.length ?? 0;
    return count >= 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;

    const appointmentId = getAppointmentId(selectedAppt);
    if (!appointmentId) {
      toast.error("No linked appointment found for this queue item.");
      return;
    }

    if (dialogAction === "cancel") {
      try {
        await cancelMutation.mutateAsync({ appointmentId, reason: cancelReason, remarks: cancelRemarks, refundRequired });
        toast.success("Appointment cancelled successfully!");
        closeDialog();
        refetchQueue();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || "Failed to cancel appointment.");
      }
    } else {
      // Client-side one-reschedule-limit guard
      if (getIsAlreadyRescheduled(selectedAppt)) {
        toast.error("This appointment has already been rescheduled once. Further rescheduling requires administrator approval.");
        return;
      }

      // Validate reschedule fields
      const errors: Record<string, string> = {};
      if (!rescheduleDate) errors.date = "New appointment date is required.";
      if (!rescheduleTime) errors.time = "New appointment time is required.";
      if (!rescheduleDoctor) errors.doctor = "Doctor is required.";
      if (!rescheduleDept) errors.department = "Department is required.";

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (rescheduleDate && new Date(rescheduleDate) < today) {
        errors.date = "New appointment date cannot be before today.";
      }

      if (Object.keys(errors).length > 0) {
        setRescheduleErrors(errors);
        return;
      }
      setRescheduleErrors({});

      try {
        await rescheduleMutation.mutateAsync({
          appointmentId,
          newDate: rescheduleDate,
          newTime: rescheduleTime,
          doctorId: rescheduleDoctor,
          departmentId: rescheduleDept,
          reason: rescheduleReason,
          remarks: rescheduleRemarks
        });
        toast.success("Appointment rescheduled successfully! New token generated.");
        closeDialog();
        refetchQueue();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || "Failed to reschedule appointment.");
      }
    }
  };

  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get("patientId") || "";

  // ── Booking form ──
  const {
    register,
    handleSubmit: handleBookSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: urlPatientId,
      doctorId: "",
      departmentId: "",
      date: new Date().toISOString().split("T")[0],
      time: "",
      type: "Consultation",
      notes: ""
    }
  });

  const selectedPatientId = watch("patientId");
  const selectedDoctorId = watch("doctorId");
  const selectedDeptId = watch("departmentId");
  const selectedDate = watch("date");

  const { data: patientDetail, isLoading: patientLoading, isError: patientError } = usePatientDetail(selectedPatientId);

  // Autofill patient query search box and handle auto-focus to Department field
  useEffect(() => {
    if (urlPatientId && tab === "new") {
      setValue("patientId", urlPatientId);
      setTimeout(() => {
        const deptSelect = document.getElementsByName("departmentId")[0] as HTMLSelectElement | undefined;
        if (deptSelect) {
          deptSelect.focus();
        }
      }, 300);
    }
  }, [urlPatientId, setValue, tab]);

  useEffect(() => {
    if (patientDetail?.patient) {
      setPatientQuery(`${patientDetail.patient.name} (${patientDetail.patient.uhid})`);
    }
  }, [patientDetail]);

  // ── Real-time Duplicate Appointment Check ──
  const { data: dupCheck, isFetching: dupChecking } = useCheckDuplicateAppointment(
    selectedPatientId,
    selectedDoctorId,
    selectedDate,
    !isFollowUp  // skip check when booking a follow-up
  );
  const isDuplicate = !isFollowUp && dupCheck?.isDuplicate === true;
  const duplicateMessage = dupCheck?.message || "";

  const getFilteredSlots = () => {
    if (!selectedDate) return ALL_SLOTS;
    return getAvailableSlots(selectedDate, selectedDoctorId);
  };

  const handleBook = async (data: any) => {
    // Client-side duplicate guard (backend will also enforce this)
    if (isDuplicate) {
      toast.error(duplicateMessage || "Duplicate appointment detected. Please resolve the existing appointment first.");
      return;
    }
    try {
      const payload = {
        ...data,
        ...(isFollowUp ? {
          followUp: true,
          parentAppointmentId: followUpParentId || undefined,
          followUpReason: followUpReason || "",
        } : {}),
      };
      const result = await bookMutation.mutateAsync(payload);
      const invoiceId = result?.invoice?._id;
      reset();
      setPatientQuery("");
      setIsFollowUp(false);
      setFollowUpParentId("");
      setFollowUpReason("");
      if (invoiceId) navigate(`/receptionist/billing/consultation?invoiceId=${invoiceId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to book appointment.";
      toast.error(msg);
    }
  };

  const statusColors: Record<string, string> = {
    waiting: "bg-amber-50 text-amber-700 border-amber-200",
    called: "bg-indigo-50 text-indigo-700 border-indigo-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    skipped: "bg-rose-50 text-rose-700 border-rose-200"
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
      render: (row: any) => (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusColors[row.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
          {row.status}
        </span>
      )
    },
    {
      header: "Actions",
      render: (row: any) => {
        const canAct = row.status !== "called" && row.status !== "completed" && row.status !== "skipped";
        return canAct ? (
          <button
            type="button"
            onClick={() => openDialog(row)}
            className="rounded bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
          >
            Cancel / Reschedule
          </button>
        ) : null;
      }
    }
  ];

  const isMutating = cancelMutation.isPending || rescheduleMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Outpatient Bookings</h1>
          <p className="text-sm text-slate-500">Manage consultant appointment scheduling and queues.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setTab("today")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${tab === "today" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"}`}
          >
            <List className="h-3.5 w-3.5" /> Today's Queue
          </button>
          <button
            onClick={() => setTab("new")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${tab === "new" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Plus className="h-3.5 w-3.5" /> Book Appointment
          </button>
          <button
            onClick={() => setTab("calendar")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${tab === "calendar" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Calendar className="h-3.5 w-3.5" /> Calendar View
          </button>
        </div>
      </div>

      {/* Today's Queue */}
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
        <form onSubmit={handleBookSubmit(handleBook)} className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="h-4.5 w-4.5" /> Patient Selection
              </h3>

              {patientLoading && (
                <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-navy-600" />
                  <span>Loading patient details...</span>
                </div>
              )}

              {selectedPatientId && !patientLoading && (patientError || !patientDetail?.patient) && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Patient not found.</span>
                  </div>
                  <p>The specified patient ID is invalid or does not exist in the registry.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("patientId", "");
                      setPatientQuery("");
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors"
                  >
                    Return to Patient Search
                  </button>
                </div>
              )}

              {patientDetail?.patient && patientDetail.patient.isActive === false && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold text-amber-800">Warning: Inactive Patient Account</p>
                    <p className="mt-0.5 leading-snug">This patient's registration status is marked as inactive.</p>
                  </div>
                </div>
              )}

              {selectedPatientId && patientDetail?.patient ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-800">{patientDetail.patient.name}</div>
                      <div className="font-mono text-xs text-slate-400 font-semibold mt-0.5">{patientDetail.patient.uhid}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setValue("patientId", "");
                        setPatientQuery("");
                      }}
                      className="text-xs font-bold text-navy-700 hover:text-navy-800 border border-slate-200 bg-white rounded-md px-3 py-1.5 transition-colors shadow-sm"
                    >
                      Change Patient
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Age / Gender</span>
                      <span className="font-bold text-slate-700">{patientDetail.patient.age ?? "—"} Yrs / <span className="capitalize">{patientDetail.patient.gender}</span></span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Phone</span>
                      <span className="font-bold text-slate-700 font-mono">{patientDetail.patient.phone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Blood Group</span>
                      <span className="font-bold text-slate-700">{patientDetail.patient.bloodGroup || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Registration Date</span>
                      <span className="font-bold text-slate-700">
                        {new Date(patientDetail.patient.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {patientDetail.patient.status && (
                      <div>
                        <span className="text-slate-400 block font-semibold mb-0.5">Status</span>
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 capitalize border border-blue-200">
                          {patientDetail.patient.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                !patientLoading && (
                  <>
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
                            onClick={() => { setValue("patientId", p._id); setPatientQuery(`${p.name} (${p.uhid})`); }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${selectedPatientId === p._id ? "bg-navy-50 font-semibold" : ""}`}
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
                  </>
                )
              )}
              {errors.patientId && <p className="text-xs text-red-500 font-medium">{errors.patientId.message as any}</p>}
            </Card>

            {/* Clinical Profile & History (Only displayed when patient is selected) */}
            {selectedPatientId && patientDetail?.patient && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b pb-1.5 flex items-center gap-1.5">
                    <FolderHeart className="h-4 w-4 text-navy-600" /> Previous Visits & Appointments
                  </h4>
                  {patientDetail.patient.medicalHistory && patientDetail.patient.medicalHistory.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {patientDetail.patient.medicalHistory.map((item: any, idx: number) => (
                        <div key={idx} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0 text-xs">
                          <div className="flex justify-between text-slate-400 font-semibold">
                            <span>{new Date(item.date).toLocaleDateString("en-IN")} — {item.visitType}</span>
                            <span className="font-bold text-slate-600 uppercase text-[10px]">{item.status}</span>
                          </div>
                          <div className="mt-0.5 text-slate-700 font-bold">{item.diagnosis}</div>
                          {item.notes && <div className="text-[10px] text-slate-500 mt-1 bg-slate-50 p-1.5 rounded border border-slate-100 leading-snug">{item.notes}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-455 italic py-4 text-center">No previous visits or clinical entries found.</div>
                  )}
                </Card>

                <Card className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b pb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Allergies & Medical Alerts
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 block">Allergies:</span>
                      {patientDetail.patient.allergies ? (
                        <div className="mt-1 bg-red-50 border border-red-200 text-red-700 rounded px-2.5 py-1.5 font-bold">
                          ⚠️ {patientDetail.patient.allergies}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic mt-0.5">No registered allergies.</div>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Medical Alerts / Conditions:</span>
                      {patientDetail.patient.medicalHistory?.some((m: any) => m.visitType?.toLowerCase().includes("admission") || m.visitType?.toLowerCase().includes("emergency")) ? (
                        <div className="mt-1 bg-amber-50 border border-amber-200 text-amber-700 rounded px-2.5 py-1.5 font-semibold leading-normal">
                          🔔 Patient has a history of Admission or Emergency visits. Please review clinical history.
                        </div>
                      ) : (
                        <div className="text-slate-450 italic mt-0.5">No critical medical alerts.</div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            <Card className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Stethoscope className="h-4.5 w-4.5" /> Doctor & Department selection
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField label="Department" required {...register("departmentId")} hint={errors.departmentId?.message as any}>
                  <option value="">Select Department</option>
                  {departments.map((dept: any) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                </SelectField>
                <SelectField label="Consultant Doctor" required {...register("doctorId")} hint={errors.doctorId?.message as any}>
                  <option value="">Select Doctor</option>
                  {doctors?.filter((d: any) => !selectedDeptId || d.department?._id === selectedDeptId || d.department === selectedDeptId)
                    .map((doc: any) => <option key={doc._id} value={doc._id}>{doc.name} ({doc.specialization})</option>)}
                </SelectField>
              </div>

              {/* ── Real-time Duplicate Appointment Warning ── */}
              {selectedPatientId && selectedDoctorId && selectedDate && (
                <div className="mt-1">
                  {dupChecking && (
                    <div className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                      <span className="text-xs text-slate-500">Checking for duplicate appointments...</span>
                    </div>
                  )}
                  {!dupChecking && isDuplicate && (
                    <div className="flex items-start gap-2.5 rounded-md bg-red-50 border border-red-200 px-3 py-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-red-700">Duplicate Appointment Detected</p>
                        <p className="mt-0.5 text-xs text-red-600 leading-snug">{duplicateMessage}</p>
                        <button
                          type="button"
                          onClick={() => { setIsFollowUp(true); }}
                          className="mt-1.5 text-[10px] font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
                        >
                          Book as Follow-up Visit instead →
                        </button>
                      </div>
                    </div>
                  )}
                  {!dupChecking && !isDuplicate && selectedPatientId && selectedDoctorId && selectedDate && (
                    <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-1.5">
                      <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      <span className="text-xs text-green-700 font-medium">No duplicate appointment found. Slot is available.</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Follow-up Booking Section ── */}
              {isFollowUp && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Follow-up Visit Booking</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setIsFollowUp(false); setFollowUpParentId(""); setFollowUpReason(""); }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      ✕ Cancel Follow-up
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">Parent Appointment Reference ID *</label>
                    <input
                      type="text"
                      value={followUpParentId}
                      onChange={(e) => setFollowUpParentId(e.target.value)}
                      placeholder="Enter parent appointment _id (ObjectId)..."
                      className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="mt-0.5 text-[10px] text-blue-500">The completed parent appointment ID this follow-up is linked to.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">Follow-up Reason *</label>
                    <input
                      type="text"
                      value={followUpReason}
                      onChange={(e) => setFollowUpReason(e.target.value)}
                      placeholder="e.g. Post-operative review, Lab result discussion..."
                      className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </Card>

            <Card className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="h-4.5 w-4.5" /> Schedule slot details
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <InputField label="Appointment Date" type="date" required min={new Date().toISOString().split("T")[0]} {...register("date")} hint={errors.date?.message as any} />
                <SelectField label="Available Slot" required {...register("time")} hint={errors.time?.message as any}>
                  <option value="">Select Slot</option>
                  {getFilteredSlots().map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </SelectField>
                <SelectField label="Appointment Type" required {...register("type")} hint={errors.type?.message as any}>
                  <option value="Consultation">Regular Consult</option>
                  <option value="Walk-in">Walk-in Visit</option>
                  <option value="Emergency">Emergency Visit</option>
                </SelectField>

                {/* ── Real-time Doctor Off Duty Warning ── */}
                {selectedDoctorId && selectedDate && isDoctorOffDuty && (
                  <div className="sm:col-span-3 flex items-start gap-2.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-amber-700">Doctor is Unavailable</p>
                      <p className="mt-0.5 text-xs text-amber-600 leading-snug">
                        Dr. {selectedDoc?.name || "the selected doctor"} is marked as "Off" on {selectedDayOfWeekName || "this day"}. Please choose a different date or select another consultant.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <TextareaField label="Chief Complaints / Notes" {...register("notes")} rows={2} />
            </Card>
          </div>

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
              {isFollowUp && (
                <div className="flex items-center gap-1.5 mt-1 rounded bg-blue-100 px-2 py-1">
                  <RefreshCw className="h-3 w-3 text-blue-600" />
                  <span className="text-[10px] font-semibold text-blue-700">Booking as Follow-up Visit</span>
                </div>
              )}
              <p className="text-[10px] text-slate-455 italic mt-2">Note: Confirmed bookings generate a bill, which must be processed before calling the patient.</p>
              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={bookMutation.isPending || isDuplicate}>
                  {bookMutation.isPending ? "Booking..." : isDuplicate ? "⚠ Duplicate — Cannot Book" : "Confirm & Open Billing"}
                </Button>
              </div>

            </Card>
          </div>
        </form>
      )}

      {/* Calendar View */}
      {tab === "calendar" && (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base font-semibold text-slate-850">OP Scheduling Calendar</h2>
            <div className="text-sm font-semibold text-navy-700">{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 border-b border-slate-100 pb-2">
            {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d => <span key={d}>{d}</span>)}
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

      {/* ── Combined Cancel / Reschedule Modal ── */}
      {selectedAppt && (
        <Modal isOpen={!!selectedAppt} onClose={closeDialog} title="Appointment Action">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Appointment Details */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-400 block mb-0.5">Patient Name</span>
                <span className="font-semibold text-slate-800">{selectedAppt.patient?.name || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">UHID</span>
                <span className="font-semibold text-slate-800 font-mono">{selectedAppt.patient?.uhid || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Doctor</span>
                <span className="font-semibold text-slate-800">{selectedAppt.doctor?.name || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Department</span>
                <span className="font-semibold text-slate-800">{selectedAppt.department?.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Token Number</span>
                <span className="font-semibold text-slate-800">{selectedAppt.tokenNumber || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Status</span>
                <span className="font-semibold text-navy-700 uppercase">{selectedAppt.status || "—"}</span>
              </div>
            </div>

            {/* Action Selector — always visible */}
            {(() => {
              const alreadyRescheduled = getIsAlreadyRescheduled(selectedAppt);
              return (
                <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Select Action</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="dialogAction"
                      value="cancel"
                      checked={dialogAction === "cancel"}
                      onChange={() => setDialogAction("cancel")}
                      className="h-4 w-4 accent-red-600"
                    />
                    <span className="text-sm font-semibold text-slate-800">Cancel Appointment</span>
                  </label>
                  <label className={`flex items-center gap-3 ${alreadyRescheduled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                    <input
                      type="radio"
                      name="dialogAction"
                      value="reschedule"
                      checked={dialogAction === "reschedule"}
                      onChange={() => !alreadyRescheduled && setDialogAction("reschedule")}
                      disabled={alreadyRescheduled}
                      className="h-4 w-4 accent-navy-600"
                    />
                    <span className="text-sm font-semibold text-slate-800">Reschedule Appointment</span>
                  </label>
                  {alreadyRescheduled && (
                    <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <p className="text-xs font-medium text-amber-700 leading-snug">
                        This appointment has already been rescheduled once. Further rescheduling requires administrator approval.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Cancel Fields ── */}
            {dialogAction === "cancel" && (
              <div className="space-y-3">
                <SelectField
                  label="Cancellation Reason *"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                >
                  <option value="Patient Requested">Patient Requested</option>
                  <option value="Doctor Unavailable">Doctor Unavailable</option>
                  <option value="Duplicate Booking">Duplicate Booking</option>
                  <option value="Wrong Booking">Wrong Booking</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Other">Other</option>
                </SelectField>

                <TextareaField
                  label="Remarks / Cancellation Notes"
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  placeholder="Provide extra details for cancellation..."
                  rows={2}
                />

                <SelectField
                  label="Refund Required *"
                  required
                  value={refundRequired}
                  onChange={(e) => setRefundRequired(e.target.value)}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes (Process refund request)</option>
                </SelectField>
              </div>
            )}

            {/* ── Reschedule Fields ── */}
            {dialogAction === "reschedule" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">New Appointment Date *</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={rescheduleDate}
                      onChange={(e) => { setRescheduleDate(e.target.value); setRescheduleTime(""); }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${rescheduleErrors.date ? "border-red-400 focus:ring-red-400" : "border-slate-300 focus:border-navy-500 focus:ring-navy-500"}`}
                    />
                    {rescheduleErrors.date && <p className="mt-0.5 text-xs text-red-500">{rescheduleErrors.date}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">New Time Slot *</label>
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${rescheduleErrors.time ? "border-red-400 focus:ring-red-400" : "border-slate-300 focus:border-navy-500 focus:ring-navy-500"}`}
                    >
                      <option value="">Select Slot</option>
                      {getAvailableSlots(rescheduleDate, rescheduleDoctor).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {rescheduleErrors.time && <p className="mt-0.5 text-xs text-red-500">{rescheduleErrors.time}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Doctor *</label>
                    <select
                      value={rescheduleDoctor}
                      onChange={(e) => setRescheduleDoctor(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${rescheduleErrors.doctor ? "border-red-400 focus:ring-red-400" : "border-slate-300 focus:border-navy-500 focus:ring-navy-500"}`}
                    >
                      <option value="">Select Doctor</option>
                      {doctors?.map((doc: any) => <option key={doc._id} value={doc._id}>{doc.name} ({doc.specialization})</option>)}
                    </select>
                    {rescheduleErrors.doctor && <p className="mt-0.5 text-xs text-red-500">{rescheduleErrors.doctor}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Department *</label>
                    <select
                      value={rescheduleDept}
                      onChange={(e) => setRescheduleDept(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${rescheduleErrors.department ? "border-red-400 focus:ring-red-400" : "border-slate-300 focus:border-navy-500 focus:ring-navy-500"}`}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept: any) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                    </select>
                    {rescheduleErrors.department && <p className="mt-0.5 text-xs text-red-500">{rescheduleErrors.department}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for Reschedule *</label>
                  <select
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                  >
                    <option value="Patient Requested">Patient Requested</option>
                    <option value="Doctor Requested">Doctor Requested</option>
                    <option value="Doctor Unavailable">Doctor Unavailable</option>
                    <option value="Equipment Issue">Equipment Issue</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <TextareaField
                  label="Remarks"
                  value={rescheduleRemarks}
                  onChange={(e) => setRescheduleRemarks(e.target.value)}
                  placeholder="Optional notes about this reschedule..."
                  rows={2}
                />
              </div>
            )}

            {/* Bottom Buttons */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button type="button" variant="secondary" onClick={closeDialog}>
                Close
              </Button>
              {dialogAction === "cancel" ? (
                <Button type="submit" variant="danger" disabled={isMutating}>
                  {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              ) : (
                <Button type="submit" disabled={isMutating} className="bg-navy-600 hover:bg-navy-700 text-white">
                  {rescheduleMutation.isPending ? "Rescheduling..." : "Confirm Reschedule"}
                </Button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
