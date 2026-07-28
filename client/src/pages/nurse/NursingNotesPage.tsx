import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText,
  Search,
  Plus,
  Calendar,
  Clock,
  User,
  Heart,
  Thermometer,
  Activity,
  Wind,
  Droplet,
  Trash2,
  Edit3,
  Printer,
  FileDown,
  Paperclip,
  X,
  PlusCircle,
  Filter,
  Users,
  AlertTriangle,
  Sparkles,
  Inbox
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { usePatients } from "../../features/patients";
import { useAuth } from "../../context/AuthContext";

interface Note {
  id: string;
  patientId: string;
  patientName: string;
  uhid: string;
  ward: string;
  roomNumber: string;
  date: string;
  time: string;
  nurseName: string;
  observation: string;
  symptoms: string;
  medicationGiven: string;
  status: "Routine" | "Critical" | "Urgent" | "Follow-up";
  vitals: {
    temperature: string;
    bloodPressure: string;
    pulseRate: string;
    respiratoryRate: string;
    oxygenSaturation: string;
  };
  additionalNotes: string;
  attachments: string[];
}

const INITIAL_NOTES: Note[] = [
  {
    id: "note-1",
    patientId: "pat-1",
    patientName: "Sita Devi",
    uhid: "UHID-982341",
    ward: "General Ward B",
    roomNumber: "Room 202 • Bed 3",
    date: new Date().toISOString().split("T")[0],
    time: "10:15 AM",
    nurseName: "Sr. Priya Nair, RN",
    observation: "Patient is conscious, alert, and oriented. Complaining of mild headache. Administered prescribed analgesic.",
    symptoms: "Mild headache, slight fatigue",
    medicationGiven: "Paracetamol 650mg PO",
    status: "Routine",
    vitals: {
      temperature: "98.6 °F",
      bloodPressure: "120/80 mmHg",
      pulseRate: "72 bpm",
      respiratoryRate: "16 bpm",
      oxygenSaturation: "98%",
    },
    additionalNotes: "Will monitor vitals again in 2 hours. Urged patient to increase fluid intake.",
    attachments: ["clinical_observation_sheet_v1.pdf"],
  },
  {
    id: "note-2",
    patientId: "pat-2",
    patientName: "Rahul Verma",
    uhid: "UHID-184752",
    ward: "ICU Care Station",
    roomNumber: "ICU Room 04 • Bed 1",
    date: new Date().toISOString().split("T")[0],
    time: "08:30 AM",
    nurseName: "Sr. Priya Nair, RN",
    observation: "SpO2 level dropped suddenly. Patient showed signs of dyspnea. Put on low-flow oxygen mask and called attending doctor.",
    symptoms: "Shortness of breath, anxiety, cyanosis indicators",
    medicationGiven: "Albuterol Nebulizer treatment",
    status: "Critical",
    vitals: {
      temperature: "99.1 °F",
      bloodPressure: "135/90 mmHg",
      pulseRate: "98 bpm",
      respiratoryRate: "24 bpm",
      oxygenSaturation: "91%",
    },
    additionalNotes: "Oxygen flow set at 4L/min. Attending physician Dr. Anand notified. SpO2 recovered to 96% after 15 mins.",
    attachments: ["ecg_wave_scan_0830.png", "oxygen_log.pdf"],
  },
  {
    id: "note-3",
    patientId: "pat-3",
    patientName: "Amit Patel",
    uhid: "UHID-334912",
    ward: "General Ward B",
    roomNumber: "Room 211 • Bed 2",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Yesterday
    time: "14:45 PM",
    nurseName: "Nurse Rahul Sharma, RN",
    observation: "Post-op wound dressing performed. No active bleeding noted at incision site. Minimal serosanguinous drainage.",
    symptoms: "Mild localized pain at surgical site",
    medicationGiven: "Tramadol 50mg IV",
    status: "Follow-up",
    vitals: {
      temperature: "98.2 °F",
      bloodPressure: "115/75 mmHg",
      pulseRate: "68 bpm",
      respiratoryRate: "14 bpm",
      oxygenSaturation: "99%",
    },
    additionalNotes: "Incision is clean, dry, and intact. Patient educated on avoiding heavy strains. Pain managed successfully.",
    attachments: [],
  }
];

