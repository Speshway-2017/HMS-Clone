import { useState } from "react";
import { Activity, User, Play, CheckCircle, RefreshCw, AlertTriangle, Stethoscope } from "lucide-react";
import {
  useReceptionQueue,
  useSimulateCall,
  useSimulateComplete
} from "../../features/receptionist";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { SelectField, TextareaField } from "../../components/ui/Field";

export function QueuePage() {
  const [activeSubTab, setActiveSubTab] = useState<"queue" | "simulator">("queue");

  // Simulator states
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [outcome, setOutcome] = useState<"op" | "ip">("op");
  const [notes, setNotes] = useState("");
  const [ward, setWard] = useState("General Ward");
  const [roomType, setRoomType] = useState("General");

  // Queries & Mutations
  const { data: tokens, isLoading, refetch } = useReceptionQueue();
  const callMutation = useSimulateCall();
  const completeMutation = useSimulateComplete();

  const handleCall = async (tokenId: string) => {
    try {
      await callMutation.mutateAsync(tokenId);
      alert("Simulated: Doctor is now calling the patient. Display Board updated!");
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to call patient.");
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTokenId) {
      alert("Please select a called token to complete.");
      return;
    }

    try {
      await completeMutation.mutateAsync({
        queueId: selectedTokenId,
        outcome,
        notes,
        ward,
        roomType
      });
      alert(`Simulated: Consultation completed. Outcome: ${outcome.toUpperCase()}`);
      setSelectedTokenId("");
      setNotes("");
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to complete consult.");
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
    },
    {
      header: "Simulator Actions",
      render: (row: any) => (
        <div className="flex gap-2">
          {row.status === "waiting" && (
            <Button
              type="button"
              onClick={() => handleCall(row._id)}
              variant="secondary"
              className="text-[10px] px-2.5 py-1 flex items-center gap-1 hover:bg-indigo-50 border-indigo-250 text-indigo-700"
            >
              <Play className="h-3 w-3" /> Doctor Call
            </Button>
          )}
          {row.status === "called" && (
            <Button
              type="button"
              onClick={() => {
                setSelectedTokenId(row._id);
                setActiveSubTab("simulator");
              }}
              className="text-[10px] px-2.5 py-1 flex items-center gap-1 hover:bg-emerald-800"
            >
              <CheckCircle className="h-3 w-3" /> Complete Consult
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Front Desk Queues</h1>
          <p className="text-sm text-slate-500">Coordinate clinic token wait lines and simulate doctor actions.</p>
        </div>

        {/* Tab triggers */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setActiveSubTab("queue")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeSubTab === "queue" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> Token Queue
          </button>
          <button
            onClick={() => setActiveSubTab("simulator")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeSubTab === "simulator" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Stethoscope className="h-3.5 w-3.5" /> Doctor Simulator Console
          </button>
        </div>
      </div>

      {activeSubTab === "queue" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Active Token Queue</h2>
            <Button onClick={() => refetch()} variant="secondary" className="px-3 py-1.5 text-xs flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Queue
            </Button>
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">Loading token lines...</div>
          ) : (
            <DataTable columns={queueColumns} rows={tokens || []} rowKey={(row) => row._id} />
          )}
        </Card>
      )}

      {activeSubTab === "simulator" && (
        <form onSubmit={handleComplete} className="max-w-2xl space-y-6">
          <Card className="space-y-4">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Stethoscope className="h-4.5 w-4.5" /> Simulated Doctor Console
            </h3>
            <p className="text-xs text-slate-500">Select a token that has been called, provide diagnosis notes, and decide whether to release as OP or refer for IP admission.</p>

            <SelectField
              label="Select Called Patient Token"
              required
              value={selectedTokenId}
              onChange={(e) => setSelectedTokenId(e.target.value)}
            >
              <option value="">Choose Active Called Patient</option>
              {tokens
                ?.filter((t) => t.status === "called")
                .map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.tokenNumber} — {t.patient?.name} ({t.doctor?.name})
                  </option>
                ))}
            </SelectField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Consultation Outcome"
                required
                value={outcome}
                onChange={(e: any) => setOutcome(e.target.value)}
              >
                <option value="op">Continue as OP (Discharge Patient)</option>
                <option value="ip">Admit as IP (Send Inpatient Referral)</option>
              </SelectField>

              {outcome === "ip" && (
                <SelectField
                  label="Suggested Ward Name"
                  required
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                >
                  <option value="General Ward">General Ward</option>
                  <option value="Semi-Private Ward">Semi-Private Ward</option>
                  <option value="Private Ward">Private Ward</option>
                  <option value="ICU">ICU (Intensive Care)</option>
                </SelectField>
              )}
            </div>

            <TextareaField
              label="Diagnosis / Doctor Prescription Notes"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Enter simulated clinical diagnosis..."
            />
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" onClick={() => setActiveSubTab("queue")} variant="secondary">
              Back to Queue
            </Button>
            <Button type="submit" disabled={completeMutation.isPending}>
              {completeMutation.isPending ? "Completing..." : "Submit Doctor Diagnosis"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
