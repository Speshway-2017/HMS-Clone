import { useState } from "react";
import { Link } from "react-router-dom";
import { Receipt, AlertCircle, TrendingUp, Plus } from "lucide-react";
import { useInvoices } from "../../features/invoices";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Invoice } from "../../types/domain";

const STATUS_TONE = { pending: "warning", partially_paid: "info", paid: "success", overdue: "danger" } as const;

export function FinancePage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, isLoading } = useInvoices({ page, status: status || undefined });

  const columns: Column<Invoice>[] = [
    { header: "Invoice", render: (inv) => <span className="font-mono text-xs text-slate-500">{inv._id.slice(-8).toUpperCase()}</span> },
    { header: "Patient", render: (inv) => <span className="font-medium text-slate-700">{typeof inv.patient === "object" ? inv.patient.name : ""}</span> },
    { header: "Date Issued", render: (inv) => <span className="text-slate-600">{new Date(inv.issuedAt).toLocaleDateString()}</span> },
    { header: "Amount", render: (inv) => <span className="font-semibold text-slate-800">₹{(inv.totals?.total ?? 0).toFixed(2)}</span> },
    { header: "Status", render: (inv) => <Badge tone={STATUS_TONE[inv.status]}>{inv.status.replace("_", " ")}</Badge> },
    {
      header: "Actions",
      render: (inv) => (
        <Link to={`/admin/finance/invoices/${inv._id}`} className="text-sm font-medium text-navy-700 hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Dashboard</h1>
          <p className="text-sm text-slate-500">Real revenue and billing overview for your hospital.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Billing" value={`₹${(data?.counts.totalBilling ?? 0).toFixed(2)}`} icon={<Receipt className="h-5 w-5" />} emphasis />
        <KpiCard label="Net Revenue (Paid)" value={`₹${(data?.counts.netRevenue ?? 0).toFixed(2)}`} icon={<TrendingUp className="h-5 w-5" />} />
        <KpiCard label="Pending / Overdue" value={data?.counts.pendingCount ?? 0} icon={<AlertCircle className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {["", "pending", "partially_paid", "paid", "overdue"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === s ? "bg-navy-50 text-navy-700" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {s === "" ? "All Invoices" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        <DataTable columns={columns} rows={data?.data ?? []} rowKey={(inv) => inv._id} emptyMessage={isLoading ? "Loading..." : "No invoices yet."} />

        <div className="mt-4 flex justify-end">
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
