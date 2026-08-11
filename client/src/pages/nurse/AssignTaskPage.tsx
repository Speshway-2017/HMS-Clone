import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Search,
  ClipboardList,
  User,
  Calendar,
  Clock,
  Bell,
  UploadCloud,
  FileText,
  Trash2,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileUp,
  ChevronDown,
  Sparkles,
  Inbox
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { usePatients } from "../../features/patients";
import { useStaffList } from "../../features/staff";

const TASK_NAMES = [
  "Medication Administration",
  "Blood Pressure Check",
  "Temperature Check",
  "IV Fluid Change",
  "Dressing Change",
  "Blood Sample Collection",
  "ECG Monitoring",
  "Oxygen Monitoring",
  "Doctor Follow-up",
  "Other"
];

const PRIORITIES = [
  { id: "low", label: "Low", color: "bg-emerald-50 text-emerald-700 border-emerald-200 active:bg-emerald-100", activeColor: "bg-emerald-600 text-white border-emerald-600" },
  { id: "medium", label: "Medium", color: "bg-amber-50 text-amber-700 border-amber-200 active:bg-amber-100", activeColor: "bg-amber-500 text-white border-amber-500" },
  { id: "high", label: "High", color: "bg-orange-50 text-orange-700 border-orange-200 active:bg-orange-100", activeColor: "bg-orange-500 text-white border-orange-500" },
  { id: "critical", label: "Critical", color: "bg-red-50 text-red-700 border-red-200 active:bg-red-100", activeColor: "bg-red-600 text-white border-red-600" },
];

