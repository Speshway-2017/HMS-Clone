import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Receipt, Plus, Trash2 } from "lucide-react";
import { useCreateInvoice } from "../../features/invoices";
import { usePatients } from "../../features/patients";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

interface LineItem {
  description: string;
  category: string;
  quantity: number;
  amount: number;
}

export function InvoiceFormPage() {
  const navigate = useNavigate();
  const { data: patients } = usePatients({ page: 1 });
  const createInvoice = useCreateInvoice();

  const [patient, setPatient] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [insuranceCoveragePercent, setInsuranceCoveragePercent] = useState(0);
  const [items, setItems] = useState<LineItem[]>([{ description: "", category: "consultation", quantity: 1, amount: 0 }]);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", category: "consultation", quantity: 1, amount: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const invoice = await createInvoice.mutateAsync({ patient, items, taxRate, serviceFee, insuranceCoveragePercent });
      navigate(`/admin/finance/invoices/${invoice._id}`);
    } catch {
      setError("Could not create invoice. Check the form and try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/admin/finance" className="hover:text-navy-700">
            Revenue Analytics
          </Link>{" "}
          &gt; Create Invoice
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Create New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={Receipt} title="Billing Details">
          <SelectField label="Patient" required value={patient} onChange={(e) => setPatient(e.target.value)}>
            <option value="">Select Patient</option>
            {patients?.data.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <InputField label="Tax Rate (%)" type="number" min={0} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
          <InputField label="Service Fee (₹)" type="number" min={0} value={serviceFee} onChange={(e) => setServiceFee(Number(e.target.value))} />
          <InputField
            label="Insurance Coverage (%)"
            type="number"
            min={0}
            max={100}
            value={insuranceCoveragePercent}
            onChange={(e) => setInsuranceCoveragePercent(Number(e.target.value))}
          />
        </FormSection>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Itemized Charges</h2>
            <Button type="button" variant="secondary" onClick={addItem}>
              <Plus className="h-4 w-4" /> Add Line Item
            </Button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  placeholder="Description"
                  className="col-span-5 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={item.category}
                  onChange={(e) => updateItem(i, { category: e.target.value })}
                  placeholder="Category"
                  className="col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                  className="col-span-1 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={item.amount}
                  onChange={(e) => updateItem(i, { amount: Number(e.target.value) })}
                  placeholder="Amount"
                  className="col-span-2 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                />
                <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/finance")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={createInvoice.isPending}>
            {createInvoice.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
