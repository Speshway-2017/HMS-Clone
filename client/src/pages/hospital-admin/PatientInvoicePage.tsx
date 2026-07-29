import { Link, useParams } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { useInvoice, useUpdateInvoice } from "../../features/invoices";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

const STATUS_TONE = { pending: "warning", partially_paid: "info", paid: "success", overdue: "danger" } as const;

export function PatientInvoicePage() {
  const { id } = useParams();
  const { data: invoice, isLoading } = useInvoice(id);
  const updateInvoice = useUpdateInvoice(id ?? "");

  if (isLoading || !invoice) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const patientName = invoice.patient && typeof invoice.patient === "object" ? invoice.patient.name : "Walk-in Patient";
  const patientId = invoice.patient && typeof invoice.patient === "object" ? invoice.patient._id : invoice.patient;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">
            <Link to="/admin/finance" className="hover:text-navy-700">
              Revenue Analytics
            </Link>{" "}
            / Invoices / {id}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Patient Billing Record</h1>
        </div>
        {invoice.status !== "paid" && (
          <Button
            variant="primary"
            onClick={() => updateInvoice.mutate({ status: "paid" })}
            disabled={updateInvoice.isPending}
          >
            <CreditCard className="h-4 w-4" /> Record Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient Details</p>
            <Link to={`/admin/patients/${patientId}`} className="mt-1 block text-lg font-semibold text-navy-700 hover:underline">
              {patientName}
            </Link>
          </Card>

          <Card className="bg-navy-700 text-white">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-100">Current Status</h3>
            <div className="mt-3">
              <Badge tone={STATUS_TONE[invoice.status]}>{invoice.status.replace("_", " ")}</Badge>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-navy-100">
                <span>Insurance Coverage</span>
                <span>{invoice.insuranceCoveragePercent}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/20">
                <div className="h-2 rounded-full bg-white" style={{ width: `${invoice.insuranceCoveragePercent}%` }} />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <h3 className="mb-4 text-base font-semibold text-slate-800">Itemized Charges</h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-400">
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium text-slate-700">{item.description}</td>
                    <td className="py-2">
                      <Badge tone="neutral">{item.category || "—"}</Badge>
                    </td>
                    <td className="py-2 text-slate-600">{item.quantity}</td>
                    <td className="py-2 text-right font-medium text-slate-700">₹{(item.quantity * item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">₹{(invoice.totals?.subtotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax ({invoice.taxRate}%)</span>
                <span className="font-medium text-slate-800">₹{(invoice.totals?.taxAmount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service Fees</span>
                <span className="font-medium text-slate-800">₹{(invoice.serviceFee ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>Total Amount</span>
                <span>₹{(invoice.totals?.total ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Insurance Coverage</span>
                <span>-₹{(invoice.totals?.insuranceCovered ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-red-600">
                <span>Patient Balance Due</span>
                <span>₹{(invoice.totals?.patientBalance ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
