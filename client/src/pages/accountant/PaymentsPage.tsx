import { useState } from "react";
import { 
  CreditCard, 
  Search, 
  Eye, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  Clock,
  IndianRupee
} from "lucide-react";
import { usePaymentHistory, usePendingInvoices } from "../../features/receptionist";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";

const STATUS_TONE = { 
  paid: "success", 
  pending: "warning", 
  overdue: "danger" 
} as const;

export function AccountantPaymentsPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Queries
  const { data: paymentsData, isLoading: paymentsLoading } = usePaymentHistory("all");
  const { data: pendingData, isLoading: pendingLoading } = usePendingInvoices();

  const payments = paymentsData?.payments ?? [];
  const pendingInvoices = pendingData?.invoices ?? [];

  // Structure unified payments list: combining paid payments + pending invoices for tracking
  const unifiedRecords: any[] = [];

  // Add paid payments
  payments.forEach((p) => {
    unifiedRecords.push({
      _id: p._id,
      patientName: p.patient?.name ?? "Walk-in Patient",
      patientPhone: p.patient?.phone ?? "N/A",
      invoiceId: p.invoice?._id ?? "N/A",
      amount: p.amount,
      date: new Date(p.paidAt),
      method: p.paymentMethod,
      transactionId: p.transactionId,
      status: "paid",
      mixedDetails: p.mixedDetails,
    });
  });

  // Add pending & overdue invoices
  pendingInvoices.forEach((inv) => {
    const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date();
    unifiedRecords.push({
      _id: inv._id,
      patientName: inv.patient?.name ?? "Walk-in Patient",
      patientPhone: inv.patient?.phone ?? "N/A",
      invoiceId: inv._id,
      amount: inv.totals.patientBalance ?? inv.totals.total,
      date: new Date(inv.issuedAt),
      method: "N/A",
      transactionId: "N/A",
      status: isOverdue ? "overdue" : "pending",
      dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
    });
  });

  // Filter records
  const filteredRecords = unifiedRecords.filter((rec) => {
    const matchesSearch = rec.patientName.toLowerCase().includes(search.toLowerCase()) || 
                          rec.invoiceId.toLowerCase().includes(search.toLowerCase()) ||
                          rec.transactionId.toLowerCase().includes(search.toLowerCase());
    
    if (activeFilter === "all") return matchesSearch;
    return matchesSearch && rec.status === activeFilter;
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  // Count metrics
  const paidCount = unifiedRecords.filter(r => r.status === "paid").length;
  const pendingCount = unifiedRecords.filter(r => r.status === "pending").length;
  const overdueCount = unifiedRecords.filter(r => r.status === "overdue").length;
  const totalCollections = paymentsData?.totalAmount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Tracking</h1>
          <p className="text-sm text-slate-500">Monitor paid collections, pending client balances, and overdue invoices.</p>
        </div>
      </div>

      {/* Mini KPI indicators */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          label="Total Collections" 
          value={`₹${totalCollections.toLocaleString("en-IN")}`} 
          icon={<IndianRupee className="h-5 w-5" />} 
          emphasis 
        />
        <KpiCard 
          label="Paid Bills" 
          value={paidCount} 
          icon={<CheckCircle className="h-5 w-5" />} 
        />
        <KpiCard 
          label="Pending Bills" 
          value={pendingCount} 
          icon={<Clock className="h-5 w-5" />} 
        />
        <KpiCard 
          label="Overdue Bills" 
          value={overdueCount} 
          icon={<AlertCircle className="h-5 w-5" />} 
        />
      </div>

      {/* Filter tab selectors */}
      <div className="flex border-b border-slate-200">
        {(["all", "paid", "pending", "overdue"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-all ${
              activeFilter === filter 
                ? "border-navy-700 text-navy-700" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {filter === "all" ? "All History" : `${filter} Payments`}
          </button>
        ))}
      </div>

      {/* Main Grid table */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by Patient, Invoice ID, or Trans ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Invoice ID</th>
                <th className="px-4 py-3">Payment Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentsLoading || pendingLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{rec.patientName}</div>
                      <div className="text-xs text-slate-500">{rec.patientPhone}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {rec.invoiceId.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-650">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {rec.date.toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-semibold uppercase">
                      {rec.method}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      ₹{rec.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[rec.status as "paid" | "pending" | "overdue"]} className="w-36">
                        {rec.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rec.status === "paid" && (
                        <button
                          onClick={() => {
                            setSelectedPayment(rec);
                            setIsDetailsOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-navy-700 hover:bg-navy-50"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Payment Details (with breakdown of mixed transactions) */}
      <Modal
        title="Payment details"
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 border space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs">Patient</span>
                <span className="font-semibold text-slate-800 text-xs">{selectedPayment.patientName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs">Invoice Ref</span>
                <span className="font-mono text-slate-800 text-xs">{selectedPayment.invoiceId.toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs">Transaction Ref</span>
                <span className="font-mono text-slate-800 text-xs">{selectedPayment.transactionId}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs">Date Paid</span>
                <span className="text-slate-800 text-xs">{selectedPayment.date.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-sm">
                <span className="text-slate-800">Total Paid Amount</span>
                <span className="text-navy-700">₹{selectedPayment.amount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Mixed Method breakdown */}
            {selectedPayment.method === "Mixed" && selectedPayment.mixedDetails && (
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Mixed Payment Split</h4>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">UPI Amount:</span>
                    <span className="font-semibold text-slate-800">₹{(selectedPayment.mixedDetails.upiAmount ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cash Amount:</span>
                    <span className="font-semibold text-slate-800">₹{(selectedPayment.mixedDetails.cashAmount ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Card Amount:</span>
                    <span className="font-semibold text-slate-800">₹{(selectedPayment.mixedDetails.cardAmount ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="rounded-lg bg-navy-700 hover:bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
