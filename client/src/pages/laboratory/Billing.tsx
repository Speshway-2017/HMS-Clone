import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import {
  Receipt, Search, Plus, Eye, Printer, Check, FlaskConical,
  X, IndianRupee, CalendarDays, BadgeCheck
} from "lucide-react";
import { useInvoices } from "../../features/invoices";
import { useLaboratoryRequests } from "../../features/laboratory";
import { useMyHospital } from "../../features/hospitals";
import { usePaymentHistory } from "../../features/receptionist";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import toast from "react-hot-toast";

interface LabBillItem {
  testName: string;
  price: number;
}

interface ReceiptInfo {
  invoiceId: string;
  patientName: string;
  patientUhid?: string;
  items: LabBillItem[];
  subtotal: number;
  tax: number;
  total: number;
  patientBalance: number;
  status: string;
  issuedAt: string;
}

export function LaboratoryBilling() {
  const { data: invoiceData, isLoading } = useInvoices({ billingType: "LAB" });
  const { data: requests = [] } = useLaboratoryRequests();
  const { data: hospitalData } = useMyHospital();
  const { data: todayPaymentsData } = usePaymentHistory("today");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "paid" | "today">("pending");
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptInfo, setReceiptInfo] = useState<ReceiptInfo | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const prices: Record<string, number> = (hospitalData as any)?.investigationPrices || {};

  const rawInvoices: any[] = invoiceData?.data || [];
  const invoices = rawInvoices.map((inv: any) => ({
    _id: inv._id,
    patientName: inv.patient?.name || "—",
    patientUhid: inv.patient?.uhid,
    items: (inv.items || []).map((it: any) => ({ testName: it.description, price: it.amount })),
    subtotal: inv.totals?.subtotal || 0,
    taxAmount: inv.totals?.taxAmount || 0,
    total: inv.totals?.total || 0,
    patientBalance: inv.totals?.patientBalance ?? 0,
    status: inv.status,
    issuedAt: inv.issuedAt || inv.createdAt,
    isInvoice: true,
  }));

  const pendingRequests = requests
    .filter((req) => req.status === "pending")
    .map((req) => {
      const sub = (req.tests || []).reduce((sum, t) => sum + (prices[t] || 0), 0);
      return {
        _id: req._id,
        patientName: req.patientName,
        patientUhid: req.patientUhid || "",
        items: (req.tests || []).map((t) => ({ testName: t, price: prices[t] || 0 })),
        subtotal: sub,
        taxAmount: 0,
        total: sub,
        patientBalance: sub,
        status: "unbilled",
        issuedAt: req.date,
        isInvoice: false,
        rawRequest: req,
      };
    });

  const rawTodayPayments = todayPaymentsData?.payments || [];
  const todayLabPayments = rawTodayPayments
    .filter((p: any) => p.invoice?.billingType === "LAB")
    .map((p: any) => ({
      _id: p._id,
      invoiceId: p.invoice?._id,
      patientName: p.patient?.name || "—",
      patientUhid: p.patient?.uhid,
      items: (p.invoice?.items || []).map((it: any) => ({ testName: it.description, price: it.amount })),
      amountPaid: p.amount,
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId,
      paidAt: p.paidAt,
      subtotal: p.invoice?.totals?.subtotal || 0,
      taxAmount: p.invoice?.totals?.taxAmount || 0,
      total: p.invoice?.totals?.total || 0,
      patientBalance: p.invoice?.totals?.patientBalance || 0,
      status: p.invoice?.status || "paid",
      isInvoice: true,
      issuedAt: p.paidAt,
    }));

  const paidInvoiceIds = new Set(rawTodayPayments.map((p: any) => p.invoice?._id?.toString()));

  const todayPaidInvoicesWithoutPayments = invoices
    .filter((inv) => {
      if (inv.status === "pending" || inv.status === "unbilled") return false;

      const date = new Date(inv.issuedAt);
      const today = new Date();
      const isToday = date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear();

      return isToday && !paidInvoiceIds.has(inv._id.toString());
    })
    .map((inv) => ({
      _id: inv._id,
      invoiceId: inv._id,
      patientName: inv.patientName,
      patientUhid: inv.patientUhid,
      items: inv.items,
      amountPaid: inv.total - inv.patientBalance,
      paymentMethod: "Cash",
      transactionId: "LEGACY",
      paidAt: inv.issuedAt,
      subtotal: inv.subtotal,
      taxAmount: inv.taxAmount,
      total: inv.total,
      patientBalance: inv.patientBalance,
      status: inv.status,
      isInvoice: true,
      issuedAt: inv.issuedAt,
    }));

  const conformedTodayCollections = [...todayLabPayments, ...todayPaidInvoicesWithoutPayments];

  const allBillingEntries: any[] = activeTab === "pending"
    ? [...pendingRequests, ...invoices.filter((inv) => inv.status !== "paid")]
    : activeTab === "paid"
    ? invoices.filter((inv) => inv.status === "paid")
    : conformedTodayCollections;

  // Sort by date descending
  allBillingEntries.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  const filteredInvoices = allBillingEntries.filter((inv) => {
    const q = search.toLowerCase();
    const searchMatch = !search ||
      inv.patientName.toLowerCase().includes(q) ||
      inv._id.toLowerCase().includes(q) ||
      inv.items.some((it: any) => it.testName.toLowerCase().includes(q));
    return searchMatch;
  });



  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=600,height=700");
    if (!win) return;
    win.document.write(`
      <html><head><title>Lab Invoice</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; font-size: 13px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin-bottom: 16px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .total-row td { font-weight: bold; background: #f0f8ff; }
        .status-paid { color: green; font-weight: bold; }
        .footer { margin-top: 24px; text-align: center; color: #999; font-size: 11px; }
      </style>
      </head><body>${printContents}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const statusTone = (s: string) =>
    s === "paid" ? "success" : s === "partially_paid" ? "warning" : s === "unbilled" ? "warning" : "info";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-blue-600" />
            Laboratory Billing
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage laboratory invoices for test charges.</p>
        </div>
        <Button
          onClick={() => navigate("/laboratory/billing/new")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Lab Bill
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Bills", value: invoices.length + pendingRequests.length, icon: <Receipt className="h-5 w-5 text-blue-500" />, bg: "bg-blue-50" },
          { label: "Pending", value: invoices.filter(i => i.status !== "paid").length + pendingRequests.length, icon: <CalendarDays className="h-5 w-5 text-amber-500" />, bg: "bg-amber-50" },
          { label: "Paid", value: invoices.filter(i => i.status === "paid").length, icon: <BadgeCheck className="h-5 w-5 text-green-500" />, bg: "bg-green-50" },
          { label: "Today's Collecting", value: `₹${conformedTodayCollections.reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()}`, icon: <IndianRupee className="h-5 w-5 text-indigo-500" />, bg: "bg-indigo-50" },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 flex items-center gap-3 border border-slate-200`}>
            <div className="p-2 rounded-lg bg-white shadow-sm">{stat.icon}</div>
            <div>
              <div className="text-xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-1 justify-between">
          <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
            {(["pending", "paid", "today"] as const).map((tab) => {
              let count = 0;
              let label = "";
              if (tab === "paid") {
                count = invoices.filter(i => i.status === "paid").length;
                label = "Paid";
              } else if (tab === "pending") {
                count = invoices.filter(i => i.status !== "paid").length + pendingRequests.length;
                label = "Pending";
              } else {
                count = conformedTodayCollections.length;
                label = "Today's Collecting";
              }
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-5 py-1.5 text-xs font-semibold transition-colors capitalize ${
                    activeTab === tab ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient name, invoice ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No {activeTab} bills found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tests</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-700 font-bold">
                      {inv.isInvoice ? inv._id.slice(-8).toUpperCase() : `REQ-${inv._id.slice(-6).toUpperCase()}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{inv.patientName}</div>
                      {inv.patientUhid && <div className="text-[10px] text-slate-400 font-mono">{inv.patientUhid}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {inv.items.map((it: LabBillItem, i: number) => (
                          <span key={i} className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">{it.testName}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {activeTab === "today" ? (
                        <div>
                          <div className="flex items-center gap-0.5 text-green-600 font-bold">
                            <IndianRupee className="h-3 w-3" />
                            {inv.amountPaid.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">of ₹{inv.total.toLocaleString()}</div>
                        </div>
                      ) : (
                        <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{inv.total.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {activeTab === "today"
                        ? new Date(inv.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : new Date(inv.issuedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {activeTab === "today" ? (
                        <Badge tone="success">{inv.paymentMethod.toUpperCase()}</Badge>
                      ) : (
                        <Badge tone={statusTone(inv.status)}>{inv.status.replace("_", " ").toUpperCase()}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {activeTab === "today" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setReceiptInfo({
                                invoiceId: inv.invoiceId || inv._id,
                                patientName: inv.patientName,
                                patientUhid: inv.patientUhid,
                                items: inv.items,
                                subtotal: inv.subtotal,
                                tax: inv.taxAmount,
                                total: inv.total,
                                patientBalance: inv.patientBalance,
                                status: inv.status,
                                issuedAt: inv.issuedAt,
                              });
                              setIsReceiptOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View Receipt"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      ) : inv.isInvoice ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setReceiptInfo({
                                invoiceId: inv._id,
                                patientName: inv.patientName,
                                patientUhid: inv.patientUhid,
                                items: inv.items,
                                subtotal: inv.subtotal,
                                tax: inv.taxAmount,
                                total: inv.total,
                                patientBalance: inv.patientBalance,
                                status: inv.status,
                                issuedAt: inv.issuedAt,
                              });
                              setIsReceiptOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View Receipt"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {inv.status !== "paid" && (
                            <button
                              onClick={async () => {
                                try {
                                  if (inv.patientBalance > 0) {
                                    await api.post("/reception/billing/pay", {
                                      invoiceId: inv._id,
                                      amount: inv.patientBalance,
                                      paymentMethod: "Cash",
                                    });
                                  } else {
                                    await api.patch(`/invoices/${inv._id}`, { status: "paid" });
                                  }
                                  queryClient.invalidateQueries({ queryKey: ["invoices"] });
                                  queryClient.invalidateQueries({ queryKey: ["reception", "billing", "payment-history"] });
                                  toast.success("Bill marked as paid!");
                                } catch {
                                  toast.error("Failed to update status.");
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Mark as Paid"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const req = inv.rawRequest;
                              navigate("/laboratory/billing/new", {
                                state: {
                                  fromRequest: true,
                                  patientId: req.patientId,
                                  patientName: req.patientName,
                                  patientUhid: req.patientUhid || "",
                                  tests: req.tests,
                                  priority: req.priority,
                                  requestId: req._id,
                                }
                              });
                            }}
                            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-750 text-white px-2.5 py-1 rounded text-xs font-bold transition-colors shadow-xs"
                            title="Bill and Accept Request"
                          >
                            <IndianRupee className="h-3 w-3" /> Bill & Accept
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>



      {/* ── Receipt Modal ── */}
      {receiptInfo && (
        <Modal title="Laboratory Invoice / Receipt" isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)}>
          <div className="space-y-4">
            <div ref={printRef} className="space-y-4 text-sm">
              <h1 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 4 }}>Laboratory Invoice</h1>
              <h2 style={{ color: "#555", marginBottom: 12 }}>Invoice #{receiptInfo.invoiceId.slice(-8).toUpperCase()}</h2>

              <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Patient</div>
                  <div className="font-bold">{receiptInfo.patientName}</div>
                  {receiptInfo.patientUhid && <div className="text-xs text-slate-500 font-mono">{receiptInfo.patientUhid}</div>}
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Date</div>
                  <div className="font-medium">{new Date(receiptInfo.issuedAt).toLocaleString()}</div>
                  <Badge tone={receiptInfo.status === "paid" ? "success" : "warning"} className="mt-1">
                    {receiptInfo.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ border: "1px solid #ddd", padding: "6px 10px", textAlign: "left" }}>Test</th>
                    <th style={{ border: "1px solid #ddd", padding: "6px 10px", textAlign: "right" }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptInfo.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ border: "1px solid #ddd", padding: "6px 10px" }}>{it.testName}</td>
                      <td style={{ border: "1px solid #ddd", padding: "6px 10px", textAlign: "right" }}>₹{it.price.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f0f8ff", fontWeight: "bold" }}>
                    <td style={{ border: "1px solid #ddd", padding: "6px 10px" }}>Subtotal</td>
                    <td style={{ border: "1px solid #ddd", padding: "6px 10px", textAlign: "right" }}>₹{receiptInfo.subtotal.toLocaleString()}</td>
                  </tr>
                  {receiptInfo.tax > 0 && (
                    <tr>
                      <td style={{ border: "1px solid #ddd", padding: "6px 10px" }}>Tax</td>
                      <td style={{ border: "1px solid #ddd", padding: "6px 10px", textAlign: "right" }}>₹{receiptInfo.tax.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="total-row" style={{ background: "#e8f4ff", fontWeight: "bold" }}>
                    <td style={{ border: "1px solid #ddd", padding: "8px 10px", fontSize: 15 }}>TOTAL</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px 10px", textAlign: "right", fontSize: 15 }}>₹{receiptInfo.total.toLocaleString()}</td>
                  </tr>
                  <tr style={{ fontWeight: "bold", color: "#16a34a" }}>
                    <td style={{ border: "1px solid #ddd", padding: "8px 10px" }}>Amount Paid</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px 10px", textAlign: "right" }}>₹{(receiptInfo.total - receiptInfo.patientBalance).toLocaleString()}</td>
                  </tr>
                  {receiptInfo.patientBalance > 0 && (
                    <tr style={{ fontWeight: "bold", color: "#dc2626" }}>
                      <td style={{ border: "1px solid #ddd", padding: "8px 10px" }}>Remaining Balance</td>
                      <td style={{ border: "1px solid #ddd", padding: "8px 10px", textAlign: "right" }}>₹{receiptInfo.patientBalance.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <p style={{ textAlign: "center", color: "#999", fontSize: 11 }}>
                Thank you for choosing our laboratory services.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="secondary" onClick={() => setIsReceiptOpen(false)}>Close</Button>
              <Button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
