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
  Eye
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

interface Expense {
  _id: string;
  category: "Utilities" | "Rent/Lease" | "Medical Supplies" | "Equipment Maintenance" | "Salaries" | "Admin Expenses" | "Vendor Payments";
  amount: number;
  recipient: string;
  date: string;
  description: string;
  paymentMethod: "UPI" | "Bank Transfer" | "Cash" | "Card";
  status: "Paid" | "Pending Approval";
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

  useEffect(() => {
    const saved = localStorage.getItem("hms_expenses");
    if (saved) {
      setExpenses(JSON.parse(saved));
    } else {
      const defaultExpenses: Expense[] = [
        {
          _id: "EXP-10920",
          category: "Medical Supplies",
          amount: 45000,
          recipient: "Apollo Med Distributors",
          date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          description: "Purchase of disposable surgical gloves and masks.",
          paymentMethod: "Bank Transfer",
          status: "Paid"
        },
        {
          _id: "EXP-10921",
          category: "Utilities",
          amount: 28400,
          recipient: "State Electricity Board",
          date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
          description: "Main block electricity utility bill payment.",
          paymentMethod: "UPI",
          status: "Paid"
        },
        {
          _id: "EXP-10922",
          category: "Rent/Lease",
          amount: 55000,
          recipient: "Paramount Properties",
          date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0],
          description: "OPD extension block monthly rental lease.",
          paymentMethod: "Bank Transfer",
          status: "Paid"
        },
        {
          _id: "EXP-10923",
          category: "Equipment Maintenance",
          amount: 18000,
          recipient: "Siemens Medical Care",
          date: new Date().toISOString().split("T")[0],
          description: "CT scanner routine laser calibration & check.",
          paymentMethod: "Card",
          status: "Pending Approval"
        }
      ];
      setExpenses(defaultExpenses);
      localStorage.setItem("hms_expenses", JSON.stringify(defaultExpenses));
    }
  }, []);

  const saveExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    localStorage.setItem("hms_expenses", JSON.stringify(newExpenses));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !recipient || !date) return;

    const newExpense: Expense = {
      _id: `EXP-${Math.floor(10000 + Math.random() * 90000)}`,
      category,
      amount,
      recipient,
      date,
      description,
      paymentMethod,
      status
    };

    const updated = [newExpense, ...expenses];
    saveExpenses(updated);
    setIsAddExpenseOpen(false);

    // Reset inputs
    setCategory("Utilities");
    setAmount(0);
    setRecipient("");
    setDate("");
    setDescription("");
    setPaymentMethod("UPI");
    setStatus("Paid");
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    const updated = expenses.filter((exp) => exp._id !== id);
    saveExpenses(updated);
  };

  const handleApprove = (id: string) => {
    const updated = expenses.map((exp) => {
      if (exp._id === id) {
        return { ...exp, status: "Paid" as const };
      }
      return exp;
    });
    saveExpenses(updated);
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
        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {/* Expense Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard 
          label="Total Logged Expense (Paid)" 
          value={`₹${totalSpend.toLocaleString("en-IN")}`} 
          icon={<ClipboardList className="h-5 w-5" />} 
          emphasis 
        />
        <KpiCard 
          label="Pending Assessor Approval" 
          value={`${pendingApprovalsCount} payments`} 
          icon={<AlertCircle className="h-5 w-5" />} 
        />
        <KpiCard 
          label="Locked Approval Volume" 
          value={`₹${pendingApprovalsAmount.toLocaleString("en-IN")}`} 
          icon={<Building2 className="h-5 w-5" />} 
        />
      </div>

      {/* Filter panel */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {["All", "Utilities", "Rent/Lease", "Medical Supplies", "Equipment Maintenance", "Salaries", "Admin Expenses", "Vendor Payments"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filterCategory === cat ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expense History Table */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search expenses, recipents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Expense ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Recipient/Vendor</th>
                <th className="px-4 py-3">Date logged</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50 text-slate-700">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {exp._id}
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
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-450" />
                        {new Date(exp.date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-850 whitespace-nowrap">
                      ₹{exp.amount.toLocaleString("en-IN")}
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
              label="Expense Amount (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="1"
              required
            />
            <InputField
              label="Date of Payment"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <InputField
            label="Recipient / Vendor Name"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="E.g., Siemens Healthcare Ltd"
            required
          />

          <SelectField
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            required
          >
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Card">Credit/Debit Card</option>
          </SelectField>

          <SelectField
            label="Payment Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            required
          >
            <option value="Paid">Disbursed (Paid)</option>
            <option value="Pending Approval">Requires approval first</option>
          </SelectField>

          <TextareaField
            label="Brief description / notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="E.g., CT scanner annual maintenance contract payment."
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddExpenseOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Expense Details */}
      <Modal
        title="Expense Details"
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedExpense(null);
        }}
      >
        {selectedExpense && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 border space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs font-semibold">Expense ID</span>
                <span className="font-mono text-slate-800 text-xs">{selectedExpense._id}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs font-semibold">Category</span>
                <span className="font-semibold text-slate-800 text-xs">{selectedExpense.category}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs font-semibold">Recipient / Vendor</span>
                <span className="font-semibold text-slate-800 text-xs">{selectedExpense.recipient}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs font-semibold">Date Logged</span>
                <span className="text-slate-800 text-xs">{new Date(selectedExpense.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs font-semibold">Payment Method</span>
                <span className="text-slate-800 text-xs font-medium uppercase">{selectedExpense.paymentMethod}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs font-semibold">Status</span>
                <span className="text-slate-800 text-xs"><Badge tone={selectedExpense.status === "Paid" ? "success" : "warning"}>{selectedExpense.status}</Badge></span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 text-xs font-semibold">Description</span>
                <span className="text-slate-800 text-xs">{selectedExpense.description}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2">
                <span className="text-slate-800">Total Amount</span>
                <span className="text-navy-700">₹{selectedExpense.amount.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
