import { useState, useEffect } from "react";
import { Plus, Search, Eye, ShoppingBag, CheckCircle, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField } from "../../components/ui/Field";
import { Supplier } from "../../types/domain";
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "../../features/suppliers";

interface PurchaseOrder {
  _id: string;
  supplierName: string;
  items: { name: string; quantity: number; cost: number }[];
  date: string;
  totalCost: number;
  status: "Pending" | "Ordered" | "Delivered" | "Cancelled";
}

// ----------------- Validation Functions -----------------
const validateSupplierName = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) return "Please fill out this field";
  if (trimmed.length < 2) return "Supplier Company Name must be at least 2 characters. Please enter valid data";
  if (trimmed.length > 100) return "Supplier Company Name cannot exceed 100 characters. Please enter valid data";
  if (!/^[a-zA-Z0-9\s\.\-/'&,()%+]+$/.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "Supplier Company Name contains invalid data. Please enter valid data";
  }
  return null;
};

const validateContactPerson = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) return null; // optional
  if (trimmed.length < 2) return "Contact Person must be at least 2 characters. Please enter valid data";
  if (trimmed.length > 100) return "Contact Person cannot exceed 100 characters. Please enter valid data";
  if (!/^[a-zA-Z\s\.\'-]+$/.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) {
    return "Contact Person contains invalid data. Please enter valid data";
  }
  return null;
};

const validateSupplierEmail = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) return null; // optional
  if (trimmed.length > 100) return "Email Address cannot exceed 100 characters. Please enter valid data";
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed) || trimmed.includes("..")) {
    return "Please enter a valid email address. Please enter valid data";
  }
  return null;
};

const validateSupplierPhone = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) return "Please fill out this field";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits) || /^(\d)\1{9}$/.test(digits)) {
    return "Please enter a valid 10-digit phone number. Please enter valid data";
  }
  return null;
};

const validateSupplierBalance = (val: any): string | null => {
  if (val === "" || val === undefined || val === null) return null;
  const num = Number(val);
  if (isNaN(num)) return "Please enter valid data";
  if (num < 0) return "Outstanding Balance cannot be negative. Please enter valid data";
  if (num > 10000000) return "Outstanding Balance cannot exceed 10,000,000. Please enter valid data";
  return null;
};

const validateSupplierAddress = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) return null; // optional
  if (trimmed.length > 250) return "Address cannot exceed 250 characters. Please enter valid data";
  if (/<script\b|javascript:/i.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed)) {
    return "Address contains invalid data. Please enter valid data";
  }
  return null;
};

