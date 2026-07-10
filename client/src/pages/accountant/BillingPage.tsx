import { useState, useEffect } from "react";
import { 
  Receipt, 
  Plus, 
  Search, 
  Trash2, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle,
  Eye
} from "lucide-react";
import { useInvoices, useCreateInvoice } from "../../features/invoices";
import { usePatients } from "../../features/patients";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

const STATUS_TONE = { 
  pending: "warning", 
  partially_paid: "info", 
  paid: "success", 
  overdue: "danger" 
} as const;

interface BillingItem {
  description: string;
  category: string;
  quantity: number;
  amount: number;
}

export function AccountantBillingPage() {
  const [activeTab, setActiveTab] = useState<"all" | "op" | "ip" | "pharmacy" | "laboratory">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Invoices & Patients Queries
  const { data: invoicesData, refetch } = useInvoices({ page });
  const { data: patientsData } = usePatients({ limit: 100 } as any);
  const createInvoiceMutation = useCreateInvoice();

  // Modals state
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // New Invoice Form state
  const [patientId, setPatientId] = useState("");
  const [taxRate, setTaxRate] = useState(5);
  const [serviceFee, setServiceFee] = useState(150);
  const [insuranceCoverPercent, setInsuranceCoverPercent] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<BillingItem[]>([
    { description: "Consultation Fee", category: "op", quantity: 1, amount: 500 }
  ]);

  // Form item inputs
  const [itemDesc, setItemDesc] = useState("");
  const [itemCat, setItemCat] = useState("op");
  const [itemQty, setItemQty] = useState(1);
  const [itemAmt, setItemAmt] = useState(0);

  // Totals calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount + Number(serviceFee);
  const insuranceCovered = total * (insuranceCoverPercent / 100);
  const patientBalance = total - insuranceCovered;

  const handleAddItem = () => {
    if (!itemDesc || itemAmt <= 0 || itemQty <= 0) return;
    setItems([...items, { description: itemDesc, category: itemCat, quantity: itemQty, amount: itemAmt }]);
    setItemDesc("");
    setItemQty(1);
    setItemAmt(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || items.length === 0) return;

    createInvoiceMutation.mutate(
      {
        patient: patientId,
        items,
        taxRate,
        serviceFee,
        insuranceCoveragePercent: insuranceCoverPercent,
        status: "pending",
        dueDate: dueDate ? new Date(dueDate) as any : undefined
      },
      {
        onSuccess: () => {
          setIsNewInvoiceOpen(false);
          setItems([{ description: "Consultation Fee", category: "op", quantity: 1, amount: 500 }]);
          setPatientId("");
          setInsuranceCoverPercent(0);
          setDueDate("");
          refetch();
        }
      }
    );
  };

  // Filter invoices client-side for immediate feedback
  const filteredInvoices = (invoicesData?.data ?? []).filter((inv) => {
    const pName = typeof inv.patient === "object" ? (inv.patient as any).name : "";
    const matchesSearch = pName.toLowerCase().includes(search.toLowerCase()) || 
                          inv._id.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    // Map tab categories to items categories
    return matchesSearch && inv.items.some((item) => item.category === activeTab);
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Billing & Invoices</h1>
          <p className="text-sm text-slate-500">Manage OPD, IPD, laboratory diagnostics, and pharmacy bills.</p>
        </div>
        <button
          onClick={() => setIsNewInvoiceOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Create Invoice
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        {(["all", "op", "ip", "pharmacy", "laboratory"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-all ${
              activeTab === tab 
                ? "border-navy-700 text-navy-700" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "all" 
              ? "All Bills" 
              : tab === "op" || tab === "ip" 
                ? `${tab.toUpperCase()} Billing` 
                : `${tab.charAt(0).toUpperCase()}${tab.slice(1)} Billing`}
          </button>
        ))}
      </div>

      {/* Main Grid & Tables */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by Patient name or Invoice ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[750px]">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Invoice ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Department/Type</th>
                <th className="px-4 py-3">Date Issued</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No invoices found for this criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {inv._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {typeof inv.patient === "object" ? (inv.patient as any).name : "Walk-in"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="capitalize">{inv.items[0]?.category.toUpperCase() ?? "OP"}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(inv.issuedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      ₹{inv.totals.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[inv.status]} className="w-36">{inv.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsInvoiceDetailsOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-navy-700 hover:bg-navy-50"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Generate New Invoice */}
      <Modal 
        title="Generate New Invoice" 
        isOpen={isNewInvoiceOpen} 
        onClose={() => setIsNewInvoiceOpen(false)}
      >
        <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
          <SelectField
            label="Select Patient"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
          >
            <option value="">-- Choose Patient --</option>
            {patientsData?.data?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.phone})
              </option>
            ))}
          </SelectField>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Tax Rate (%)"
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              min="0"
              max="100"
            />
            <InputField
              label="Service Fee (₹)"
              type="number"
              value={serviceFee}
              onChange={(e) => setServiceFee(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Insurance Coverage (%)"
              type="number"
              value={insuranceCoverPercent}
              onChange={(e) => setInsuranceCoverPercent(Number(e.target.value))}
              min="0"
              max="100"
            />
            <InputField
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Items Section */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Invoice Items</h4>
            
            {/* Added items list */}
            {items.length > 0 && (
              <ul className="divide-y divide-slate-100 text-xs">
                {items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="font-semibold text-slate-700">{item.description}</span>
                      <span className="ml-2 text-[10px] uppercase bg-slate-100 text-slate-500 px-1 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-600">
                        {item.quantity} × ₹{item.amount} = ₹{item.quantity * item.amount}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Quick add item form */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Item Description"
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                className="col-span-2 rounded border border-slate-200 p-1.5 text-xs outline-none focus:border-navy-500"
              />
              <select
                value={itemCat}
                onChange={(e) => setItemCat(e.target.value)}
                className="rounded border border-slate-200 p-1.5 text-xs outline-none bg-white"
              >
                <option value="op">OP Consultation</option>
                <option value="ip">IP Ward/Room</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="laboratory">Laboratory</option>
              </select>
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Qty"
                  value={itemQty}
                  onChange={(e) => setItemQty(Number(e.target.value))}
                  className="w-12 rounded border border-slate-200 p-1.5 text-xs outline-none"
                  min="1"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={itemAmt || ""}
                  onChange={(e) => setItemAmt(Number(e.target.value))}
                  className="w-full rounded border border-slate-200 p-1.5 text-xs outline-none"
                  min="0"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full rounded bg-slate-100 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Add Item
            </button>
          </div>

          {/* Computed Summary */}
          <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-medium text-slate-800">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax ({taxRate}%):</span>
              <span className="font-medium text-slate-800">₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Service Fee:</span>
              <span className="font-medium text-slate-800">₹{Number(serviceFee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Insurance Benefit ({insuranceCoverPercent}%):</span>
              <span className="font-medium text-emerald-600">-₹{insuranceCovered.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold">
              <span className="text-slate-800">Total Patient Balance:</span>
              <span className="text-navy-700">₹{patientBalance.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsNewInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={items.length === 0 || !patientId}>
              Generate & Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Invoice Print/Preview Details */}
      <Modal
        title="Invoice Details"
        isOpen={isInvoiceDetailsOpen}
        onClose={() => setIsInvoiceDetailsOpen(false)}
      >
        {selectedInvoice && (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div id="invoice-print-area" className="space-y-4">
              <div className="flex justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold text-navy-700">HMS Enterprise</h3>
                  <p className="text-xs text-slate-500">Global Hospital Group Network</p>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-bold text-slate-800">INVOICE</h4>
                  <p className="text-xs font-mono text-slate-500">
                    ID: {selectedInvoice._id.toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500">
                    Date: {new Date(selectedInvoice.issuedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Patient / Insurance Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wide">Billed To:</h5>
                  <p className="font-semibold text-slate-850">
                    {typeof selectedInvoice.patient === "object" ? selectedInvoice.patient.name : "Walk-in"}
                  </p>
                  <p className="text-slate-500">
                    Phone: {typeof selectedInvoice.patient === "object" ? selectedInvoice.patient.phone : "N/A"}
                  </p>
                  <p className="text-slate-500">
                    Status: <span className="capitalize">{typeof selectedInvoice.patient === "object" ? selectedInvoice.patient.status : "OPD"}</span>
                  </p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wide">Insurance / Coverage:</h5>
                  <p className="text-slate-700">
                    Provider: {typeof selectedInvoice.patient === "object" ? (selectedInvoice.patient.insuranceProvider || "None") : "None"}
                  </p>
                  <p className="text-slate-700">
                    Coverage: {selectedInvoice.insuranceCoveragePercent || 0}% Covered
                  </p>
                  <p className="text-slate-700">
                    Due Date: {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : "Immediate"}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50">
                  <tr className="font-semibold text-slate-500 uppercase whitespace-nowrap">
                    <th className="py-2 px-1">Description</th>
                    <th className="py-2 px-1 text-center">Category</th>
                    <th className="py-2 px-1 text-center">Qty</th>
                    <th className="py-2 px-1 text-right">Price</th>
                    <th className="py-2 px-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items.map((item: any, i: number) => (
                    <tr key={i} className="text-slate-700">
                      <td className="py-2 px-1">{item.description}</td>
                      <td className="py-2 px-1 text-center uppercase text-[10px] text-slate-400">{item.category}</td>
                      <td className="py-2 px-1 text-center">{item.quantity}</td>
                      <td className="py-2 px-1 text-right">₹{item.amount.toFixed(2)}</td>
                      <td className="py-2 px-1 text-right font-medium">₹{(item.quantity * item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="border-t pt-4 flex flex-col items-end text-xs space-y-1.5">
                <div className="flex w-64 justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-semibold text-slate-800">₹{selectedInvoice.totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex w-64 justify-between">
                  <span className="text-slate-500">Tax Amount:</span>
                  <span className="font-semibold text-slate-800">₹{selectedInvoice.totals.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex w-64 justify-between">
                  <span className="text-slate-500">Service Fee:</span>
                  <span className="font-semibold text-slate-800">₹{selectedInvoice.serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex w-64 justify-between text-emerald-600">
                  <span>Insurance Covered:</span>
                  <span>-₹{selectedInvoice.totals.insuranceCovered.toFixed(2)}</span>
                </div>
                <div className="flex w-64 justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
                  <span className="text-slate-800">Patient Due:</span>
                  <span className="text-navy-700">₹{selectedInvoice.totals.patientBalance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Authorized Invoice
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handlePrint}>
                  <Printer className="h-4 w-4" /> Print Bill
                </Button>
                <Button variant="primary" onClick={() => alert("Invoice downloaded as PDF successfully.")}>
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
