import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PackagePlus } from "lucide-react";
import { useInventoryItem, useCreateInventoryItem, useUpdateInventoryItem } from "../../features/inventory";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

export function InventoryFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: item } = useInventoryItem(id);
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem(id ?? "");

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "medicines" as "medicines" | "equipment" | "consumables",
    description: "",
    unit: "units",
    stockQty: 0,
    reorderLevel: 0,
    maxLevel: 0,
    unitCost: 0,
    supplier: "",
    storageCondition: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        sku: item.sku,
        category: item.category,
        description: item.description,
        unit: item.unit,
        stockQty: item.stockQty,
        reorderLevel: item.reorderLevel,
        maxLevel: item.maxLevel,
        unitCost: item.unitCost,
        supplier: item.supplier,
        storageCondition: item.storageCondition,
      });
    }
  }, [item]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit) {
        await updateItem.mutateAsync(form);
      } else {
        await createItem.mutateAsync(form);
      }
      navigate("/admin/inventory");
    } catch {
      setError("Could not save inventory item. Check the form and try again.");
    }
  }

  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/admin/inventory" className="hover:text-navy-700">
            Inventory
          </Link>{" "}
          &gt; {isEdit ? "Edit Item" : "Add New Item"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Inventory Item" : "Add Inventory Item"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection icon={PackagePlus} title="Item Details">
          <InputField label="Item Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amoxicillin 500mg" />
          <InputField label="SKU" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. MED-AX-092" />
          <SelectField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}>
            <option value="medicines">Medicines</option>
            <option value="equipment">Equipment</option>
            <option value="consumables">Consumables</option>
          </SelectField>
          <InputField label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. units, boxes" />
          <InputField label="Stock Quantity" type="number" min={0} value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })} />
          <InputField label="Reorder Level" type="number" min={0} value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
          <InputField label="Max Level" type="number" min={0} value={form.maxLevel} onChange={(e) => setForm({ ...form, maxLevel: Number(e.target.value) })} />
          <InputField label="Unit Cost (₹)" type="number" min={0} value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} />
          <InputField label="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="e.g. Global Pharma Co." />
          <InputField label="Storage Condition" value={form.storageCondition} onChange={(e) => setForm({ ...form, storageCondition: e.target.value })} placeholder="e.g. Cold Chain (2-8°C)" />
          <div className="sm:col-span-2">
            <TextareaField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/inventory")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      </form>
    </div>
  );
}
