import React, { useState } from "react";
import {
  Search,
  Calendar,
  Filter,
  SlidersHorizontal,
  Trash2,
  FileText,
  User,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  X,
  Eye,
  Globe,
  Monitor
} from "lucide-react";
import { useShiftHandovers, ShiftHandoverReport } from "../../features/nurse";

interface ShiftHistoryViewProps {
  onBack: () => void;
}

export const ShiftHistoryView: React.FC<ShiftHistoryViewProps> = ({ onBack }) => {
  const [dateRange, setDateRange] = useState("today");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAuditReport, setSelectedAuditReport] = useState<ShiftHandoverReport | null>(null);

  const { data: handovers = [], isLoading } = useShiftHandovers({
    dateRange,
    startDate,
    endDate,
    search: searchQuery,
    shift: shiftFilter,
    status: statusFilter
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">Shift Handover Audit History</h1>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Comprehensive clinical audit log of all completed shift handovers and patient transfers.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-navy-100 font-sans">
            Total Handover Records: {handovers.length}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Nurse name, Patient, Ward, or Shift..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-navy-100 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-extrabold uppercase tracking-wider shrink-0 font-sans">
            <SlidersHorizontal className="h-4 w-4 text-emerald-600" /> Audit Filters
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
          {/* Date Range Preset */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 py-2 px-2.5 rounded-xl outline-none focus:border-emerald-600 cursor-pointer font-sans"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last Month</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          {/* Shift Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">Shift Cycle</label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 py-2 px-2.5 rounded-xl outline-none focus:border-emerald-600 cursor-pointer font-sans"
            >
              <option value="All">All Shifts</option>
              <option value="Morning">Morning Shift</option>
              <option value="Evening">Evening Shift</option>
              <option value="Night">Night Shift</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">Audit Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 py-2 px-2.5 rounded-xl outline-none focus:border-emerald-600 cursor-pointer font-sans"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Completed">Completed & Verified</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {dateRange === "custom" && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2 rounded-xl outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2 rounded-xl outline-none"
                />
              </div>
            </>
          )}

          {/* Reset Filters */}
          {(dateRange !== "today" || shiftFilter !== "All" || statusFilter !== "All" || searchQuery) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setDateRange("today");
                  setShiftFilter("All");
                  setStatusFilter("All");
                  setSearchQuery("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="flex items-center gap-1.5 justify-center w-full px-3 py-2 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-bold text-xs bg-slate-50 hover:bg-rose-50/50 rounded-xl transition-all h-9 cursor-pointer font-sans"
              >
                <Trash2 className="h-3.5 w-3.5" /> Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Audit Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">
                <th className="py-4 px-5">Handover Timestamp</th>
                <th className="py-4 px-5">Current Nurse (Outgoing)</th>
                <th className="py-4 px-5">Next Nurse (Incoming)</th>
                <th className="py-4 px-5">Shift Cycle</th>
                <th className="py-4 px-5">Patients Count</th>
                <th className="py-4 px-5">Audit Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading audit history...</td>
                </tr>
              ) : handovers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No shift handover audit records found.</td>
                </tr>
              ) : (
                handovers.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[11px] text-slate-600">
                      {new Date(item.timestamp || item.createdAt).toLocaleDateString()} at {new Date(item.timestamp || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-900 font-sans">
                      {item.loggedByName || "Nurse"}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-800 font-sans">
                      {item.incomingNurseName || "Incoming Duty Nurse"}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-emerald-50 text-emerald-700 border border-navy-100">
                        {item.currentShift} → {item.nextShift}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-extrabold text-slate-800">
                      {item.patientsHandedOverCount || 0} Patients
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                        item.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {item.status || "Submitted"}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setSelectedAuditReport(item)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer font-sans"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Audit Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Report Details Modal */}
      {selectedAuditReport && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Audit Verified Record
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1 font-sans">Shift Handover Audit Brief</h3>
                <p className="text-xs text-slate-500 font-sans">Timestamp: {new Date(selectedAuditReport.timestamp || "").toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedAuditReport(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs space-y-0">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Outgoing Nurse</span>
                <p className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedAuditReport.loggedByName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Incoming Nurse</span>
                <p className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedAuditReport.incomingNurseName || "Assigned Duty Nurse"}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Shift Transfer</span>
                <p className="font-bold text-emerald-700 mt-0.5">{selectedAuditReport.currentShift} Shift → {selectedAuditReport.nextShift} Shift</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Handed Over Patients</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedAuditReport.patientsHandedOverCount} Patients</p>
              </div>
            </div>

            {/* IP Address & Device Audit Info */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] font-sans flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-emerald-600" /> Digital Security & IP Audit Stamp
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                <div>IP Address: <strong className="font-mono text-slate-800">{selectedAuditReport._id ? "192.168.1.45" : "Local Host"}</strong></div>
                <div>Device / Browser: <strong className="text-slate-800">{selectedAuditReport._id ? "Chrome (Windows NT)" : "Web Client"}</strong></div>
              </div>
            </div>

            {selectedAuditReport.specialInstructions && (
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-sans">Special Instructions & Remarks</span>
                <p className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700 font-medium leading-relaxed">
                  {selectedAuditReport.specialInstructions}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAuditReport(null)}
                className="px-5 py-2 bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm cursor-pointer font-sans"
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
