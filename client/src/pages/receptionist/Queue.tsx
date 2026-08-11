import { RefreshCw } from "lucide-react";
import { useReceptionQueue } from "../../features/receptionist";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";

export function QueuePage() {
  // Queries & Mutations
  const { data: tokens, isLoading, refetch } = useReceptionQueue();

  const queueColumns = [
    {
      header: "Token #",
      render: (row: any) => (
        <span className={`font-mono text-sm font-bold ${row.type === "emergency" ? "text-red-600 font-extrabold" : "text-slate-800"}`}>
          {row.tokenNumber} {row.type === "emergency" && "(EMG)"}
        </span>
      )
    },
    {
      header: "Patient (UHID)",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.patient?.uhid}</div>
        </div>
      )
    },
    {
      header: "Doctor Assigned",
      render: (row: any) => <span className="text-xs font-medium text-slate-700">{row.doctor?.name}</span>
    },
    {
      header: "Status",
      render: (row: any) => {
        const colors: Record<string, string> = {
          waiting: "bg-amber-50 text-amber-700 border-amber-200",
          called: "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse",
          completed: "bg-green-50 text-green-700 border-green-200",
          skipped: "bg-rose-50 text-rose-700 border-rose-200"
        };
        return (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors[row.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
            {row.status}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Front Desk Queues</h1>
          <p className="text-sm text-slate-500">Coordinate clinic token wait lines.</p>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-800">Active Token Queue</h2>
          <Button onClick={() => refetch()} variant="secondary" className="px-3 py-1.5 text-xs flex items-center gap-1 self-start sm:self-auto">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Queue
          </Button>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-slate-400">Loading token lines...</div>
        ) : (
          <DataTable columns={queueColumns} rows={tokens || []} rowKey={(row) => row._id} />
        )}
      </Card>
    </div>
  );
}

