import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PackagePlus, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useInventoryItem, useCreateInventoryItem, useUpdateInventoryItem } from "../../features/inventory";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

const INVENTORY_LIMITS = {
  NAME: 100,
  SKU: 50,
  UNIT: 50,
  SUPPLIER: 100,
  STORAGE_CONDITION: 100,
  DESCRIPTION: 500,
  STOCK_QTY_MAX: 1000000,
  REORDER_LEVEL_MAX: 1000000,
  MAX_LEVEL_MAX: 1000000,
  UNIT_COST_MAX: 10000000,
} as const;

// Patterns for valid data
const ITEM_NAME_REGEX = /^[a-zA-Z0-9\s\.\-/'&,()%+]+$/;
const SKU_REGEX = /^[a-zA-Z0-9\-_./]+$/;
const UNIT_REGEX = /^[a-zA-Z0-9\s\-_/()]+$/;
const SUPPLIER_REGEX = /^[a-zA-Z0-9\s\.\-/'&,()]+$/;
const STORAGE_REGEX = /^[a-zA-Z0-9\s\.\-°/():,]+$/;

export function InventoryFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: item } = useInventoryItem(id);
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem(id ?? "");

  const [form, setForm] = useState<{
    name: string;
    sku: string;
    category: "medicines" | "equipment" | "consumables";
    description: string;
    unit: string;
    stockQty: number | string;
    reorderLevel: number | string;
    maxLevel: number | string;
    unitCost: number | string;
    supplier: string;
    storageCondition: string;
  }>({
    name: "",
    sku: "",
    category: "medicines",
    description: "",
    unit: "units",
    stockQty: 0,
    reorderLevel: 0,
    maxLevel: 0,
    unitCost: 0,
    supplier: "",
    storageCondition: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || "",
        sku: item.sku || "",
        category: (item.category as typeof form.category) || "medicines",
        description: item.description || "",
        unit: item.unit || "units",
        stockQty: item.stockQty ?? 0,
        reorderLevel: item.reorderLevel ?? 0,
        maxLevel: item.maxLevel ?? 0,
        unitCost: item.unitCost ?? 0,
        supplier: item.supplier || "",
        storageCondition: item.storageCondition || "",
      });
      const errs: Record<string, string | undefined> = {};
      const nameErr = validateField("name", item.name);
      if (nameErr) errs.name = nameErr;
      const skuErr = validateField("sku", item.sku);
      if (skuErr) errs.sku = skuErr;
      if (item.unit) {
        const uErr = validateField("unit", item.unit);
        if (uErr) errs.unit = uErr;
      }
      if (item.supplier) {
        const sErr = validateField("supplier", item.supplier);
        if (sErr) errs.supplier = sErr;
      }
      if (item.storageCondition) {
        const scErr = validateField("storageCondition", item.storageCondition);
        if (scErr) errs.storageCondition = scErr;
      }
      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) {
        setError("Invalid data is not accepted. Please enter valid data");
      }
    } else if (!isEdit && !form.sku) {
      const catPrefix = form.category ? form.category.substring(0, 3).toUpperCase() : "MED";
      const randomNum = Math.floor(100 + Math.random() * 900);
      setForm((prev) => ({ ...prev, sku: `${catPrefix}-ITEM-${randomNum}` }));
    }
  }, [item, isEdit]);

  const validateField = (
    field:
      | "name"
      | "sku"
      | "category"
      | "unit"
      | "stockQty"
      | "reorderLevel"
      | "maxLevel"
      | "unitCost"
      | "supplier"
      | "storageCondition"
      | "description",
    value: any
  ): string | undefined => {
    const valStr = typeof value === "string" ? value : String(value ?? "");
    const trimmed = valStr.trim();

    if (field === "name") {
      if (!trimmed) {
        return "Item Name is required. Field is required. Please fill out this field";
      }
      if (valStr.length > INVENTORY_LIMITS.NAME) {
        return `Item Name cannot exceed ${INVENTORY_LIMITS.NAME} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed.length < 2 || !ITEM_NAME_REGEX.test(trimmed)) {
        return "Item Name contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "sku") {
      if (!trimmed) {
        return "SKU is required. Field is required. Please fill out this field";
      }
      if (valStr.length > INVENTORY_LIMITS.SKU) {
        return `SKU cannot exceed ${INVENTORY_LIMITS.SKU} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed.length < 2 || !SKU_REGEX.test(trimmed)) {
        return "SKU contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "category") {
      if (!["medicines", "equipment", "consumables"].includes(valStr)) {
        return "Category contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "unit") {
      if (!trimmed && valStr.length > 0) {
        return "Unit contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      if (valStr.length > INVENTORY_LIMITS.UNIT) {
        return `Unit cannot exceed ${INVENTORY_LIMITS.UNIT} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed && !UNIT_REGEX.test(trimmed)) {
        return "Unit contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "stockQty") {
      if (valStr === "" || valStr === null || valStr === undefined) {
        return "Stock Quantity is required. Field is required. Please enter valid data";
      }
      const num = Number(value);
      if (isNaN(num)) {
        return "Stock Quantity must be a valid number. Invalid data is not accepted. Please enter valid data";
      }
      if (num < 0) {
        return "Stock Quantity cannot be negative. Invalid data is not accepted. Please enter valid data";
      }
      if (num > INVENTORY_LIMITS.STOCK_QTY_MAX) {
        return `Stock Quantity cannot exceed ${INVENTORY_LIMITS.STOCK_QTY_MAX.toLocaleString()}. Too long text is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "reorderLevel") {
      if (valStr === "" || valStr === null || valStr === undefined) {
        return "Reorder Level is required. Field is required. Please enter valid data";
      }
      const num = Number(value);
      if (isNaN(num)) {
        return "Reorder Level must be a valid number. Invalid data is not accepted. Please enter valid data";
      }
      if (num < 0) {
        return "Reorder Level cannot be negative. Invalid data is not accepted. Please enter valid data";
      }
      if (num > INVENTORY_LIMITS.REORDER_LEVEL_MAX) {
        return `Reorder Level cannot exceed ${INVENTORY_LIMITS.REORDER_LEVEL_MAX.toLocaleString()}. Too long text is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "maxLevel") {
      if (valStr === "" || valStr === null || valStr === undefined) {
        return "Max Level is required. Field is required. Please enter valid data";
      }
      const num = Number(value);
      if (isNaN(num)) {
        return "Max Level must be a valid number. Invalid data is not accepted. Please enter valid data";
      }
      if (num < 0) {
        return "Max Level cannot be negative. Invalid data is not accepted. Please enter valid data";
      }
      if (num > INVENTORY_LIMITS.MAX_LEVEL_MAX) {
        return `Max Level cannot exceed ${INVENTORY_LIMITS.MAX_LEVEL_MAX.toLocaleString()}. Too long text is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "unitCost") {
      if (valStr === "" || valStr === null || valStr === undefined) {
        return "Unit Cost is required. Field is required. Please enter valid data";
      }
      const num = Number(value);
      if (isNaN(num)) {
        return "Unit Cost must be a valid number. Invalid data is not accepted. Please enter valid data";
      }
      if (num < 0) {
        return "Unit Cost cannot be negative. Invalid data is not accepted. Please enter valid data";
      }
      if (num > INVENTORY_LIMITS.UNIT_COST_MAX) {
        return `Unit Cost cannot exceed ${INVENTORY_LIMITS.UNIT_COST_MAX.toLocaleString()}. Too long text is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "supplier") {
      if (!trimmed && valStr.length > 0) {
        return "Supplier contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      if (valStr.length > INVENTORY_LIMITS.SUPPLIER) {
        return `Supplier cannot exceed ${INVENTORY_LIMITS.SUPPLIER} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed && (!SUPPLIER_REGEX.test(trimmed) || trimmed.length < 2)) {
        return "Supplier contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "storageCondition") {
      if (!trimmed && valStr.length > 0) {
        return "Storage Condition contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      if (valStr.length > INVENTORY_LIMITS.STORAGE_CONDITION) {
        return `Storage Condition cannot exceed ${INVENTORY_LIMITS.STORAGE_CONDITION} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed && !STORAGE_REGEX.test(trimmed)) {
        return "Storage Condition contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "description") {
      if (valStr.length > INVENTORY_LIMITS.DESCRIPTION) {
        return `Description cannot exceed ${INVENTORY_LIMITS.DESCRIPTION} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed && (/<script|javascript:|data:/i.test(trimmed))) {
        return "Description contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: string,
    currentLen: number,
    limit: number,
    label: string,
    allowedCharRegex?: RegExp
  ) => {
    const allowedNavKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];

    if (allowedNavKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    if (allowedCharRegex && e.key.length === 1 && !allowedCharRegex.test(e.key)) {
      e.preventDefault();
      const msg = "Please enter valid data";
      setError(msg);
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-invalid-char` });
      return;
    }

    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = `${label} cannot exceed ${limit} characters. Please enter valid data`;
      setError("Please enter valid data");
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-limit` });
    }
  };

  const handleNumberKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: string,
    label: string,
    allowDecimal = false
  ) => {
    const allowedNavKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];

    if (allowedNavKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
      e.preventDefault();
      const msg = `${label} cannot be negative. Please enter valid data`;
      setError("Please enter valid data");
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-no-neg` });
      return;
    }

    if (allowDecimal && e.key === ".") {
      if (String(e.currentTarget.value).includes(".")) {
        e.preventDefault();
        const msg = "Please enter valid data";
        setError(msg);
        setFieldErrors((prev) => ({ ...prev, [field]: msg }));
        toast.error(msg, { id: `${field}-double-dot` });
      }
      return;
    }

    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const msg = "Please enter valid data";
      setError(msg);
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-not-num` });
    }
  };

  const handleBlur = (
    field:
      | "name"
      | "sku"
      | "category"
      | "unit"
      | "stockQty"
      | "reorderLevel"
      | "maxLevel"
      | "unitCost"
      | "supplier"
      | "storageCondition"
      | "description"
  ) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setError("Please enter valid data");
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const nameErr = validateField("name", form.name);
    const skuErr = validateField("sku", form.sku);
    const categoryErr = validateField("category", form.category);
    const unitErr = validateField("unit", form.unit);
    const stockQtyErr = validateField("stockQty", form.stockQty);
    const reorderLevelErr = validateField("reorderLevel", form.reorderLevel);
    const maxLevelErr = validateField("maxLevel", form.maxLevel);
    const unitCostErr = validateField("unitCost", form.unitCost);
    const supplierErr = validateField("supplier", form.supplier);
    const storageConditionErr = validateField("storageCondition", form.storageCondition);
    const descriptionErr = validateField("description", form.description);

    const errors: Record<string, string | undefined> = {
      name: nameErr,
      sku: skuErr,
      category: categoryErr,
      unit: unitErr,
      stockQty: stockQtyErr,
      reorderLevel: reorderLevelErr,
      maxLevel: maxLevelErr,
      unitCost: unitCostErr,
      supplier: supplierErr,
      storageCondition: storageConditionErr,
      description: descriptionErr,
    };

    setFieldErrors(errors);
    setTouched({
      name: true,
      sku: true,
      category: true,
      unit: true,
      stockQty: true,
      reorderLevel: true,
      maxLevel: true,
      unitCost: true,
      supplier: true,
      storageCondition: true,
      description: true,
    });

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      const firstError = Object.values(errors).find(Boolean);
      setError("Please enter valid data");
      toast.error(firstError || "Please enter valid data", { id: "inventory-form-invalid" });
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category,
      unit: form.unit.trim(),
      stockQty: Number(form.stockQty) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      maxLevel: Number(form.maxLevel) || 0,
      unitCost: Number(form.unitCost) || 0,
      supplier: form.supplier.trim(),
      storageCondition: form.storageCondition.trim(),
      description: form.description.trim(),
    };

    try {
      if (isEdit) {
        await updateItem.mutateAsync(payload);
        toast.success("Inventory item updated successfully!");
      } else {
        await createItem.mutateAsync(payload);
        toast.success("Inventory item created successfully!");
      }
      navigate("/admin/inventory");
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Please enter valid data";
      setError(serverMsg);
      toast.error(serverMsg, { id: "inventory-save-error" });
    }
  }

  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/admin/inventory" className="hover:text-emerald-700">
            Inventory
          </Link>{" "}
          &gt; {isEdit ? "Edit Item" : "Add New Item"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Inventory Item" : "Add Inventory Item"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <FormSection icon={PackagePlus} title="Item Details">
          <InputField
            label="Item Name *"
            required
            maxLength={INVENTORY_LIMITS.NAME}
            showCharCount
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => {
              const val = e.target.value;
              setForm((prev) => ({ ...prev, name: val }));
              const err = validateField("name", val);
              setFieldErrors((prev) => ({ ...prev, name: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "name", form.name.length, INVENTORY_LIMITS.NAME, "Item Name", ITEM_NAME_REGEX)}
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Amoxicillin 500mg"
          />

          <InputField
            label="SKU *"
            required
            maxLength={INVENTORY_LIMITS.SKU}
            showCharCount
            value={form.sku}
            error={fieldErrors.sku}
            onChange={(e) => {
              const val = e.target.value;
              setForm((prev) => ({ ...prev, sku: val }));
              const err = validateField("sku", val);
              setFieldErrors((prev) => ({ ...prev, sku: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "sku", form.sku.length, INVENTORY_LIMITS.SKU, "SKU", SKU_REGEX)}
            onBlur={() => handleBlur("sku")}
            placeholder="e.g. MED-ITEM-526"
          />

          <SelectField
            label="Category"
            value={form.category}
            error={fieldErrors.category}
            onChange={(e) => {
              const val = e.target.value as typeof form.category;
              setForm((prev) => ({ ...prev, category: val }));
              const err = validateField("category", val);
              setFieldErrors((prev) => ({ ...prev, category: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onBlur={() => handleBlur("category")}
          >
            <option value="medicines">Medicines</option>
            <option value="equipment">Equipment</option>
            <option value="consumables">Consumables</option>
          </SelectField>

          <InputField
            label="Unit"
            maxLength={INVENTORY_LIMITS.UNIT}
            showCharCount
            value={form.unit}
            error={fieldErrors.unit}
            onChange={(e) => {
              const val = e.target.value;
              setForm((prev) => ({ ...prev, unit: val }));
              const err = validateField("unit", val);
              setFieldErrors((prev) => ({ ...prev, unit: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "unit", form.unit.length, INVENTORY_LIMITS.UNIT, "Unit", UNIT_REGEX)}
            onBlur={() => handleBlur("unit")}
            placeholder="e.g. units, boxes"
          />

          <InputField
            label="Stock Quantity"
            type="number"
            min={0}
            max={INVENTORY_LIMITS.STOCK_QTY_MAX}
            value={form.stockQty}
            error={fieldErrors.stockQty}
            onChange={(e) => {
              const raw = e.target.value;
              const val = raw === "" ? "" : Number(raw);
              setForm((prev) => ({ ...prev, stockQty: val }));
              const err = validateField("stockQty", raw);
              setFieldErrors((prev) => ({ ...prev, stockQty: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleNumberKeyGuard(e, "stockQty", "Stock Quantity")}
            onBlur={() => handleBlur("stockQty")}
          />

          <InputField
            label="Reorder Level"
            type="number"
            min={0}
            max={INVENTORY_LIMITS.REORDER_LEVEL_MAX}
            value={form.reorderLevel}
            error={fieldErrors.reorderLevel}
            onChange={(e) => {
              const raw = e.target.value;
              const val = raw === "" ? "" : Number(raw);
              setForm((prev) => ({ ...prev, reorderLevel: val }));
              const err = validateField("reorderLevel", raw);
              setFieldErrors((prev) => ({ ...prev, reorderLevel: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleNumberKeyGuard(e, "reorderLevel", "Reorder Level")}
            onBlur={() => handleBlur("reorderLevel")}
          />

          <InputField
            label="Max Level"
            type="number"
            min={0}
            max={INVENTORY_LIMITS.MAX_LEVEL_MAX}
            value={form.maxLevel}
            error={fieldErrors.maxLevel}
            onChange={(e) => {
              const raw = e.target.value;
              const val = raw === "" ? "" : Number(raw);
              setForm((prev) => ({ ...prev, maxLevel: val }));
              const err = validateField("maxLevel", raw);
              setFieldErrors((prev) => ({ ...prev, maxLevel: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleNumberKeyGuard(e, "maxLevel", "Max Level")}
            onBlur={() => handleBlur("maxLevel")}
          />

          <InputField
            label="Unit Cost (₹)"
            type="number"
            min={0}
            max={INVENTORY_LIMITS.UNIT_COST_MAX}
            step="any"
            value={form.unitCost}
            error={fieldErrors.unitCost}
            onChange={(e) => {
              const raw = e.target.value;
              const val = raw === "" ? "" : Number(raw);
              setForm((prev) => ({ ...prev, unitCost: val }));
              const err = validateField("unitCost", raw);
              setFieldErrors((prev) => ({ ...prev, unitCost: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleNumberKeyGuard(e, "unitCost", "Unit Cost", true)}
            onBlur={() => handleBlur("unitCost")}
          />

          <InputField
            label="Supplier"
            maxLength={INVENTORY_LIMITS.SUPPLIER}
            showCharCount
            value={form.supplier}
            error={fieldErrors.supplier}
            onChange={(e) => {
              const val = e.target.value;
              setForm((prev) => ({ ...prev, supplier: val }));
              const err = validateField("supplier", val);
              setFieldErrors((prev) => ({ ...prev, supplier: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "supplier", form.supplier.length, INVENTORY_LIMITS.SUPPLIER, "Supplier", SUPPLIER_REGEX)}
            onBlur={() => handleBlur("supplier")}
            placeholder="e.g. Global Pharma Co."
          />

          <InputField
            label="Storage Condition"
            maxLength={INVENTORY_LIMITS.STORAGE_CONDITION}
            showCharCount
            value={form.storageCondition}
            error={fieldErrors.storageCondition}
            onChange={(e) => {
              const val = e.target.value;
              setForm((prev) => ({ ...prev, storageCondition: val }));
              const err = validateField("storageCondition", val);
              setFieldErrors((prev) => ({ ...prev, storageCondition: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "storageCondition", form.storageCondition.length, INVENTORY_LIMITS.STORAGE_CONDITION, "Storage Condition", STORAGE_REGEX)}
            onBlur={() => handleBlur("storageCondition")}
            placeholder="e.g. Cold Chain (2-8°C)"
          />

          <div className="sm:col-span-2">
            <TextareaField
              label="Description"
              maxLength={INVENTORY_LIMITS.DESCRIPTION}
              showCharCount
              value={form.description}
              error={fieldErrors.description}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, description: val }));
                const err = validateField("description", val);
                setFieldErrors((prev) => ({ ...prev, description: err }));
                if (!err && error === "Please enter valid data") setError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "description", form.description.length, INVENTORY_LIMITS.DESCRIPTION, "Description")}
              onBlur={() => handleBlur("description")}
              rows={2}
              placeholder="Optional description of the inventory item..."
            />
          </div>
        </FormSection>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

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
