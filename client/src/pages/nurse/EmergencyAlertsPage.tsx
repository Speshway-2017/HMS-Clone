import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Search,
  RefreshCw,
  Eye,
  Check,
  Filter,
  Info,
  Calendar,
  BedDouble,
  User,
  Clock
} from "lucide-react";
import { useNurseNotifications, useMarkNotificationRead, useDismissNotification, useNurseWards } from "../../features/nurse";

export function EmergencyAlertsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [wardFilter, setWardFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");

  const { data: rawNotifications = [], isLoading, refetch } = useNurseNotifications();
  const { data: wards = [] } = useNurseWards();
  const markReadMutation = useMarkNotificationRead();
  const dismissMutation = useDismissNotification();

  // Standardize & Map Notifications Data
  const alertsList = useMemo(() => {
    return rawNotifications.map((n: any) => {
      const sev = (n.severity || "info").toLowerCase();
      const mappedSev = sev === "danger" ? "critical" : sev;

      let status = "new";
      if (n.status) {
        status = n.status.toLowerCase();
      } else if (n.isRead) {
        status = "acknowledged";
      }

      return {
        _id: n._id || `alert-${Math.random()}`,
        title: n.title || "Emergency Clinical Alert",
        message: n.message || "Patient vitals or call bell alarm flagged.",
        severity: mappedSev as "critical" | "warning" | "info" | "success",
        status: status as "new" | "acknowledged" | "in_progress" | "resolved",
        isRead: n.isRead || status === "acknowledged" || status === "resolved",
        createdAt: n.createdAt || new Date().toISOString(),
        patientName: n.data?.patientName || n.patientName || "Assigned Patient",
        uhid: n.data?.uhid || n.uhid || "UHID-8821",
        ward: n.data?.ward || n.wardName || "General Ward",
        bedNumber: n.data?.roomNumber || n.bedNumber || "Bed 101",
      };
    });
  }, [rawNotifications]);

  // Compute 4 Backend KPI Metrics
  const metrics = useMemo(() => {
    const total = alertsList.length;
    const critical = alertsList.filter((a) => a.severity === "critical").length;
    const pending = alertsList.filter((a) => a.status === "new" || !a.isRead).length;
    const resolved = alertsList.filter((a) => a.status === "resolved").length;

    return { total, critical, pending, resolved };
  }, [alertsList]);

  // Filter & Sort Order Rules: Newest first; Critical before Info if timestamps equal
  const filteredAndSortedAlerts = useMemo(() => {
    return alertsList
      .filter((a) => {
        const matchesSearch =
          a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.uhid.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSev = severityFilter === "all" || a.severity === severityFilter;
        const matchesStatus = statusFilter === "all" || a.status === statusFilter;
        const matchesWard = wardFilter === "all" || a.ward.toLowerCase() === wardFilter.toLowerCase();

        let matchesDate = true;
        if (dateRangeFilter === "today") {
          const todayStr = new Date().toISOString().split("T")[0];
          matchesDate = a.createdAt.startsWith(todayStr);
        }

        return matchesSearch && matchesSev && matchesStatus && matchesWard && matchesDate;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();

        if (timeB !== timeA) return timeB - timeA;

        // Equal timestamp: Critical comes first
        const severityWeight = { critical: 4, warning: 3, info: 2, success: 1 };
        return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      });
  }, [alertsList, searchTerm, severityFilter, statusFilter, wardFilter, dateRangeFilter]);

  // Date Formatting Helper (Date on line 1, Time on line 2)
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return { date, time };
  };

  const handleAcknowledge = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await markReadMutation.mutateAsync(id);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await dismissMutation.mutateAsync(id);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Nurse</span>
            <span>/</span>
            <span className="text-slate-700">Emergency Alerts</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Emergency & Critical Alarms</h1>
          <p className="text-xs text-slate-500">Real-time clinical alarms, vitals notifications, and call bell responses.</p>
        </div>
      </div>

      {/* 13. KPI Cards on Top */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Total Alerts</p>
            <span className="rounded-full bg-slate-100 p-1.5 text-slate-600">
              <Bell className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.total}</p>
          <p className="mt-1 text-[11px] text-slate-400">Shift total logged</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Critical Alerts</p>
            <span className="rounded-full bg-red-100 p-1.5 text-red-600">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-red-600">{metrics.critical}</p>
          <p className="mt-1 text-[11px] text-slate-400">Requires urgent response</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Pending</p>
            <span className="rounded-full bg-amber-100 p-1.5 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{metrics.pending}</p>
          <p className="mt-1 text-[11px] text-slate-400">Unacknowledged alarms</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Resolved Today</p>
            <span className="rounded-full bg-emerald-100 p-1.5 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{metrics.resolved}</p>
          <p className="mt-1 text-[11px] text-slate-400">Interventions completed</p>
        </div>
      </div>

      {/* 12. Filters & Search Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient, UHID or Alert Title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-navy-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">CRITICAL</option>
              <option value="warning">WARNING</option>
              <option value="info">INFO</option>
              <option value="success">SUCCESS</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Wards</option>
              {wards.map((w: any) => (
                <option key={w._id} value={w.name}>{w.name}</option>
              ))}
            </select>

            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today Only</option>
            </select>
          </div>
        </div>

        {/* 1. Enterprise Data Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            {/* 9. Sticky Header */}
            <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
              <tr className="h-11 font-extrabold uppercase text-[11px] text-slate-500 tracking-wider">
                <th className="px-4 py-3 min-w-[240px]">Alert</th>
                <th className="px-4 py-3 min-w-[150px]">Patient</th>
                <th className="px-4 py-3 min-w-[140px]">Ward / Bed</th>
                <th className="px-4 py-3 w-28 text-center">Severity</th>
                <th className="px-4 py-3 w-32 text-right">Triggered Time</th>
                <th className="px-4 py-3 w-32 text-center">Status</th>
                <th className="px-4 py-3 min-w-[160px] text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredAndSortedAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Bell className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold">No emergency alerts found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedAlerts.map((row) => {
                  const { date, time } = formatDateTime(row.createdAt);

                  return (
                    <tr
                      key={row._id}
                      onClick={() => navigate(`/nurse/alerts/${row._id}`)}
                      className="h-14 min-h-[52px] hover:bg-[#F8FAFC] transition-colors cursor-pointer items-center"
                    >
                      {/* 2. Alert Column */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            row.severity === "critical"
                              ? "bg-red-100 text-red-600"
                              : row.severity === "warning"
                              ? "bg-amber-100 text-amber-600"
                              : row.severity === "success"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-blue-100 text-blue-600"
                          }`}>
                            {row.severity === "critical" ? (
                              <ShieldAlert className="h-4 w-4" />
                            ) : row.severity === "warning" ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : row.severity === "success" ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Info className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{row.title}</p>
                            <p
                              className="text-[11px] text-slate-500 line-clamp-1"
                              title={row.message}
                            >
                              {row.message}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Patient Column */}
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="font-bold text-slate-900">{row.patientName}</p>
                          <p className="text-[10px] font-mono text-slate-500">{row.uhid}</p>
                        </div>
                      </td>

                      {/* Ward / Bed Column */}
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="font-semibold text-slate-700">{row.ward}</p>
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 inline-block mt-0.5">
                            {row.bedNumber}
                          </span>
                        </div>
                      </td>

                      {/* 3. Severity Column */}
                      <td className="px-4 py-2.5 w-28 text-center">
                        <span className={`inline-block w-20 text-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                          row.severity === "critical"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : row.severity === "warning"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : row.severity === "success"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}>
                          {row.severity}
                        </span>
                      </td>

                      {/* 4. Triggered Time Column */}
                      <td className="px-4 py-2.5 text-right w-32">
                        <p className="font-bold text-slate-800 leading-tight">{date}</p>
                        <p className="text-[10px] font-mono text-slate-500">{time}</p>
                      </td>

                      {/* 5. Status Column */}
                      <td className="px-4 py-2.5 text-center w-32">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                          row.status === "new"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : row.status === "acknowledged"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : row.status === "in_progress"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {row.status}
                        </span>
                      </td>

                      {/* 6. Actions Column */}
                      <td className="px-4 py-2.5 text-right min-w-[160px]">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/nurse/alerts/${row._id}`);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer"
                            title="View Full Details"
                          >
                            <Eye className="h-3 w-3 text-slate-500" /> View
                          </button>

                          {row.status === "new" && (
                            <button
                              onClick={(e) => handleAcknowledge(e, row._id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
                              title="Acknowledge Alert"
                            >
                              <Check className="h-3 w-3" /> Ack
                            </button>
                          )}

                          {row.status !== "resolved" && (
                            <button
                              onClick={(e) => handleResolve(e, row._id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
                              title="Mark Resolved"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
