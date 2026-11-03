import { useState, useEffect } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useReceptionQueue } from "../../features/receptionist";
import { socket } from "../../lib/socket";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";

export function QueuePage() {
  // Queries & Mutations
  const { data: tokens, isLoading, isFetching, isError, refetch } = useReceptionQueue();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleQueueSync = () => {
      refetch();
    };

    socket.on("queue_updated", handleQueueSync);
    socket.on("appointment_updated", handleQueueSync);
    socket.on("op_patient_checked_in", handleQueueSync);
    socket.on("dashboard_update", handleQueueSync);

    return () => {
      socket.off("queue_updated", handleQueueSync);
      socket.off("appointment_updated", handleQueueSync);
      socket.off("op_patient_checked_in", handleQueueSync);
      socket.off("dashboard_update", handleQueueSync);
    };
  }, [refetch]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetch();
      toast.success("Queue refreshed successfully");
    } catch {
      toast.error("Failed to refresh queue data");
    } finally {
      setIsRefreshing(false);
    }
  };

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
          <div className="font-semibold text-slate-800">{row.patient?.name || "Walk-in Patient"}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.patient?.uhid || "—"}</div>
        </div>
      )
    },
    {
      header: "Doctor Assigned",
      render: (row: any) => <span className="text-xs font-medium text-slate-700">{row.doctor?.name || "Unassigned"}</span>
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
        const statusKey = String(row.status || "waiting").toLowerCase();
        return (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors[statusKey] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
            {row.status || "WAITING"}
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
          <Button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="secondary"
            className="px-3 py-1.5 text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            data-testid="refresh-queue-button"
            aria-label="Refresh Queue"
            title="Refresh Queue"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching || isRefreshing ? "animate-spin text-navy-600" : ""}`} />
            Refresh Queue
          </Button>
        </div>

        {isError && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>Failed to load active token queue. Please try refreshing again.</span>
            </div>
            <Button variant="secondary" onClick={handleRefresh} className="text-xs px-2 py-1">
              Retry
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-slate-400">Loading token lines...</div>
        ) : (
          <DataTable
            columns={queueColumns}
            rows={tokens || []}
            rowKey={(row: any) => String(row._id || row.tokenNumber || Math.random())}
            emptyMessage="No active tokens in queue."
          />
        )}
      </Card>
    </div>
  );
}