export function AssignTaskPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  const [taskName, setTaskName] = useState(TASK_NAMES[0]);
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [reminder, setReminder] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const { data: patientsData, isLoading: isPatientsLoading } = usePatients({ search: searchQuery });
  const { data: staffData } = useStaffList({ role: "nurse" });

  const activePatients = patientsData?.data ?? [];
  const activeNurses = staffData?.data ?? [];

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setAttachments([...attachments, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Submit Task Form
  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Please select a patient.");
      return;
    }
    if (!assignedTo) {
      toast.error("Please assign the task to a nurse.");
      return;
    }
    if (!dueDate || !dueTime) {
      toast.error("Please specify both due date and due time.");
      return;
    }

    setIsSubmitting(true);
    // Simulate API request Delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);

    toast.success(isDraft ? "Task draft saved successfully!" : "Task successfully assigned!");
    navigate("/nurse");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <Link to="/nurse" className="hover:text-blue-600 transition-colors">Workspace</Link> &gt; Assign Task
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Assign Nursing Task
            <Sparkles className="h-5 w-5 text-blue-500 fill-blue-100" />
          </h1>
          <p className="text-sm text-slate-500">Create and assign nursing activities for patients.</p>
        </div>
      </div>

      {/* Main Container: Split Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Form: Takes 2 cols on wide, full on medium */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={(e) => handleSubmit(e, false)}>
            <Card className="p-6 rounded-[16px] border border-slate-100 bg-white shadow-sm hover:shadow-md/5 transition-shadow duration-300">
              <div className="space-y-6">
                
                {/* 1. Patient Picker Row */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Patient</label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search admitted patients by name or ID..."
                        value={selectedPatient ? selectedPatient.name : searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (selectedPatient) setSelectedPatient(null);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                      {selectedPatient && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatient(null);
                            setSearchQuery("");
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-red-500 hover:text-red-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Patient Results Autocomplete Dropdown */}
                    {showDropdown && !selectedPatient && (
                      <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                        {isPatientsLoading ? (
                          <div className="px-4 py-3 text-xs text-slate-500">Searching database...</div>
                        ) : activePatients.length > 0 ? (
                          activePatients.map((patient: any) => (
                            <button
                              key={patient._id}
                              type="button"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setShowDropdown(false);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
                                {patient.name.charAt(0)}
                              </div>
                              <div className="overflow-hidden">
                                <div className="text-sm font-semibold text-slate-800 truncate">{patient.name}</div>
                                <div className="text-xs text-slate-500">UHID: {patient.uhid} • Age: {patient.age}</div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-xs text-slate-500">No matching patients found.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Patient Overview Sub-card */}
                  {selectedPatient && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/20 p-4 flex gap-4 items-center animate-fadeIn">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg border-2 border-white shadow-sm">
                        {selectedPatient.name.charAt(0)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Name</div>
                          <div className="text-sm font-bold text-slate-800">{selectedPatient.name}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient ID</div>
                          <div className="text-xs font-semibold text-slate-600 mt-0.5">{selectedPatient.uhid || "P-MOCK"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ward</div>
                          <div className="text-xs font-semibold text-slate-600 mt-0.5">{selectedPatient.status === "admitted" ? "General Ward B" : "ICU Care"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room Number</div>
                          <div className="text-xs font-semibold text-slate-600 mt-0.5">Room 208 • Bed 04</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Task Name Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Task Name</label>
                  <div className="relative">
                    <select
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm outline-none appearance-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      {TASK_NAMES.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </div>

                {/* 3. Task Description TextArea */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Task Description</label>
                  <textarea
                    rows={4}
                    placeholder="Enter detailed nursing instructions, vital range targets, medication dosages, or preparation steps..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  />
                </div>

                {/* 4. Priority Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Priority</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PRIORITIES.map((p) => {
                      const isSelected = priority === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPriority(p.id)}
                          className={`flex items-center justify-center rounded-lg border py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                            isSelected ? p.activeColor : p.color
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Assignment dropdown */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Assign To</label>
                  <div className="relative">
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm outline-none appearance-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="">Select a Nurse...</option>
                      {activeNurses.map((nurse: any) => (
                        <option key={nurse._id} value={nurse._id}>
                          {nurse.name} ({nurse.employeeId || "Staff"})
                        </option>
                      ))}
                      {/* Placeholder fallbacks if no server staff fetched */}
                      {activeNurses.length === 0 && (
                        <>
                          <option value="1">Sr. Priya Nair</option>
                          <option value="2">Nurse Rahul Sharma</option>
                          <option value="3">Sr. Linda Jenkins</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </div>

                {/* 6. Scheduling Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Due Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Due Time</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 7. Reminder Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/20 p-4">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-blue-500 fill-blue-50" />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Notification Alerts</div>
                      <div className="text-xs text-slate-500">Notify nurse 15 minutes before task is due.</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminder}
                      onChange={(e) => setReminder(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 8. Attachments upload */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Attachments</label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-6 px-4 text-center cursor-pointer hover:border-blue-400 hover:bg-slate-50/80 transition-all group"
                  >
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <UploadCloud className="h-8 w-8 text-slate-400 mb-2 group-hover:text-blue-500 group-hover:scale-105 transition-all" />
                    <span className="text-xs font-semibold text-slate-600">Drag & Drop files or click to browse</span>
                    <span className="text-[10px] text-slate-400 mt-1">PDFs, Word documents, clinical report scans up to 10MB</span>
                  </div>

                  {/* Upload List */}
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-xs bg-slate-50">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                            <span className="text-slate-700 truncate font-medium">{file.name}</span>
                            <span className="text-[10px] text-slate-400">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-3 border-t border-slate-100 pt-6">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold px-6"
                  >
                    {isSubmitting ? "Assigning..." : "Assign Task"}
                  </Button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Save Draft
                  </button>
                </div>

              </div>
            </Card>
          </form>
        </div>

        {/* Right Sidebar: Pending list, Upcoming list, and Statistics */}
        <div className="space-y-6">
          
          {/* Statistics Panel */}
          <Card className="p-6 rounded-[16px] border border-slate-100 bg-white shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-blue-600" />
              Task Statistics
            </h2>
            <div className="space-y-4">
              
              {/* Circular completion ring simulation */}
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-slate-100">
                  <div className="absolute top-[-4px] left-[-4px] h-16 w-16 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600 rotation-45"></div>
                  <span className="text-sm font-bold text-slate-800">75%</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">18 / 24 Completed</div>
                  <p className="text-xs text-slate-400">Shift tasks progress stats</p>
                </div>
              </div>

              {/* Priority Load Distribution */}
              <div className="space-y-2 pt-2 border-t border-slate-50 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span> Critical Tasks
                  </span>
                  <span className="font-bold text-slate-700">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-500"></span> High Priority
                  </span>
                  <span className="font-bold text-slate-700">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span> Medium Priority
                  </span>
                  <span className="font-bold text-slate-700">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Low Priority
                  </span>
                  <span className="font-bold text-slate-700">8</span>
                </div>
              </div>

            </div>
          </Card>

          {/* Today's Pending Tasks */}
          <Card className="p-6 rounded-[16px] border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                Shift Pending Tasks
              </h2>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase">Today</span>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-slate-50/50 transition-colors">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-amber-50 text-amber-700 font-bold text-xs border border-amber-150">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-800">Medication Administration</div>
                  <p className="text-[10px] text-slate-500 truncate">Patient: Sita Devi • Room 202</p>
                  <span className="text-[9px] font-bold text-red-500 mt-1 block">Due in 15 mins</span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-slate-50/50 transition-colors">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-700 font-bold text-xs border border-blue-150">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-800">Blood Sample Collection</div>
                  <p className="text-[10px] text-slate-500 truncate">Patient: Rahul Verma • Room 104</p>
                  <span className="text-[9px] font-bold text-amber-600 mt-1 block">Due in 1 hour</span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-slate-50/50 transition-colors">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-150">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-800">Dressing Change</div>
                  <p className="text-[10px] text-slate-500 truncate">Patient: Amit Patel • Room 111</p>
                  <span className="text-[9px] font-bold text-slate-400 mt-1 block">Completed</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="p-6 rounded-[16px] border border-slate-100 bg-white shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-blue-600" />
              Upcoming Tasks
            </h2>
            <div className="space-y-3">
              
              <div className="border-l-2 border-blue-500 pl-3 py-1 text-xs">
                <div className="font-bold text-slate-800">IV Fluid Change</div>
                <p className="text-[10px] text-slate-500">Patient: Anjali Sen • Room 108</p>
                <div className="text-[9px] text-slate-400 mt-0.5">Tomorrow, 09:30 AM</div>
              </div>

              <div className="border-l-2 border-slate-300 pl-3 py-1 text-xs">
                <div className="font-bold text-slate-800">ECG Monitoring Session</div>
                <p className="text-[10px] text-slate-500">Patient: Sita Devi • Room 202</p>
                <div className="text-[9px] text-slate-400 mt-0.5">Tomorrow, 14:00 PM</div>
              </div>

            </div>
          </Card>

        </div>

      </div>

    </div>
  );
}
