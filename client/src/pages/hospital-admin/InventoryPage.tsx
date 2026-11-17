import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  ClipboardList,
  Eye,
  Plus,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RotateCcw,
  Pill,
  Truck
} from "lucide-react";
import toast from "react-hot-toast";

import { useInventory } from "../../features/inventory";
import { useBranchContext } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";
import { AllBranchesNoticeBanner } from "../../components/common/AllBranchesNoticeBanner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { exportToExcel } from "../../lib/excelUtils";

export interface PharmacyMedicine {
  _id: string;
  name: string;
  strength: string;
  sku: string;
  category: string;
  batchNo: string;
  expiryDate: string;
  stockQty: number;
  reorderLevel: number;
  maxLevel: number;
  price: number;
  supplier: string;
  unit: string;
  daysUntilExpiry: number | null;
  expiryStatus: "expired" | "expiring_soon" | "expiring_medium" | "safe" | "unknown";
  stockStatus: "out_of_stock" | "critical" | "low" | "optimal";
}

export interface ReorderRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  sku: string;
  supplier: string;
  currentStock: number;
  reorderQty: number;
  priority: "Urgent" | "High" | "Normal";
  status: "Draft Note" | "Order Placed" | "In Transit" | "Stock Received" | "Cancelled";
  orderDate: string;
  expectedDeliveryDate?: string;
  estimatedCost?: number;
  notes: string;
  createdAt: string;
}

function parseBackendMedicine(item: any): PharmacyMedicine {
  const parts = item.description ? item.description.split(" | ") : [];
  const subcategory = parts[0] || "General";
  const expiryDate = parts[1] || "";

  let daysUntilExpiry: number | null = null;
  let expiryStatus: "expired" | "expiring_soon" | "expiring_medium" | "safe" | "unknown" = "unknown";

  if (expiryDate) {
    const exp = new Date(expiryDate);
    if (!isNaN(exp.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      exp.setHours(0, 0, 0, 0);
      daysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 0) {
        expiryStatus = "expired";
      } else if (daysUntilExpiry <= 30) {
        expiryStatus = "expiring_soon";
      } else if (daysUntilExpiry <= 90) {
        expiryStatus = "expiring_medium";
      } else {
        expiryStatus = "safe";
      }
    }
  }

  const stockQty = Number(item.stockQty) || 0;
  const reorderLevel = Number(item.reorderLevel) || 0;

  let stockStatus: "out_of_stock" | "critical" | "low" | "optimal" = "optimal";
  if (stockQty <= 0) {
    stockStatus = "out_of_stock";
  } else if (stockQty <= reorderLevel) {
    stockStatus = "critical";
  } else if (reorderLevel > 0 && stockQty <= reorderLevel * 1.5) {
    stockStatus = "low";
  }

  return {
    _id: item._id,
    name: item.name || "Unnamed Medicine",
    strength: item.strength || "",
    sku: item.sku || "—",
    category: subcategory,
    batchNo: item.storageCondition || "—",
    expiryDate,
    stockQty,
    reorderLevel,
    maxLevel: Number(item.maxLevel) || 0,
    price: Number(item.unitCost) || 0,
    supplier: item.supplier || "—",
    unit: item.unit || "units",
    daysUntilExpiry,
    expiryStatus,
    stockStatus
  };
}