export function NursingNotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "today" | "week" | "critical">("all");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Form Fields State
  const [formPatient, setFormPatient] = useState<any>(null);
  const [formObservation, setFormObservation] = useState("");
  const [formSymptoms, setFormSymptoms] = useState("");
  const [formMedication, setFormMedication] = useState("");
  const [formStatus, setFormStatus] = useState<Note["status"]>("Routine");
  const [formTemp, setFormTemp] = useState("");
  const [formBP, setFormBP] = useState("");
  const [formPulse, setFormPulse] = useState("");
  const [formResp, setFormResp] = useState("");
  const [formSpo2, setFormSpo2] = useState("");
  const [formAdditionalNotes, setFormAdditionalNotes] = useState("");
  const [formAttachments, setFormAttachments] = useState<string[]>([]);
  const [tempAttachmentName, setTempAttachmentName] = useState("");

  // Patients query for Live dropdown data
  const { data: patientsData } = usePatients({ page: 1, status: "admitted" });
  const activeInpatients = patientsData?.data ?? [];

  // Reset form helper
  const resetForm = () => {
    setFormPatient(null);
    setFormObservation("");
    setFormSymptoms("");
    setFormMedication("");
    setFormStatus("Routine");
    setFormTemp("");
    setFormBP("");
    setFormPulse("");
    setFormResp("");
    setFormSpo2("");
    setFormAdditionalNotes("");
    setFormAttachments([]);
    setTempAttachmentName("");
    setEditingNote(null);
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    
    // Attempt matching with active patient list
    const patientObj = activeInpatients.find(p => p._id === note.patientId) || {
      _id: note.patientId,
      name: note.patientName,
      uhid: note.uhid,
    };
    
    setFormPatient(patientObj);
    setFormObservation(note.observation);
    setFormSymptoms(note.symptoms);
    setFormMedication(note.medicationGiven);
    setFormStatus(note.status);
    setFormTemp(note.vitals.temperature.replace(" °F", ""));
    setFormBP(note.vitals.bloodPressure.replace(" mmHg", ""));
    setFormPulse(note.vitals.pulseRate.replace(" bpm", ""));
    setFormResp(note.vitals.respiratoryRate.replace(" bpm", ""));
    setFormSpo2(note.vitals.oxygenSaturation.replace("%", ""));
    setFormAdditionalNotes(note.additionalNotes);
    setFormAttachments(note.attachments);
    
    setIsModalOpen(true);
  };

  // Save/Submit note
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatient) {
      toast.error("Please select a patient.");
      return;
    }
    if (!formObservation.trim()) {
      toast.error("Please fill in observations.");
      return;
    }

    const currentFormattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const currentFormattedDate = new Date().toISOString().split("T")[0];

    const notePayload: Note = {
      id: editingNote ? editingNote.id : `note-${Date.now()}`,
      patientId: formPatient._id || formPatient.id,
      patientName: formPatient.name,
      uhid: formPatient.uhid || "MOCK-UHID",
      ward: formPatient.status === "admitted" ? "General Ward B" : "ICU Care Station",
      roomNumber: "Room 204 • Bed 1", // Mock fallback
      date: editingNote ? editingNote.date : currentFormattedDate,
      time: editingNote ? editingNote.time : currentFormattedTime,
      nurseName: user?.name || "Staff Nurse, RN",
      observation: formObservation,
      symptoms: formSymptoms,
      medicationGiven: formMedication,
      status: formStatus,
      vitals: {
        temperature: formTemp ? `${formTemp} °F` : "--",
        bloodPressure: formBP ? `${formBP} mmHg` : "--",
        pulseRate: formPulse ? `${formPulse} bpm` : "--",
        respiratoryRate: formResp ? `${formResp} bpm` : "--",
        oxygenSaturation: formSpo2 ? `${formSpo2}%` : "--",
      },
      additionalNotes: formAdditionalNotes,
      attachments: formAttachments,
    };

    if (editingNote) {
      setNotes(notes.map((n) => (n.id === editingNote.id ? notePayload : n)));
      toast.success("Nursing note updated successfully.");
    } else {
      setNotes([notePayload, ...notes]);
      toast.success("Nursing note created successfully.");
    }

    setIsModalOpen(false);
    resetForm();
  };

  // Delete note
  const handleDeleteNote = (id: string) => {
    if (confirm("Are you sure you want to delete this nursing note?")) {
      setNotes(notes.filter((n) => n.id !== id));
      toast.success("Nursing note deleted.");
    }
  };

  // Add simulated attachment
  const handleAddAttachment = () => {
    if (tempAttachmentName.trim()) {
      setFormAttachments([...formAttachments, tempAttachmentName.trim()]);
      setTempAttachmentName("");
    }
  };

  // Print Note
  const handlePrint = (note: Note) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
        <head>
          <title>Nursing Observation Note - ${note.patientName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
            .title { font-size: 24px; font-weight: bold; color: #1e3a8a; }
            .row { display: flex; margin-bottom: 10px; }
            .label { font-weight: bold; width: 150px; }
            .section { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
            .vitals-grid { display: grid; grid-template-cols: repeat(5, 1fr); gap: 10px; background: #f3f4f6; padding: 12px; border-radius: 8px; }
            .vitals-val { font-weight: bold; font-size: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Hospital Management System</div>
            <div style="font-size: 14px; color: #666;">Nursing Observation Report</div>
          </div>
          <div class="row"><div class="label">Date/Time:</div><div>${note.date} @ ${note.time}</div></div>
          <div class="row"><div class="label">Recorded By:</div><div>${note.nurseName}</div></div>
          <div class="row"><div class="label">Patient Name:</div><div>${note.patientName} (${note.uhid})</div></div>
          <div class="row"><div class="label">Ward/Room:</div><div>${note.ward} - ${note.roomNumber}</div></div>
          <div class="row"><div class="label">Status Level:</div><div style="font-weight:bold; color: ${note.status === "Critical" ? "#ef4444" : "#2563eb"};">${note.status}</div></div>

          <div class="section">
            <h3>Clinical Vitals Summary</h3>
            <div class="vitals-grid">
              <div><div>Temp</div><div class="vitals-val">${note.vitals.temperature}</div></div>
              <div><div>BP</div><div class="vitals-val">${note.vitals.bloodPressure}</div></div>
              <div><div>Pulse</div><div class="vitals-val">${note.vitals.pulseRate}</div></div>
              <div><div>Resp Rate</div><div class="vitals-val">${note.vitals.respiratoryRate}</div></div>
              <div><div>SpO2</div><div class="vitals-val">${note.vitals.oxygenSaturation}</div></div>
            </div>
          </div>

          <div class="section">
            <h3>Observations & Activities</h3>
            <p><strong>Clinical Notes:</strong> ${note.observation}</p>
            <p><strong>Symptoms Described:</strong> ${note.symptoms || "None"}</p>
            <p><strong>Medication Administered:</strong> ${note.medicationGiven || "None"}</p>
            <p><strong>Additional Directions:</strong> ${note.additionalNotes || "None"}</p>
          </div>
          <script>window.print();</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Export PDF simulation
  const handleExportPDF = (note: Note) => {
    toast.success(`Exporting Clinical Note for ${note.patientName} to PDF format...`);
  };

  // Filter Logic
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // 1. Patient filter
      if (selectedPatientId !== "all" && n.patientId !== selectedPatientId) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesPatient = n.patientName.toLowerCase().includes(query) || n.uhid.toLowerCase().includes(query);
        const matchesObs = n.observation.toLowerCase().includes(query) || n.nurseName.toLowerCase().includes(query);
        if (!matchesPatient && !matchesObs) return false;
      }

      // 3. Date / Status filters
      if (filterType === "today") {
        const todayStr = new Date().toISOString().split("T")[0];
        if (n.date !== todayStr) return false;
      } else if (filterType === "week") {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (new Date(n.date).getTime() < oneWeekAgo) return false;
      } else if (filterType === "critical") {
        if (n.status !== "Critical" && n.status !== "Urgent") return false;
      }

      return true;
    });
  }, [notes, selectedPatientId, searchQuery, filterType]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <Link to="/nurse" className="hover:text-blue-600 transition-colors">Workspace</Link> &gt; Clinical Notes
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Nursing Notes
            <FileText className="h-6 w-6 text-blue-600" />
          </h1>
          <p className="text-sm text-slate-500">Document patient observations and nursing activities.</p>
        </div>
        <div>
          <Button
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add New Note
          </Button>
        </div>
      </div>

      {/* Top Filter and Search Bar Card */}
      <Card className="p-4 rounded-[16px] border border-slate-100 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          
          {/* Patient Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Filter by Patient</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none cursor-pointer focus:border-blue-500 focus:bg-white"
            >
              <option value="all">All Admitted Patients</option>
              {activeInpatients.map((p: any) => (
                <option key={p._id} value={p._id}>{p.name} ({p.uhid})</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex flex-col md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Search Notes</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by keywords, nurse names, observation logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Filter Pills Toggle */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Date & Priority filters</label>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50/50 p-1 gap-1">
              {([
                { id: "all", label: "All" },
                { id: "today", label: "Today" },
                { id: "week", label: "Week" },
                { id: "critical", label: "Critical" }
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFilterType(opt.id)}
                  className={`flex-1 rounded py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    filterType === opt.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </Card>

      {/* Main Content Area - Timeline Design */}
      <div className="relative pl-6 md:pl-8 border-l border-slate-200 ml-4 space-y-6">
        
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => {
            const isCritical = note.status === "Critical";
            return (
              <div key={note.id} className="relative animate-fadeIn">
                
                {/* Timeline Bullet Anchor */}
                <span className={`absolute -left-[31px] md:-left-[39px] top-1.5 flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full border-2 bg-white ${
                  isCritical ? "border-red-500" : "border-blue-600"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${isCritical ? "bg-red-500 animate-ping" : "bg-blue-600"}`} />
                </span>

                {/* Timeline Note Card */}
                <Card className="p-6 rounded-[16px] border border-slate-100 bg-white shadow-sm hover:shadow-md/5 transition-all">
                  
                  {/* Card Title & Meta Row */}
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-50 pb-3 mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Observation Log</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{note.patientName}</span>
                        <span className="text-xs text-slate-400">UHID: {note.uhid}</span>
                        <span className="text-xs text-slate-400">• {note.ward} • {note.roomNumber}</span>
                      </div>
                    </div>
                    
                    {/* Timestamp & Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold bg-slate-50 px-2 py-1 rounded">
                        <Calendar className="h-3 w-3" />
                        {note.date}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold bg-slate-50 px-2 py-1 rounded">
                        <Clock className="h-3 w-3" />
                        {note.time}
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                        note.status === "Critical"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : note.status === "Urgent"
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : note.status === "Follow-up"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {note.status}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="grid gap-6 md:grid-cols-3">
                    
                    {/* Notes & Observation column (Takes 2/3) */}
                    <div className="md:col-span-2 space-y-4">
                      
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Observation</h4>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">{note.observation}</p>
                      </div>

                      {note.symptoms && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reported Symptoms</h4>
                          <p className="text-xs text-slate-600 font-medium">{note.symptoms}</p>
                        </div>
                      )}

                      {note.medicationGiven && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Medication Administered</h4>
                          <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded">
                            <Heart className="h-3.5 w-3.5 fill-blue-100" />
                            {note.medicationGiven}
                          </span>
                        </div>
                      )}

                      {note.additionalNotes && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Additional Observations & Plan</h4>
                          <p className="text-xs text-slate-500 italic">{note.additionalNotes}</p>
                        </div>
                      )}

                      {/* Attachments */}
                      {note.attachments && note.attachments.length > 0 && (
                        <div className="pt-2">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Scanned Clinical Scans & Reports</h4>
                          <div className="flex flex-wrap gap-2">
                            {note.attachments.map((file, i) => (
                              <div key={i} className="flex items-center gap-1 text-[11px] text-slate-600 font-semibold border border-slate-200 bg-slate-50 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer transition-colors">
                                <Paperclip className="h-3 w-3 text-slate-400" />
                                {file}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Vitals Summary sidebar (Takes 1/3) */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Recorded Vitals</h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-orange-500" /> Temperature</span>
                          <span className="font-bold text-slate-800">{note.vitals.temperature}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-purple-500" /> Blood Pressure</span>
                          <span className="font-bold text-slate-800">{note.vitals.bloodPressure}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-red-500" /> Pulse Rate</span>
                          <span className="font-bold text-slate-800">{note.vitals.pulseRate}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 flex items-center gap-1"><Wind className="h-3.5 w-3.5 text-blue-500" /> Respiration</span>
                          <span className="font-bold text-slate-800">{note.vitals.respiratoryRate}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 flex items-center gap-1"><Droplet className="h-3.5 w-3.5 text-teal-500" /> SpO2</span>
                          <span className="font-bold text-slate-800">{note.vitals.oxygenSaturation}</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {note.nurseName}
                      </div>

                    </div>

                  </div>

                  {/* Actions Footer Bar */}
                  <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(note)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-100 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50/50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePrint(note)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5 text-slate-400" />
                        Print
                      </button>
                      <button
                        onClick={() => handleExportPDF(note)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <FileDown className="h-3.5 w-3.5 text-slate-400" />
                        Export PDF
                      </button>
                    </div>
                  </div>

                </Card>

              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-100 pr-6">
            <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold">No observation notes match the selected filters.</div>
            <p className="text-xs text-slate-400 mt-1">Try resetting search parameters or add a new log note.</p>
          </div>
        )}

      </div>

      {/* Add / Edit Note Modal Dialouge */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-fadeIn">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editingNote ? "Edit Observation Note" : "Add Nursing Observation Note"}</h3>
                <p className="text-xs text-slate-500">Record a new assessment note in the patient clinical logs.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-5">
              
              {/* Row 1: Patient Picker & Priority Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Patient</label>
                  <select
                    disabled={!!editingNote}
                    value={formPatient ? formPatient._id || formPatient.id : ""}
                    onChange={(e) => {
                      const selected = activeInpatients.find(p => p._id === e.target.value);
                      setFormPatient(selected);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
                    required
                  >
                    <option value="">Select Admitted Patient...</option>
                    {activeInpatients.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.name} ({p.uhid})</option>
                    ))}
                    {/* Fallback mock match if active list is empty */}
                    {activeInpatients.length === 0 && editingNote && (
                      <option value={formPatient?._id}>{formPatient?.name}</option>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Note Priority Level</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Note["status"])}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Routine">Routine (Regular Log)</option>
                    <option value="Follow-up">Follow-up Assessment</option>
                    <option value="Urgent">Urgent / Warning level</option>
                    <option value="Critical">Critical Alert (Requires Physician)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Observation Summary */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Observation Summary</label>
                <textarea
                  rows={3}
                  placeholder="Describe patient status, alert indicators, or ward interventions..."
                  value={formObservation}
                  onChange={(e) => setFormObservation(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white resize-none"
                  required
                />
              </div>

              {/* Row 3: Symptoms & Medications */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Symptoms Described</label>
                  <input
                    type="text"
                    placeholder="e.g. Mild chest tightness, nausea"
                    value={formSymptoms}
                    onChange={(e) => setFormSymptoms(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Medication Administered</label>
                  <input
                    type="text"
                    placeholder="e.g. Metoprolol 25mg IV push"
                    value={formMedication}
                    onChange={(e) => setFormMedication(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Vitals Form fields */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Clinical Vitals</h4>
                
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Temp (°F)</label>
                    <input
                      type="text"
                      placeholder="e.g. 98.6"
                      value={formTemp}
                      onChange={(e) => setFormTemp(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">BP (mmHg)</label>
                    <input
                      type="text"
                      placeholder="e.g. 120/80"
                      value={formBP}
                      onChange={(e) => setFormBP(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Pulse (bpm)</label>
                    <input
                      type="text"
                      placeholder="e.g. 72"
                      value={formPulse}
                      onChange={(e) => setFormPulse(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Resp (bpm)</label>
                    <input
                      type="text"
                      placeholder="e.g. 16"
                      value={formResp}
                      onChange={(e) => setFormResp(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">SpO2 (%)</label>
                    <input
                      type="text"
                      placeholder="e.g. 98"
                      value={formSpo2}
                      onChange={(e) => setFormSpo2(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Additional Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Additional Notes / Next Actions</label>
                <textarea
                  rows={2}
                  placeholder="Enter followup instructions, nursing care plan directions..."
                  value={formAdditionalNotes}
                  onChange={(e) => setFormAdditionalNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white resize-none"
                />
              </div>

              {/* Row 5: Attachments simulator */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Attachments</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter file name to attach (e.g. scan_vitals_report.pdf)"
                    value={tempAttachmentName}
                    onChange={(e) => setTempAttachmentName(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Attach
                  </button>
                </div>
                {formAttachments.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {formAttachments.map((file, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                        <Paperclip className="h-3 w-3 text-slate-400" />
                        {file}
                        <button
                          type="button"
                          onClick={() => setFormAttachments(formAttachments.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 border-t border-slate-100 pt-4 mt-6">
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold px-5"
                >
                  Save Note
                </Button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
