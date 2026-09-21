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
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => window.print()}
          >
            Print Invoice
          </Button>
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

      {/* Hidden Printable Invoice Container (triggers on window.print() via @media print) */}
      <div id="invoice-print-area" className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">SPESHWAY HOSPITALS</h1>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-0.5">Enterprise Healthcare ERP System</p>
            <p className="text-xs text-slate-500 mt-1">Main Hospital Branch • Tel: +91 800-SPESHWAY • Email: billing@speshwayhospitals.com</p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-slate-900 text-white text-xs font-extrabold uppercase px-3 py-1 rounded">
              PATIENT BILL INVOICE
            </span>
            <p className="text-sm font-mono font-bold mt-2 text-slate-800">INV #{(invoice as any).invoiceNo || id}</p>
            <p className="text-xs text-slate-500">Issued Date: {new Date((invoice as any).issuedAt || (invoice as any).createdAt || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Patient Details</h3>
            <p className="text-sm font-bold text-slate-900">{patientName}</p>
            <p className="text-xs text-slate-600 font-mono">UHID: {(invoice.patient as any)?.uhid || "N/A"}</p>
            <p className="text-xs text-slate-600">Mobile: {(invoice.patient as any)?.phone || "N/A"}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Invoice Summary</h3>
            <p className="text-xs text-slate-700"><span className="font-semibold text-slate-500">Billing Type:</span> {invoice.billingType || "Medical Services"}</p>
            <p className="text-xs text-slate-700"><span className="font-semibold text-slate-500">Status:</span> <span className="font-bold text-slate-900 uppercase">{invoice.status}</span></p>
          </div>
        </div>

        <table className="w-full text-left border-collapse mb-6 text-xs">
          <thead>
            <tr className="border-b-2 border-slate-300 bg-slate-100 font-bold text-slate-700 uppercase">
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {invoice.items.map((item: any, i: number) => (
              <tr key={i}>
                <td className="py-2.5 px-3 font-semibold">{item.description}</td>
                <td className="py-2.5 px-3">{item.category || "—"}</td>
                <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                <td className="py-2.5 px-3 text-right font-medium">₹{(item.quantity * item.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300 text-xs">
              <td colSpan={3} className="py-2 px-3 text-right font-semibold text-slate-600">Subtotal:</td>
              <td className="py-2 px-3 text-right font-semibold text-slate-800">₹{(invoice.totals?.subtotal ?? 0).toFixed(2)}</td>
            </tr>
            {invoice.totals?.taxAmount > 0 && (
              <tr className="text-xs">
                <td colSpan={3} className="py-2 px-3 text-right font-semibold text-slate-600">Tax ({invoice.taxRate}%):</td>
                <td className="py-2 px-3 text-right font-semibold text-slate-800">₹{(invoice.totals?.taxAmount ?? 0).toFixed(2)}</td>
              </tr>
            )}
            <tr className="border-t-2 border-slate-900 bg-slate-50 text-xs">
              <td colSpan={3} className="py-3 px-3 font-black text-right text-slate-900 uppercase">Total Amount:</td>
              <td className="py-3 px-3 font-black text-right text-slate-900 text-base">₹{(invoice.totals?.total ?? 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 mt-8 text-xs">
          <div>
            <p className="font-bold text-slate-800">Hospital Billing Notice:</p>
            <p className="text-slate-500 mt-1">Thank you for choosing Speshway Hospitals. This is a computer generated official invoice receipt.</p>
          </div>
          <div className="text-right flex flex-col items-end justify-end">
            <div className="w-48 border-b border-slate-400 mb-1"></div>
            <p className="font-bold text-slate-800">Authorized Signature & Stamp</p>
            <p className="text-[10px] text-slate-400">Speshway Hospitals Billing Department</p>
          </div>
        </div>
      </div>
    </div>
  );
}
