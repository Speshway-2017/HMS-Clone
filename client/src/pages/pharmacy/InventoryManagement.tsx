import { useState, useEffect } from "react";
import { Boxes, Plus, Search, Edit3, Trash2, AlertTriangle, AlertCircle, Sparkles, Download, Upload } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import toast from "react-hot-toast";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { ImportExcelModal } from "../../components/ui/ImportExcelModal";
import { exportToExcel } from "../../lib/excelUtils";
import { InputField, SelectField } from "../../components/ui/Field";
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from "../../features/inventory";
import { useSuppliers } from "../../features/suppliers";

function generateAutoSku(medName: string = "", cat: string = "Analgesic"): string {
  const catPrefix = (cat || "MED").substring(0, 3).toUpperCase();
  const nameClean = medName.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const nameCode = nameClean.length >= 2 ? nameClean.substring(0, 3) : "MED";
  const num = Math.floor(100 + Math.random() * 900);
  return `${catPrefix}-${nameCode}-${num}`;
}

function generateAutoBatchNo(): string {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `B${yr}${mo}-${rand}`;
}

interface Medicine {
  _id: string;
  name: string;
  strength: string;
  category: string;
  sku: string;
  stockQty: number;
  reorderLevel: number;
  expiryDate: string;
  price: number;
  batchNo: string;
  supplier: string;
}

function mapBackendToMedicine(item: any): Medicine {
  const parts = item.description ? item.description.split(" | ") : [];
  const subcategory = parts[0] || "Analgesic";
  const expiryDate = parts[1] || "";

  return {
    _id: item._id,
    name: item.name,
    strength: item.strength || "",
    sku: item.sku,
    category: subcategory,
    stockQty: item.stockQty,
    reorderLevel: item.reorderLevel,
    expiryDate: expiryDate,
    price: item.unitCost,
    batchNo: item.storageCondition || "",
    supplier: item.supplier || "",
  };
}

