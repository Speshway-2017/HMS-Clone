import { Calendar, Filter, RefreshCw, Building2, User } from "lucide-react";

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
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs">
      {/* Left: Filter selectors */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span>Filters:</span>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-50 px-2.5 py-1 text-xs text-slate-700 transition-colors">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value as DateRangeOption)}
            className="bg-transparent font-medium outline-none cursor-pointer text-slate-800"
            aria-label="Filter by date range"
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
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-50 px-2.5 py-1 text-xs text-slate-700 transition-colors">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="bg-transparent font-medium outline-none cursor-pointer text-slate-800 max-w-[130px] truncate"
            aria-label="Filter by department"
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
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-50 px-2.5 py-1 text-xs text-slate-700 transition-colors">
          <User className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={selectedDoctor}
            onChange={(e) => onDoctorChange(e.target.value)}
            className="bg-transparent font-medium outline-none cursor-pointer text-slate-800 max-w-[130px] truncate"
            aria-label="Filter by doctor"
          >
            <option value="all">All Doctors</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Sync Status & Refresh */}
      <div className="flex items-center gap-3">
        <span className="hidden md:inline text-[11px] text-slate-400 font-medium">
          Synced at {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          title="Refresh live metrics"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
