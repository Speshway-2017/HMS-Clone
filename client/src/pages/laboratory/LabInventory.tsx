import { useState, useEffect } from "react";
import { Boxes, Plus, Edit3, Trash2, AlertTriangle, AlertCircle, Search, Download, Upload } from "lucide-react";
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

interface LabInventoryItem {
  _id: string;
  name: string;
  sku: string;
  category: "Reagent" | "Consumable";
  quantity: number;
  unit: string;
  expiryDate: string;
  reorderLevel: number;
  batchNo: string;
  storageTemp: string;
}

const validateField = (field: string, value: any): string | null => {
  const rawVal = typeof value === "string" ? value : value !== undefined && value !== null ? String(value) : "";
  const trimmed = rawVal.trim();

  if (field === "name") {
    if (!trimmed) {
      return "Please fill out this field";
    }
    if (rawVal.length > 100) {
      return "Item Name cannot exceed 100 characters. Characters limit: 100. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
    }
    if (trimmed.length < 2) {
      return "Item Name must be at least 2 characters. Please enter valid data";
    }
    if (
      !/^[a-zA-Z0-9\s\.\-/'&,()%+]+$/.test(trimmed) ||
      !/[a-zA-Z0-9]/.test(trimmed) ||
      /<[^>]*>|javascript:/i.test(trimmed)
    ) {
      return "Item Name contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    return null;
  }

  if (field === "sku") {
    if (!trimmed) {
      return "Please fill out this field";
    }
    if (rawVal.length > 50) {
      return "SKU Code cannot exceed 50 characters. Characters limit: 50. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
    }
    if (trimmed.length < 2) {
      return "SKU Code must be at least 2 characters. Please enter valid data";
    }
    if (
      !/^[a-zA-Z0-9\-_./]+$/.test(trimmed) ||
      !/[a-zA-Z0-9]/.test(trimmed) ||
      /<[^>]*>|javascript:/i.test(trimmed)
    ) {
      return "SKU Code contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    return null;
  }

  if (field === "quantity") {
    if (rawVal === "" || !trimmed) {
      return "Please fill out this field";
    }
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return "Quantity contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    if (trimmed.includes(".")) {
      return "Quantity must be a whole number. Please enter valid data";
    }
    const num = Number(trimmed);
    if (isNaN(num)) {
      return "Quantity contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    if (num < 0) {
      return "Quantity cannot be negative. Please enter valid data";
    }
    if (num > 1000000 || trimmed.length > 7) {
      return "Quantity cannot exceed 1,000,000. Characters limit: 7. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
    }
    return null;
  }

  if (field === "unit") {
    if (!trimmed) {
      return "Please fill out this field";
    }
    if (rawVal.length > 50) {
      return "Unit Label cannot exceed 50 characters. Characters limit: 50. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
    }
    if (trimmed.length < 2) {
      return "Unit Label must be at least 2 characters. Please enter valid data";
    }
    if (
      !/^[a-zA-Z0-9\s\.\-/()]+$/.test(trimmed) ||
      !/[a-zA-Z0-9]/.test(trimmed) ||
      /<[^>]*>|javascript:/i.test(trimmed)
    ) {
      return "Unit Label contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    return null;
  }

  if (field === "expiryDate") {
    if (!trimmed) {
      return "Please fill out this field";
    }
    if (rawVal.length > 10) {
      return "Expiry Date cannot exceed 10 characters. Too long text is not accepted. Too long data is not accepted. Please enter valid data";
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(trimmed) || isNaN(Date.parse(trimmed))) {
      return "Expiry Date contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    const year = parseInt(trimmed.slice(0, 4), 10);
    if (year < 2000 || year > 2100) {
      return "Expiry Date contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    return null;
  }

  if (field === "reorderLevel") {
    if (rawVal === "" || !trimmed) {
      return "Please fill out this field";
    }
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return "Reorder Threshold contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    if (trimmed.includes(".")) {
      return "Reorder Threshold must be a whole number. Please enter valid data";
    }
    const num = Number(trimmed);
    if (isNaN(num)) {
      return "Reorder Threshold contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    if (num < 0) {
      return "Reorder Threshold cannot be negative. Please enter valid data";
    }
    if (num > 1000000 || trimmed.length > 7) {
      return "Reorder Threshold cannot exceed 1,000,000. Characters limit: 7. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
    }
    return null;
  }

  if (field === "batchNo") {
    if (!trimmed) {
      return "Please fill out this field";
    }
    if (rawVal.length > 50) {
      return "Batch Number cannot exceed 50 characters. Characters limit: 50. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
    }
    if (trimmed.length < 2) {
      return "Batch Number must be at least 2 characters. Please enter valid data";
    }
    if (
      !/^[a-zA-Z0-9\-_./]+$/.test(trimmed) ||
      !/[a-zA-Z0-9]/.test(trimmed) ||
      /<[^>]*>|javascript:/i.test(trimmed)
    ) {
      return "Batch Number contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    return null;
  }

  if (field === "search") {
    if (!trimmed) return null;
    if (rawVal.length > 100) {
      return "Search cannot exceed 100 characters. Characters limit: 100. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
    }
    if (/<[^>]*>|javascript:/i.test(trimmed) || !/^[a-zA-Z0-9\s.,\-_/()#]+$/.test(trimmed)) {
      return "Search contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
    }
    return null;
  }

  return null;
};

export function LaboratoryInventory() {
  const [inventory, setInventory] = useState<LabInventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  // Add/Edit State
  const [selectedItem, setSelectedItem] = useState<LabInventoryItem | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Reagent" | "Consumable">("Reagent");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState<string | number>(0);
  const [unit, setUnit] = useState("vials");
  const [expiryDate, setExpiryDate] = useState("");
  const [reorderLevel, setReorderLevel] = useState<string | number>(10);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [batchNo, setBatchNo] = useState("");
  const [storageTemp, setStorageTemp] = useState("2 - 8°C");

  useEffect(() => {
    const saved = localStorage.getItem("hms_laboratory_inventory");
    if (saved && JSON.parse(saved).length > 0) {
      setInventory(JSON.parse(saved));
    } else {
      // Seed initial reagents inventory if empty
      const initialItems: LabInventoryItem[] = [
        { _id: "LAB-INV-001", name: "CBC Diluent (Cellpack)", sku: "RE-CBC-01", category: "Reagent", quantity: 12, unit: "containers", expiryDate: "2027-02-15", reorderLevel: 5, batchNo: "B-CB991", storageTemp: "15 - 30°C" },
        { _id: "LAB-INV-002", name: "HbA1c Reagent Kit", sku: "RE-HBA-02", category: "Reagent", quantity: 3, unit: "kits", expiryDate: "2026-09-10", reorderLevel: 5, batchNo: "B-HB202", storageTemp: "2 - 8°C" },
        { _id: "LAB-INV-003", name: "Lipid Panel Cassettes", sku: "RE-LPD-03", category: "Reagent", quantity: 80, unit: "pieces", expiryDate: "2026-11-20", reorderLevel: 100, batchNo: "B-LP405", storageTemp: "2 - 8°C" },
        { _id: "LAB-INV-004", name: "Blood Collection Tubes (Purple Top)", sku: "CS-TUBE-01", category: "Consumable", quantity: 450, unit: "pieces", expiryDate: "2028-06-30", reorderLevel: 200, batchNo: "B-PT001", storageTemp: "15 - 30°C" },
        { _id: "LAB-INV-005", name: "Sterile Syringes 5ml", sku: "CS-SYR-02", category: "Consumable", quantity: 180, unit: "pieces", expiryDate: "2028-08-15", reorderLevel: 200, batchNo: "B-SR002", storageTemp: "15 - 30°C" }
      ];
      localStorage.setItem("hms_laboratory_inventory", JSON.stringify(initialItems));
      setInventory(initialItems);
    }
  }, []);

  const saveInventory = (updated: LabInventoryItem[]) => {
    setInventory(updated);
    localStorage.setItem("hms_laboratory_inventory", JSON.stringify(updated));
  };

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setName("");
    setCategory("Reagent");
    setSku("");
    setQuantity(0);
    setUnit("vials");
    setExpiryDate("");
    setReorderLevel(10);
    setBatchNo("");
    setStorageTemp("2 - 8°C");
    setErrors({});
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (item: LabInventoryItem) => {
    setSelectedItem(item);
    setName(item.name);
    setCategory(item.category);
    setSku(item.sku);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setExpiryDate(item.expiryDate);
    setReorderLevel(item.reorderLevel);
    setBatchNo(item.batchNo);
    setStorageTemp(item.storageTemp);
    setErrors({});
    setIsAddEditOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    const err = validateField("name", val);
    setErrors(prev => ({ ...prev, name: err }));
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isNavigationKey = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Enter", "Escape", "Home", "End"
    ].includes(e.key);
    if (e.ctrlKey || e.altKey || e.metaKey || isNavigationKey) return;
    if (name.length >= 100) {
      const inputEl = e.currentTarget;
      const hasSelection = (inputEl.selectionEnd ?? 0) - (inputEl.selectionStart ?? 0) > 0;
      if (!hasSelection) {
        e.preventDefault();
        const msg = "Item Name cannot exceed 100 characters. Characters limit: 100. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
        setErrors(prev => ({ ...prev, name: msg }));
        toast.error(msg, { id: "item-name-limit" });
      }
    }
  };

  const handleSkuChange = (val: string) => {
    setSku(val);
    const err = validateField("sku", val);
    setErrors(prev => ({ ...prev, sku: err }));
  };

  const handleSkuKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isNavigationKey = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Enter", "Escape", "Home", "End"
    ].includes(e.key);
    if (e.ctrlKey || e.altKey || e.metaKey || isNavigationKey) return;
    if (sku.length >= 50) {
      const inputEl = e.currentTarget;
      const hasSelection = (inputEl.selectionEnd ?? 0) - (inputEl.selectionStart ?? 0) > 0;
      if (!hasSelection) {
        e.preventDefault();
        const msg = "SKU Code cannot exceed 50 characters. Characters limit: 50. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
        setErrors(prev => ({ ...prev, sku: msg }));
        toast.error(msg, { id: "sku-limit" });
      }
    }
  };

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const err = validateField("quantity", val);
    setErrors(prev => ({ ...prev, quantity: err }));
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["-", "e", "E", "+", "."].includes(e.key)) {
      e.preventDefault();
      const msg = e.key === "."
        ? "Quantity must be a whole number. Please enter valid data"
        : "Quantity cannot be negative. Please enter valid data";
      setErrors(prev => ({ ...prev, quantity: msg }));
      toast.error(msg, { id: "qty-invalid" });
      return;
    }
    const isNavigationKey = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Enter", "Escape", "Home", "End"
    ].includes(e.key);
    if (e.ctrlKey || e.altKey || e.metaKey || isNavigationKey) return;
    if (String(quantity).length >= 7 && /^[0-9]$/.test(e.key)) {
      const inputEl = e.currentTarget;
      const hasSelection = (inputEl.selectionEnd ?? 0) - (inputEl.selectionStart ?? 0) > 0;
      if (!hasSelection) {
        e.preventDefault();
        const msg = "Quantity cannot exceed 1,000,000. Characters limit: 7. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
        setErrors(prev => ({ ...prev, quantity: msg }));
        toast.error(msg, { id: "qty-limit" });
      }
    }
  };

  const handleUnitChange = (val: string) => {
    setUnit(val);
    const err = validateField("unit", val);
    setErrors(prev => ({ ...prev, unit: err }));
  };

  const handleUnitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isNavigationKey = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Enter", "Escape", "Home", "End"
    ].includes(e.key);
    if (e.ctrlKey || e.altKey || e.metaKey || isNavigationKey) return;
    if (unit.length >= 50) {
      const inputEl = e.currentTarget;
      const hasSelection = (inputEl.selectionEnd ?? 0) - (inputEl.selectionStart ?? 0) > 0;
      if (!hasSelection) {
        e.preventDefault();
        const msg = "Unit Label cannot exceed 50 characters. Characters limit: 50. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
        setErrors(prev => ({ ...prev, unit: msg }));
        toast.error(msg, { id: "unit-limit" });
      }
    }
  };

  const handleExpiryDateChange = (val: string) => {
    setExpiryDate(val);
    const err = validateField("expiryDate", val);
    setErrors(prev => ({ ...prev, expiryDate: err }));
  };

  const handleExpiryDateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isNavigationKey = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Enter", "Escape", "Home", "End"
    ].includes(e.key);
    if (e.ctrlKey || e.altKey || e.metaKey || isNavigationKey) return;
    if (expiryDate.length >= 10) {
      const inputEl = e.currentTarget;
      const hasSelection = (inputEl.selectionEnd ?? 0) - (inputEl.selectionStart ?? 0) > 0;
      if (!hasSelection) {
        e.preventDefault();
        const msg = "Expiry Date cannot exceed 10 characters. Too long text is not accepted. Too long data is not accepted. Please enter valid data";
        setErrors(prev => ({ ...prev, expiryDate: msg }));
        toast.error(msg, { id: "expiry-limit" });
      }
    }
  };

  const handleReorderLevelChange = (val: string) => {
    setReorderLevel(val);
    const err = validateField("reorderLevel", val);
    setErrors(prev => ({ ...prev, reorderLevel: err }));
  };

  const handleReorderLevelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["-", "e", "E", "+", "."].includes(e.key)) {
      e.preventDefault();
      const msg = e.key === "."
        ? "Reorder Threshold must be a whole number. Please enter valid data"
        : "Reorder Threshold cannot be negative. Please enter valid data";
      setErrors(prev => ({ ...prev, reorderLevel: msg }));
      toast.error(msg, { id: "reorder-invalid" });
      return;
    }
    const isNavigationKey = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Enter", "Escape", "Home", "End"
    ].includes(e.key);
    if (e.ctrlKey || e.altKey || e.metaKey || isNavigationKey) return;
    if (String(reorderLevel).length >= 7 && /^[0-9]$/.test(e.key)) {
      const inputEl = e.currentTarget;
      const hasSelection = (inputEl.selectionEnd ?? 0) - (inputEl.selectionStart ?? 0) > 0;
      if (!hasSelection) {
        e.preventDefault();
        const msg = "Reorder Threshold cannot exceed 1,000,000. Characters limit: 7. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
        setErrors(prev => ({ ...prev, reorderLevel: msg }));
        toast.error(msg, { id: "reorder-limit" });
      }
    }
  };

  const handleBatchNoChange = (val: string) => {
    setBatchNo(val);
    const err = validateField("batchNo", val);
    setErrors(prev => ({ ...prev, batchNo: err }));
  };

  const handleBatchNoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isNavigationKey = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Enter", "Escape", "Home", "End"
    ].includes(e.key);
    if (e.ctrlKey || e.altKey || e.metaKey || isNavigationKey) return;
    if (batchNo.length >= 50) {
      const inputEl = e.currentTarget;
      const hasSelection = (inputEl.selectionEnd ?? 0) - (inputEl.selectionStart ?? 0) > 0;
      if (!hasSelection) {
        e.preventDefault();
        const msg = "Batch Number cannot exceed 50 characters. Characters limit: 50. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
        setErrors(prev => ({ ...prev, batchNo: msg }));
        toast.error(msg, { id: "batch-limit" });
      }
    }
  };

  const handleBlur = (field: string) => {
    let val: any;
    if (field === "name") val = name;
    else if (field === "sku") val = sku;
    else if (field === "quantity") val = quantity;
    else if (field === "unit") val = unit;
    else if (field === "expiryDate") val = expiryDate;
    else if (field === "reorderLevel") val = reorderLevel;
    else if (field === "batchNo") val = batchNo;
    else if (field === "search") val = search;
    const err = validateField(field, val);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    const err = validateField("search", val);
    setErrors(prev => ({ ...prev, search: err }));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isNavigationKey = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Enter", "Escape", "Home", "End"
    ].includes(e.key);
    if (e.ctrlKey || e.altKey || e.metaKey || isNavigationKey) return;
    if (search.length >= 100) {
      const inputEl = e.currentTarget;
      const hasSelection = (inputEl.selectionEnd ?? 0) - (inputEl.selectionStart ?? 0) > 0;
      if (!hasSelection) {
        e.preventDefault();
        const msg = "Search cannot exceed 100 characters. Characters limit: 100. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
        setErrors(prev => ({ ...prev, search: msg }));
        toast.error(msg, { id: "search-limit" });
      }
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteInventory = () => {
    if (!deleteTargetId) return;
    const updated = inventory.filter(i => i._id !== deleteTargetId);
    saveInventory(updated);
    toast.success("Lab item deleted successfully!");
    setDeleteTargetId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateField("name", name);
    const skuErr = validateField("sku", sku);
    const qtyErr = validateField("quantity", quantity);
    const unitErr = validateField("unit", unit);
    const expErr = validateField("expiryDate", expiryDate);
    const reorderErr = validateField("reorderLevel", reorderLevel);
    const batchErr = validateField("batchNo", batchNo);

    const newErrors = {
      name: nameErr,
      sku: skuErr,
      quantity: qtyErr,
      unit: unitErr,
      expiryDate: expErr,
      reorderLevel: reorderErr,
      batchNo: batchErr,
    };

    setErrors(prev => ({ ...prev, ...newErrors }));

    const firstErr = nameErr || skuErr || qtyErr || unitErr || expErr || reorderErr || batchErr;
    if (firstErr) {
      toast.error(firstErr);
      return;
    }

    if (selectedItem) {
      const updated = inventory.map(i => 
        i._id === selectedItem._id 
          ? { 
              ...i, 
              name: typeof name === "string" ? name.trim() : name, 
              category, 
              sku: typeof sku === "string" ? sku.trim() : sku, 
              quantity: Number(quantity), 
              unit: typeof unit === "string" ? unit.trim() : unit, 
              expiryDate: typeof expiryDate === "string" ? expiryDate.trim() : expiryDate, 
              reorderLevel: Number(reorderLevel), 
              batchNo: typeof batchNo === "string" ? batchNo.trim() : batchNo, 
              storageTemp 
            } 
          : i
      );
      saveInventory(updated);
      toast.success("Lab inventory item updated successfully!");
    } else {
      const newItem: LabInventoryItem = {
        _id: `LAB-INV-${Math.floor(100 + Math.random() * 900)}`,
        name: typeof name === "string" ? name.trim() : name,
        category,
        sku: typeof sku === "string" ? sku.trim() : sku,
        quantity: Number(quantity),
        unit: typeof unit === "string" ? unit.trim() : unit,
        expiryDate: typeof expiryDate === "string" ? expiryDate.trim() : expiryDate,
        reorderLevel: Number(reorderLevel),
        batchNo: typeof batchNo === "string" ? batchNo.trim() : batchNo,
        storageTemp
      };
      saveInventory([...inventory, newItem]);
      toast.success("Lab inventory item added successfully!");
    }
    setIsAddEditOpen(false);
    setErrors({});
  };

  const filtered = inventory.filter(i => {
    const matchesSearch = 
      i.name.toLowerCase().includes(search.toLowerCase()) || 
      i.sku.toLowerCase().includes(search.toLowerCase()) || 
      i.batchNo.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "All" || i.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleExportExcel = () => {
    const headers = ["Item Name", "SKU", "Category", "Batch No", "Quantity", "Unit", "Reorder Level", "Expiry Date", "Storage Temp"];
    const rows = inventory.map((item) => [
      item.name,
      item.sku,
      item.category,
      item.batchNo,
      item.quantity,
      item.unit,
      item.reorderLevel,
      item.expiryDate,
      item.storageTemp,
    ]);
    exportToExcel("Laboratory_Inventory_2026", headers, rows);
  };

  const handleImportLabItems = (importedRecords: Record<string, string>[]) => {
    toast.success(`Successfully imported ${importedRecords.length} lab inventory items!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laboratory Inventory</h1>
          <p className="text-sm text-slate-500">Track and manage diagnostics reagents, chemical assays, and phlebotomy consumables.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsImportOpen(true)} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50">
            <Upload className="h-4 w-4 text-emerald-600" /> Import Excel
          </Button>
          <Button variant="secondary" onClick={handleExportExcel} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50">
            <Download className="h-4 w-4 text-slate-600" /> Export Excel
          </Button>
          <Button onClick={handleOpenAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-750">
            <Plus className="h-4 w-4" /> Add Inventory Item
          </Button>
        </div>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Diagnostic Stock Items</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{inventory.length}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Boxes className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Low Reagents Warning</div>
            <div className="mt-1 text-2xl font-bold text-red-650">
              {inventory.filter(i => i.quantity <= i.reorderLevel).length}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Near Expiry Assays</div>
            <div className="mt-1 text-2xl font-bold text-amber-650">
              {inventory.filter(i => {
                const exp = new Date(i.expiryDate);
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
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setFilterCategory("All")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterCategory === "All" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFilterCategory("Reagent")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterCategory === "Reagent" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Reagents
          </button>
          <button
            onClick={() => setFilterCategory("Consumable")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterCategory === "Consumable" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Consumables
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search analyte, SKU, batch..."
            maxLength={100}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onBlur={() => handleBlur("search")}
            onKeyDown={handleSearchKeyDown}
            className={`w-full rounded-lg border ${errors.search ? "border-red-500 text-red-900" : "border-slate-350"} bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white`}
          />
          {errors.search && (
            <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
              {errors.search}
            </p>
          )}
        </div>
      </div>

      {/* Main Grid Table */}
      <Card>
        <DataTable
          rowKey={(r) => r._id}
          rows={filtered}
          emptyMessage="No inventory items found."
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
              header: "Item Name",
              render: (r) => (
                <div>
                  <div className="font-semibold text-slate-800">{r.name}</div>
                  <div className="text-xs text-slate-400">{r.category} · {r.storageTemp}</div>
                </div>
              )
            },
            {
              header: "Batch No",
              render: (r) => <span className="font-mono text-xs text-slate-650">{r.batchNo}</span>
            },
            {
              header: "Stock Quantity",
              render: (r) => {
                const isCritical = r.quantity <= r.reorderLevel;
                return (
                  <div>
                    <span className={`font-bold text-sm ${isCritical ? "text-red-650" : "text-slate-800"}`}>
                      {r.quantity} {r.unit}
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
                const exp = new Date(r.expiryDate);
                const today = new Date();
                const diff = exp.getTime() - today.getTime();
                const diffDays = Math.ceil(diff / (1000 * 3600 * 24));
                const isExpired = diffDays <= 0;
                const isNearExpiry = diffDays > 0 && diffDays <= 90;

                return (
                  <div>
                    <span className={`text-xs ${isExpired ? "text-red-600 font-bold" : isNearExpiry ? "text-amber-600 font-semibold" : "text-slate-650"}`}>
                      {r.expiryDate}
                    </span>
                    {isExpired && <span className="block text-[9px] text-red-500 font-bold uppercase">EXPIRED</span>}
                    {isNearExpiry && <span className="block text-[9px] text-amber-500 font-semibold">EXPIRING SOON</span>}
                  </div>
                );
              }
            },
            {
              header: "Actions",
              render: (r) => (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => handleOpenEdit(r)} className="p-1 hover:text-blue-700">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => handleDelete(r._id)} className="p-1 hover:text-red-750">
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
        title={selectedItem ? "Edit Lab Item" : "Add Lab Item"} 
        isOpen={isAddEditOpen} 
        onClose={() => setIsAddEditOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Item Name"
              required
              maxLength={100}
              showCharCount
              charCount={typeof name === "string" ? name.length : 0}
              maxCharCount={100}
              error={errors.name}
              placeholder="e.g. Lipid Panel Kit"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => handleBlur("name")}
              onKeyDown={handleNameKeyDown}
            />

            <SelectField
              label="Category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            >
              <option value="Reagent">Reagent</option>
              <option value="Consumable">Consumable</option>
            </SelectField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InputField
              label="SKU Code"
              required
              maxLength={50}
              showCharCount
              charCount={typeof sku === "string" ? sku.length : 0}
              maxCharCount={50}
              error={errors.sku}
              placeholder="e.g. RE-LPD-03"
              value={sku}
              onChange={(e) => handleSkuChange(e.target.value)}
              onBlur={() => handleBlur("sku")}
              onKeyDown={handleSkuKeyDown}
            />

            <InputField
              label="Quantity"
              required
              type="number"
              min={0}
              max={1000000}
              error={errors.quantity}
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              onBlur={() => handleBlur("quantity")}
              onKeyDown={handleQuantityKeyDown}
            />

            <InputField
              label="Unit Label"
              required
              maxLength={50}
              showCharCount
              charCount={typeof unit === "string" ? unit.length : 0}
              maxCharCount={50}
              error={errors.unit}
              placeholder="e.g. kits, vials"
              value={unit}
              onChange={(e) => handleUnitChange(e.target.value)}
              onBlur={() => handleBlur("unit")}
              onKeyDown={handleUnitKeyDown}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InputField
              label="Expiry Date"
              required
              type="date"
              error={errors.expiryDate}
              value={expiryDate}
              onChange={(e) => handleExpiryDateChange(e.target.value)}
              onBlur={() => handleBlur("expiryDate")}
              onKeyDown={handleExpiryDateKeyDown}
            />

            <InputField
              label="Reorder Threshold"
              required
              type="number"
              min={0}
              max={1000000}
              error={errors.reorderLevel}
              value={reorderLevel}
              onChange={(e) => handleReorderLevelChange(e.target.value)}
              onBlur={() => handleBlur("reorderLevel")}
              onKeyDown={handleReorderLevelKeyDown}
            />

            <InputField
              label="Batch Number"
              required
              maxLength={50}
              showCharCount
              charCount={typeof batchNo === "string" ? batchNo.length : 0}
              maxCharCount={50}
              error={errors.batchNo}
              placeholder="e.g. B-LP102"
              value={batchNo}
              onChange={(e) => handleBatchNoChange(e.target.value)}
              onBlur={() => handleBlur("batchNo")}
              onKeyDown={handleBatchNoKeyDown}
            />
          </div>

          <SelectField
            label="Storage Temperature"
            required
            value={storageTemp}
            onChange={(e) => setStorageTemp(e.target.value)}
          >
            <option value="2 - 8°C">2 - 8°C (Refrigerated)</option>
            <option value="15 - 30°C">15 - 30°C (Room Temp)</option>
            <option value="-20°C">-20°C (Frozen)</option>
          </SelectField>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsAddEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-750">Save Item</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetId)}
        title="Confirm Deletion"
        message="Are you sure you want to delete this lab reagent/consumable? This action cannot be undone."
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDeleteInventory}
      />

      <ImportExcelModal
        isOpen={isImportOpen}
        title="Import Lab Inventory Excel"
        sampleFilename="Lab_Inventory_Import_Template.csv"
        sampleHeaders={["Item Name", "SKU", "Category", "Batch No", "Quantity", "Unit", "Reorder Level", "Expiry Date", "Storage Temp"]}
        sampleRows={[
          ["CBC Diluent (Cellpack)", "RE-CBC-01", "Reagent", "B-CB991", 12, "containers", 5, "2027-02-15", "15 - 30°C"],
          ["HbA1c Reagent Kit", "RE-HBA-02", "Reagent", "B-HB202", 3, "kits", 5, "2026-09-10", "2 - 8°C"],
        ]}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportLabItems}
      />
    </div>
  );
}
