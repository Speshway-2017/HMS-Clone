import { Building2, Network, FolderTree, Users2, Download, ArrowRight, FileText } from "lucide-react";
import { useReports, useExportReport } from "../../features/reports";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const ICONS: Record<string, typeof Building2> = {
  hospitals: Building2,
  branches: Network,
  departments: FolderTree,
  admins: Users2,
};

export function ReportsPage() {
  const { data, isLoading } = useReports();
  const exportReport = useExportReport();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports Hub</h1>
        <p className="text-sm text-slate-500">Export real-time registry data as CSV for offline analysis and compliance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data?.categories.map((category) => {
          const Icon = ICONS[category.type] ?? FileText;
          return (
            <Card key={category.type}>
              <div className="flex items-start justify-between">
                <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{category.count}</span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-800">{category.label}</h3>
              <button
                onClick={() => exportReport.mutate(category.type)}
                disabled={exportReport.isPending}
                className="mt-3 flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline disabled:opacity-50"
              >
                Export CSV <ArrowRight className="h-4 w-4" />
              </button>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Recent Exports</h3>
        </div>
        {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
        {!isLoading && data?.reports.length === 0 && <p className="text-sm text-slate-400">No exports yet — use the cards above to generate one.</p>}
        <div className="divide-y divide-slate-100">
          {data?.reports.map((report) => (
            <div key={report._id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold capitalize text-slate-800">{report.type} export</div>
                  <div className="text-xs text-slate-400">
                    {report.rowCount} rows · {report.format.toUpperCase()} · by {report.generatedBy?.name ?? "Unknown"} ·{" "}
                    {new Date(report.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <Download className="h-4 w-4 text-slate-300" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
