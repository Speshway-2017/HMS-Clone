import { useState } from "react";
import { 
  Search, 
  Clock, 
} from "lucide-react";
import { useAuditLogs } from "../../features/receptionist";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

function formatAuditDetails(details: any): string {
  if (details === null || details === undefined) return "-";

  let parsed = details;

  if (typeof details === "string") {
    const trimmed = details.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        return details;
      }
    } else {
      return details;
    }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return String(parsed);
  }

  if (typeof parsed.message === "string" && parsed.message.trim() !== "") {
    return parsed.message;
  }

  if (typeof parsed.description === "string" && parsed.description.trim() !== "") {
    return parsed.description;
  }

  if (typeof parsed.note === "string" && parsed.note.trim() !== "") {
    return parsed.note;
  }

  const parts: string[] = [];
  Object.entries(parsed).forEach(([key, val]) => {
    if (val === null || val === undefined || val === "") return;
    if (typeof val === "object") return;
    const formattedKey = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
    const formattedVal = typeof val === "number" && key.toLowerCase().includes("total") ? `₹${val.toLocaleString("en-IN")}` : String(val);
    parts.push(`${formattedKey}: ${formattedVal}`);
  });

  return parts.length > 0 ? parts.join(" · ") : JSON.stringify(parsed);
}

export function AccountantAuditLogsPage() {
  const [search, setSearch] = useState("");
  const { data: logs, isLoading } = useAuditLogs();

  const filteredLogs = (logs ?? []).filter((log) => {
    const searchLower = search.toLowerCase();
    const actionMatch = log.action?.toLowerCase().includes(searchLower);
    const userMatch = (log.performedBy?.name || log.user?.name || log.userEmail)?.toLowerCase().includes(searchLower);
    const entityMatch = (log.resource || log.entity)?.toLowerCase().includes(searchLower);
    const detailsStr = formatAuditDetails(log.details);
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
                filteredLogs.map((log) => {
                  const formattedDetails = formatAuditDetails(log.details);

                  return (
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
                      <td className="px-4 py-3 text-xs max-w-sm text-slate-700 font-medium" title={formattedDetails}>
                        {formattedDetails}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
