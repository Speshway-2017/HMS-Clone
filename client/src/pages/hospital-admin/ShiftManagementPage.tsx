import { useState } from "react";
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Users,
  ShieldCheck,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import {
  useShifts,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useAssignShift,
  ShiftMaster,
} from "../../features/shifts";
import { useStaffList } from "../../features/staff";
import { useDoctors } from "../../features/doctors";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { InputField, SelectField } from "../../components/ui/Field";
import toast from "react-hot-toast";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";

const SHIFT_LIMITS = {
  NAME: 50,
  TIME: 20,
  GRACE_PERIOD: 120,
  HOURS: 24,
} as const;

const SHIFT_NAME_REGEX = /^[a-zA-Z0-9\s\.\-/_()]+$/;
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?[APap][Mm])?$/;

export function ShiftManagementPage() {
  // Modals state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftMaster | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [targetShiftName, setTargetShiftName] = useState("General");

  // Form fields for Shift create/edit
  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("05:00 PM");
  const [gracePeriod, setGracePeriod] = useState<number | string>(15);
  const [halfDayHours, setHalfDayHours] = useState<number | string>(4);
  const [fullDayHours, setFullDayHours] = useState<number | string>(8);
  const [crossesMidnight, setCrossesMidnight] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    shiftName?: string;
    startTime?: string;
    endTime?: string;
    gracePeriod?: string;
    fullDayHours?: string;
    halfDayHours?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  // React Query Hooks
  const { data: shifts = [], isLoading } = useShifts();
  const { data: staffRes } = useStaffList({});
  const { data: docRes } = useDoctors({} as any);

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const assignShift = useAssignShift();

  // Combine Staff & Doctors
  const allEmployees: any[] = [];
  if (docRes?.data) {
    docRes.data.forEach((doc: any) => {
      allEmployees.push({
        _id: doc._id,
        employeeId: doc.licenseNo || `DOC-${doc._id.slice(-5).toUpperCase()}`,
        name: doc.name,
        type: "Doctor",
        role: doc.specialization ? `Doctor (${doc.specialization})` : "Doctor",
        currentShift: doc.shift || "General",
      });
    });
  }
  if (staffRes?.data) {
    staffRes.data.forEach((st: any) => {
      allEmployees.push({
        _id: st._id,
        employeeId: st.employeeId || `STF-${st._id.slice(-5).toUpperCase()}`,
        name: st.name,
        type: "Staff",
        role: st.role || "Staff Member",
        currentShift: st.shift || "General",
      });
    });
  }

  const validateField = (
    field: "shiftName" | "startTime" | "endTime" | "gracePeriod" | "fullDayHours" | "halfDayHours",
    value: any
  ): string | undefined => {
    if (field === "shiftName") {
      const valStr = typeof value === "string" ? value : String(value ?? "");
      const trimmed = valStr.trim();
      if (!trimmed) {
        return "Shift Name is required. Please enter valid data";
      }
      if (valStr.length > SHIFT_LIMITS.NAME) {
        return `Shift Name cannot exceed ${SHIFT_LIMITS.NAME} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !SHIFT_NAME_REGEX.test(trimmed)) {
        return "Shift Name contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (field === "startTime") {
      const valStr = typeof value === "string" ? value : String(value ?? "");
      const trimmed = valStr.trim();
      if (!trimmed) {
        return "Start Time is required. Please enter valid data";
      }
      if (valStr.length > SHIFT_LIMITS.TIME) {
        return `Start Time cannot exceed ${SHIFT_LIMITS.TIME} characters. Please enter valid data`;
      }
      if (!TIME_REGEX.test(trimmed)) {
        return "Start Time is invalid. Please enter valid time (e.g. 08:00 AM). Please enter valid data";
      }
      return undefined;
    }

    if (field === "endTime") {
      const valStr = typeof value === "string" ? value : String(value ?? "");
      const trimmed = valStr.trim();
      if (!trimmed) {
        return "End Time is required. Please enter valid data";
      }
      if (valStr.length > SHIFT_LIMITS.TIME) {
        return `End Time cannot exceed ${SHIFT_LIMITS.TIME} characters. Please enter valid data`;
      }
      if (!TIME_REGEX.test(trimmed)) {
        return "End Time is invalid. Please enter valid time (e.g. 04:00 PM). Please enter valid data";
      }
      return undefined;
    }

    if (field === "gracePeriod") {
      const num = Number(value);
      if (isNaN(num)) {
        return "Grace Period must be a valid number. Please enter valid data";
      }
      if (num < 0) {
        return "Grace Period cannot be negative. Please enter valid data";
      }
      if (num > SHIFT_LIMITS.GRACE_PERIOD) {
        return `Grace Period cannot exceed ${SHIFT_LIMITS.GRACE_PERIOD} minutes. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "fullDayHours") {
      const num = Number(value);
      if (isNaN(num)) {
        return "Full Day must be a valid number. Please enter valid data";
      }
      if (num < 0) {
        return "Full Day hours cannot be negative. Please enter valid data";
      }
      if (num > SHIFT_LIMITS.HOURS) {
        return `Full Day cannot exceed ${SHIFT_LIMITS.HOURS} hours. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "halfDayHours") {
      const num = Number(value);
      if (isNaN(num)) {
        return "Half Day must be a valid number. Please enter valid data";
      }
      if (num < 0) {
        return "Half Day hours cannot be negative. Please enter valid data";
      }
      if (num > SHIFT_LIMITS.HOURS) {
        return `Half Day cannot exceed ${SHIFT_LIMITS.HOURS} hours. Please enter valid data`;
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "shiftName" | "startTime" | "endTime",
    currentLen: number,
    limit: number,
    label: string
  ) => {
    const allowedNavKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (allowedNavKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = `${label} cannot exceed ${limit} characters. Please enter valid data`;
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      setFormError("Please enter valid data");
      toast.error(msg, { id: `shift-${field}-limit` });
    }
  };

  const handleOpenCreate = () => {
    setEditingShift(null);
    setShiftName("");
    setStartTime("09:00 AM");
    setEndTime("05:00 PM");
    setGracePeriod(15);
    setHalfDayHours(4);
    setFullDayHours(8);
    setCrossesMidnight(false);
    setFieldErrors({});
    setFormError(null);
    setIsShiftModalOpen(true);
  };

  const handleOpenEdit = (shift: ShiftMaster) => {
    setEditingShift(shift);
    setShiftName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setGracePeriod(shift.gracePeriodMinutes);
    setHalfDayHours(shift.halfDayHours);
    setFullDayHours(shift.fullDayHours);
    setCrossesMidnight(shift.crossesMidnight);
    setFieldErrors({});
    setFormError(null);
    setIsShiftModalOpen(true);
  };

  const handleGracePeriodUp = () => {
    const next = Math.min(SHIFT_LIMITS.GRACE_PERIOD, (Number(gracePeriod) || 0) + 1);
    setGracePeriod(next);
    const err = validateField("gracePeriod", next);
    setFieldErrors((prev) => ({ ...prev, gracePeriod: err }));
  };

  const handleGracePeriodDown = () => {
    const current = Number(gracePeriod) || 0;
    if (current <= 0) {
      setGracePeriod(0);
      setFieldErrors((prev) => ({ ...prev, gracePeriod: undefined }));
      return;
    }
    const next = Math.max(0, current - 1);
    setGracePeriod(next);
    const err = validateField("gracePeriod", next);
    setFieldErrors((prev) => ({ ...prev, gracePeriod: err }));
  };

  const handleFullDayUp = () => {
    const next = Math.min(SHIFT_LIMITS.HOURS, (Number(fullDayHours) || 0) + 1);
    setFullDayHours(next);
    const err = validateField("fullDayHours", next);
    setFieldErrors((prev) => ({ ...prev, fullDayHours: err }));
  };

  const handleFullDayDown = () => {
    const current = Number(fullDayHours) || 0;
    if (current <= 0) {
      setFullDayHours(0);
      setFieldErrors((prev) => ({ ...prev, fullDayHours: undefined }));
      return;
    }
    const next = Math.max(0, current - 1);
    setFullDayHours(next);
    const err = validateField("fullDayHours", next);
    setFieldErrors((prev) => ({ ...prev, fullDayHours: err }));
  };

  const handleHalfDayUp = () => {
    const next = Math.min(SHIFT_LIMITS.HOURS, (Number(halfDayHours) || 0) + 1);
    setHalfDayHours(next);
    const err = validateField("halfDayHours", next);
    setFieldErrors((prev) => ({ ...prev, halfDayHours: err }));
  };

  const handleHalfDayDown = () => {
    const current = Number(halfDayHours) || 0;
    if (current <= 0) {
      setHalfDayHours(0);
      setFieldErrors((prev) => ({ ...prev, halfDayHours: undefined }));
      return;
    }
    const next = Math.max(0, current - 1);
    setHalfDayHours(next);
    const err = validateField("halfDayHours", next);
    setFieldErrors((prev) => ({ ...prev, halfDayHours: err }));
  };

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nameErr = validateField("shiftName", shiftName);
    const startErr = validateField("startTime", startTime);
    const endErr = validateField("endTime", endTime);
    const graceErr = validateField("gracePeriod", gracePeriod);
    const fullErr = validateField("fullDayHours", fullDayHours);
    const halfErr = validateField("halfDayHours", halfDayHours);

    const errors = {
      shiftName: nameErr,
      startTime: startErr,
      endTime: endErr,
      gracePeriod: graceErr,
      fullDayHours: fullErr,
      halfDayHours: halfErr,
    };

    setFieldErrors(errors);

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      const firstError = Object.values(errors).find(Boolean);
      setFormError("Please enter valid data");
      toast.error(firstError || "Please enter valid data", { id: "shift-invalid" });
      return;
    }

    try {
      if (editingShift) {
        await updateShift.mutateAsync({
          id: editingShift._id,
          name: shiftName.trim(),
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          gracePeriodMinutes: Number(gracePeriod),
          halfDayHours: Number(halfDayHours),
          fullDayHours: Number(fullDayHours),
          crossesMidnight,
        });
        toast.success("Shift updated successfully!");
      } else {
        await createShift.mutateAsync({
          name: shiftName.trim(),
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          gracePeriodMinutes: Number(gracePeriod),
          halfDayHours: Number(halfDayHours),
          fullDayHours: Number(fullDayHours),
          crossesMidnight,
        });
        toast.success("Shift created successfully!");
      }
      setIsShiftModalOpen(false);
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message || err?.message || "Failed to save shift. Please enter valid data";
      setFormError("Please enter valid data");
      toast.error(serverMsg, { id: "shift-submit-error" });
    }
  };

  const [deleteTargetShiftId, setDeleteTargetShiftId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteTargetShiftId(id);
  };

  const confirmDeleteShift = async () => {
    if (!deleteTargetShiftId) return;
    try {
      await deleteShift.mutateAsync(deleteTargetShiftId);
      toast.success("Shift master deleted successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete shift master");
    } finally {
      setDeleteTargetShiftId(null);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !targetShiftName) return;

    const emp = allEmployees.find((e) => e._id === selectedEmployeeId || e.employeeId === selectedEmployeeId);
    if (!emp) return;

    await assignShift.mutateAsync({
      employeeId: emp._id,
      employeeType: emp.type,
      shiftName: targetShiftName,
    });

    toast.success(`Assigned ${targetShiftName} shift successfully!`);
    setIsAssignModalOpen(false);
  };

  const getShiftIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("morning")) return <Sunrise className="h-5 w-5 text-amber-500" />;
    if (n.includes("evening")) return <Sunset className="h-5 w-5 text-orange-500" />;
    if (n.includes("night")) return <Moon className="h-5 w-5 text-indigo-500" />;
    return <Sun className="h-5 w-5 text-sky-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Shift Management</h1>
          <p className="text-sm text-slate-500">
            Define shift timings, grace periods, midnight crossings, and staff duty assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setIsAssignModalOpen(true)}>
            <Users className="h-4 w-4 mr-1.5" /> Assign Staff to Shift
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Shift Master
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Shifts"
          value={shifts.length}
          icon={<Clock className="h-5 w-5 text-emerald-600" />}
        />
        <KpiCard
          label="Assigned Staff"
          value={allEmployees.length}
          icon={<Users className="h-5 w-5 text-emerald-600" />}
        />
        <KpiCard
          label="Night Shift Coverage"
          value={shifts.filter((s) => s.crossesMidnight).length}
          icon={<Moon className="h-5 w-5 text-indigo-600" />}
        />
        <KpiCard
          label="Grace Period Standard"
          value="15 Mins"
          icon={<ShieldCheck className="h-5 w-5 text-sky-600" />}
        />
      </div>

      {/* Shift Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-slate-400">Loading shift configurations...</div>
        ) : (
          shifts.map((shift) => (
            <Card key={shift._id} className="p-5 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between border-b pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  {getShiftIcon(shift.name)}
                  <h3 className="font-bold text-slate-900 text-base">{shift.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(shift)}
                    className="p-1 text-slate-400 hover:text-emerald-700 rounded hover:bg-slate-100"
                    title="Edit Shift"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(shift._id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                    title="Delete Shift"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between font-mono text-slate-900 bg-slate-50 p-2 rounded border">
                  <span>Timing:</span>
                  <span className="font-bold text-emerald-800">
                    {shift.startTime} – {shift.endTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Grace Period:</span>
                  <span className="font-semibold text-slate-800">{shift.gracePeriodMinutes} mins</span>
                </div>
                <div className="flex justify-between">
                  <span>Full Day Threshold:</span>
                  <span className="font-semibold text-slate-800">{shift.fullDayHours} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Half Day Threshold:</span>
                  <span className="font-semibold text-slate-800">{shift.halfDayHours} hrs</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-slate-500">Crosses Midnight:</span>
                  <Badge tone={shift.crossesMidnight ? "info" : "neutral"}>
                    {shift.crossesMidnight ? "Yes (Night)" : "No"}
                  </Badge>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Staff Shift Directory Table */}
      <Card className="overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Staff Shift Roster & Assignments</h3>
          <span className="text-xs text-slate-500">Real-time Shift Assignments</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Emp ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Shift</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {allEmployees.map((emp) => (
                <tr key={emp._id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-semibold text-emerald-700">{emp.employeeId}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{emp.name}</td>
                  <td className="py-3 px-4 text-slate-600">{emp.role}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-250">
                      {getShiftIcon(emp.currentShift)}
                      <span className="ml-1.5">{emp.currentShift}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedEmployeeId(emp._id);
                        setTargetShiftName(emp.currentShift);
                        setIsAssignModalOpen(true);
                      }}
                    >
                      Reassign Shift
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL 1: CREATE / EDIT SHIFT */}
      <Modal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        title={editingShift ? "Edit Shift Configuration" : "Create New Shift Master"}
      >
        <form onSubmit={handleShiftSubmit} noValidate className="space-y-4">
          <InputField
            label="Shift Name"
            type="text"
            required
            maxLength={SHIFT_LIMITS.NAME}
            showCharCount
            placeholder="e.g. Morning, Evening, Night, General"
            value={shiftName}
            error={fieldErrors.shiftName}
            onChange={(e) => {
              const val = e.target.value;
              setShiftName(val);
              const err = validateField("shiftName", val);
              setFieldErrors((prev) => ({ ...prev, shiftName: err }));
              if (!err && formError === "Please enter valid data") setFormError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "shiftName", shiftName.length, SHIFT_LIMITS.NAME, "Shift Name")}
            onBlur={() => {
              const err = validateField("shiftName", shiftName);
              setFieldErrors((prev) => ({ ...prev, shiftName: err }));
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Start Time (e.g. 08:00 AM)"
              type="text"
              required
              maxLength={SHIFT_LIMITS.TIME}
              showCharCount
              value={startTime}
              error={fieldErrors.startTime}
              onChange={(e) => {
                const val = e.target.value;
                setStartTime(val);
                const err = validateField("startTime", val);
                setFieldErrors((prev) => ({ ...prev, startTime: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "startTime", startTime.length, SHIFT_LIMITS.TIME, "Start Time")}
              onBlur={() => {
                const err = validateField("startTime", startTime);
                setFieldErrors((prev) => ({ ...prev, startTime: err }));
              }}
            />
            <InputField
              label="End Time (e.g. 04:00 PM)"
              type="text"
              required
              maxLength={SHIFT_LIMITS.TIME}
              showCharCount
              value={endTime}
              error={fieldErrors.endTime}
              onChange={(e) => {
                const val = e.target.value;
                setEndTime(val);
                const err = validateField("endTime", val);
                setFieldErrors((prev) => ({ ...prev, endTime: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "endTime", endTime.length, SHIFT_LIMITS.TIME, "End Time")}
              onBlur={() => {
                const err = validateField("endTime", endTime);
                setFieldErrors((prev) => ({ ...prev, endTime: err }));
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <InputField
              label="Grace Period (mins)"
              type="number"
              min={0}
              max={SHIFT_LIMITS.GRACE_PERIOD}
              step={1}
              value={gracePeriod}
              error={fieldErrors.gracePeriod}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setGracePeriod(0);
                  setFieldErrors((prev) => ({ ...prev, gracePeriod: undefined }));
                  return;
                }
                const num = Number(raw);
                setGracePeriod(raw);
                const err = validateField("gracePeriod", num);
                setFieldErrors((prev) => ({ ...prev, gracePeriod: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && Number(gracePeriod) <= 0) {
                  e.preventDefault();
                  setGracePeriod(0);
                }
              }}
              onBlur={() => {
                const err = validateField("gracePeriod", gracePeriod);
                setFieldErrors((prev) => ({ ...prev, gracePeriod: err }));
              }}
              inputRightElement={
                <div className="flex flex-col border border-slate-300 rounded overflow-hidden shadow-2xs bg-white">
                  <button
                    type="button"
                    aria-label="Up Arrow"
                    title="Up Arrow"
                    data-testid="grace-period-up"
                    onClick={handleGracePeriodUp}
                    className="px-1 py-0.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 flex items-center justify-center transition-colors border-b border-slate-200 cursor-pointer"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Down Arrow"
                    title="Down Arrow"
                    data-testid="grace-period-down"
                    onClick={handleGracePeriodDown}
                    className="px-1 py-0.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              }
            />
            <InputField
              label="Full Day (hrs)"
              type="number"
              min={0}
              max={SHIFT_LIMITS.HOURS}
              step={1}
              value={fullDayHours}
              error={fieldErrors.fullDayHours}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setFullDayHours(0);
                  setFieldErrors((prev) => ({ ...prev, fullDayHours: undefined }));
                  return;
                }
                const num = Number(raw);
                setFullDayHours(raw);
                const err = validateField("fullDayHours", num);
                setFieldErrors((prev) => ({ ...prev, fullDayHours: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && Number(fullDayHours) <= 0) {
                  e.preventDefault();
                  setFullDayHours(0);
                }
              }}
              onBlur={() => {
                const err = validateField("fullDayHours", fullDayHours);
                setFieldErrors((prev) => ({ ...prev, fullDayHours: err }));
              }}
              inputRightElement={
                <div className="flex flex-col border border-slate-300 rounded overflow-hidden shadow-2xs bg-white">
                  <button
                    type="button"
                    aria-label="Up Arrow"
                    title="Up Arrow"
                    data-testid="full-day-up"
                    onClick={handleFullDayUp}
                    className="px-1 py-0.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 flex items-center justify-center transition-colors border-b border-slate-200 cursor-pointer"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Down Arrow"
                    title="Down Arrow"
                    data-testid="full-day-down"
                    onClick={handleFullDayDown}
                    className="px-1 py-0.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              }
            />
            <InputField
              label="Half Day (hrs)"
              type="number"
              min={0}
              max={SHIFT_LIMITS.HOURS}
              step={1}
              value={halfDayHours}
              error={fieldErrors.halfDayHours}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setHalfDayHours(0);
                  setFieldErrors((prev) => ({ ...prev, halfDayHours: undefined }));
                  return;
                }
                const num = Number(raw);
                setHalfDayHours(raw);
                const err = validateField("halfDayHours", num);
                setFieldErrors((prev) => ({ ...prev, halfDayHours: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && Number(halfDayHours) <= 0) {
                  e.preventDefault();
                  setHalfDayHours(0);
                }
              }}
              onBlur={() => {
                const err = validateField("halfDayHours", halfDayHours);
                setFieldErrors((prev) => ({ ...prev, halfDayHours: err }));
              }}
              inputRightElement={
                <div className="flex flex-col border border-slate-300 rounded overflow-hidden shadow-2xs bg-white">
                  <button
                    type="button"
                    aria-label="Up Arrow"
                    title="Up Arrow"
                    data-testid="half-day-up"
                    onClick={handleHalfDayUp}
                    className="px-1 py-0.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 flex items-center justify-center transition-colors border-b border-slate-200 cursor-pointer"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Down Arrow"
                    title="Down Arrow"
                    data-testid="half-day-down"
                    onClick={handleHalfDayDown}
                    className="px-1 py-0.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              }
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="crossesMidnight"
              checked={crossesMidnight}
              onChange={(e) => setCrossesMidnight(e.target.checked)}
              className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-navy-500"
            />
            <label htmlFor="crossesMidnight" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Shift crosses midnight (Night shift)
            </label>
          </div>

          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setIsShiftModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingShift ? "Save Changes" : "Create Shift"}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ASSIGN STAFF TO SHIFT */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Staff Member to Shift"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <SelectField
            label="Select Employee"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            required
          >
            <option value="">Select Employee...</option>
            {allEmployees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.employeeId}) - {emp.role} [Current: {emp.currentShift}]
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Select Shift to Assign"
            value={targetShiftName}
            onChange={(e) => setTargetShiftName(e.target.value)}
            required
          >
            {shifts.map((s) => (
              <option key={s._id} value={s.name}>
                {s.name} Shift ({s.startTime} – {s.endTime})
              </option>
            ))}
          </SelectField>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Assign Shift</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetShiftId)}
        title="Confirm Deletion"
        message="Are you sure you want to delete this shift master? This action cannot be undone."
        isLoading={deleteShift.isPending}
        onClose={() => setDeleteTargetShiftId(null)}
        onConfirm={confirmDeleteShift}
      />
    </div>
  );
}
