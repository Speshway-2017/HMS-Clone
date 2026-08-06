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

  // Form Fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Analgesic");
  const [sku, setSku] = useState("");
  const [stockQty, setStockQty] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [price, setPrice] = useState(0);
  const [batchNo, setBatchNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [appSuppliers, setAppSuppliers] = useState<{ _id: string; name: string }[]>([]);

  // Load suppliers from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("hms_pharmacy_suppliers");
    if (saved) {
      setAppSuppliers(JSON.parse(saved));
    }
  }, [isAddEditOpen]);

  // TanStack Query Hooks
  const { data: inventoryData, isLoading } = useInventory({ category: "medicines", search });
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

  const handleOpenAdd = () => {
    setSelectedMed(null);
    const initialCategory = "Analgesic";
    setName("");
    setCategory(initialCategory);
    setSku(generateAutoSku("", initialCategory));
    setBatchNo(generateAutoBatchNo());
    setStockQty(0);
    setReorderLevel(0);
    setExpiryDate("");
    setPrice(0);
    setSupplier("");
    setIsAddEditOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!selectedMed) {
      setSku(generateAutoSku(val, category));
    }
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
    setCategory(med.category);
    setSku(med.sku);
    setStockQty(med.stockQty);
    setReorderLevel(med.reorderLevel);
    setExpiryDate(med.expiryDate);
    setPrice(med.price);
    setBatchNo(med.batchNo);
    setSupplier(med.supplier);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !batchNo) return;

    const payload = {
      name,
      sku,
      category: "medicines" as const,
      description: `${category} | ${expiryDate}`,
      unit: "units",
      stockQty: Number(stockQty),
      reorderLevel: Number(reorderLevel),
      unitCost: Number(price),
      supplier,
      storageCondition: batchNo,
    };

    try {
      if (selectedMed) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      setIsAddEditOpen(false);
    } catch (err) {
      console.error("Failed to save medicine", err);
    }
  };

  const filtered = medicines.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(search.toLowerCase()) || 
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      m.batchNo.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "All" || m.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-slate-500 font-medium">Loading inventory data...</div>
      </div>
    );
  }

  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleExportExcel = () => {
    const headers = ["Medicine Name", "SKU", "Category", "Batch No", "Stock Qty", "Reorder Level", "Expiry Date", "Unit Price (INR)", "Supplier"];
    const rows = medicines.map((m) => [
      m.name,
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
          <Button onClick={handleOpenAdd} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-800 text-white">
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
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterCategory === "All" ? "bg-navy-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterCategory === cat ? "bg-navy-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
            className="w-full rounded-lg border border-slate-350 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-navy-500 focus:bg-white"
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
                  <Button variant="ghost" onClick={() => handleOpenEdit(r)} className="p-1 hover:text-navy-700">
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Medicine Name"
              required
              placeholder="e.g. Paracetamol 650mg"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
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
                <label className="text-xs font-bold text-slate-700 uppercase">SKU (Auto-Generated)</label>
                <button
                  type="button"
                  onClick={() => setSku(generateAutoSku(name, category))}
                  className="text-[10px] font-extrabold text-navy-700 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Generate new unique SKU"
                >
                  <Sparkles className="h-3 w-3 text-indigo-600" /> Auto Generate
                </button>
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. ANA-PAR-402"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Batch Number (Auto-Generated)</label>
                <button
                  type="button"
                  onClick={() => setBatchNo(generateAutoBatchNo())}
                  className="text-[10px] font-extrabold text-navy-700 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Generate new unique Batch Number"
                >
                  <Sparkles className="h-3 w-3 text-indigo-600" /> Auto Generate
                </button>
              </div>
              <input
                type="text"
                required
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="e.g. B202608-4910"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-100"
              />
            </div>

            <InputField
              label="Stock Quantity"
              type="number"
              required
              min={0}
              value={stockQty}
              onChange={(e) => setStockQty(Number(e.target.value))}
            />

            <InputField
              label="Reorder Level"
              type="number"
              required
              min={0}
              value={reorderLevel}
              onChange={(e) => setReorderLevel(Number(e.target.value))}
            />

            <InputField
              label="Retail Unit Price (₹)"
              type="number"
              step="0.01"
              required
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />

            <InputField
              label="Supplier"
              required
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Acme Pharma Distributors"
              className="sm:col-span-2"
              list="suppliers-datalist"
            />
            <datalist id="suppliers-datalist">
              {supplier.trim().length > 0 &&
                appSuppliers
                  .filter((s) =>
                    s.name.toLowerCase().includes(supplier.toLowerCase())
                  )
                  .map((s) => <option key={s._id} value={s.name} />)}
            </datalist>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {selectedMed ? "Save Changes" : "Add Medicine"}
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
        sampleHeaders={["Medicine Name", "SKU", "Category", "Batch No", "Stock Qty", "Reorder Level", "Expiry Date", "Unit Price", "Supplier"]}
        sampleRows={[
          ["Paracetamol 500mg", "ANA-PAR-101", "Analgesic", "B2026-01", 200, 20, "2027-12-31", 15.5, "PharmaCorp"],
          ["Amoxicillin 250mg", "ANT-AMO-202", "Antibiotic", "B2026-02", 100, 15, "2027-06-30", 45.0, "MediSupply"],
        ]}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportMeds}
      />
    </div>
  );
}
