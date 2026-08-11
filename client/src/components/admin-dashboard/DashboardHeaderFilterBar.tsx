import { Calendar, Filter, RefreshCw, Radio, Building2, User } from "lucide-react";

export type DateRangeOption = "today" | "yesterday" | "7d" | "30d" | "3m" | "6m" | "1y";

interface DashboardHeaderFilterBarProps {
  dateRange: DateRangeOption;
  onDateRangeChange: (range: DateRangeOption) => void;
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  selectedDoctor: string;
  onDoctorChange: (doc: string) => void;
  departments: { id: string; name: string }[];
  doctors: { id: string; name: string }[];
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: Date;
}

export function DashboardHeaderFilterBar({
  dateRange,
  onDateRangeChange,
  selectedDepartment,
  onDepartmentChange,
  selectedDoctor,
  onDoctorChange,
  departments,
  doctors,
  onRefresh,
  isRefreshing,
  lastUpdated,
}: DashboardHeaderFilterBarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
      {/* Title & Live Status */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-700 text-white shadow-sm">
          <Filter className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Global Controls</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
              <Radio className="h-3 w-3 animate-pulse text-emerald-600" /> Live Syncing
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Last synced: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value as DateRangeOption)}
            className="bg-transparent font-semibold outline-none cursor-pointer text-slate-800"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">This Year</option>
          </select>
        </div>

        {/* Department Selector */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="bg-transparent font-semibold outline-none cursor-pointer text-slate-800 max-w-[140px] truncate"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Doctor Selector */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
          <User className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={selectedDoctor}
            onChange={(e) => onDoctorChange(e.target.value)}
            className="bg-transparent font-semibold outline-none cursor-pointer text-slate-800 max-w-[130px] truncate"
          >
            <option value="all">All Doctors</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-700 transition-all hover:bg-navy-100 disabled:opacity-50"
          title="Refresh live metrics"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