export function PharmacySupplierManagement() {
  const [activeTab, setActiveTab] = useState<"suppliers" | "orders">("suppliers");
  const [search, setSearch] = useState("");

  // Backend API query
  const { data: suppliers = [], isLoading: isSuppliersLoading } = useSuppliers(search);
  const createSupplierMutation = useCreateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  // Local state for POs
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // Modals state
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Supplier Form State (Add / Edit)
  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supAddress, setSupAddress] = useState("");
  const [supBalance, setSupBalance] = useState<number | string>(0);
  const [supStatus, setSupStatus] = useState<"active" | "inactive">("active");

  // Errors state
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({});

  // New Order Form State
  const [orderSupplier, setOrderSupplier] = useState("");
  const [orderSupplierError, setOrderSupplierError] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<{ name: string; quantity: number; cost: number }[]>([
    { name: "", quantity: 10, cost: 0 },
  ]);
  const [orderItemErrors, setOrderItemErrors] = useState<Array<{ name?: string; quantity?: string; cost?: string }>>([]);

  useEffect(() => {
    // Clear old localStorage supplier data to ensure pure DB sync
    localStorage.removeItem("hms_pharmacy_suppliers");

    // Load POs
    const savedOrders = localStorage.getItem("hms_pharmacy_purchase_orders");
    let ordersList: PurchaseOrder[] = [];
    if (savedOrders) {
      ordersList = JSON.parse(savedOrders).filter(
        (po: PurchaseOrder) =>
          po.supplierName !== "Global Pharma Distributors" &&
          po.supplierName !== "Acme Healthcare Corp" &&
          po.supplierName !== "Apex MediSupplies"
      );
    }
    localStorage.setItem("hms_pharmacy_purchase_orders", JSON.stringify(ordersList));
    setPurchaseOrders(ordersList);
  }, []);

  const updateSupplierMutation = useUpdateSupplier(editingSupplier?._id || "");

  const handleOpenAddModal = () => {
    setSupName("");
    setSupContact("");
    setSupEmail("");
    setSupPhone("");
    setSupAddress("");
    setSupBalance(0);
    setSupStatus("active");
    setFormErrors({});
    setIsAddSupplierOpen(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupName(supplier.name || "");
    setSupContact(supplier.contactPerson || "");
    setSupEmail(supplier.email || "");
    setSupPhone(supplier.phone || "");
    setSupAddress(supplier.address || "");
    setSupBalance(supplier.outstandingBalance ?? 0);
    setSupStatus(supplier.status || "active");
    setFormErrors({});
    setIsEditSupplierOpen(true);
  };

  const validateAll = () => {
    const nameErr = validateSupplierName(supName);
    const contactErr = validateContactPerson(supContact);
    const emailErr = validateSupplierEmail(supEmail);
    const phoneErr = validateSupplierPhone(supPhone);
    const balanceErr = validateSupplierBalance(supBalance);
    const addressErr = validateSupplierAddress(supAddress);

    const newErrors = {
      name: nameErr,
      contactPerson: contactErr,
      email: emailErr,
      phone: phoneErr,
      outstandingBalance: balanceErr,
      address: addressErr,
    };
    setFormErrors(newErrors);

    const firstErr = nameErr || contactErr || emailErr || phoneErr || balanceErr || addressErr;
    if (firstErr) {
      toast.error(firstErr);
      return false;
    }
    return true;
  };

  const handleAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    try {
      await createSupplierMutation.mutateAsync({
        name: supName.trim(),
        contactPerson: supContact.trim(),
        email: supEmail.trim(),
        phone: supPhone.replace(/\D/g, ""),
        address: supAddress.trim(),
        outstandingBalance: Number(supBalance) || 0,
        status: supStatus,
      });

      toast.success("Supplier profile created successfully!");
      setIsAddSupplierOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to create supplier";
      toast.error(msg);
    }
  };

  const handleEditSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !validateAll()) return;

    try {
      await updateSupplierMutation.mutateAsync({
        name: supName.trim(),
        contactPerson: supContact.trim(),
        email: supEmail.trim(),
        phone: supPhone.replace(/\D/g, ""),
        address: supAddress.trim(),
        outstandingBalance: Number(supBalance) || 0,
        status: supStatus,
      });

      toast.success("Supplier profile updated successfully!");
      setIsEditSupplierOpen(false);
      setEditingSupplier(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update supplier";
      toast.error(msg);
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"?`)) return;

    try {
      await deleteSupplierMutation.mutateAsync(id);
      toast.success(`Supplier "${name}" deleted successfully.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to delete supplier";
      toast.error(msg);
    }
  };

  const handleAddOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasOrderError = false;

    if (!orderSupplier.trim()) {
      setOrderSupplierError("Please select a supplier");
      hasOrderError = true;
    } else {
      setOrderSupplierError(null);
    }

    const itemErrors = orderItems.map((item) => {
      const itErr: { name?: string; quantity?: string; cost?: string } = {};
      const trimmedName = (item.name || "").trim();
      if (!trimmedName) {
        itErr.name = "Please enter medicine name";
      } else if (trimmedName.length < 2) {
        itErr.name = "Medicine name must be at least 2 characters";
      } else if (trimmedName.length > 100) {
        itErr.name = "Medicine name cannot exceed 100 characters";
      } else if (!/^[a-zA-Z0-9\s\.\-/'&,()%+]+$/.test(trimmedName) || !/[a-zA-Z0-9]/.test(trimmedName)) {
        itErr.name = "Please enter valid data";
      }

      const q = Number(item.quantity);
      if (isNaN(q) || q < 1) {
        itErr.quantity = "Quantity must be at least 1";
      } else if (q > 1000000) {
        itErr.quantity = "Quantity cannot exceed 1,000,000";
      } else if (!Number.isInteger(q)) {
        itErr.quantity = "Quantity must be a whole number";
      }

      const c = Number(item.cost);
      if (isNaN(c) || c < 0) {
        itErr.cost = "Cost cannot be negative";
      } else if (c > 10000000) {
        itErr.cost = "Cost cannot exceed 10,000,000";
      }

      if (itErr.name || itErr.quantity || itErr.cost) {
        hasOrderError = true;
      }
      return itErr;
    });

    setOrderItemErrors(itemErrors);

    if (hasOrderError) {
      toast.error("Please resolve errors in the purchase order before submitting");
      return;
    }

    const total = orderItems.reduce((acc, curr) => acc + curr.quantity * curr.cost, 0);
    const newPO: PurchaseOrder = {
      _id: `PO-${Math.floor(7000 + Math.random() * 900)}`,
      supplierName: orderSupplier,
      items: orderItems.map((it) => ({ ...it, quantity: Number(it.quantity), cost: Number(it.cost) })),
      date: new Date().toISOString().split("T")[0],
      totalCost: total,
      status: "Ordered",
    };

    const updatedPOs = [newPO, ...purchaseOrders];
    setPurchaseOrders(updatedPOs);
    localStorage.setItem("hms_pharmacy_purchase_orders", JSON.stringify(updatedPOs));

    // Reset Form
    setOrderSupplier("");
    setOrderItems([{ name: "", quantity: 10, cost: 0 }]);
    setOrderItemErrors([]);
    setIsAddOrderOpen(false);
    toast.success("Purchase order created successfully!");
  };

  const handleReceiveOrder = (poId: string) => {
    const updatedPOs = purchaseOrders.map((po) => {
      if (po._id === poId) {
        return { ...po, status: "Delivered" as const };
      }
      return po;
    });
    setPurchaseOrders(updatedPOs);
    localStorage.setItem("hms_pharmacy_purchase_orders", JSON.stringify(updatedPOs));

    if (selectedOrder?._id === poId) {
      setSelectedOrder({ ...selectedOrder, status: "Delivered" });
    }
    toast.success("Shipment delivery confirmed!");
  };

  const handleOrderItemChange = (index: number, field: keyof PurchaseOrder["items"][0], value: any) => {
    const updated = [...orderItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setOrderItems(updated);
    if (orderItemErrors[index]?.[field as "name" | "quantity" | "cost"]) {
      const updatedErrors = [...orderItemErrors];
      updatedErrors[index] = { ...updatedErrors[index], [field]: undefined };
      setOrderItemErrors(updatedErrors);
    }
  };

  const handleAddRow = () => {
    setOrderItems([...orderItems, { name: "", quantity: 10, cost: 0 }]);
    setOrderItemErrors([...orderItemErrors, {}]);
  };

  const handleRemoveRow = (index: number) => {
    if (orderItems.length === 1) return;
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
    const updatedErrors = [...orderItemErrors];
    updatedErrors.splice(index, 1);
    setOrderItemErrors(updatedErrors);
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) return;
    if (!/[\d]/.test(e.key)) {
      e.preventDefault();
      return;
    }
    const input = e.currentTarget;
    const selLength = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    const currentDigits = input.value.replace(/\D/g, "");
    if (currentDigits.length >= 10 && selLength === 0) {
      e.preventDefault();
      toast.error("Phone Number cannot exceed 10 digits. Please enter valid data");
    }
  };

  const handleTextKeyDown = (maxLen: number, fieldLabel: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const input = e.currentTarget;
    const selLength = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    if (input.value.length >= maxLen && selLength === 0) {
      e.preventDefault();
      toast.error(`${fieldLabel} cannot exceed ${maxLen} characters. Please enter valid data`);
    }
  };

  const filteredPOs = purchaseOrders.filter(
    (po) =>
      po.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      po._id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier & Purchase Orders</h1>
          <p className="text-sm text-slate-500">Manage medicine distributors and process procurements.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "suppliers" ? (
            <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Supplier
            </Button>
          ) : (
            <Button onClick={() => setIsAddOrderOpen(true)} className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Create Purchase Order
            </Button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "suppliers"
                ? "bg-white text-navy-700 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Suppliers ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "orders"
                ? "bg-white text-navy-700 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Purchase Orders ({purchaseOrders.length})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === "suppliers" ? "Search suppliers..." : "Search POs..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-350 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-navy-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Suppliers Tab */}
      {activeTab === "suppliers" ? (
        <Card>
          <DataTable
            rowKey={(r) => r._id}
            rows={suppliers}
            emptyMessage={isSuppliersLoading ? "Loading suppliers..." : "No suppliers found in database."}
            columns={[
              {
                header: "ID",
                render: (r) => <span className="font-bold text-navy-700">{r.supplierId || r._id.slice(-6)}</span>,
              },
              {
                header: "Supplier Name",
                render: (r) => (
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800">{r.name}</span>
                    <span className="text-[10px] text-slate-400">{r.address || "No address provided"}</span>
                  </div>
                ),
              },
              {
                header: "Contact Person",
                render: (r) => <span className="text-slate-700">{r.contactPerson || "—"}</span>,
              },
              {
                header: "Contact Info",
                render: (r) => (
                  <div className="text-xs">
                    <div>{r.phone}</div>
                    <div className="text-slate-400">{r.email || "No email"}</div>
                  </div>
                ),
              },
              {
                header: "Status",
                render: (r) => (
                  <Badge tone={r.status === "active" ? "success" : "neutral"}>
                    {r.status?.toUpperCase() || "ACTIVE"}
                  </Badge>
                ),
              },
              {
                header: "Outstanding Balance",
                render: (r) => (
                  <span className={`font-bold ${(r.outstandingBalance || 0) > 0 ? "text-amber-600" : "text-slate-650"}`}>
                    ₹{(r.outstandingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                ),
              },
              {
                header: "Actions",
                render: (r) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedSupplier(r)}
                      className="p-1 hover:text-navy-700"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleOpenEditModal(r)}
                      className="p-1 hover:text-blue-600"
                      title="Edit Supplier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteSupplier(r._id, r.name)}
                      className="p-1 hover:text-red-600 text-slate-400"
                      title="Delete Supplier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      ) : (
        /* Purchase Orders Tab */
        <Card>
          <DataTable
            rowKey={(r) => r._id}
            rows={filteredPOs}
            emptyMessage="No purchase orders found."
            columns={[
              {
                header: "PO Code",
                render: (r) => <span className="font-bold text-navy-700">{r._id}</span>,
              },
              {
                header: "Supplier",
                render: (r) => <span className="font-semibold text-slate-800">{r.supplierName}</span>,
              },
              {
                header: "Items Count",
                render: (r) => (
                  <span className="text-xs font-mono">
                    {r.items.length} items ({r.items.reduce((acc, c) => acc + c.quantity, 0)} units)
                  </span>
                ),
              },
              {
                header: "Total Cost",
                render: (r) => (
                  <span className="font-bold">₹{r.totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                ),
              },
              {
                header: "Order Date",
                render: (r) => <span className="text-xs text-slate-600">{r.date}</span>,
              },
              {
                header: "Status",
                render: (r) => {
                  const tone =
                    r.status === "Delivered"
                      ? "success"
                      : r.status === "Ordered"
                      ? "info"
                      : r.status === "Pending"
                      ? "warning"
                      : "danger";
                  return <Badge tone={tone}>{r.status}</Badge>;
                },
              },
              {
                header: "Actions",
                render: (r) => (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedOrder(r)}
                      className="p-1 hover:text-navy-700"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {r.status === "Ordered" && (
                      <Button
                        onClick={() => handleReceiveOrder(r._id)}
                        className="py-1 px-2 bg-green-700 hover:bg-green-800 text-xs flex items-center gap-1"
                        title="Mark Delivered"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Receive
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* Supplier Profile Detail Modal */}
      {selectedSupplier && (
        <Modal
          title="Supplier Profile"
          isOpen={!!selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
        >
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Supplier Name</div>
              <div className="text-base font-bold text-slate-800">{selectedSupplier.name}</div>
              <div className="text-xs text-slate-500">ID: {selectedSupplier.supplierId || selectedSupplier._id}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Contact Person</div>
                <div className="font-semibold text-slate-800">{selectedSupplier.contactPerson || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Phone</div>
                <div className="text-slate-800 font-mono">{selectedSupplier.phone}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Email Address</div>
                <div className="text-slate-850">{selectedSupplier.email || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Outstanding Dues</div>
                <div className="font-bold text-amber-600">
                  ₹{(selectedSupplier.outstandingBalance || 0).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Full Address</div>
              <div className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {selectedSupplier.address || "No address on file."}
              </div>
            </div>

            <div className="flex justify-end pt-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  handleOpenEditModal(selectedSupplier);
                  setSelectedSupplier(null);
                }}
              >
                Edit Profile
              </Button>
              <Button variant="secondary" onClick={() => setSelectedSupplier(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* PO Detail Modal */}
      {selectedOrder && (
        <Modal
          title={`Purchase Order Details - ${selectedOrder._id}`}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm border-b border-slate-100 pb-3">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Supplier</div>
                <div className="font-bold text-slate-800">{selectedOrder.supplierName}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Order Date</div>
                <div className="font-semibold text-slate-700">{selectedOrder.date}</div>
              </div>
              <div className="mt-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Status</div>
                <Badge tone={selectedOrder.status === "Delivered" ? "success" : "info"}>
                  {selectedOrder.status}
                </Badge>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase text-slate-400 mb-2">Itemized PO Records</div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                    <th className="p-2">Item Name</th>
                    <th className="p-2 text-center">Quantity</th>
                    <th className="p-2 text-right">Cost Price (₹)</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx} className="text-slate-800">
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="p-2 text-center font-mono">{item.quantity}</td>
                      <td className="p-2 text-right font-mono">₹{item.cost.toFixed(2)}</td>
                      <td className="p-2 text-right font-bold font-mono">₹{(item.quantity * item.cost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t border-slate-100 pt-3">
              <span>Total PO Value:</span>
              <span>₹{selectedOrder.totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
              {selectedOrder.status === "Ordered" && (
                <Button onClick={() => handleReceiveOrder(selectedOrder._id)} className="bg-green-700 hover:bg-green-800">
                  Confirm Shipment Delivery
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add Supplier Modal */}
      <Modal
        title="Add New Supplier Profile"
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
      >
        <form onSubmit={handleAddSupplierSubmit} noValidate className="space-y-4">
          <InputField
            label="Supplier Company Name"
            required
            placeholder="e.g. Apollo Pharmacy Distributors"
            value={supName}
            maxLength={100}
            showCharCount
            charCount={supName.length}
            minCharCount={2}
            error={formErrors.name}
            onKeyDown={handleTextKeyDown(100, "Supplier Company Name")}
            onChange={(e) => {
              setSupName(e.target.value);
              if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: null }));
            }}
            onBlur={() => {
              const err = validateSupplierName(supName);
              setFormErrors((prev) => ({ ...prev, name: err }));
            }}
          />

          <InputField
            label="Contact Person"
            placeholder="e.g. John Doe"
            value={supContact}
            maxLength={100}
            showCharCount
            charCount={supContact.length}
            minCharCount={2}
            error={formErrors.contactPerson}
            onKeyDown={handleTextKeyDown(100, "Contact Person")}
            onChange={(e) => {
              setSupContact(e.target.value);
              if (formErrors.contactPerson) setFormErrors((prev) => ({ ...prev, contactPerson: null }));
            }}
            onBlur={() => {
              const err = validateContactPerson(supContact);
              setFormErrors((prev) => ({ ...prev, contactPerson: err }));
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Email Address"
              type="email"
              placeholder="supplier@email.com"
              value={supEmail}
              maxLength={100}
              showCharCount
              charCount={supEmail.length}
              error={formErrors.email}
              onKeyDown={handleTextKeyDown(100, "Email Address")}
              onChange={(e) => {
                setSupEmail(e.target.value);
                if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: null }));
              }}
              onBlur={() => {
                const err = validateSupplierEmail(supEmail);
                setFormErrors((prev) => ({ ...prev, email: err }));
              }}
            />
            <InputField
              label="Phone Number"
              required
              placeholder="e.g. 9999888877"
              value={supPhone}
              maxLength={10}
              showCharCount
              charCount={supPhone.length}
              error={formErrors.phone}
              onKeyDown={handlePhoneKeyDown}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                setSupPhone(cleaned);
                if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: null }));
              }}
              onBlur={() => {
                const err = validateSupplierPhone(supPhone);
                setFormErrors((prev) => ({ ...prev, phone: err }));
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Outstanding Balance (₹)"
              type="number"
              min={0}
              max={10000000}
              placeholder="0"
              value={supBalance}
              error={formErrors.outstandingBalance}
              onKeyDown={(e) => {
                if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
              }}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Number(e.target.value);
                setSupBalance(val);
                if (formErrors.outstandingBalance) setFormErrors((prev) => ({ ...prev, outstandingBalance: null }));
              }}
              onBlur={() => {
                const err = validateSupplierBalance(supBalance);
                setFormErrors((prev) => ({ ...prev, outstandingBalance: err }));
              }}
            />
            <SelectField
              label="Status"
              value={supStatus}
              onChange={(e) => setSupStatus(e.target.value as "active" | "inactive")}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
          </div>

          <InputField
            label="Full Business Address"
            placeholder="e.g. Office Suite 120, Trade Center, Delhi"
            value={supAddress}
            maxLength={250}
            showCharCount
            charCount={supAddress.length}
            error={formErrors.address}
            onKeyDown={handleTextKeyDown(250, "Address")}
            onChange={(e) => {
              setSupAddress(e.target.value);
              if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: null }));
            }}
            onBlur={() => {
              const err = validateSupplierAddress(supAddress);
              setFormErrors((prev) => ({ ...prev, address: err }));
            }}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsAddSupplierOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSupplierMutation.isPending}>
              {createSupplierMutation.isPending ? "Saving..." : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Supplier Modal */}
      {isEditSupplierOpen && editingSupplier && (
        <Modal
          title={`Edit Supplier - ${editingSupplier.name}`}
          isOpen={isEditSupplierOpen}
          onClose={() => {
            setIsEditSupplierOpen(false);
            setEditingSupplier(null);
          }}
        >
          <form onSubmit={handleEditSupplierSubmit} noValidate className="space-y-4">
            <InputField
              label="Supplier Company Name"
              required
              value={supName}
              maxLength={100}
              showCharCount
              charCount={supName.length}
              minCharCount={2}
              error={formErrors.name}
              onKeyDown={handleTextKeyDown(100, "Supplier Company Name")}
              onChange={(e) => {
                setSupName(e.target.value);
                if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: null }));
              }}
              onBlur={() => {
                const err = validateSupplierName(supName);
                setFormErrors((prev) => ({ ...prev, name: err }));
              }}
            />

            <InputField
              label="Contact Person"
              value={supContact}
              maxLength={100}
              showCharCount
              charCount={supContact.length}
              minCharCount={2}
              error={formErrors.contactPerson}
              onKeyDown={handleTextKeyDown(100, "Contact Person")}
              onChange={(e) => {
                setSupContact(e.target.value);
                if (formErrors.contactPerson) setFormErrors((prev) => ({ ...prev, contactPerson: null }));
              }}
              onBlur={() => {
                const err = validateContactPerson(supContact);
                setFormErrors((prev) => ({ ...prev, contactPerson: err }));
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Email Address"
                type="email"
                value={supEmail}
                maxLength={100}
                showCharCount
                charCount={supEmail.length}
                error={formErrors.email}
                onKeyDown={handleTextKeyDown(100, "Email Address")}
                onChange={(e) => {
                  setSupEmail(e.target.value);
                  if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: null }));
                }}
                onBlur={() => {
                  const err = validateSupplierEmail(supEmail);
                  setFormErrors((prev) => ({ ...prev, email: err }));
                }}
              />
              <InputField
                label="Phone Number"
                required
                value={supPhone}
                maxLength={10}
                showCharCount
                charCount={supPhone.length}
                error={formErrors.phone}
                onKeyDown={handlePhoneKeyDown}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setSupPhone(cleaned);
                  if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: null }));
                }}
                onBlur={() => {
                  const err = validateSupplierPhone(supPhone);
                  setFormErrors((prev) => ({ ...prev, phone: err }));
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Outstanding Balance (₹)"
                type="number"
                min={0}
                max={10000000}
                value={supBalance}
                error={formErrors.outstandingBalance}
                onKeyDown={(e) => {
                  if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                }}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  setSupBalance(val);
                  if (formErrors.outstandingBalance) setFormErrors((prev) => ({ ...prev, outstandingBalance: null }));
                }}
                onBlur={() => {
                  const err = validateSupplierBalance(supBalance);
                  setFormErrors((prev) => ({ ...prev, outstandingBalance: err }));
                }}
              />
              <SelectField
                label="Status"
                value={supStatus}
                onChange={(e) => setSupStatus(e.target.value as "active" | "inactive")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectField>
            </div>

            <InputField
              label="Full Business Address"
              value={supAddress}
              maxLength={250}
              showCharCount
              charCount={supAddress.length}
              error={formErrors.address}
              onKeyDown={handleTextKeyDown(250, "Address")}
              onChange={(e) => {
                setSupAddress(e.target.value);
                if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: null }));
              }}
              onBlur={() => {
                const err = validateSupplierAddress(supAddress);
                setFormErrors((prev) => ({ ...prev, address: err }));
              }}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditSupplierOpen(false);
                  setEditingSupplier(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateSupplierMutation.isPending}>
                {updateSupplierMutation.isPending ? "Updating..." : "Update Supplier"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Purchase Order Modal */}
      <Modal
        title="Create Procurement Purchase Order"
        isOpen={isAddOrderOpen}
        onClose={() => setIsAddOrderOpen(false)}
      >
        <form onSubmit={handleAddOrderSubmit} noValidate className="space-y-4">
          <div>
            <SelectField
              label="Choose Supplier"
              required
              value={orderSupplier}
              onChange={(e) => {
                setOrderSupplier(e.target.value);
                if (orderSupplierError) setOrderSupplierError(null);
              }}
            >
              <option value="">-- Select Supplier --</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s.name}>
                  {s.name} ({s.supplierId || s._id.slice(-6)})
                </option>
              ))}
            </SelectField>
            {orderSupplierError && (
              <p className="mt-1 text-xs font-medium text-rose-500">{orderSupplierError}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase items</span>
              <Button
                type="button"
                variant="ghost"
                onClick={handleAddRow}
                className="text-xs py-1 px-2 border border-slate-200"
              >
                + Add Item
              </Button>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {orderItems.map((item, index) => {
                const itErr = orderItemErrors[index] || {};
                return (
                  <div key={index} className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Medicine Name *</label>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          placeholder="e.g. Ibuprofen 400mg"
                          value={item.name}
                          onChange={(e) => handleOrderItemChange(index, "name", e.target.value)}
                          className={`w-full rounded border p-1 text-xs text-slate-800 outline-none ${
                            itErr.name ? "border-rose-400 bg-rose-50/20" : "border-slate-350 bg-white"
                          }`}
                        />
                      </div>

                      <div className="w-20">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Qty *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={1000000}
                          value={item.quantity}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault();
                          }}
                          onChange={(e) => handleOrderItemChange(index, "quantity", e.target.value)}
                          className={`w-full rounded border p-1 text-xs text-slate-850 outline-none ${
                            itErr.quantity ? "border-rose-400 bg-rose-50/20" : "border-slate-350 bg-white"
                          }`}
                        />
                      </div>

                      <div className="w-24">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Cost (₹) *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          max={10000000}
                          value={item.cost}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                          }}
                          onChange={(e) => handleOrderItemChange(index, "cost", e.target.value)}
                          className={`w-full rounded border p-1 text-xs text-slate-850 outline-none ${
                            itErr.cost ? "border-rose-400 bg-rose-50/20" : "border-slate-350 bg-white"
                          }`}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handleRemoveRow(index)}
                        className="p-1 px-2 text-xs py-1"
                        disabled={orderItems.length === 1}
                      >
                        🗑
                      </Button>
                    </div>

                    {(itErr.name || itErr.quantity || itErr.cost) && (
                      <div className="text-[10px] font-medium text-rose-500 space-y-0.5">
                        {itErr.name && <p>Medicine Name: {itErr.name}</p>}
                        {itErr.quantity && <p>Qty: {itErr.quantity}</p>}
                        {itErr.cost && <p>Cost: {itErr.cost}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddOrderOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Purchase Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
