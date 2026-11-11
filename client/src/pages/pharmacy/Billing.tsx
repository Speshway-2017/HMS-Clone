import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Receipt, Search, Eye, Printer, Check, CreditCard, IndianRupee, Wallet } from "lucide-react";
import { usePatients } from "../../features/patients";
import { useInvoices } from "../../features/invoices";
import { useMyHospital } from "../../features/hospitals";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField } from "../../components/ui/Field";
import toast from "react-hot-toast";
import { roundCurrency, toPaise } from "../../lib/currency";

// Alias for local convenience
const roundToTwo = roundCurrency;

interface PharmacyInvoice {
  _id: string;
  patientName: string;
  patientId: string;
  patientUhid: string;
  patientPhone: string;
  prescriptionNumber: string;
  items: { name: string; quantity: number; price: number }[];
  taxRate: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  patientBalance: number;
  amountPaid: number;
  paymentMethod: string;
  date: string;
  status: string;
}

export function PharmacyBilling() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightInvoiceId = searchParams.get("invoiceId") || "";
  const { data: hospitalData } = useMyHospital();

  const { data: patientData, isLoading: isPatientsLoading } = usePatients({});
  const { data: dbInvoiceData, isLoading: isInvoicesLoading } = useInvoices({ billingType: "PHARMACY", limit: 100 });

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"Paid" | "Pending">("Pending");

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<PharmacyInvoice | null>(null);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Payment Form State
  const [payAmount, setPayAmount] = useState("");
  const [payAmountError, setPayAmountError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("Cash");
  const [upiAmount, setUpiAmount] = useState("0");
  const [cashAmount, setCashAmount] = useState("0");
  const [cardAmount, setCardAmount] = useState("0");

  const handledInvoiceIdRef = useRef<string | null>(null);

  // Map live database invoices conformed to billing list
  const rawInvoices = dbInvoiceData?.data || [];
  const invoices: PharmacyInvoice[] = useMemo(() => {
    return rawInvoices
      .filter((inv: any) => inv.billingType === "PHARMACY")
      .map((inv: any) => {
        const p = inv.patient as any;
        const items = (inv.items || []).map((item: any) => ({
          name: item.description,
          quantity: item.quantity,
          price: item.amount,
        }));
        
        // Normalise every money field through roundCurrency to eliminate DB floating-point residuals
        const subtotal = roundCurrency(inv.totals?.subtotal || 0);
        const tax = roundCurrency(inv.totals?.taxAmount || 0);
        const discount = roundCurrency(inv.totals?.discount || inv.discount || 0);
        const total = roundCurrency(inv.totals?.total || 0);
        const rawBalance = inv.totals?.patientBalance !== undefined ? inv.totals.patientBalance : total;
        const patientBalance = roundCurrency(rawBalance);
        const amountPaid = Math.max(0, roundCurrency(total - patientBalance));

        let prescriptionNumber = "N/A";
        if (inv.provisionalData?.notes) {
          const match = inv.provisionalData.notes.match(/Prescription Ref:\s*(\S+)/i);
          if (match) {
            prescriptionNumber = match[1];
          } else {
            prescriptionNumber = inv.provisionalData.notes;
          }
        }

        return {
          _id: inv._id,
          patientName: p ? p.name : "Walk-in Patient",
          patientId: p ? p._id : "",
          patientUhid: p ? p.uhid : "N/A",
          patientPhone: p ? p.phone : "N/A",
          prescriptionNumber,
          date: new Date(inv.issuedAt || inv.createdAt).toISOString().split("T")[0],
          items,
          taxRate: inv.taxRate || 0,
          discount,
          subtotal,
          tax,
          total,
          patientBalance,
          amountPaid,
          paymentMethod: inv.paymentMode || "Cash",
          status: inv.status,
        };
      });
  }, [rawInvoices]);

  // Auto-open payment collection modal for highlighed invoice from search parameter
  useEffect(() => {
    if (!highlightInvoiceId) {
      handledInvoiceIdRef.current = null;
      return;
    }
    if (invoices.length > 0 && handledInvoiceIdRef.current !== highlightInvoiceId) {
      const found = invoices.find(inv => inv._id === highlightInvoiceId);
      if (found) {
        handledInvoiceIdRef.current = highlightInvoiceId;
        setSelectedInvoice(found);
        setPayAmount(found.patientBalance.toFixed(2));
        setPayAmountError(null);
        setPayMethod("Cash");
        setUpiAmount("0");
        setCashAmount("0");
        setCardAmount("0");
        setIsPaymentModalOpen(true);
        // Clear param to avoid repeated pops
        setSearchParams({}, { replace: true });
      }
    }
  }, [highlightInvoiceId, invoices, setSearchParams]);

  const validatePaymentAmount = (val: string, maxBalance: number): string | null => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      return "Please fill out this field";
    }
    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      return "Please enter a valid payment amount";
    }
    if (num <= 0) {
      return "Payment amount must be greater than zero. Please enter valid data";
    }
    const enteredPaise = toPaise(num);
    const maxPaise = toPaise(maxBalance);
    if (enteredPaise > maxPaise) {
      return `Amount cannot exceed the remaining balance of ₹${roundCurrency(maxBalance).toFixed(2)}. Please enter valid data`;
    }
    const decimalParts = trimmed.split(".");
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      return "Amount cannot have more than 2 decimal places. Please enter valid data";
    }
    return null;
  };

  // Handle Payment Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const valErr = validatePaymentAmount(payAmount, selectedInvoice.patientBalance);
    if (valErr) {
      setPayAmountError(valErr);
      toast.error(valErr);
      return;
    }

    const amt = parseFloat(payAmount);
    const enteredPaise = toPaise(amt);
    const remainingPaise = toPaise(selectedInvoice.patientBalance);

    if (payMethod === "Mixed") {
      const mixedSum = toPaise(Number(upiAmount)) + toPaise(Number(cashAmount)) + toPaise(Number(cardAmount));
      if (Math.abs(mixedSum - enteredPaise) > 1) { // allow 1 paise rounding slack
        toast.error(
          `Mixed amounts sum (₹${(mixedSum / 100).toFixed(2)}) must equal Total Payment Collected (₹${(enteredPaise / 100).toFixed(2)})`
        );
        return;
      }
    }

    try {
      const roundedAmt = roundCurrency(amt);
      const payload = {
        invoiceId: selectedInvoice._id,
        amount: roundedAmt,
        paymentMethod: payMethod,
        mixedDetails: payMethod === "Mixed" ? {
          upiAmount: roundCurrency(Number(upiAmount)),
          cashAmount: roundCurrency(Number(cashAmount)),
          cardAmount: roundCurrency(Number(cardAmount))
        } : { upiAmount: 0, cashAmount: 0, cardAmount: 0 }
      };

      await api.post("/reception/billing/pay", payload);
      toast.success("Payment Processed Successfully!");

      // Optimistic update using paise arithmetic to avoid float drift
      const newBalancePaise = Math.max(0, remainingPaise - enteredPaise);
      const newBalance = newBalancePaise / 100;
      const newPaid = roundCurrency(selectedInvoice.amountPaid + roundedAmt);
      const updatedInv = {
        ...selectedInvoice,
        patientBalance: newBalance,
        amountPaid: newPaid,
        status: newBalancePaise === 0 ? "paid" : "partially_paid"
      };

      await queryClient.invalidateQueries({ queryKey: ["invoices"] });

      setIsPaymentModalOpen(false);
      setSelectedInvoice(updatedInv);
      setIsInvoiceDetailsOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to process payment");
    }
  };

  const filtered = invoices.filter(inv => {
    const matchesTab = 
      (activeTab === "Paid" && inv.status === "paid") ||
      (activeTab === "Pending" && (inv.status === "pending" || inv.status === "partially_paid"));

    const searchLower = search.toLowerCase();
    const matchesSearch = 
      inv.patientName.toLowerCase().includes(searchLower) || 
      inv._id.toLowerCase().includes(searchLower) ||
      inv.patientUhid.toLowerCase().includes(searchLower) ||
      inv.patientPhone.toLowerCase().includes(searchLower) ||
      inv.prescriptionNumber.toLowerCase().includes(searchLower);

    return matchesTab && matchesSearch;
  });

  if (isPatientsLoading || isInvoicesLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-slate-500 font-medium">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy Billing & Invoicing</h1>
          <p className="text-sm text-slate-500">Collect retail payments, generate invoices, and view receipts.</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
          {(["Pending", "Paid"] as const).map(tab => {
            const count = invoices.filter(inv => {
              if (tab === "Pending") return inv.status === "pending" || inv.status === "partially_paid";
              return inv.status === "paid";
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab 
                    ? "bg-white text-navy-700 shadow-sm" 
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {tab} Invoices ({count})
              </button>
            );
          })}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Patient, UHID, Invoice or Rx..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-350 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-navy-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Invoices List */}
      <Card>
        <DataTable
          rowKey={(r) => r._id}
          rows={filtered}
          emptyMessage={`No ${activeTab.toLowerCase()} invoices found.`}
          columns={[
            {
              header: "Invoice ID",
              render: (r) => <span className="font-bold text-navy-700 font-mono text-xs" title={r._id}>#{r._id.slice(-8).toUpperCase()}</span>
            },
            {
              header: "Patient",
              render: (r) => (
                <div className="min-w-[120px]">
                  <div className="font-semibold text-slate-800">{r.patientName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">UHID: {r.patientUhid}</div>
                </div>
              )
            },
            {
              header: "Rx Ref",
              render: (r) => <span className="font-mono text-xs whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded text-slate-650 border border-slate-200">{r.prescriptionNumber}</span>
            },
            {
              header: "Outstanding",
              render: (r) => (
                <span className={`font-bold whitespace-nowrap ${r.patientBalance > 0 ? "text-amber-600" : "text-slate-650"}`}>
                  ₹{r.patientBalance.toFixed(2)}
                </span>
              )
            },
            {
              header: "Paid Amount",
              render: (r) => <span className="text-xs text-slate-700 font-medium whitespace-nowrap">₹{r.amountPaid.toFixed(2)}</span>
            },
            {
              header: "Grand Total",
              render: (r) => <span className="font-bold whitespace-nowrap">₹{r.total.toFixed(2)}</span>
            },
            {
              header: "Status",
              render: (r) => (
                <Badge tone={r.status === "paid" ? "success" : r.status === "partially_paid" ? "info" : "warning"}>
                  {r.status === "paid" ? "Paid" : r.status === "partially_paid" ? "Partially Paid" : "Unpaid"}
                </Badge>
              )
            },
            {
              header: "Actions",
              render: (r) => (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setSelectedInvoice(r);
                      setIsInvoiceDetailsOpen(true);
                    }} 
                    className="p-1 hover:text-navy-700"
                    title="View Receipt"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {r.status !== "paid" && (
                    <Button
                      onClick={() => {
                        setSelectedInvoice(r);
                        setPayAmount(r.patientBalance.toFixed(2));
                        setPayAmountError(null);
                        setPayMethod("Cash");
                        setUpiAmount("0");
                        setCashAmount("0");
                        setCardAmount("0");
                        setIsPaymentModalOpen(true);
                      }}
                      className="py-1 px-2.5 bg-green-700 hover:bg-green-800 text-xs flex items-center gap-1 font-bold whitespace-nowrap"
                    >
                      <Check className="h-3.5 w-3.5" /> Pay Balance
                    </Button>
                  )}
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Collect Payment Modal */}
      {selectedInvoice && (
        <Modal
          title="Collect Balance Payment"
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
        >
          <form onSubmit={handlePaymentSubmit} noValidate className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-800">{selectedInvoice.patientName} ({selectedInvoice.patientUhid})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice total:</span>
                <span className="font-bold text-slate-800">₹{selectedInvoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Paid:</span>
                <span className="font-bold text-slate-800">₹{selectedInvoice.amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-dashed border-slate-200 pt-1.5 text-navy-800">
                <span>Remaining Balance Due:</span>
                <span>₹{selectedInvoice.patientBalance.toFixed(2)}</span>
              </div>
            </div>

            <InputField
              label="Amount to Pay (₹)"
              type="number"
              required
              min={0.01}
              step={0.01}
              max={roundCurrency(selectedInvoice.patientBalance)}
              value={payAmount}
              error={payAmountError}
              onKeyDown={(e) => {
                if (['-', '+', 'e', 'E'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const newVal = e.target.value;
                setPayAmount(newVal);
                const err = validatePaymentAmount(newVal, selectedInvoice.patientBalance);
                setPayAmountError(err);
              }}
              onBlur={() => {
                const err = validatePaymentAmount(payAmount, selectedInvoice.patientBalance);
                setPayAmountError(err);
              }}
            />

            <SelectField
              label="Payment Option"
              required
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cheque">Cheque</option>
              <option value="Mixed">Mixed Payment</option>
            </SelectField>

            {payMethod === "Mixed" && (
              <div className="p-3 bg-navy-50/30 border border-navy-100 rounded-lg grid grid-cols-3 gap-2">
                <InputField
                  label="UPI Amount (₹)"
                  type="number"
                  step={0.01}
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(e.target.value)}
                />
                <InputField
                  label="Cash Amount (₹)"
                  type="number"
                  step={0.01}
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                />
                <InputField
                  label="Card Amount (₹)"
                  type="number"
                  step={0.01}
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-green-700 hover:bg-green-800 text-white font-bold">
                <IndianRupee className="h-3.5 w-3.5" /> Process Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invoice Details / Receipt Modal */}
      {selectedInvoice && (
        <Modal 
          title="Printable Pharmacy Receipt" 
          isOpen={isInvoiceDetailsOpen} 
          onClose={() => setIsInvoiceDetailsOpen(false)}
        >
          <div className="space-y-4">
            <div id="pharmacy-invoice-print" className="border border-slate-200 p-6 rounded-xl bg-white space-y-4 font-sans text-xs">
              <div className="text-center flex flex-col items-center gap-1.5 justify-center">
                {hospitalData?.logoUrl && (
                  <img src={hospitalData.logoUrl} alt={hospitalData.name} className="h-10 object-contain" />
                )}
                <h2 className="text-lg font-bold text-slate-900">{hospitalData?.name || "Sunrise General Hospital"}</h2>
                <p className="text-[10px] text-slate-500 font-medium">PHARMACY INVOICE & RECEIPT</p>
                <div className="text-[9px] text-slate-400 mt-0.5">GSTIN: 27AACCS1092F1Z4 | Lic: PH-2024-99882</div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-3"></div>

              <div className="grid grid-cols-2 gap-2 text-slate-650">
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Invoice No:</span>
                  <span className="font-bold text-slate-850 font-mono">{selectedInvoice._id}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Invoice Date:</span>
                  <span className="font-bold text-slate-850">{selectedInvoice.date}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Patient Details:</span>
                  <span className="font-bold text-slate-850">{selectedInvoice.patientName}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">UHID: {selectedInvoice.patientUhid} | Phone: {selectedInvoice.patientPhone}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Prescription Ref:</span>
                  <span className="font-bold text-slate-850 font-mono">{selectedInvoice.prescriptionNumber}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Payment Status:</span>
                  <span className={`font-bold uppercase ${selectedInvoice.status === "paid" ? "text-green-700" : "text-amber-600 font-bold"}`}>
                    {selectedInvoice.status === "paid" ? "Paid" : selectedInvoice.status === "partially_paid" ? "Partially Paid" : "Unpaid"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 my-3"></div>

              <div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-100">
                      <th className="pb-2">Medicine Details</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Unit Price</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx} className="text-slate-800">
                        <td className="py-2.5 font-medium">{item.name}</td>
                        <td className="py-2.5 text-center">{item.quantity}</td>
                        <td className="py-2.5 text-right">₹{item.price.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-semibold">₹{(item.quantity * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-dashed border-slate-200 my-3"></div>

              <div>
                <div className="flex justify-between text-slate-550">
                  <span>Subtotal:</span>
                  <span className="font-semibold font-mono">₹{selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-550">
                  <span>GST Tax ({selectedInvoice.taxRate}%):</span>
                  <span className="font-semibold font-mono">₹{selectedInvoice.tax.toFixed(2)}</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount:</span>
                    <span className="font-semibold font-mono">- ₹{selectedInvoice.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-550">
                  <span>Amount Paid Already:</span>
                  <span className="font-semibold font-mono text-slate-800">₹{selectedInvoice.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-150 pt-2">
                  <span>Remaining Balance Due:</span>
                  <span className="font-mono text-navy-700">₹{selectedInvoice.patientBalance.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-6">
                Thank you for your payment. Wish you a speedy recovery!
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsInvoiceDetailsOpen(false)}>Close</Button>
              {selectedInvoice.status !== "paid" && (
                <Button 
                  onClick={() => {
                    setIsInvoiceDetailsOpen(false);
                    setPayAmount(selectedInvoice.patientBalance.toFixed(2));
                    setPayAmountError(null);
                    setPayMethod("Cash");
                    setUpiAmount("0");
                    setCashAmount("0");
                    setCardAmount("0");
                    setIsPaymentModalOpen(true);
                  }} 
                  className="bg-green-700 hover:bg-green-800 flex items-center gap-1 font-bold"
                >
                  <IndianRupee className="h-4 w-4" /> Pay Balance
                </Button>
              )}
              <Button onClick={() => window.print()} className="flex items-center gap-1 bg-navy-700">
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
