import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Receipt, Search, Plus, Eye, Printer, Check, CreditCard, DollarSign } from "lucide-react";
import { usePatients } from "../../features/patients";
import { useInventory } from "../../features/inventory";
import { useInvoices, useCreateInvoice } from "../../features/invoices";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField } from "../../components/ui/Field";

interface PharmacyInvoice {
  _id: string;
  patientName: string;
  patientId: string;
  items: { name: string; quantity: number; price: number }[];
  taxRate: number; // e.g. 5%
  discount: number; // in ₹
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "UPI" | "Card" | "Cash" | "Insurance";
  date: string;
  status: "Paid" | "Pending";
}

interface NewInvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

export function PharmacyBilling() {
  const { data: patientData, isLoading: isPatientsLoading } = usePatients({});
  const { data: dbInvoiceData, isLoading: isInvoicesLoading } = useInvoices({});
  const { data: inventoryData } = useInventory({ category: "medicines" });
  const createInvoiceMutation = useCreateInvoice();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"Paid" | "Pending">("Paid");

  // Modals state
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PharmacyInvoice | null>(null);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);

  // Form State
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [invoiceItems, setInvoiceItems] = useState<NewInvoiceItem[]>([{ name: "", quantity: 1, price: 0 }]);
  const [taxRate, setTaxRate] = useState(12); // default GST 12%
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PharmacyInvoice["paymentMethod"]>("UPI");
  const [status, setStatus] = useState<"Paid" | "Pending">("Paid");

  // Load custom tax setting on mount
  useEffect(() => {
    const savedTax = localStorage.getItem("hms_pharmacy_tax_rate");
    if (savedTax) {
      setTaxRate(Number(savedTax));
    }
  }, []);

  // Map live inventory medicines
  const rawItems = inventoryData?.data || [];
  const availableMeds = rawItems.map((item: any) => {
    const parts = item.description ? item.description.split(" | ") : [];
    const subcategory = parts[0] || "Analgesic";
    const expiryDate = parts[1] || "";
    return {
      _id: item._id,
      name: item.name,
      category: subcategory,
      stockQty: item.stockQty,
      reorderLevel: item.reorderLevel,
      expiryDate: expiryDate,
      price: item.unitCost,
    };
  });

  // Map live database invoices
  const rawInvoices = dbInvoiceData?.data || [];
  const invoices: PharmacyInvoice[] = rawInvoices.map((inv: any) => {
    const p = inv.patient as any;
    const items = (inv.items || []).map((item: any) => ({
      name: item.description,
      quantity: item.quantity,
      price: item.amount,
    }));
    return {
      _id: inv._id,
      patientName: p ? p.name : "Walk-in Patient",
      patientId: p ? p._id : "",
      date: new Date(inv.issuedAt || inv.createdAt).toISOString().split("T")[0],
      items,
      taxRate: inv.taxRate || 0,
      discount: inv.discount || 0,
      subtotal: inv.totals?.subtotal || 0,
      tax: inv.totals?.taxAmount || 0,
      total: inv.totals?.total || 0,
      paymentMethod: "UPI",
      status: inv.status === "paid" ? "Paid" : "Pending",
    };
  });

  const handlePatientSelect = (patId: string) => {
    setPatientId(patId);
    const p = patientData?.data?.find((pat: any) => pat._id === patId);
    setPatientName(p ? p.name : "Walk-in Patient");
  };

  const handleItemChange = (index: number, field: keyof NewInvoiceItem, value: any) => {
    const updated = [...invoiceItems];
    if (field === "name") {
      const selectedName = value;
      const target = availableMeds.find(m => m.name === selectedName);
      updated[index] = {
        ...updated[index],
        name: selectedName,
        price: target ? target.price : 0
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }
    setInvoiceItems(updated);
  };

  const handleAddItem = () => {
    setInvoiceItems([...invoiceItems, { name: "", quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (invoiceItems.length === 1) return;
    const updated = [...invoiceItems];
    updated.splice(index, 1);
    setInvoiceItems(updated);
  };

  const computeTotals = () => {
    const sub = invoiceItems.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
    const tax = Math.round(sub * (taxRate / 100) * 100) / 100;
    const tot = Math.max(0, sub + tax - discount);
    return { subtotal: sub, tax, total: tot };
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !invoiceItems[0].name) return;

    const { subtotal, tax, total } = computeTotals();

    const payload = {
      patient: patientId,
      items: invoiceItems.map(it => ({
        description: it.name,
        category: "medicines",
        quantity: Number(it.quantity),
        amount: Number(it.price)
      })),
      taxRate: Number(taxRate),
      discount: Number(discount),
      status: status === "Paid" ? ("paid" as const) : ("pending" as const),
      totals: {
        subtotal,
        taxAmount: tax,
        discount: Number(discount),
        total,
        patientBalance: status === "Paid" ? 0 : total,
        insuranceCovered: 0,
        serviceFee: 0,
      }
    };

    try {
      await createInvoiceMutation.mutateAsync(payload);

      // Deduct stock in database
      for (const invItem of invoiceItems) {
        const target = rawItems.find((m: any) => m.name === invItem.name);
        if (target) {
          const newQty = Math.max(0, target.stockQty - Number(invItem.quantity));
          await api.patch(`/inventory/${target._id}`, { stockQty: newQty });
        }
      }

      setIsNewInvoiceOpen(false);
      // Reset Form
      setPatientId("");
      setPatientName("");
      setInvoiceItems([{ name: "", quantity: 1, price: 0 }]);
      setDiscount(0);
      setStatus("Paid");
    } catch (err) {
      console.error("Failed to save invoice", err);
    }
  };

  const handleMarkAsPaid = async (invId: string) => {
    try {
      await api.patch(`/invoices/${invId}`, { status: "paid" });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (selectedInvoice?._id === invId) {
        setSelectedInvoice({ ...selectedInvoice, status: "Paid" });
      }
    } catch (err) {
      console.error("Failed to update invoice status", err);
    }
  };

  const filtered = invoices.filter(inv => {
    const matchesTab = inv.status === activeTab;
    const matchesSearch = 
      inv.patientName.toLowerCase().includes(search.toLowerCase()) || 
      inv._id.toLowerCase().includes(search.toLowerCase()) ||
      inv.patientId.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totals = computeTotals();

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
        <Button onClick={() => setIsNewInvoiceOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Generate Invoice
        </Button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
          {(["Paid", "Pending"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab 
                  ? "bg-white text-navy-700 shadow-sm" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {tab} Invoices ({invoices.filter(inv => inv.status === tab).length})
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice ID or patient..."
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
              render: (r) => <span className="font-bold text-navy-700">{r._id}</span>
            },
            {
              header: "Patient",
              render: (r) => (
                <div>
                  <div className="font-semibold text-slate-800">{r.patientName}</div>
                  <div className="text-xs text-slate-400">{r.patientId}</div>
                </div>
              )
            },
            {
              header: "Bill Date",
              render: (r) => <span className="text-xs text-slate-650">{r.date}</span>
            },
            {
              header: "Payment Mode",
              render: (r) => <span className="text-xs font-semibold text-slate-700">{r.paymentMethod}</span>
            },
            {
              header: "Invoice Amount",
              render: (r) => <span className="font-bold">₹{r.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            },
            {
              header: "Status",
              render: (r) => <Badge tone={r.status === "Paid" ? "success" : "warning"}>{r.status}</Badge>
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
                  {r.status === "Pending" && (
                    <Button
                      onClick={() => handleMarkAsPaid(r._id)}
                      className="py-1 px-2.5 bg-green-700 hover:bg-green-800 text-xs flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Mark Paid
                    </Button>
                  )}
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* New Invoice Modal */}
      <Modal 
        title="Generate Pharmacy Retail Invoice" 
        isOpen={isNewInvoiceOpen} 
        onClose={() => setIsNewInvoiceOpen(false)}
      >
        <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Select Patient"
              required
              value={patientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
            >
              <option value="">-- Choose Patient --</option>
              {patientData?.data?.map((p: any) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.phone})
                </option>
              ))}
              <option value="WALK-IN">Walk-In Patient</option>
            </SelectField>

            <SelectField
              label="Payment Method"
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
            >
              <option value="UPI">UPI / QR Code</option>
              <option value="Card">Debit / Credit Card</option>
              <option value="Cash">Cash payment</option>
              <option value="Insurance">Insurance claim</option>
            </SelectField>
          </div>

          {/* Items selection */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Invoice Items</h4>
              <Button type="button" variant="ghost" onClick={handleAddItem} className="text-xs py-1 px-2 border border-slate-200">
                + Add Medicine
              </Button>
            </div>

            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {invoiceItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-end bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Medicine</label>
                    <select
                      required
                      value={item.name}
                      onChange={(e) => handleItemChange(index, "name", e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white p-1 text-xs text-slate-800 outline-none"
                    >
                      <option value="">Select medicine</option>
                      {availableMeds.map((med) => (
                        <option key={med._id} value={med.name} disabled={med.stockQty === 0}>
                          {med.name} (Price: ₹{med.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Qty</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white p-1 text-xs text-slate-850 outline-none"
                    />
                  </div>

                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Price</label>
                    <input
                      type="text"
                      disabled
                      value={item.price}
                      className="w-full rounded border border-slate-300 bg-slate-100 p-1 text-xs text-slate-500"
                    />
                  </div>

                  <Button 
                    type="button" 
                    variant="danger" 
                    onClick={() => handleRemoveItem(index)}
                    className="p-1 px-2.5 text-xs py-1"
                    disabled={invoiceItems.length === 1}
                  >
                    🗑
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing calculations */}
          <div className="border-t border-slate-150 pt-3 text-xs space-y-2">
            <div className="flex justify-between text-slate-550">
              <span>Subtotal:</span>
              <span className="font-semibold font-mono">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-550 items-center">
              <span>Tax (GST {taxRate}%):</span>
              <span className="font-semibold font-mono">₹{totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-555 items-center gap-4">
              <span>Discount (₹):</span>
              <input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-24 border rounded border-slate-350 bg-white p-1 text-right outline-none font-mono"
              />
            </div>
            <div className="flex justify-between text-slate-550">
              <span>Payment Status:</span>
              <div className="flex gap-2">
                <label className="flex items-center gap-1">
                  <input type="radio" checked={status === "Paid"} onChange={() => setStatus("Paid")} /> Paid
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" checked={status === "Pending"} onChange={() => setStatus("Pending")} /> Pending
                </label>
              </div>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-800 border-t border-dashed border-slate-200 pt-2">
              <span>Grand Total:</span>
              <span className="font-mono text-navy-700">₹{totals.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsNewInvoiceOpen(false)}>Cancel</Button>
            <Button type="submit">Complete & Issue Bill</Button>
          </div>
        </form>
      </Modal>

      {/* Invoice Details / Receipt Modal */}
      {selectedInvoice && (
        <Modal 
          title="Pharmacy Retail Invoice" 
          isOpen={isInvoiceDetailsOpen} 
          onClose={() => setIsInvoiceDetailsOpen(false)}
        >
          <div className="space-y-4">
            <div id="pharmacy-invoice-print" className="border border-slate-200 p-6 rounded-xl bg-white space-y-4 font-sans">
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-900">Sunrise General Hospital</h2>
                <p className="text-xs text-slate-500 font-medium">PHARMACY DEPARTMENT RECEIPT</p>
                <div className="text-[9px] text-slate-400 mt-0.5">GSTIN: 27AACCS1092F1Z4 | Lic: PH-2024-99882</div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-4"></div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-650">
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Invoice No:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice._id}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Invoice Date:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.date}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Patient:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.patientName}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">ID: {selectedInvoice.patientId}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Payment Mode:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.paymentMethod}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Status:</span>
                  <span className={`font-bold uppercase ${selectedInvoice.status === "Paid" ? "text-green-700" : "text-amber-600 animate-pulse"}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 my-4"></div>

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
                        <td className="py-2 font-medium">{item.name}</td>
                        <td className="py-2 text-center">{item.quantity}</td>
                        <td className="py-2 text-right">₹{item.price.toFixed(2)}</td>
                        <td className="py-2 text-right font-semibold">₹{(item.quantity * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-dashed border-slate-200 my-4"></div>

              <div className="text-xs space-y-1.5 pr-2">
                <div className="flex justify-between text-slate-550">
                  <span>Subtotal:</span>
                  <span className="font-semibold font-mono">₹{selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-550">
                  <span>Tax (GST {selectedInvoice.taxRate}%):</span>
                  <span className="font-semibold font-mono">₹{selectedInvoice.tax.toFixed(2)}</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount:</span>
                    <span className="font-semibold font-mono">- ₹{selectedInvoice.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-150 pt-2">
                  <span>Total Amount Paid:</span>
                  <span className="font-mono text-navy-700">₹{selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-6">
                Thank you for your payment. Wish you a speedy recovery!
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsInvoiceDetailsOpen(false)}>Close</Button>
              {selectedInvoice.status === "Pending" && (
                <Button onClick={() => handleMarkAsPaid(selectedInvoice._id)} className="bg-green-700 hover:bg-green-800 flex items-center gap-1">
                  <Check className="h-4 w-4" /> Collect Payment
                </Button>
              )}
              <Button onClick={() => window.print()} className="flex items-center gap-1 bg-navy-700">
                <Printer className="h-4 w-4" /> Print Invoice
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
