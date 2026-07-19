import { useState, useEffect } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  Eye,
  RefreshCw,
  User,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";

interface Expense {
  _id: string;
  category: "Utilities" | "Rent/Lease" | "Medical Supplies" | "Equipment Maintenance" | "Salaries" | "Admin Expenses" | "Vendor Payments";
  amount: number;
  recipient: string;
  date: string;
  description: string;
  paymentMethod: "UPI" | "Bank Transfer" | "Cash" | "Card";
  status: "Paid" | "Pending Approval";
  createdBy?: {
    _id: string;
    name: string;
  };
}

const CAT_COLORS: Record<string, string> = {
  Utilities: "bg-blue-100 text-blue-700",
  "Rent/Lease": "bg-indigo-100 text-indigo-700",
  "Medical Supplies": "bg-teal-100 text-teal-700",
  "Equipment Maintenance": "bg-amber-100 text-amber-700",
  Salaries: "bg-emerald-100 text-emerald-700",
  "Admin Expenses": "bg-purple-100 text-purple-700",
  "Vendor Payments": "bg-rose-100 text-rose-700"
};

export function AccountantExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Form inputs
  const [category, setCategory] = useState<Expense["category"]>("Utilities");
  const [amount, setAmount] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<Expense["paymentMethod"]>("UPI");
  const [status, setStatus] = useState<Expense["status"]>("Paid");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpenses = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get<{ status: string; data: Expense[] }>("/accountant/expenses");
      setExpenses(res.data.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? err.message ?? "Failed to fetch expenses.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !recipient || !date) return;

    setIsSubmitting(true);
    try {
      await api.post("/accountant/expenses", {
        category,
        amount,
        recipient,
        date,
        description,
        paymentMethod,
        status
      });
      setIsAddExpenseOpen(false);
      fetchExpenses();

      // Reset inputs
      setCategory("Utilities");
      setAmount(0);
      setRecipient("");
      setDate("");
      setDescription("");
      setPaymentMethod("UPI");
      setStatus("Paid");
    } catch (err: any) {
      alert(err.response?.data?.message ?? err.message ?? "Failed to save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await api.delete(`/accountant/expenses/${id}`);
      fetchExpenses();
    } catch (err: any) {
      alert(err.response?.data?.message ?? err.message ?? "Failed to delete expense.");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/accountant/expenses/${id}/approve`);
      fetchExpenses();
    } catch (err: any) {
      alert(err.response?.data?.message ?? err.message ?? "Failed to approve expense.");
    }
  };

  // Calculations
  const totalSpend = expenses.filter(e => e.status === "Paid").reduce((sum, e) => sum + e.amount, 0);
  const pendingApprovalsCount = expenses.filter(e => e.status === "Pending Approval").length;
  const pendingApprovalsAmount = expenses.filter(e => e.status === "Pending Approval").reduce((sum, e) => sum + e.amount, 0);

  // Filter
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = exp.recipient.toLowerCase().includes(search.toLowerCase()) || 
                          exp._id.toLowerCase().includes(search.toLowerCase()) || 
                          exp.description.toLowerCase().includes(search.toLowerCase());
    if (filterCategory === "All") return matchesSearch;
    return matchesSearch && exp.category === filterCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Expense Tracking</h1>
          <p className="text-sm text-slate-500">Record administrative spend, vendors liabilities, and operational expenses.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchExpenses}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-650 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 transition"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Expense Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard 
          label="Total Logged Expense (Paid)" 
          value={`₹${totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} 
          icon={<ClipboardList className="h-5 w-5" />} 
          emphasis 
        />
        <KpiCard 
          label="Pending Approvals" 
          value={`${pendingApprovalsCount} Requests`} 
          icon={<CreditCard className="h-5 w-5" />} 
          trend={{ direction: "up", text: `Value: ₹${pendingApprovalsAmount.toLocaleString("en-IN")}` }}
        />
        <KpiCard 
          label="Average Expense/Transaction" 
          value={`₹${(expenses.length ? totalSpend / expenses.length : 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} 
          icon={<Building2 className="h-5 w-5" />} 
        />
      </div>

      {/* Filters & categories */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {["All", "Utilities", "Rent/Lease", "Medical Supplies", "Equipment Maintenance", "Salaries", "Admin Expenses", "Vendor Payments"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filterCategory === cat ? "bg-navy-55 text-navy-700 font-bold" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search expenses, recipients, descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 mb-4 text-sm">
            <AlertCircle className="h-5 w-5" />
            {errorMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Expense ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Recipient/Vendor</th>
                <th className="px-4 py-3">Logged By</th>
                <th className="px-4 py-3">Date logged</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-navy-550" />
                    Loading expense records...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50 text-slate-700">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      #{exp._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${CAT_COLORS[exp.category]}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{exp.recipient}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-slate-500 text-xs">
                        <User className="h-3.5 w-3.5" />
                        {exp.createdBy?.name || "System"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-450" />
                        {new Date(exp.date).toLocaleDateString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-850 whitespace-nowrap">
                      ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge tone={exp.status === "Paid" ? "success" : "warning"} className="w-36">
                        {exp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedExpense(exp);
                          setIsDetailsOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-navy-700 hover:bg-navy-50"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {exp.status === "Pending Approval" && (
                        <button
                          onClick={() => handleApprove(exp._id)}
                          className="inline-flex items-center gap-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-xs font-semibold shadow"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(exp._id)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                        title="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Add New Expense */}
      <Modal
        title="Add Hospital Expense"
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <SelectField
            label="Expense Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            required
          >
            <option value="Utilities">Utilities (Electricity, Water, Internet)</option>
            <option value="Rent/Lease">Rent/Lease (Blocks, Rooms lease)</option>
            <option value="Medical Supplies">Medical Supplies (Medicines, consumables)</option>
            <option value="Equipment Maintenance">Equipment Maintenance (Calibrations, checks)</option>
            <option value="Salaries">Employee Salaries (Disbursements)</option>
            <option value="Admin Expenses">Admin Expenses (Stationery, food, travel)</option>
            <option value="Vendor Payments">Vendor Payments (Outsourcing liabilities)</option>
          </SelectField>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Amount (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
              min={1}
            />
            <InputField
              label="Recipient/Vendor"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              placeholder="e.g. Apollo Distributors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <SelectField
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              required
            >
              <option value="UPI">UPI (Unified Payments Interface)</option>
              <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
              <option value="Cash">Cash</option>
              <option value="Card">Credit/Debit Card</option>
            </SelectField>
          </div>

          <SelectField
            label="Initial Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            required
          >
            <option value="Paid">Paid (Immediately settled)</option>
            <option value="Pending Approval">Pending Approval (Needs validation)</option>
          </SelectField>

          <TextareaField
            label="Description/Notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add invoice numbers, purchase descriptions..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAddExpenseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Details */}
      <Modal
        title="Expense Details"
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedExpense(null);
        }}
      >
        {selectedExpense && (
          <div className="space-y-4 text-slate-700">
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-slate-500 text-xs uppercase">Expense ID</span>
              <span className="font-mono text-sm">#{selectedExpense._id.toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-slate-500 text-xs uppercase">Category</span>
              <span className={`rounded px-2.5 py-0.5 text-xs font-semibold ${CAT_COLORS[selectedExpense.category]}`}>
                {selectedExpense.category}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-slate-500 text-xs uppercase">Recipient/Vendor</span>
              <span className="font-bold text-slate-800">{selectedExpense.recipient}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-slate-500 text-xs uppercase">Logged By</span>
              <span className="text-slate-800">{selectedExpense.createdBy?.name || "System"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-slate-500 text-xs uppercase">Date Logged</span>
              <span>{new Date(selectedExpense.date).toLocaleDateString("en-IN", { dateStyle: "long" })}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-slate-500 text-xs uppercase">Amount Paid</span>
              <span className="font-bold text-slate-900 text-lg">₹{selectedExpense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-slate-500 text-xs uppercase">Payment Method</span>
              <span>{selectedExpense.paymentMethod}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-slate-500 text-xs uppercase">Status</span>
              <Badge tone={selectedExpense.status === "Paid" ? "success" : "warning"}>
                {selectedExpense.status}
              </Badge>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-500 text-xs uppercase block">Description/Notes</span>
              <p className="bg-slate-50 border p-2.5 rounded text-sm text-slate-600 italic">
                {selectedExpense.description || "No description provided."}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
