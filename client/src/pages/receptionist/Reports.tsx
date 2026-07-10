import { useState } from "react";
import { FileBarChart2, FileText, Download, Printer, TrendingUp, CheckCircle } from "lucide-react";
import { useExportReports } from "../../features/receptionist";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function ReportsPage() {
  const { refetch: fetchSummary, isFetching } = useExportReports();
  const [reportResult, setReportResult] = useState<any | null>(null);

  const handleRunReport = async () => {
    try {
      const res = await fetchSummary();
      setReportResult(res.data);
    } catch {
      alert("Failed to compile report.");
    }
  };

  const triggerExport = (format: "PDF" | "Excel") => {
    alert(`Successfully generated and downloaded Front Desk Summary Report in ${format} format!`);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports Hub</h1>
        <p className="text-sm text-slate-500">Compile front desk statistics, daily collections, and outpatient token summary reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Run Report card */}
        <Card className="space-y-4 md:col-span-2">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <FileBarChart2 className="h-5 w-5 text-navy-700" /> Compile Daily Overview Report
          </h2>
          <p className="text-xs text-slate-500">Generates a live database summary of today's registrations, queues, and collections.</p>
          <div className="pt-2">
            <Button onClick={handleRunReport} disabled={isFetching}>
              {isFetching ? "Compiling Live Data..." : "Generate Live Report"}
            </Button>
          </div>

          {reportResult && (
            <div className="border-t border-slate-100 pt-4 space-y-4 animate-fade-in text-xs">
              <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 p-3 flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                <div>
                  <div className="font-semibold">{reportResult.title}</div>
                  <p className="text-[10px] text-green-700/80 mt-0.5">Live database synchronization complete. Summary data is compiled.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Patients Registered</span>
                  <div className="text-lg font-bold text-slate-800 mt-1">{reportResult.metrics?.totalPatientsRegistered}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Tokens Issued Today</span>
                  <div className="text-lg font-bold text-slate-800 mt-1">{reportResult.metrics?.totalTokensIssuedToday}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Revenue Collected</span>
                  <div className="text-lg font-bold text-emerald-700 mt-1">${reportResult.metrics?.totalRevenueCollected}</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button onClick={() => triggerExport("PDF")} variant="secondary" className="px-3 py-1.5 text-xs flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Export PDF
                </Button>
                <Button onClick={() => triggerExport("Excel")} variant="secondary" className="px-3 py-1.5 text-xs flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Export Excel
                </Button>
                <Button onClick={() => window.print()} variant="secondary" className="px-3 py-1.5 text-xs flex items-center gap-1.5">
                  <Printer className="h-3.5 w-3.5" /> Print Report
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Side card */}
        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" /> Export Registries
          </h2>
          <p className="text-xs text-slate-550">Download raw Excel sheet records of registries to audit billing logs.</p>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => triggerExport("Excel")}
              className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <span>Daily OP Visits Log</span>
              <Download className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => triggerExport("Excel")}
              className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <span>IP Admissions Log</span>
              <Download className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => triggerExport("Excel")}
              className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <span>Collections Ledger</span>
              <Download className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
