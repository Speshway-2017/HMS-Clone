import { useState } from "react";
import { 
  History, 
  Search, 
  Clock, 
  ShieldAlert, 
  CheckCircle,
  Calendar
} from "lucide-react";
import { useAuditLogs } from "../../features/receptionist";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

export function AccountantAuditLogsPage() {
  const [search, setSearch] = useState("");
  const { data: logs, isLoading } = useAuditLogs();

  const filteredLogs = (logs ?? []).filter((log) => {
    const searchLower = search.toLowerCase();
    const actionMatch = log.action?.toLowerCase().includes(searchLower);
    const userMatch = (log.performedBy?.name || log.user?.name || log.userEmail)?.toLowerCase().includes(searchLower);
    const entityMatch = (log.resource || log.entity)?.toLowerCase().includes(searchLower);
    const detailsStr = typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details || "");
    const detailsMatch = detailsStr.toLowerCase().includes(searchLower);
    return actionMatch || userMatch || entityMatch || detailsMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-sm text-slate-500">View user activities, system transactions, and financial updates for compliance tracking.</p>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search actions, users, descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 min-w-[800px]">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource Affected</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading compliance logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No compliance history found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-xs">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {log.performedBy?.name || log.user?.name || log.userEmail || "System"}
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        {(log.performedBy?.role || log.user?.role || log.userRole || "Daemon").replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge tone={log.action?.toLowerCase().includes("create") || log.action?.toLowerCase().includes("payment") || log.action?.toLowerCase().includes("login") ? "success" : "neutral"}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {log.resource || log.entity || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono max-w-sm truncate text-slate-600" title={typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details || "")}>
                      {typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details || "-")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
