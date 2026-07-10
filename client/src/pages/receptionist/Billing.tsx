import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CreditCard, AlertCircle, FileText, CheckCircle, Printer, Clock } from "lucide-react";
import {
  usePayBilling,
  usePendingInvoices,
  usePaymentHistory,
  useCompletedInvoices
} from "../../features/receptionist";
import { api } from "../../lib/api";
import { InputField, SelectField } from "../../components/ui/Field";
import { formatINR } from "../../lib/currency";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";

interface Props {
  activeTab?: "consultation" | "pending" | "completed" | "collections";
}

export function BillingPage({ activeTab = "consultation" }: Props) {
  const [tab, setTab] = useState<"consultation" | "pending" | "completed" | "collections">(activeTab as any);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  // Selected billing states
  const [invoice, setInvoice] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Cash" | "Card" | "Mixed">("UPI");

  // Mixed Payment breakdowns
  const [upiAmount, setUpiAmount] = useState("0");
  const [cashAmount, setCashAmount] = useState("0");
  const [cardAmount, setCardAmount] = useState("0");

  // Receipt outcomes
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Data-consistent hooks — same queries as dashboard stats
  const payMutation = usePayBilling();
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = usePendingInvoices();
  const { data: completedData, isLoading: completedLoading } = useCompletedInvoices();
  const { data: collectionsData, isLoading: collectionsLoading } = usePaymentHistory("today");

  const pendingInvoices = pendingData?.invoices ?? [];
  const completedInvoices = completedData?.invoices ?? [];
  const todayPayments = collectionsData?.payments ?? [];
  const todayTotal = collectionsData?.totalAmount ?? 0;

  // Check URL params for invoiceId (from appointment booking redirect)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const invId = params.get("invoiceId");
    if (invId) {
      loadInvoice(invId);
      setTab("consultation");
    }
  }, [location]);

  const loadInvoice = async (id: string) => {
    setInvoiceLoading(true);
    try {
      const res = await api.get<any>(`/invoices/${id}`);
      setInvoice(res.data?.data?.invoice || res.data);
      setReceiptData(null);
    } catch {
      alert("Failed to fetch invoice details");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const totalToPay = invoice.totals?.total || invoice.totals?.patientBalance || 400;

    const payload = {
      invoiceId: invoice._id,
      amount: totalToPay,
      paymentMethod,
      mixedDetails: paymentMethod === "Mixed" ? {
        upiAmount: parseFloat(upiAmount),
        cashAmount: parseFloat(cashAmount),
        cardAmount: parseFloat(cardAmount),
      } : undefined
    };

    try {
      const result = await payMutation.mutateAsync(payload);
      setReceiptData(result);
      setInvoice(null);
      refetchPending(); // keep pending list in sync
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to process payment");
    }
  };

  const pendingColumns = [
    {
      header: "Invoice Date",
      render: (row: any) => <span className="text-xs text-slate-600">{new Date(row.issuedAt).toLocaleDateString("en-IN")}</span>
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-450 font-mono">{row.patient?.uhid}</div>
        </div>
      )
    },
    {
      header: "Amount Due",
      render: (row: any) => <span className="text-xs font-semibold text-slate-800">{formatINR(row.totals?.total)}</span>
    },
    {
      header: "Action",
      render: (row: any) => (
        <Button
          type="button"
          onClick={() => { loadInvoice(row._id); setTab("consultation"); }}
          className="text-xs px-3 py-1 flex items-center gap-1"
        >
          <CreditCard className="h-3.5 w-3.5" /> Process Payment
        </Button>
      )
    }
  ];

  const completedColumns = [
    {
      header: "Date",
      render: (row: any) => <span className="text-xs text-slate-600">{new Date(row.updatedAt || row.issuedAt).toLocaleDateString("en-IN")}</span>
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-450 font-mono">{row.patient?.uhid}</div>
        </div>
      )
    },
    {
      header: "Amount Paid",
      render: (row: any) => <span className="text-xs font-semibold text-emerald-700">{formatINR(row.totals?.total)}</span>
    },
    {
      header: "Status",
      render: () => <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold uppercase">Paid</span>
    }
  ];

  const collectionsColumns = [
    {
      header: "Paid At",
      render: (row: any) => <span className="text-xs text-slate-600">{new Date(row.paidAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-450 font-mono">{row.patient?.uhid}</div>
        </div>
      )
    },
    {
      header: "Method",
      render: (row: any) => <span className="text-xs font-medium text-slate-700">{row.paymentMethod}</span>
    },
    {
      header: "Amount",
      render: (row: any) => <span className="text-xs font-semibold text-slate-800">{formatINR(row.amount)}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing Desk</h1>
          <p className="text-sm text-slate-500">Collect consultation fees, issue receipts, and track transactions.</p>
        </div>

        {/* Tab triggers */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setTab("consultation")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "consultation" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" /> Consultation Payment
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "pending" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" /> Pending Bills
            {pendingInvoices.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-[9px] font-bold">{pendingInvoices.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "completed" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" /> Completed
          </button>
          <button
            onClick={() => setTab("collections")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "collections" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Today's Collections
          </button>
        </div>
      </div>

      {/* Consultation Billing Tab */}
      {tab === "consultation" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left panel: Bill Invoice Display */}
          <div className="md:col-span-2 space-y-6">
            {invoiceLoading ? (
              <div className="p-12 text-center text-slate-400">Loading invoice details...</div>
            ) : invoice ? (
              <Card className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Invoice ID: {invoice._id}</h3>
                    <p className="text-[10px] text-slate-400">Issued: {new Date(invoice.issuedAt).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase">
                    Unpaid
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="font-semibold text-slate-700">Patient Details:</div>
                  <div className="text-slate-500">{invoice.patient?.name} ({invoice.patient?.uhid})</div>
                  <div className="text-slate-500">Phone: {invoice.patient?.phone}</div>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items?.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right">{formatINR(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600 max-w-xs ml-auto">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatINR(invoice.totals?.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>{formatINR(invoice.totals?.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-100 pt-1 text-sm">
                    <span>Total Amount:</span>
                    <span>{formatINR(invoice.totals?.total)}</span>
                  </div>
                </div>
              </Card>
            ) : receiptData ? (
              // Booking Success Screen
              <Card className="space-y-6 border-green-200 bg-green-50/10">
                <div className="text-center space-y-2 border-b border-slate-100 pb-4">
                  <CheckCircle className="mx-auto h-12 w-12 text-emerald-600 animate-bounce" />
                  <h3 className="text-lg font-bold text-slate-800">✔ Appointment Booked Successfully</h3>
                  <p className="text-xs text-slate-500">Patient checked in and token issued successfully.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-450 block">Patient Name:</span>
                    <span className="font-semibold text-slate-700">{receiptData.appointment?.patient?.name || receiptData.invoice?.patient?.name || "Patient"}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Patient UHID:</span>
                    <span className="font-mono font-semibold text-slate-700">{receiptData.appointment?.patient?.uhid || receiptData.invoice?.patient?.uhid || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Appointment Number:</span>
                    <span className="font-bold font-mono text-indigo-700">{receiptData.appointmentNumber ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Receipt Number:</span>
                    <span className="font-bold font-mono text-slate-700">{receiptData.receiptNumber ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Doctor:</span>
                    <span className="font-semibold text-slate-700">{receiptData.appointment?.doctor?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Department:</span>
                    <span className="font-semibold text-slate-700">{receiptData.appointment?.department?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Date &amp; Time:</span>
                    <span className="font-semibold text-slate-700">
                      {receiptData.appointment?.date ? new Date(receiptData.appointment.date).toLocaleDateString("en-IN") : "N/A"} · {receiptData.appointment?.time || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Token Number:</span>
                    <span className="font-bold text-lg text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">{receiptData.tokenNumber ?? receiptData.token?.tokenNumber ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Queue Number:</span>
                    <span className="font-bold text-lg text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">{receiptData.queueNumber ?? receiptData.token?.queueNumber ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Amount Paid:</span>
                    <span className="font-bold text-slate-900">{formatINR(receiptData.billing?.total ?? receiptData.payment?.amount)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Button type="button" onClick={() => window.print()} variant="secondary" className="flex items-center gap-1 text-xs">
                    <Printer className="h-4 w-4" /> Print Receipt
                  </Button>
                  <Button type="button" onClick={() => {
                    const t = receiptData.tokenNumber ?? receiptData.token?.tokenNumber ?? "N/A";
                    const q = receiptData.queueNumber ?? receiptData.token?.queueNumber ?? "N/A";
                    const p = receiptData.appointment?.patient?.name || "Patient";
                    const d = receiptData.appointment?.doctor?.name || "Doctor";
                    const dt = receiptData.appointment?.date ? new Date(receiptData.appointment.date).toLocaleDateString("en-IN") : "N/A";
                    const tm = receiptData.appointment?.time || "N/A";
                    alert(`--- TOKEN TICKET ---\nToken: ${t}  Queue: ${q}\nPatient: ${p}\nDoctor: ${d}\nDate: ${dt}  Time: ${tm}\n--------------------`);
                  }} variant="secondary" className="flex items-center gap-1 text-xs">
                    <Printer className="h-4 w-4" /> Print Token
                  </Button>
                  <Button type="button" onClick={() => navigate("/receptionist/queue")} variant="secondary" className="text-xs">
                    View Appointment
                  </Button>
                  <Button type="button" onClick={() => {
                    setReceiptData(null);
                    navigate("/receptionist/appointments/new");
                  }} className="text-xs">
                    Book Another
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
                <FileText className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                <p>No active billing item selected.</p>
                <p className="text-xs mt-1">Please select an invoice from the "Pending Bills" tab.</p>
              </div>
            )}
          </div>

          {/* Right panel: Payment Processing */}
          <div className="space-y-6">
            {invoice && (
              <Card>
                <form onSubmit={handleProcessPayment} className="space-y-4">
                  <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                    Payment Gateway
                  </h3>

                  <SelectField
                    label="Payment Method"
                    required
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe)</option>
                    <option value="Cash">Cash Collection</option>
                    <option value="Card">Card Swipe Terminal</option>
                    <option value="Mixed">Mixed Payment</option>
                  </SelectField>

                  {paymentMethod === "Mixed" && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <InputField
                        label="UPI Amount (₹)"
                        type="number"
                        value={upiAmount}
                        onChange={(e) => setUpiAmount(e.target.value)}
                      />
                      <InputField
                        label="Cash Amount (₹)"
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                      />
                      <InputField
                        label="Card Amount (₹)"
                        type="number"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <Button type="submit" className="w-full" disabled={payMutation.isPending}>
                      {payMutation.isPending ? "Processing..." : "Process & Issue Token"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Pending Bills Tab */}
      {tab === "pending" && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-800">
            Pending Consultation Fees
            {!pendingLoading && <span className="ml-2 text-sm text-amber-600 font-normal">({pendingInvoices.length} invoices)</span>}
          </h2>
          {pendingLoading ? (
            <div className="py-8 text-center text-slate-400">Loading pending invoices...</div>
          ) : (
            <DataTable columns={pendingColumns} rows={pendingInvoices} rowKey={(row) => row._id} emptyMessage="No pending consultation invoices." />
          )}
        </Card>
      )}

      {/* Completed Payments Tab */}
      {tab === "completed" && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-800">
            Completed Payments
            {!completedLoading && <span className="ml-2 text-sm text-emerald-600 font-normal">({completedInvoices.length} records)</span>}
          </h2>
          {completedLoading ? (
            <div className="py-8 text-center text-slate-400">Loading completed invoices...</div>
          ) : (
            <DataTable columns={completedColumns} rows={completedInvoices} rowKey={(row) => row._id} emptyMessage="No completed payments yet." />
          )}
        </Card>
      )}

      {/* Today's Collections Tab */}
      {tab === "collections" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Today's Collections</h2>
            {!collectionsLoading && (
              <div className="text-right">
                <div className="text-xs text-slate-500">Total Collected Today</div>
                <div className="text-lg font-bold text-emerald-700">{formatINR(todayTotal)}</div>
              </div>
            )}
          </div>
          {collectionsLoading ? (
            <div className="py-8 text-center text-slate-400">Loading today's collections...</div>
          ) : (
            <DataTable columns={collectionsColumns} rows={todayPayments} rowKey={(row) => row._id} emptyMessage="No payments collected today." />
          )}
        </Card>
      )}
    </div>
  );
}
