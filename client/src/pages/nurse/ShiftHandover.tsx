import React, { useState } from "react";
import toast from "react-hot-toast";
import { 
  ClipboardList, 
  Printer, 
  Clock, 
  AlertTriangle, 
  Pill, 
  FileText, 
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  Activity,
  User,
  History,
  FileCheck
} from "lucide-react";
import { useSaveShiftHandover, useShiftHandovers, ShiftHandoverReport } from "../../features/nurse";
import { useNurseInpatients } from "../../features/nurse";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

export default function ShiftHandover() {
  const { user } = useAuth();
  const { data: inpatients } = useNurseInpatients();
  const { data: handovers, isLoading: isHandoversLoading } = useShiftHandovers();
  const saveHandoverMutation = useSaveShiftHandover();

  // Form states
  const [currentShift, setCurrentShift] = useState("Morning");
  const [nextShift, setNextShift] = useState("Evening");
  const [patientsCount, setPatientsCount] = useState("");
  const [patientsDetails, setPatientsDetails] = useState("");
  const [pendingMedication, setPendingMedication] = useState("");
  const [pendingProcedures, setPendingProcedures] = useState("");
  const [criticalPatients, setCriticalPatients] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [remarks, setRemarks] = useState("");
  const [nurseSignature, setNurseSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Search/Filter for History Timeline
  const [searchQuery, setSearchQuery] = useState("");
  
  // Printing Target State
  const [activePrintReport, setActivePrintReport] = useState<ShiftHandoverReport | null>(null);

  // Handle Form Autofill from Active Inpatients
  const handleAutofill = () => {
    if (!inpatients || inpatients.length === 0) {
      toast.error("No active inpatients roster found to autofill");
      return;
    }
    const count = inpatients.length;
    setPatientsCount(String(count));

    // Compile details
    const details = inpatients.map((item: any, idx: number) => {
      const name = item.patient?.name || "Unknown Patient";
      const room = item.room?.roomNumber || "N/A";
      const bed = item.bed?.bedNumber || "N/A";
      return `${idx + 1}. ${name} (Room ${room}, Bed ${bed})`;
    }).join("\n");
    setPatientsDetails(details);

    // Compile critical cases
    const criticalList = inpatients
      .filter((item: any) => item.priority === "Emergency" || item.priority === "Urgent")
      .map((item: any) => `${item.patient?.name} (Room ${item.room?.roomNumber || "N/A"}) - ${item.priority}`)
      .join("\n");
    setCriticalPatients(criticalList || "None flagged today.");

    // Compile active/pending meds
    const pendingMedsList = inpatients.map((item: any) => {
      const activeMeds = (item.medicationOrders || [])
        .filter((m: any) => m.status === "active")
        .map((m: any) => m.drugName)
        .join(", ");
      return activeMeds ? `${item.patient?.name}: ${activeMeds}` : null;
    }).filter(Boolean).join("\n");
    setPendingMedication(pendingMedsList || "No active pending prescriptions today.");

    // Sign with user name
    if (user?.name) {
      setNurseSignature(`${user.name}, RN`);
    }

    toast.success("Autofilled form context from current inpatients database roster!");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseSignature.trim()) {
      toast.error("Handover report requires outgoing nurse signature validation");
      return;
    }

    setSubmitting(true);
    const loadingToastId = toast.loading("Saving Shift Handover Report to Audit logs...");

    try {
      await saveHandoverMutation.mutateAsync({
        currentShift,
        nextShift,
        patientsHandedOverCount: Number(patientsCount) || 0,
        patientsHandedOverDetails: patientsDetails,
        pendingMedication,
        pendingProcedures,
        criticalPatients,
        specialInstructions,
        remarks,
        nurseSignature
      });

      toast.success("Shift Handover successfully compiled and logged!", { id: loadingToastId });
      
      // Reset form
      setPatientsCount("");
      setPatientsDetails("");
      setPendingMedication("");
      setPendingProcedures("");
      setCriticalPatients("");
      setSpecialInstructions("");
      setRemarks("");
      setNurseSignature("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit shift handover.", { id: loadingToastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = (report: ShiftHandoverReport) => {
    setActivePrintReport(report);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Filter Handovers History
  const filteredHandovers = (handovers || []).filter((h) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      h.currentShift.toLowerCase().includes(query) ||
      h.nextShift.toLowerCase().includes(query) ||
      h.loggedByName.toLowerCase().includes(query) ||
      h.nurseSignature.toLowerCase().includes(query) ||
      (h.remarks || "").toLowerCase().includes(query) ||
      (h.specialInstructions || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8 font-sans pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-500" />
            Nursing Shift Handover Center
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Formulate clinical handoffs, review pending care, and access shift audit history records.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAutofill}
          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-705 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all active:scale-98 cursor-pointer shadow-sm"
        >
          <Layers className="h-4 w-4" />
          Autofill Inpatients
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 space-y-6 border border-slate-100 shadow-sm bg-white">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-500" />
                Shift Handover Summary Form
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold text-slate-655">
              
              {/* Shifts Select */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Current Shift</label>
                  <select
                    value={currentShift}
                    onChange={(e) => setCurrentShift(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="Morning">Morning Shift (07:00 – 15:00)</option>
                    <option value="Evening">Evening Shift (15:00 – 23:00)</option>
                    <option value="Night">Night Shift (23:00 – 07:00)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Next Shift</label>
                  <select
                    value={nextShift}
                    onChange={(e) => setNextShift(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="Morning">Morning Shift (07:00 – 15:00)</option>
                    <option value="Evening">Evening Shift (15:00 – 23:00)</option>
                    <option value="Night">Night Shift (23:00 – 07:00)</option>
                  </select>
                </div>
              </div>

              {/* Patients Count & Details */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Patients Handed Over Count</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5"
                    value={patientsCount}
                    onChange={(e) => setPatientsCount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Patients Roster Details</label>
                  <textarea
                    rows={3}
                    placeholder="Provide a quick list of patients or bed/ward assignments..."
                    value={patientsDetails}
                    onChange={(e) => setPatientsDetails(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 focus:border-indigo-500 outline-none resize-none font-medium"
                  />
                </div>
              </div>

              {/* Pending Medications & Procedures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Pill className="h-3.5 w-3.5 text-indigo-500" /> Pending Medications / Doses
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Detail any medication scheduled for next shift or missed doses..."
                    value={pendingMedication}
                    onChange={(e) => setPendingMedication(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 focus:border-indigo-500 outline-none resize-none font-medium text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-rose-500" /> Pending Procedures / Vitals
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Detail dressing changes, pending labs, radiologies or diagnostics..."
                    value={pendingProcedures}
                    onChange={(e) => setPendingProcedures(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 focus:border-indigo-500 outline-none resize-none font-medium text-[11px]"
                  />
                </div>
              </div>

              {/* Critical Patients & Special Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Critical / High Priority Patients
                  </label>
                  <textarea
                    rows={4}
                    placeholder="List unstable, ICU cases, or emergency prioritizations..."
                    value={criticalPatients}
                    onChange={(e) => setCriticalPatients(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 focus:border-indigo-500 outline-none resize-none font-medium text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-violet-500" /> Special Instructions
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Notes from admitting doctors, dietary protocols, isolation alerts..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 focus:border-indigo-500 outline-none resize-none font-medium text-[11px]"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">General Shift Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Smooth shift round, wards running on optimal nurse ratios..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-indigo-500 outline-none font-medium"
                />
              </div>

              {/* Nurse Signature */}
              <div className="border-t border-slate-100 pt-4 mt-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nurse Digital Signature</label>
                  <input
                    type="text"
                    required
                    placeholder="Type Full Name with credentials (e.g. Clara Oswald, RN)"
                    value={nurseSignature}
                    onChange={(e) => setNurseSignature(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Signing here validates this report legally under EMR compliance regulations.</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all active:scale-98 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {submitting ? "Submitting Handoff..." : "Submit Handover Report"}
                </button>
              </div>

            </form>
          </Card>
        </div>

        {/* Right Column: History Timeline & Audit logs (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 space-y-5 border border-slate-100 shadow-sm bg-white">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <History className="h-5 w-5 text-indigo-500" />
                Handover Audit History
              </h3>
              <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-500">
                Logs Count: {filteredHandovers.length}
              </span>
            </div>

            {/* Timeline Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 outline-none focus:border-indigo-500 text-xs font-medium"
              />
            </div>

            {/* Audit Timeline Scrollable Area */}
            {isHandoversLoading ? (
              <p className="text-center text-xs text-slate-450 italic py-6">Loading audit trails...</p>
            ) : filteredHandovers.length === 0 ? (
              <p className="text-center text-xs text-slate-400 italic py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                No past handovers matching query found.
              </p>
            ) : (
              <div className="relative border-l-2 border-slate-100 pl-4 ml-2.5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {filteredHandovers.map((item, idx) => (
                  <div key={item._id || idx} className="relative group space-y-2">
                    
                    {/* Circle Node indicator */}
                    <div className="absolute -left-[22px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-indigo-500 bg-white group-hover:bg-indigo-550 transition-colors" />

                    {/* Metadata Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-700">
                            {item.currentShift}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="text-xs font-extrabold text-indigo-600">
                            {item.nextShift}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          Signed by: <strong className="font-semibold text-slate-655">{item.nurseSignature}</strong>
                        </p>
                      </div>

                      {/* Print Button */}
                      <button
                        type="button"
                        onClick={() => handlePrint(item)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors flex items-center justify-center cursor-pointer shadow-sm hover:border-indigo-200 hover:text-indigo-600 bg-white"
                        title="Print Report"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Details Box */}
                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 text-[10px] text-slate-600">
                      <div>Patients Count: <strong className="text-slate-700 font-bold">{item.patientsHandedOverCount}</strong></div>
                      
                      {item.criticalPatients && (
                        <div className="bg-amber-50/50 p-1.5 border border-amber-100 rounded text-amber-900 mt-1">
                          <span className="font-bold">Alert:</span> {item.criticalPatients}
                        </div>
                      )}
                      
                      {item.specialInstructions && (
                        <div>
                          <span className="font-bold text-slate-700">Instructions:</span> {item.specialInstructions}
                        </div>
                      )}

                      {item.remarks && (
                        <div className="italic text-slate-500 mt-1 bg-white/80 p-1 rounded">
                          Remarks: {item.remarks}
                        </div>
                      )}
                    </div>

                    <div className="text-[8px] text-slate-400 font-mono text-right font-medium">
                      Date logged: {new Date(item.createdAt || item.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* Hidden print area specifically designed for Shift Handover formatting */}
      {activePrintReport && (
        <div id="print-handover-area" className="hidden print:block p-8 bg-white text-slate-800 space-y-6">
          <div className="flex justify-between items-center border-b-2 border-indigo-600 pb-4">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight text-indigo-700">Shift Handover Summary Report</h1>
              <p className="text-xs text-slate-500 mt-1">Speshway Enterprise EMR System</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-705 px-2 py-0.5 rounded uppercase font-bold">Audit Certified</span>
              <p className="text-[10px] text-slate-400 mt-1">Date: {new Date(activePrintReport.createdAt || activePrintReport.timestamp).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border">
              <p className="text-[10px] uppercase font-bold text-slate-400">Current shift</p>
              <p className="font-bold text-slate-700">{activePrintReport.currentShift}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border">
              <p className="text-[10px] uppercase font-bold text-slate-400">Next shift</p>
              <p className="font-bold text-indigo-705">{activePrintReport.nextShift}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            
            <div className="border p-4 rounded-lg space-y-2">
              <h3 className="font-bold text-slate-700 border-b pb-1 text-[11px] uppercase">Patients Handed Over ({activePrintReport.patientsHandedOverCount})</h3>
              <p className="whitespace-pre-line text-slate-655 font-medium leading-relaxed">{activePrintReport.patientsHandedOverDetails || "No details provided."}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border p-4 rounded-lg space-y-2">
                <h3 className="font-bold text-indigo-700 border-b pb-1 text-[11px] uppercase">Pending Medication</h3>
                <p className="whitespace-pre-line text-slate-655 font-medium leading-relaxed">{activePrintReport.pendingMedication || "None recorded."}</p>
              </div>
              <div className="border p-4 rounded-lg space-y-2">
                <h3 className="font-bold text-rose-705 border-b pb-1 text-[11px] uppercase">Pending Procedures</h3>
                <p className="whitespace-pre-line text-slate-655 font-medium leading-relaxed">{activePrintReport.pendingProcedures || "None recorded."}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border p-4 rounded-lg space-y-2 bg-amber-50/20 border-amber-200">
                <h3 className="font-bold text-amber-705 border-b pb-1 text-[11px] uppercase">Critical Patients</h3>
                <p className="whitespace-pre-line text-amber-900 font-medium leading-relaxed">{activePrintReport.criticalPatients || "None flagged."}</p>
              </div>
              <div className="border p-4 rounded-lg space-y-2">
                <h3 className="font-bold text-violet-700 border-b pb-1 text-[11px] uppercase">Special Instructions</h3>
                <p className="whitespace-pre-line text-slate-655 font-medium leading-relaxed">{activePrintReport.specialInstructions || "None recorded."}</p>
              </div>
            </div>

            {activePrintReport.remarks && (
              <div className="border p-4 rounded-lg space-y-1">
                <h3 className="font-bold text-slate-700 text-[11px] uppercase">General remarks</h3>
                <p className="text-slate-650 font-medium italic">{activePrintReport.remarks}</p>
              </div>
            )}

            <div className="pt-8 flex justify-between items-end border-t border-dashed">
              <div>
                <p className="text-[10px] text-slate-400">Logged by staff member:</p>
                <p className="font-bold text-slate-700">{activePrintReport.loggedByName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Nurse Signature Validation:</p>
                <p className="font-bold text-slate-800 underline decoration-indigo-500 decoration-2">{activePrintReport.nurseSignature}</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Styled Print media override */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-handover-area, #print-handover-area * {
            visibility: visible !important;
          }
          #print-handover-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

    </div>
  );
}
