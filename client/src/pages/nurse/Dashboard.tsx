import { useState } from "react";
import toast from "react-hot-toast";
import {
  Users,
  Activity,
  BedDouble,
  ClipboardList,
  Heart,
  TrendingUp,
  AlertCircle,
  Plus,
  PlusCircle,
  Bell,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  User,
  Thermometer,
  ShieldAlert,
  Save,
  Grid,
  Pill
} from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";
import { useStaffProfileMe } from "../../features/staff";
import {
  useNurseInpatients,
  useNurseInpatient,
  useSaveNurseVitals,
  useAddNurseNotes,
  useNurseBeds,
  useNurseWards,
  useNurseRooms
} from "../../features/nurse";

interface NurseDashboardProps {
  activeTab?: "overview" | "inpatients" | "wards" | "notifications";
}

export function NurseDashboard({ activeTab: initialTab }: NurseDashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"inpatients" | "wards" | "notifications">(
    initialTab && initialTab !== "overview" ? initialTab : "inpatients"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Form states for Recording Vitals
  const [temp, setTemp] = useState("");
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [resp, setResp] = useState("");
  const [o2, setO2] = useState("");
  const [weight, setWeight] = useState("");
  const [isVitalsSubmitting, setIsVitalsSubmitting] = useState(false);

  // Form states for progress notes
  const [careLogText, setCareLogText] = useState("");
  const [isNoteSubmitting, setIsNoteSubmitting] = useState(false);

  // Queries
  const { data: staff } = useStaffProfileMe();
  const { data: inpatients, isLoading: isInpatientsLoading } = useNurseInpatients();
  const { data: selectedInpatient, isLoading: isDetailsLoading } = useNurseInpatient(selectedPatientId || undefined);
  const { data: beds, isLoading: isBedsLoading } = useNurseBeds();
  const { data: wards, isLoading: isWardsLoading } = useNurseWards();
  const { data: rooms, isLoading: isRoomsLoading } = useNurseRooms();

  // Mutations
  const saveVitalsMutation = useSaveNurseVitals(selectedPatientId || "");
  const addNotesMutation = useAddNurseNotes(selectedPatientId || "");

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setIsVitalsSubmitting(true);

    try {
      await saveVitalsMutation.mutateAsync({
        temperature: temp,
        bloodPressure: bp,
        pulseRate: pulse,
        respiratoryRate: resp,
        oxygenSaturation: o2,
        weight: weight
      });
      toast.success("Patient vitals recorded successfully!");
      setTemp("");
      setBp("");
      setPulse("");
      setResp("");
      setO2("");
      setWeight("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save vitals.");
    } finally {
      setIsVitalsSubmitting(false);
    }
  };

  const handleSaveCareLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !careLogText.trim()) return;
    setIsNoteSubmitting(true);

    try {
      await addNotesMutation.mutateAsync({
        notes: careLogText
      });
      toast.success("Progress log recorded!");
      setCareLogText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save note.");
    } finally {
      setIsNoteSubmitting(false);
    }
  };

  // Filter list
  const filteredInpatients = (inpatients || []).filter((item: any) => {
    const name = item.patient?.name || "";
    const uhid = item.patient?.uhid || "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uhid.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalAdmittedCount = inpatients?.length || 0;
  const occupiedBedsCount = beds?.filter((b) => b.isOccupied).length || 0;
  const totalBedsCount = beds?.length || 0;
  const availableBedsCount = totalBedsCount - occupiedBedsCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hello, Nurse {staff?.name ?? user?.name} 👋</h1>
        <p className="text-sm text-slate-500">
          Department: {typeof staff?.department === "object" && staff.department ? (staff.department as any).name : "General Ward"} · Shift: On Duty
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Active Inpatients"
          value={totalAdmittedCount}
          icon={<Users className="h-5 w-5 text-indigo-500" />}
          emphasis
        />
        <KpiCard
          label="Occupied Beds"
          value={occupiedBedsCount}
          icon={<BedDouble className="h-5 w-5 text-rose-500" />}
        />
        <KpiCard
          label="Available Beds"
          value={availableBedsCount}
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="Task Load Index"
          value={`${staff?.taskLoad || 45}%`}
          icon={<Activity className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-lg p-1 shadow-sm">
        {(["inpatients", "wards", "notifications"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedPatientId(null);
            }}
            className={`flex-1 py-2 text-center text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
              activeTab === tab && !selectedPatientId
                ? "bg-navy-700 text-white shadow"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab === "inpatients" ? "Inpatient Roster" : tab === "wards" ? "Ward Map & Beds" : "Real-time Alerts"}
          </button>
        ))}
      </div>

      {/* 1. INPATIENTS WORKSPACE */}
      {activeTab === "inpatients" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Patients List Left Panel */}
          <div className={`${selectedPatientId ? "hidden lg:block" : "lg:col-span-3"} space-y-4`}>
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search admitted patients by name or UHID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border pl-9 pr-4 py-2 outline-none focus:border-navy-500 text-xs font-medium"
                />
              </div>
            </Card>

            <Card className="p-0 overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Active Ward Roster
              </div>
              {isInpatientsLoading ? (
                <div className="p-6 text-center text-slate-400">Loading patients...</div>
              ) : filteredInpatients.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-semibold">No admitted patients found.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
                  {filteredInpatients.map((item: any) => {
                    const isSelected = selectedPatientId === item.patient?._id;
                    return (
                      <div
                        key={item._id}
                        onClick={() => setSelectedPatientId(item.patient?._id)}
                        className={`flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                          isSelected ? "bg-navy-50/60 border-l-4 border-navy-700 pl-5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-navy-700 font-bold text-sm">
                            {item.patient?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{item.patient?.name}</h4>
                            <p className="text-[10px] text-slate-400">
                              UHID: {item.patient?.uhid} · {item.patient?.gender}, {item.patient?.age} yrs
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge tone="info">
                            Room {item.room?.roomNumber || "N/A"} · Bed {item.bed?.bedNumber || "N/A"}
                          </Badge>
                          <p className="text-[9px] text-slate-400 mt-1">{item.ward || "General Ward"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Patient Workspace Details Right Panel */}
          {selectedPatientId && (
            <div className="lg:col-span-2 space-y-6">
              {/* Back Button for mobile */}
              <button
                onClick={() => setSelectedPatientId(null)}
                className="lg:hidden flex items-center gap-1 text-xs font-bold text-navy-700 mb-2 hover:underline"
              >
                ← Back to Roster
              </button>

              {isDetailsLoading ? (
                <Card className="p-6 text-center text-slate-400">Loading patient details...</Card>
              ) : selectedInpatient ? (
                <>
                  {/* Patient Banner */}
                  <Card className="p-6 bg-slate-900 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl" />
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                          Room Allocated
                        </span>
                        <h2 className="text-lg font-bold mt-2">{selectedInpatient.patient?.name}</h2>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-350 mt-1">
                          <p>Age: {selectedInpatient.patient?.age || "—"}</p>
                          <p>Gender: {selectedInpatient.patient?.gender || "—"}</p>
                          <p>Blood Group: {selectedInpatient.patient?.bloodGroup || "—"}</p>
                          <p>Allergies: <span className="text-rose-400 font-semibold">{selectedInpatient.patient?.allergies || "None"}</span></p>
                        </div>
                      </div>
                      <div className="text-right bg-white/5 border border-white/10 rounded-lg p-3 text-xs">
                        <p className="font-bold text-white">Bed: {selectedInpatient.bed?.bedNumber || "N/A"}</p>
                        <p className="text-slate-350 text-[10px]">Room: {selectedInpatient.room?.roomNumber || "N/A"}</p>
                        <p className="text-slate-350 text-[10px]">Ward: {selectedInpatient.ward || "N/A"}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Bedside Workspace: Vitals Form + Meds */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recording Vitals Form */}
                    <Card className="p-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
                        <Thermometer className="h-4.5 w-4.5 text-rose-500" />
                        Record Vital Signs
                      </h3>
                      <form onSubmit={handleRecordVitals} className="space-y-3 text-[11px] font-semibold text-slate-600">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block mb-0.5">Temperature (°F)</label>
                            <input
                              type="text"
                              value={temp}
                              onChange={(e) => setTemp(e.target.value)}
                              placeholder="98.6"
                              className="w-full rounded border px-2 py-1.5 outline-none focus:border-navy-500 font-medium text-xs"
                            />
                          </div>
                          <div>
                            <label className="block mb-0.5">Blood Pressure</label>
                            <input
                              type="text"
                              value={bp}
                              onChange={(e) => setBp(e.target.value)}
                              placeholder="120/80"
                              className="w-full rounded border px-2 py-1.5 outline-none focus:border-navy-500 font-medium text-xs"
                            />
                          </div>
                          <div>
                            <label className="block mb-0.5">Pulse Rate (bpm)</label>
                            <input
                              type="text"
                              value={pulse}
                              onChange={(e) => setPulse(e.target.value)}
                              placeholder="72"
                              className="w-full rounded border px-2 py-1.5 outline-none focus:border-navy-500 font-medium text-xs"
                            />
                          </div>
                          <div>
                            <label className="block mb-0.5">Resp Rate (breaths/m)</label>
                            <input
                              type="text"
                              value={resp}
                              onChange={(e) => setResp(e.target.value)}
                              placeholder="18"
                              className="w-full rounded border px-2 py-1.5 outline-none focus:border-navy-500 font-medium text-xs"
                            />
                          </div>
                          <div>
                            <label className="block mb-0.5">Oxygen Saturation (%)</label>
                            <input
                              type="text"
                              value={o2}
                              onChange={(e) => setO2(e.target.value)}
                              placeholder="98"
                              className="w-full rounded border px-2 py-1.5 outline-none focus:border-navy-500 font-medium text-xs"
                            />
                          </div>
                          <div>
                            <label className="block mb-0.5">Weight (kg)</label>
                            <input
                              type="text"
                              value={weight}
                              onChange={(e) => setWeight(e.target.value)}
                              placeholder="70"
                              className="w-full rounded border px-2 py-1.5 outline-none focus:border-navy-500 font-medium text-xs"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={isVitalsSubmitting}
                          className="w-full mt-3 rounded bg-navy-700 py-2 text-white font-bold hover:bg-navy-800 transition-colors flex items-center justify-center gap-1.5 text-xs shadow-sm"
                        >
                          <Save className="h-3.5 w-3.5" /> Save Vitals
                        </button>
                      </form>
                    </Card>

                    {/* Prescribed Medications */}
                    <Card className="p-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
                        <Pill className="h-4.5 w-4.5 text-indigo-500" />
                        Medication Schedule
                      </h3>
                      {selectedInpatient.medicationOrders && selectedInpatient.medicationOrders.length > 0 ? (
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {selectedInpatient.medicationOrders.map((med: any, idx: number) => (
                            <div key={idx} className="rounded-lg bg-slate-50 border p-3 flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">{med.drugName}</h4>
                                <p className="text-[10px] text-slate-500">
                                  {med.dosage} · {med.frequency} · {med.route}
                                </p>
                                <p className="text-[9px] text-slate-400 mt-1">Duration: {med.duration}</p>
                              </div>
                              <Badge tone="info">Active</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-36 flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-450">
                          <AlertCircle className="h-5 w-5 mb-1 text-slate-400" />
                          <p className="text-[10px] font-semibold">No active medication orders prescribed</p>
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Vitals History */}
                  <Card className="p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Vitals History Log</h3>
                    {selectedInpatient.vitals && selectedInpatient.vitals.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] font-medium text-slate-700">
                          <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Recorded At</th>
                              <th className="px-3 py-2">Temp (°F)</th>
                              <th className="px-3 py-2">BP</th>
                              <th className="px-3 py-2">Pulse (bpm)</th>
                              <th className="px-3 py-2">O2 (%)</th>
                              <th className="px-3 py-2">By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedInpatient.vitals.map((v: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 text-slate-450">{new Date(v.recordedAt).toLocaleString("en-IN")}</td>
                                <td className="px-3 py-2 font-bold">{v.temperature || "—"}</td>
                                <td className="px-3 py-2">{v.bloodPressure || "—"}</td>
                                <td className="px-3 py-2">{v.pulseRate || "—"}</td>
                                <td className="px-3 py-2 font-bold text-emerald-600">{v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"}</td>
                                <td className="px-3 py-2 text-slate-400">{v.recordedBy}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">No vital records found.</p>
                    )}
                  </Card>

                  {/* Care Progress Logging & Patient Timeline */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Add Nursing Log */}
                    <Card className="p-5 md:col-span-1 h-fit">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                        <ClipboardList className="h-4.5 w-4.5 text-indigo-500" />
                        Log Care Note
                      </h3>
                      <form onSubmit={handleSaveCareLog} className="space-y-3">
                        <textarea
                          rows={4}
                          value={careLogText}
                          onChange={(e) => setCareLogText(e.target.value)}
                          placeholder="Log medication admin, feeding, checks, dressing updates..."
                          className="w-full rounded border px-3 py-2 outline-none focus:border-navy-500 font-medium text-xs"
                          required
                        />
                        <button
                          type="submit"
                          disabled={isNoteSubmitting}
                          className="w-full rounded bg-navy-700 py-2 text-white font-bold hover:bg-navy-800 transition-colors text-xs"
                        >
                          Save Log Entry
                        </button>
                      </form>
                    </Card>

                    {/* Care Timeline */}
                    <Card className="p-5 md:col-span-2 max-h-[300px] overflow-y-auto">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Admission Timeline</h3>
                      {selectedInpatient.timeline && selectedInpatient.timeline.length > 0 ? (
                        <div className="relative border-l border-slate-200 pl-4 space-y-4 text-xs font-semibold text-slate-700">
                          {selectedInpatient.timeline.map((item: any, idx: number) => (
                            <div key={idx} className="relative">
                              <div className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-400" />
                              <div className="flex justify-between items-start text-[10px] text-slate-400">
                                <span>{new Date(item.date).toLocaleDateString("en-IN")} · {item.time}</span>
                                <span className="uppercase font-bold text-navy-700">{item.userName} ({item.userRole})</span>
                              </div>
                              <p className="text-slate-600 mt-0.5">{item.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-4">No timeline logged yet.</p>
                      )}
                    </Card>
                  </div>
                </>
              ) : (
                <Card className="p-6 text-center text-slate-400">Patient not found.</Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. WARD MAP & BEDS */}
      {activeTab === "wards" && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <Grid className="h-5 w-5 text-indigo-500" />
            Hospital Beds Grid Map
          </h3>
          {isBedsLoading || isWardsLoading || isRoomsLoading ? (
            <div className="text-center text-slate-400 py-10">Querying bed positions...</div>
          ) : !beds || beds.length === 0 ? (
            <div className="text-center text-slate-400 py-10">No beds configured.</div>
          ) : (
            <div className="space-y-6">
              {/* Group beds by rooms */}
              {rooms?.map((rm) => {
                const roomBeds = beds.filter((b) => b.room === rm._id || (typeof b.room === "object" && (b.room as any)?._id === rm._id));
                return (
                  <div key={rm._id} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-5">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Room {rm.roomNumber}</h4>
                        <p className="text-[10px] text-slate-500 capitalize">{rm.roomType} Suite</p>
                      </div>
                      <Badge tone="neutral">
                        {roomBeds.filter(b => b.isOccupied).length} / {roomBeds.length} Occupied
                      </Badge>
                    </div>
                    {roomBeds.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No beds inside this room.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                        {roomBeds.map((bd) => (
                          <div
                            key={bd._id}
                            className={`rounded-lg border p-3 text-center flex flex-col justify-between h-20 transition-all ${
                              bd.isOccupied
                                ? "bg-rose-50 border-rose-200 text-rose-800"
                                : "bg-emerald-50 border-emerald-200 text-emerald-800"
                            }`}
                          >
                            <BedDouble className="h-5 w-5 mx-auto opacity-80" />
                            <p className="text-[10px] font-bold">Bed {bd.bedNumber}</p>
                            <span className="text-[9px] uppercase tracking-wider font-semibold">
                              {bd.isOccupied ? "Occupied" : "Available"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* 3. ALERTS TAB */}
      {activeTab === "notifications" && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <Bell className="h-5 w-5 text-rose-500 animate-pulse" />
            Live Bedside & Admission Alerts
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { id: 1, title: "Urgent Admission Request", msg: "A new outpatient (UHID: PAT-94302) requires admission from OP-Consultation.", time: "2 mins ago", severity: "critical" },
              { id: 2, title: "Low Stock Alert", msg: "Inventory Item (Vial: Insulin 10ml) is running below reorder limit.", time: "10 mins ago", severity: "warning" },
              { id: 3, title: "Shift Checklist Sync", msg: "Review shift checklist logs and sync clinical reports before handoff.", time: "1 hour ago", severity: "info" }
            ].map((alert) => (
              <div
                key={alert.id}
                className={`flex gap-4 p-4 rounded-xl border ${
                  alert.severity === "critical"
                    ? "bg-red-50/50 border-red-100 text-red-900"
                    : alert.severity === "warning"
                    ? "bg-amber-50/50 border-amber-100 text-amber-900"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <div className="mt-0.5">
                  <ShieldAlert className={`h-5 w-5 ${
                    alert.severity === "critical"
                      ? "text-red-500"
                      : alert.severity === "warning"
                      ? "text-amber-500"
                      : "text-slate-400"
                  }`} />
                </div>
                <div>
                  <h4 className="text-xs font-bold">{alert.title}</h4>
                  <p className="text-xs font-medium opacity-90 mt-0.5">{alert.msg}</p>
                  <span className="text-[9px] opacity-75 mt-1 block flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {alert.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
export default NurseDashboard;