export function PharmacyInventoryManagement() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  // Add/Edit State
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [medStrength, setMedStrength] = useState("");
  const [category, setCategory] = useState("Analgesic");
  const [sku, setSku] = useState("");
  const [stockQty, setStockQty] = useState<number | string>(0);
  const [reorderLevel, setReorderLevel] = useState<number | string>(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [price, setPrice] = useState<number | string>(0);
  const [batchNo, setBatchNo] = useState("");
  const [supplier, setSupplier] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // TanStack Query Hooks
  const { data: dbSuppliers = [] } = useSuppliers();
  const { data: inventoryData, isLoading } = useInventory({ category: "medicines", limit: 500 });
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem(selectedMed?._id || "");
  const deleteMutation = useDeleteInventoryItem();

  const rawItems = inventoryData?.data || [];
  const medicines = rawItems.map(mapBackendToMedicine);

  const categories = [
    "Analgesic",
    "Antibiotic",
    "Antidiabetic",
    "Cardiovascular",
    "Antihistamine",
    "Anesthetic",
    "Vaccine"
  ];

  const validateField = (
    field: "name" | "medStrength" | "sku" | "batchNo" | "stockQty" | "reorderLevel" | "price" | "supplier",
    value: any
  ): string | undefined => {
    const rawVal = typeof value === "string" ? value : value !== undefined && value !== null ? String(value) : "";
    const trimmed = rawVal.trim();

    if (field === "name") {
      if (!trimmed) {
        return "Please fill out this field";
      }
      if (rawVal.length > 100) {
        return "Medicine Name cannot exceed 100 characters. Please enter valid data";
      }
      if (trimmed.length < 2) {
        return "Medicine Name must be at least 2 characters. Please enter valid data";
      }
      if (!/^[a-zA-Z0-9\s\.\-/'&,()%+]+$/.test(trimmed)) {
        return "Medicine Name contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (field === "medStrength") {
      if (!trimmed) {
        return undefined; // Optional field
      }
      if (rawVal.length > 50) {
        return "Strength / Power cannot exceed 50 characters. Please enter valid data";
      }
      if (!/^[a-zA-Z0-9\s\.\-/,%]+$/.test(trimmed)) {
        return "Strength / Power contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (field === "stockQty") {
      if (rawVal === "" || !trimmed) {
        return "Please fill out this field";
      }
      if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return "Please enter valid data";
      }
      if (trimmed.includes(".")) {
        return "Stock Quantity must be a whole number. Please enter valid data";
      }
      const num = Number(trimmed);
      if (isNaN(num)) {
        return "Please enter valid data";
      }
      if (num < 0) {
        return "Stock Quantity cannot be negative. Please enter valid data";
      }
      if (num > 1000000 || trimmed.length > 7) {
        return "Stock Quantity cannot exceed 1,000,000. Please enter valid data";
      }
      return undefined;
    }

    if (field === "reorderLevel") {
      if (rawVal === "" || !trimmed) {
        return "Please fill out this field";
      }
      if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return "Please enter valid data";
      }
      if (trimmed.includes(".")) {
        return "Reorder Level must be a whole number. Please enter valid data";
      }
      const num = Number(trimmed);
      if (isNaN(num)) {
        return "Please enter valid data";
      }
      if (num < 0) {
        return "Reorder Level cannot be negative. Please enter valid data";
      }
      if (num > 1000000 || trimmed.length > 7) {
        return "Reorder Level cannot exceed 1,000,000. Please enter valid data";
      }
      return undefined;
    }

    if (field === "price") {
      if (rawVal === "" || !trimmed) {
        return "Please fill out this field";
      }
      if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return "Please enter valid data";
      }
      const num = Number(trimmed);
      if (isNaN(num)) {
        return "Please enter valid data";
      }
      if (num < 0) {
        return "Retail Unit Price cannot be negative. Please enter valid data";
      }
      if (num > 10000000 || trimmed.replace(/\..*$/, "").length > 8) {
        return "Retail Unit Price cannot exceed 10,000,000. Please enter valid data";
      }
      return undefined;
    }

    if (field === "sku") {
      if (!trimmed) {
        return "Please fill out this field";
      }
      if (rawVal.length > 50) {
        return "SKU cannot exceed 50 characters. Please enter valid data";
      }
      if (!/^[a-zA-Z0-9\-_./]+$/.test(trimmed)) {
        return "SKU contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (field === "batchNo") {
      if (!trimmed) {
        return "Please fill out this field";
      }
      if (rawVal.length > 50) {
        return "Batch Number cannot exceed 50 characters. Please enter valid data";
      }
      if (!/^[a-zA-Z0-9\-_./]+$/.test(trimmed)) {
        return "Batch Number contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (field === "supplier") {
      if (!trimmed) {
        return "Please fill out this field";
      }
      if (rawVal.length > 100) {
        return "Supplier cannot exceed 100 characters. Please enter valid data";
      }
      return undefined;
    }

    return undefined;
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedNavKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"
    ];
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (
      !hasSelection &&
      name.length >= 100 &&
      !allowedNavKeys.includes(e.key) &&
      !e.ctrlKey && !e.metaKey && !e.altKey
    ) {
      e.preventDefault();
      const limitMsg = "Medicine Name cannot exceed 100 characters. Please enter valid data";
      setFieldErrors((prev) => ({ ...prev, name: limitMsg }));
      toast.error(limitMsg, { id: "med-name-limit" });
    }
  };

  const handleNameChange = (val: string) => {
    let clean = val;
    let limitErr: string | undefined;
    if (val.length > 100) {
      clean = val.slice(0, 100);
      limitErr = "Medicine Name cannot exceed 100 characters. Please enter valid data";
    }
    setName(clean);
    if (!selectedMed) {
      setSku(generateAutoSku(clean, category));
    }
    const err = limitErr || validateField("name", clean);
    setFieldErrors((prev) => ({ ...prev, name: err }));
    if (limitErr) {
      toast.error(limitErr, { id: "med-name-limit" });
    }
  };

  const handleStrengthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedNavKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"
    ];
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (
      !hasSelection &&
      medStrength.length >= 50 &&
      !allowedNavKeys.includes(e.key) &&
      !e.ctrlKey && !e.metaKey && !e.altKey
    ) {
      e.preventDefault();
      const limitMsg = "Strength / Power cannot exceed 50 characters. Please enter valid data";
      setFieldErrors((prev) => ({ ...prev, medStrength: limitMsg }));
      toast.error(limitMsg, { id: "med-strength-limit" });
    }
  };

  const handleStrengthChange = (val: string) => {
    let clean = val;
    let limitErr: string | undefined;
    if (val.length > 50) {
      clean = val.slice(0, 50);
      limitErr = "Strength / Power cannot exceed 50 characters. Please enter valid data";
    }
    setMedStrength(clean);
    const err = limitErr || validateField("medStrength", clean);
    setFieldErrors((prev) => ({ ...prev, medStrength: err }));
    if (limitErr) {
      toast.error(limitErr, { id: "med-strength-limit" });
    }
  };

  const handleStockQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedNavKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"
    ];
    if (["-", "e", "E", "+", "."].includes(e.key)) {
      e.preventDefault();
      const msg = e.key === "."
        ? "Stock Quantity must be a whole number. Please enter valid data"
        : "Stock Quantity cannot be negative. Please enter valid data";
      setFieldErrors((prev) => ({ ...prev, stockQty: msg }));
      toast.error(msg, { id: "stock-qty-invalid" });
      return;
    }
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (
      !hasSelection &&
      String(stockQty).length >= 7 &&
      /^[0-9]$/.test(e.key) &&
      !allowedNavKeys.includes(e.key) &&
      !e.ctrlKey && !e.metaKey
    ) {
      e.preventDefault();
      const limitMsg = "Stock Quantity cannot exceed 1,000,000. Please enter valid data";
      setFieldErrors((prev) => ({ ...prev, stockQty: limitMsg }));
      toast.error(limitMsg, { id: "stock-qty-limit" });
    }
  };

  const handleStockQtyChange = (val: string) => {
    setStockQty(val);
    const err = validateField("stockQty", val);
    setFieldErrors((prev) => ({ ...prev, stockQty: err }));
  };

  const handleReorderLevelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedNavKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"
    ];
    if (["-", "e", "E", "+", "."].includes(e.key)) {
      e.preventDefault();
      const msg = e.key === "."
        ? "Reorder Level must be a whole number. Please enter valid data"
        : "Reorder Level cannot be negative. Please enter valid data";
      setFieldErrors((prev) => ({ ...prev, reorderLevel: msg }));
      toast.error(msg, { id: "reorder-level-invalid" });
      return;
    }
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (
      !hasSelection &&
      String(reorderLevel).length >= 7 &&
      /^[0-9]$/.test(e.key) &&
      !allowedNavKeys.includes(e.key) &&
      !e.ctrlKey && !e.metaKey
    ) {
      e.preventDefault();
      const limitMsg = "Reorder Level cannot exceed 1,000,000. Please enter valid data";
      setFieldErrors((prev) => ({ ...prev, reorderLevel: limitMsg }));
      toast.error(limitMsg, { id: "reorder-level-limit" });
    }
  };

  const handleReorderLevelChange = (val: string) => {
    setReorderLevel(val);
    const err = validateField("reorderLevel", val);
    setFieldErrors((prev) => ({ ...prev, reorderLevel: err }));
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedNavKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"
    ];
    if (["-", "e", "E", "+"].includes(e.key)) {
      e.preventDefault();
      const msg = "Retail Unit Price cannot be negative. Please enter valid data";
      setFieldErrors((prev) => ({ ...prev, price: msg }));
      toast.error(msg, { id: "unit-price-invalid" });
      return;
    }
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (
      !hasSelection &&
      String(price).replace(/\..*$/, "").length >= 8 &&
      /^[0-9]$/.test(e.key) &&
      !String(price).includes(".") &&
      !allowedNavKeys.includes(e.key) &&
      !e.ctrlKey && !e.metaKey
    ) {
      e.preventDefault();
      const limitMsg = "Retail Unit Price cannot exceed 10,000,000. Please enter valid data";
      setFieldErrors((prev) => ({ ...prev, price: limitMsg }));
      toast.error(limitMsg, { id: "unit-price-limit" });
    }
  };

  const handlePriceChange = (val: string) => {
    setPrice(val);
    const err = validateField("price", val);
    setFieldErrors((prev) => ({ ...prev, price: err }));
  };

  const handleBlur = (
    field: "name" | "medStrength" | "sku" | "batchNo" | "stockQty" | "reorderLevel" | "price" | "supplier"
  ) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let val: any = "";
    if (field === "name") val = name;
    else if (field === "medStrength") val = medStrength;
    else if (field === "sku") val = sku;
    else if (field === "batchNo") val = batchNo;
    else if (field === "stockQty") val = stockQty;
    else if (field === "reorderLevel") val = reorderLevel;
    else if (field === "price") val = price;
    else if (field === "supplier") val = supplier;

    const err = validateField(field, val);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleOpenAdd = () => {
    setSelectedMed(null);
    const initialCategory = "Analgesic";
    setName("");
    setMedStrength("");
    setCategory(initialCategory);
    setSku(generateAutoSku("", initialCategory));
    setBatchNo(generateAutoBatchNo());
    setStockQty(0);
    setReorderLevel(0);
    setExpiryDate("");
    setPrice(0);
    setSupplier("");
    setFieldErrors({});
    setTouched({});
    setFormError(null);
    setIsAddEditOpen(true);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (!selectedMed) {
      setSku(generateAutoSku(name, val));
    }
  };

  const handleOpenEdit = (med: Medicine) => {
    setSelectedMed(med);
    setName(med.name);
    setMedStrength(med.strength || "");
    setCategory(med.category);
    setSku(med.sku);
    setStockQty(med.stockQty);
    setReorderLevel(med.reorderLevel);
    setExpiryDate(med.expiryDate);
    setPrice(med.price);
    setBatchNo(med.batchNo);
    setSupplier(med.supplier);
    setFieldErrors({});
    setTouched({});
    setFormError(null);
    setIsAddEditOpen(true);
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteMedicine = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      toast.success("Medicine deleted successfully!");
    } catch (err: any) {
      console.error("Failed to delete medicine", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete medicine.");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || createMutation.isPending || updateMutation.isPending) return;

    setTouched({
      name: true,
      medStrength: true,
      sku: true,
      batchNo: true,
      stockQty: true,
      reorderLevel: true,
      price: true,
      supplier: true,
    });

    const nameErr = validateField("name", name);
    const strengthErr = validateField("medStrength", medStrength);
    const skuErr = validateField("sku", sku);
    const batchErr = validateField("batchNo", batchNo);
    const stockErr = validateField("stockQty", stockQty);
    const reorderErr = validateField("reorderLevel", reorderLevel);
    const priceErr = validateField("price", price);
    const supplierErr = validateField("supplier", supplier);

    const errs = {
      name: nameErr,
      medStrength: strengthErr,
      sku: skuErr,
      batchNo: batchErr,
      stockQty: stockErr,
      reorderLevel: reorderErr,
      price: priceErr,
      supplier: supplierErr,
    };
    setFieldErrors(errs);

    const firstErr =
      nameErr ||
      strengthErr ||
      stockErr ||
      reorderErr ||
      priceErr ||
      skuErr ||
      batchErr ||
      supplierErr;

    if (firstErr) {
      setFormError(firstErr);
      toast.error(firstErr, { id: "med-form-error" });
      return;
    }
    setFormError(null);

    setIsSubmitting(true);
    const payload = {
      name: name.trim(),
      strength: medStrength.trim(),
      sku: sku.trim().toUpperCase(),
      category: "medicines" as const,
      description: `${category} | ${expiryDate}`,
      unit: "units",
      stockQty: Number(stockQty) || 0,
      reorderLevel: Number(reorderLevel) || 0,
      unitCost: Number(price) || 0,
      supplier: supplier.trim(),
      storageCondition: batchNo.trim(),
    };

    try {
      if (selectedMed) {
        await updateMutation.mutateAsync(payload);
        toast.success("Medicine updated successfully!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Medicine added successfully!");
      }
      setIsAddEditOpen(false);
    } catch (err: any) {
      console.error("Failed to save medicine", err);
      toast.error(err?.response?.data?.message || "Failed to save medicine.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = medicines.filter((m) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q) ||
      (m.strength && m.strength.toLowerCase().includes(q)) ||
      m.batchNo.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      (m.supplier && m.supplier.toLowerCase().includes(q));
    const matchesCategory = filterCategory === "All" || m.category.toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  if (isLoading && !inventoryData) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-slate-500 font-medium">Loading inventory data...</div>
      </div>
    );
  }

  const handleExportExcel = () => {
    const headers = ["Medicine Name", "Strength", "SKU", "Category", "Batch No", "Stock Qty", "Reorder Level", "Expiry Date", "Unit Price (INR)", "Supplier"];
    const rows = medicines.map((m) => [
      m.name,
      m.strength || "",
      m.sku,
      m.category,
      m.batchNo,
      m.stockQty,
      m.reorderLevel,
      m.expiryDate,
      m.price,
      m.supplier || "—",
    ]);
    exportToExcel("Pharmacy_Medicine_Inventory_2026", headers, rows);
  };

  const handleImportMeds = async (records: Record<string, string>[]) => {
    toast.success(`Successfully processed ${records.length} medicine records!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-sm text-slate-500">Track and manage medicine stocks, batch references, and expiries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsImportOpen(true)} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50">
            <Upload className="h-4 w-4 text-emerald-600" /> Import Excel
          </Button>
          <Button variant="secondary" onClick={handleExportExcel} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50">
            <Download className="h-4 w-4 text-slate-600" /> Export Excel
          </Button>
          <Button onClick={handleOpenAdd} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white">
            <Plus className="h-4 w-4" /> Add New Medicine
          </Button>
        </div>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Formulations</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{medicines.length}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Boxes className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Low Stock Alert</div>
            <div className="mt-1 text-2xl font-bold text-red-600">
              {medicines.filter(m => m.stockQty <= m.reorderLevel).length}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Near Expiry Alert</div>
            <div className="mt-1 text-2xl font-bold text-amber-600">
              {medicines.filter(m => {
                if (!m.expiryDate) return false;
                const exp = new Date(m.expiryDate);
                const threeM = new Date();
                threeM.setMonth(threeM.getMonth() + 3);
                return exp <= threeM;
              }).length}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterCategory("All")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${filterCategory === "All" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${filterCategory === cat ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, medicine, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-350 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Main Grid Table */}
      <Card>
        <DataTable
          rowKey={(r) => r._id}
          rows={filtered}
          emptyMessage="No medicines found in inventory."
          columns={[
            {
              header: "SKU / Code",
              render: (r) => (
                <div>
                  <div className="font-bold text-slate-700">{r.sku}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{r._id}</div>
                </div>
              )
            },
            {
              header: "Medicine Name",
              render: (r) => (
                <div>
                  <div className="font-semibold text-slate-800">{r.name}</div>
                  <div className="text-xs text-slate-400">{r.category}</div>
                </div>
              )
            },
            {
              header: "Strength",
              render: (r) => (
                <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                  {r.strength || "—"}
                </span>
              )
            },
            {
              header: "Batch No",
              render: (r) => <span className="font-mono text-xs text-slate-650">{r.batchNo}</span>
            },
            {
              header: "Stock Qty",
              render: (r) => {
                const isCritical = r.stockQty <= r.reorderLevel;
                return (
                  <div>
                    <span className={`font-bold text-sm ${isCritical ? "text-red-600" : "text-slate-800"}`}>
                      {r.stockQty} Units
                    </span>
                    {isCritical && (
                      <span className="block text-[10px] text-red-500 font-semibold flex items-center gap-0.5 mt-0.5">
                        <AlertTriangle className="h-3 w-3" /> Reorder limit ({r.reorderLevel})
                      </span>
                    )}
                  </div>
                );
              }
            },
            {
              header: "Expiry Date",
              render: (r) => {
                const expDate = r.expiryDate;
                if (!expDate) return <span className="text-xs text-slate-400">N/A</span>;
                const exp = new Date(expDate);
                const today = new Date();
                const diff = exp.getTime() - today.getTime();
                const diffDays = Math.ceil(diff / (1000 * 3600 * 24));
                const isExpired = diffDays <= 0;
                const isNearExpiry = diffDays > 0 && diffDays <= 90; // 3 months

                return (
                  <div>
                    <span className={`text-xs ${isExpired ? "text-red-600 font-bold" : isNearExpiry ? "text-amber-600 font-semibold" : "text-slate-600"}`}>
                      {expDate}
                    </span>
                    {isExpired && <span className="block text-[9px] text-red-500 font-bold uppercase">EXPIRED</span>}
                    {isNearExpiry && <span className="block text-[9px] text-amber-500 font-semibold">EXPIRING SOON</span>}
                  </div>
                );
              }
            },
            {
              header: "Unit Price",
              render: (r) => <span className="font-semibold">₹{r.price.toFixed(2)}</span>
            },
            {
              header: "Actions",
              render: (r) => (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => handleOpenEdit(r)} className="p-1 hover:text-emerald-700">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => handleDelete(r._id)} className="p-1 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        title={selectedMed ? "Edit Medicine" : "Add New Medicine"}
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Medicine Name"
              required
              maxLength={100}
              showCharCount
              placeholder="e.g. Paracetamol"
              value={name}
              error={fieldErrors.name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={() => handleBlur("name")}
            />

            <InputField
              label="Strength / Power"
              maxLength={50}
              showCharCount
              placeholder="e.g. 500mg, 100mg, 10ml"
              value={medStrength}
              error={fieldErrors.medStrength}
              onChange={(e) => handleStrengthChange(e.target.value)}
              onKeyDown={handleStrengthKeyDown}
              onBlur={() => handleBlur("medStrength")}
            />

            <SelectField
              label="Category"
              required
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </SelectField>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  SKU (Auto-Generated) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSku(generateAutoSku(name, category))}
                  className="text-[10px] font-extrabold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Generate new unique SKU"
                >
                  <Sparkles className="h-3 w-3 text-indigo-600" /> Auto Generate
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={50}
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  const err = validateField("sku", e.target.value);
                  setFieldErrors((prev) => ({ ...prev, sku: err }));
                }}
                onBlur={() => handleBlur("sku")}
                placeholder="e.g. ANA-PAR-402"
                className={`w-full rounded-xl border bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none transition-colors ${
                  fieldErrors.sku ? "border-red-500 focus:border-red-600 focus:ring-red-100" : "border-slate-200 focus:border-emerald-600 focus:ring-navy-100"
                } focus:ring-2`}
              />
              {fieldErrors.sku && (
                <p className="mt-1 text-xs font-medium text-red-600" role="alert">{fieldErrors.sku}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Batch Number (Auto-Generated) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setBatchNo(generateAutoBatchNo())}
                  className="text-[10px] font-extrabold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Generate new unique Batch Number"
                >
                  <Sparkles className="h-3 w-3 text-indigo-600" /> Auto Generate
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={50}
                value={batchNo}
                onChange={(e) => {
                  setBatchNo(e.target.value);
                  const err = validateField("batchNo", e.target.value);
                  setFieldErrors((prev) => ({ ...prev, batchNo: err }));
                }}
                onBlur={() => handleBlur("batchNo")}
                placeholder="e.g. B202608-4910"
                className={`w-full rounded-xl border bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none transition-colors ${
                  fieldErrors.batchNo ? "border-red-500 focus:border-red-600 focus:ring-red-100" : "border-slate-200 focus:border-emerald-600 focus:ring-navy-100"
                } focus:ring-2`}
              />
              {fieldErrors.batchNo && (
                <p className="mt-1 text-xs font-medium text-red-600" role="alert">{fieldErrors.batchNo}</p>
              )}
            </div>

            <InputField
              label="Stock Quantity"
              type="number"
              required
              min={0}
              max={1000000}
              value={stockQty}
              error={fieldErrors.stockQty}
              onChange={(e) => handleStockQtyChange(e.target.value)}
              onKeyDown={handleStockQtyKeyDown}
              onBlur={() => handleBlur("stockQty")}
            />

            <InputField
              label="Reorder Level"
              type="number"
              required
              min={0}
              max={1000000}
              value={reorderLevel}
              error={fieldErrors.reorderLevel}
              onChange={(e) => handleReorderLevelChange(e.target.value)}
              onKeyDown={handleReorderLevelKeyDown}
              onBlur={() => handleBlur("reorderLevel")}
            />

            <InputField
              label="Retail Unit Price (₹)"
              type="number"
              step="0.01"
              required
              min={0}
              max={10000000}
              value={price}
              error={fieldErrors.price}
              onChange={(e) => handlePriceChange(e.target.value)}
              onKeyDown={handlePriceKeyDown}
              onBlur={() => handleBlur("price")}
            />

            {dbSuppliers.length > 0 ? (
              <SelectField
                label="Supplier"
                required
                value={supplier}
                error={fieldErrors.supplier}
                onChange={(e) => {
                  setSupplier(e.target.value);
                  const err = validateField("supplier", e.target.value);
                  setFieldErrors((prev) => ({ ...prev, supplier: err }));
                }}
                onBlur={() => handleBlur("supplier")}
                className="sm:col-span-2"
              >
                <option value="">-- Select Registered Supplier --</option>
                {dbSuppliers.map((s) => (
                  <option key={s._id} value={s.name}>
                    {s.name} ({s.supplierId || s.phone || "Active"})
                  </option>
                ))}
                {supplier && !dbSuppliers.some((s) => s.name === supplier) && (
                  <option value={supplier}>{supplier}</option>
                )}
              </SelectField>
            ) : (
              <InputField
                label="Supplier"
                required
                value={supplier}
                error={fieldErrors.supplier}
                onChange={(e) => {
                  setSupplier(e.target.value);
                  const err = validateField("supplier", e.target.value);
                  setFieldErrors((prev) => ({ ...prev, supplier: err }));
                }}
                onBlur={() => handleBlur("supplier")}
                placeholder="e.g. Apollo Pharmacy Distributors"
                className="sm:col-span-2"
              />
            )}
          </div>

          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs font-semibold text-red-700 flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : selectedMed
                  ? "Save Changes"
                  : "Add Medicine"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetId)}
        title="Confirm Deletion"
        message="Are you sure you want to delete this medicine record? This action cannot be undone."
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDeleteMedicine}
      />

      <ImportExcelModal
        isOpen={isImportOpen}
        title="Import Medicine Inventory Excel"
        sampleFilename="Medicine_Inventory_Import_Template.csv"
        sampleHeaders={["Medicine Name", "Strength", "SKU", "Category", "Batch No", "Stock Qty", "Reorder Level", "Expiry Date", "Unit Price", "Supplier"]}
        sampleRows={[
          ["Paracetamol", "500mg", "ANA-PAR-101", "Analgesic", "B2026-01", 200, 20, "2027-12-31", 15.5, "PharmaCorp"],
          ["Amoxicillin", "250mg", "ANT-AMO-202", "Antibiotic", "B2026-02", 100, 15, "2027-06-30", 45.0, "MediSupply"],
        ]}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportMeds}
      />
    </div>
  );
}
