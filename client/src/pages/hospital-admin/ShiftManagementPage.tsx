import { useState } from "react";
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Users,
  ShieldCheck,
  CheckCircle2,
  Moon,
  Sun,
  Sunrise,
  Sunset,
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
import { Modal } from "../../components/ui/Modal";

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
  const [gracePeriod, setGracePeriod] = useState(15);
  const [halfDayHours, setHalfDayHours] = useState(4);
  const [fullDayHours, setFullDayHours] = useState(8);
  const [crossesMidnight, setCrossesMidnight] = useState(false);

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

  const handleOpenCreate = () => {
    setEditingShift(null);
    setShiftName("");
    setStartTime("09:00 AM");
    setEndTime("05:00 PM");
    setGracePeriod(15);
    setHalfDayHours(4);
    setFullDayHours(8);
    setCrossesMidnight(false);
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
    setIsShiftModalOpen(true);
  };

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName || !startTime || !endTime) return;

    if (editingShift) {
      await updateShift.mutateAsync({
        id: editingShift._id,
        name: shiftName,
        startTime,
        endTime,
        gracePeriodMinutes: gracePeriod,
        halfDayHours,
        fullDayHours,
        crossesMidnight,
      });
    } else {
      await createShift.mutateAsync({
        name: shiftName,
        startTime,
        endTime,
        gracePeriodMinutes: gracePeriod,
        halfDayHours,
        fullDayHours,
        crossesMidnight,
      });
    }

    setIsShiftModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this shift master?")) {
      await deleteShift.mutateAsync(id);
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
          icon={<Clock className="h-5 w-5 text-navy-600" />}
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
                    className="p-1 text-slate-400 hover:text-navy-700 rounded hover:bg-slate-100"
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
                  <span className="font-bold text-navy-800">
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
                  <td className="py-3 px-4 font-mono font-semibold text-navy-700">{emp.employeeId}</td>
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
        <form onSubmit={handleShiftSubmit} className="space-y-4">
          <InputField
            label="Shift Name"
            type="text"
            placeholder="e.g. Morning, Evening, Night, General"
            value={shiftName}
            onChange={(e) => setShiftName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Start Time (e.g. 08:00 AM)"
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <InputField
              label="End Time (e.g. 04:00 PM)"
              type="text"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <InputField
              label="Grace Period (mins)"
              type="number"
              value={gracePeriod}
              onChange={(e) => setGracePeriod(Number(e.target.value))}
            />
            <InputField
              label="Full Day (hrs)"
              type="number"
              value={fullDayHours}
              onChange={(e) => setFullDayHours(Number(e.target.value))}
            />
            <InputField
              label="Half Day (hrs)"
              type="number"
              value={halfDayHours}
              onChange={(e) => setHalfDayHours(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="crossesMidnight"
              checked={crossesMidnight}
              onChange={(e) => setCrossesMidnight(e.target.checked)}
              className="h-4 w-4 text-navy-600 rounded border-slate-300 focus:ring-navy-500"
            />
            <label htmlFor="crossesMidnight" className="text-xs font-semibold text-slate-700">
              Shift crosses midnight (Night shift)
            </label>
          </div>

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
    </div>
  );
}