export function InventoryPage() {
  const { user } = useAuth();
  const { isAllBranches } = useBranchContext();

  const hospitalId = typeof user?.hospital === "object" ? (user.hospital as any)?._id : user?.hospital || "default";
  const storageKey = `hms_medicine_reorders_${hospitalId}`;

  // Fetch only medicines entered in the pharmacy dashboard
  const { data: inventoryData, isLoading, refetch } = useInventory({ category: "medicines", limit: 500 });
  const rawItems = inventoryData?.data || [];

  const medicines: PharmacyMedicine[] = useMemo(() => {
    return rawItems.map(parseBackendMedicine);
  }, [rawItems]);

  // View & Tab Filtering
  const [activeTab, setActiveTab] = useState<"all" | "low_stock" | "expiry" | "records">("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  // Reorder Records State (persisted in localStorage)
  const [reorderRecords, setReorderRecords] = useState<ReorderRecord[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(reorderRecords));
    } catch (e) {
      console.error("Failed to save reorder records:", e);
    }
  }, [reorderRecords, storageKey]);

  // Order / Reorder Record Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<{
    medicineId: string;
    medicineName: string;
    sku: string;
    supplier: string;
    currentStock: number;
    reorderQty: number | string;
    priority: "Urgent" | "High" | "Normal";
    status: "Draft Note" | "Order Placed" | "In Transit" | "Stock Received" | "Cancelled";
    orderDate: string;
    expectedDeliveryDate: string;
    estimatedCost: number | string;
    notes: string;
  }>({
    medicineId: "",
    medicineName: "",
    sku: "",
    supplier: "",
    currentStock: 0,
    reorderQty: 100,
    priority: "High",
    status: "Order Placed",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    estimatedCost: 0,
    notes: ""
  });

  // Unique categories list for filtering
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => {
      if (m.category && m.category !== "General") set.add(m.category);
    });
    return Array.from(set).sort();
  }, [medicines]);

  // Filtered medicines list
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      // Tab filter
      if (activeTab === "low_stock") {
        if (m.stockStatus !== "critical" && m.stockStatus !== "out_of_stock") return false;
      } else if (activeTab === "expiry") {
        if (m.expiryStatus !== "expired" && m.expiryStatus !== "expiring_soon" && m.expiryStatus !== "expiring_medium") return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = m.name.toLowerCase().includes(q);
        const matchSku = m.sku.toLowerCase().includes(q);
        const matchStrength = m.strength.toLowerCase().includes(q);
        const matchBatch = m.batchNo.toLowerCase().includes(q);
        const matchSupplier = m.supplier.toLowerCase().includes(q);
        const matchCat = m.category.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchStrength && !matchBatch && !matchSupplier && !matchCat) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;

      // Expiry filter
      if (expiryFilter !== "all" && m.expiryStatus !== expiryFilter) return false;

      // Stock filter
      if (stockFilter !== "all" && m.stockStatus !== stockFilter) return false;

      return true;
    });
  }, [medicines, activeTab, search, categoryFilter, expiryFilter, stockFilter]);

  // Telemetry counts
  const totalMedicinesCount = medicines.length;
  const criticalStockCount = medicines.filter((m) => m.stockStatus === "critical" || m.stockStatus === "out_of_stock").length;
  const expiryAlertCount = medicines.filter((m) => m.expiryStatus === "expired" || m.expiryStatus === "expiring_soon" || m.expiryStatus === "expiring_medium").length;

  const handleOpenOrderModal = (med?: PharmacyMedicine) => {
    if (med) {
      const suggestedQty = Math.max(50, med.reorderLevel * 2 - med.stockQty);
      setOrderForm({
        medicineId: med._id,
        medicineName: med.name,
        sku: med.sku,
        supplier: med.supplier !== "—" ? med.supplier : "",
        currentStock: med.stockQty,
        reorderQty: suggestedQty > 0 ? suggestedQty : 100,
        priority: med.stockStatus === "out_of_stock" || med.stockStatus === "critical" ? "Urgent" : "High",
        status: "Order Placed",
        orderDate: new Date().toISOString().split("T")[0],
        expectedDeliveryDate: "",
        estimatedCost: Math.round((suggestedQty > 0 ? suggestedQty : 100) * med.price),
        notes: `Procurement order logged for ${med.name} (${med.strength}) due to ${med.stockStatus} stock.`
      });
    } else {
      setOrderForm({
        medicineId: "",
        medicineName: "",
        sku: "",
        supplier: "",
        currentStock: 0,
        reorderQty: 100,
        priority: "High",
        status: "Draft Note",
        orderDate: new Date().toISOString().split("T")[0],
        expectedDeliveryDate: "",
        estimatedCost: 0,
        notes: ""
      });
    }
    setIsOrderModalOpen(true);
  };

  const handleSaveOrderRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.medicineName.trim()) {
      toast.error("Please enter a medicine name.");
      return;
    }
    const newRecord: ReorderRecord = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      medicineId: orderForm.medicineId || "manual",
      medicineName: orderForm.medicineName.trim(),
      sku: orderForm.sku.trim() || "N/A",
      supplier: orderForm.supplier.trim() || "Pending Supplier",
      currentStock: Number(orderForm.currentStock) || 0,
      reorderQty: Number(orderForm.reorderQty) || 1,
      priority: orderForm.priority,
      status: orderForm.status,
      orderDate: orderForm.orderDate || new Date().toISOString().split("T")[0],
      expectedDeliveryDate: orderForm.expectedDeliveryDate || undefined,
      estimatedCost: Number(orderForm.estimatedCost) || 0,
      notes: orderForm.notes.trim(),
      createdAt: new Date().toISOString()
    };

    setReorderRecords((prev) => [newRecord, ...prev]);
    setIsOrderModalOpen(false);
    toast.success(`✓ Order Record #${newRecord.id} saved successfully!`);
  };

  const handleUpdateOrderStatus = (recordId: string, nextStatus: ReorderRecord["status"]) => {
    setReorderRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, status: nextStatus } : r))
    );
    toast.success(`Order #${recordId} status updated to "${nextStatus}".`);
  };

  const handleDeleteOrderRecord = (recordId: string) => {
    setReorderRecords((prev) => prev.filter((r) => r.id !== recordId));
    toast.success("Order record removed from maintenance log.");
  };

  const handleExportStockReport = () => {
    const headers = [
      "Medicine Name",
      "Strength",
      "SKU",
      "Subcategory",
      "Batch Number",
      "Current Stock",
      "Reorder Threshold",
      "Stock Status",
      "Retail Unit Price (₹)",
      "Total Value (₹)",
      "Expiration Date",
      "Days to Expiry",
      "Expiry Condition",
      "Supplier"
    ];

    const rows = filteredMedicines.map((m) => [
      m.name,
      m.strength,
      m.sku,
      m.category,
      m.batchNo,
      m.stockQty,
      m.reorderLevel,
      m.stockStatus.toUpperCase(),
      m.price,
      m.stockQty * m.price,
      m.expiryDate || "Not Set",
      m.daysUntilExpiry !== null ? m.daysUntilExpiry : "N/A",
      m.expiryStatus.toUpperCase(),
      m.supplier
    ]);

    exportToExcel(`Pharmacy_Stock_Report_${new Date().toISOString().split("T")[0]}`, headers, rows);
  };

  return (
    <div className="space-y-6 w-full pb-16 font-sans">
      <AllBranchesNoticeBanner />

      {/* Header & Access Control Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-emerald-700 transition">Dashboard</Link>
            <span>/</span>
            <span>Operations & Assets</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">Pharmacy Inventory & Stock Maintenance</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Pharmacy Inventory & Stock Maintenance
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> Admin Read-Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time pharmacy stock monitoring, expiry tracking, and procurement record maintenance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" onClick={handleExportStockReport}>
            <Download className="h-4 w-4 text-emerald-700" /> Export Stock Report
          </Button>

          <Button variant="primary" onClick={() => handleOpenOrderModal()}>
            <Plus className="h-4 w-4" /> Log Order Record
          </Button>
        </div>
      </div>

      {/* ── Tabs & Filter Controls ── */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-2 sm:gap-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === "all"
                  ? "border-emerald-700 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Pill className="h-4 w-4" />
              <span>All Pharmacy Medicines</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "all"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {totalMedicinesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("low_stock")}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === "low_stock"
                  ? "border-rose-600 text-rose-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>Low Stock Watchlist</span>
              {criticalStockCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                  {criticalStockCount}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                  0
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("expiry")}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === "expiry"
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Expiry Alerts</span>
              {expiryAlertCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  {expiryAlertCount}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                  0
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("records")}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === "records"
                  ? "border-emerald-700 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Reorder & Maintenance Records</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "records"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {reorderRecords.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab 1, 2, 3: Medicines Table View */}
        {activeTab !== "records" && (
          <Card className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
            {/* Search and Filter Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search medicine name, SKU, strength, batch, supplier..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                {/* Subcategory Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="all">All Subcategories</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Expiry Filter */}
                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="all">All Expiry States</option>
                  <option value="expired">Expired (Immediate Action)</option>
                  <option value="expiring_soon">Expiring in ≤ 30 Days</option>
                  <option value="expiring_medium">Expiring in ≤ 90 Days</option>
                  <option value="safe">Safe / Healthy Shelf Life</option>
                </select>

                {/* Stock Filter */}
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="all">All Stock Levels</option>
                  <option value="out_of_stock">Out of Stock (0 units)</option>
                  <option value="critical">Critical (≤ Reorder Level)</option>
                  <option value="low">Low Stock (≤ 1.5x Reorder)</option>
                  <option value="optimal">Optimal Stock</option>
                </select>

                {(search || categoryFilter !== "all" || expiryFilter !== "all" || stockFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setExpiryFilter("all");
                      setStockFilter("all");
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredMedicines.length}</strong> of {totalMedicinesCount} medicines
              </div>
            </div>

            {/* Medicines Master Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="py-3 px-4">Medicine & Strength</th>
                    <th className="py-3 px-3">Subcategory</th>
                    <th className="py-3 px-3">Batch & SKU</th>
                    <th className="py-3 px-3">Expiration Date</th>
                    <th className="py-3 px-3">Stock Maintenance</th>
                    <th className="py-3 px-3">Unit Price</th>
                    <th className="py-3 px-3">Supplier</th>
                    <th className="py-3 px-4 text-right">Procurement Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMedicines.length > 0 ? (
                    filteredMedicines.map((med) => {
                      const isExpired = med.expiryStatus === "expired";
                      const isExpiringSoon = med.expiryStatus === "expiring_soon";
                      const isCritical = med.stockStatus === "critical" || med.stockStatus === "out_of_stock";

                      const percent = med.reorderLevel > 0
                        ? Math.min(100, Math.round((med.stockQty / (med.reorderLevel * 2)) * 100))
                        : Math.min(100, med.stockQty > 0 ? 100 : 0);

                      return (
                        <tr
                          key={med._id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isExpired ? "bg-rose-50/20" : isCritical ? "bg-amber-50/20" : ""
                          }`}
                        >
                          {/* Medicine Name */}
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/admin/inventory/${med._id}`}
                                className="font-bold text-slate-900 hover:text-emerald-700 transition"
                              >
                                {med.name}
                              </Link>
                              {med.strength && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {med.strength}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                              ID: {med._id.slice(-6)}
                            </span>
                          </td>

                          {/* Subcategory */}
                          <td className="py-3.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {med.category}
                            </span>
                          </td>

                          {/* Batch & SKU */}
                          <td className="py-3.5 px-3">
                            <span className="font-mono text-xs font-bold text-slate-800 block">
                              {med.batchNo}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 block">
                              {med.sku}
                            </span>
                          </td>

                          {/* Expiration Date with Live Countdown */}
                          <td className="py-3.5 px-3">
                            {med.expiryDate ? (
                              <div className="space-y-1">
                                <span className="font-mono font-bold text-slate-800 block">
                                  {med.expiryDate}
                                </span>
                                {med.expiryStatus === "expired" ? (
                                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                    🔴 Expired ({Math.abs(med.daysUntilExpiry || 0)}d ago)
                                  </span>
                                ) : med.expiryStatus === "expiring_soon" ? (
                                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                    ⚠️ {med.daysUntilExpiry} days left
                                  </span>
                                ) : med.expiryStatus === "expiring_medium" ? (
                                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    ⏳ {med.daysUntilExpiry} days left
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ✓ Healthy
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Not set</span>
                            )}
                          </td>

                          {/* Stock Level with Progress Bar */}
                          <td className="py-3.5 px-3 min-w-[150px]">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900">
                                  {med.stockQty} {med.unit}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  Min: {med.reorderLevel}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    med.stockStatus === "out_of_stock"
                                      ? "bg-slate-300"
                                      : med.stockStatus === "critical"
                                      ? "bg-rose-500"
                                      : med.stockStatus === "low"
                                      ? "bg-amber-500"
                                      : "bg-emerald-600"
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span
                                className={`inline-block text-[10px] font-bold uppercase tracking-wider ${
                                  med.stockStatus === "out_of_stock"
                                    ? "text-rose-700"
                                    : med.stockStatus === "critical"
                                    ? "text-rose-600"
                                    : med.stockStatus === "low"
                                    ? "text-amber-600"
                                    : "text-emerald-700"
                                }`}
                              >
                                {med.stockStatus.replace("_", " ")}
                              </span>
                            </div>
                          </td>

                          {/* Unit Retail Price */}
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                            ₹{med.price.toFixed(2)}
                          </td>

                          {/* Supplier */}
                          <td className="py-3.5 px-3 text-slate-600 font-medium">
                            {med.supplier}
                          </td>

                          {/* Reorder Action */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant={isCritical || isExpired ? "primary" : "secondary"}
                                size="sm"
                                onClick={() => handleOpenOrderModal(med)}
                                className="text-xs"
                              >
                                <Truck className="h-3.5 w-3.5" /> Log Reorder
                              </Button>

                              <Link
                                to={`/admin/inventory/${med._id}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 transition"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        {isLoading ? (
                          <span>Loading pharmacy inventory...</span>
                        ) : (
                          <div className="space-y-2">
                            <Pill className="h-8 w-8 text-slate-300 mx-auto" />
                            <p className="font-semibold text-slate-600">No pharmacy medicines found matching current filters.</p>
                            <p className="text-xs text-slate-400">Medicines added in the Pharmacy Dashboard will automatically synchronize here.</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tab 4: Reorder & Procurement Maintenance Records Log */}
        {activeTab === "records" && (
          <Card className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-emerald-700" />
                  Procurement & Maintenance Records ({reorderRecords.length} Records)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Administrative order notes, reorder logs, and supplier maintenance records for pharmacy replenishment.
                </p>
              </div>

              <Button variant="primary" size="sm" onClick={() => handleOpenOrderModal()}>
                <Plus className="h-4 w-4" /> Record New Order
              </Button>
            </div>

            {reorderRecords.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="py-3 px-4">Record ID & Date</th>
                      <th className="py-3 px-3">Medicine & SKU</th>
                      <th className="py-3 px-3">Supplier</th>
                      <th className="py-3 px-3">Order Qty</th>
                      <th className="py-3 px-3">Est. Cost</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Order Status</th>
                      <th className="py-3 px-3">Admin Notes</th>
                      <th className="py-3 px-4 text-right">Status Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reorderRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 block">{rec.id}</span>
                          <span className="text-[11px] text-slate-500">{rec.orderDate}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          <strong className="text-slate-900 block">{rec.medicineName}</strong>
                          <span className="font-mono text-[11px] text-slate-400">{rec.sku}</span>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-slate-700">
                          {rec.supplier}
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                          {rec.reorderQty} units
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-800">
                          ₹{rec.estimatedCost ? rec.estimatedCost.toLocaleString() : "0"}
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rec.priority === "Urgent"
                                ? "bg-rose-100 text-rose-800"
                                : rec.priority === "High"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {rec.priority}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              rec.status === "Stock Received"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : rec.status === "Order Placed"
                                ? "bg-sky-100 text-sky-800 border border-sky-300"
                                : rec.status === "In Transit"
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                                : rec.status === "Cancelled"
                                ? "bg-slate-100 text-slate-500 line-through"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-slate-600 max-w-xs truncate" title={rec.notes}>
                          {rec.notes || "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {rec.status !== "Stock Received" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(rec.id, "Stock Received")}
                                className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                                title="Mark as Stock Received"
                              >
                                Received
                              </button>
                            )}

                            {rec.status !== "Order Placed" && rec.status !== "Stock Received" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(rec.id, "Order Placed")}
                                className="px-2 py-1 rounded text-[11px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 cursor-pointer"
                                title="Mark as Order Placed"
                              >
                                Placed
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteOrderRecord(rec.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete Record"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                <ClipboardList className="h-8 w-8 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Procurement Records Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Maintain records of orders placed with suppliers, delivery follow-ups, and replenishment logs.
                </p>
                <Button variant="primary" size="sm" onClick={() => handleOpenOrderModal()}>
                  <Plus className="h-4 w-4" /> Log First Order Record
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── LOG REORDER RECORD MODAL ── */}
      {isOrderModalOpen && (
        <Modal
          title="Maintain Procurement & Reorder Record"
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
        >
          <form onSubmit={handleSaveOrderRecord} className="space-y-4 text-xs">
            <p className="text-slate-500">
              Record a procurement order or stock maintenance log. (Does not mutate inventory master directly; maintains an audit procurement record for hospital management).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Medicine Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol 500mg"
                  value={orderForm.medicineName}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, medicineName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-900 outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">SKU / Code</label>
                <input
                  type="text"
                  placeholder="e.g. ANA-PAR-101"
                  value={orderForm.sku}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, sku: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Primary Supplier</label>
                <input
                  type="text"
                  placeholder="e.g. Apollo Pharma Distributors"
                  value={orderForm.supplier}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, supplier: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reorder Quantity (Units) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={orderForm.reorderQty}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, reorderQty: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold font-mono text-slate-900 outline-none focus:border-emerald-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={orderForm.priority}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-emerald-600"
                >
                  <option value="Urgent">Urgent (Stock Out Risk)</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Order Status</label>
                <select
                  value={orderForm.status}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-emerald-600"
                >
                  <option value="Draft Note">Draft Note</option>
                  <option value="Order Placed">Order Placed</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Stock Received">Stock Received</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Order Date</label>
                <input
                  type="date"
                  value={orderForm.orderDate}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, orderDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estimated Cost (₹)</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 15000"
                value={orderForm.estimatedCost}
                onChange={(e) => setOrderForm((prev) => ({ ...prev, estimatedCost: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Admin Maintenance & Follow-Up Notes</label>
              <textarea
                rows={3}
                placeholder="Supplier PO number, follow-up person, delivery batch expectations..."
                value={orderForm.notes}
                onChange={(e) => setOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={() => setIsOrderModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <CheckCircle2 className="h-4 w-4" /> Save Record
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
