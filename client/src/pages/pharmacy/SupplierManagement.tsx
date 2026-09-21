import { useState, useEffect } from "react";
import { Plus, Search, Eye, ShoppingBag, CheckCircle, Pencil, Trash2 } from "lucide-react";
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
  const [supBalance, setSupBalance] = useState(0);
  const [supStatus, setSupStatus] = useState<"active" | "inactive">("active");

  // New Order Form State
  const [orderSupplier, setOrderSupplier] = useState("");
  const [orderItems, setOrderItems] = useState<{ name: string; quantity: number; cost: number }[]>([
    { name: "", quantity: 10, cost: 0 },
  ]);

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
    setIsAddSupplierOpen(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupName(supplier.name);
    setSupContact(supplier.contactPerson || "");
    setSupEmail(supplier.email || "");
    setSupPhone(supplier.phone || "");
    setSupAddress(supplier.address || "");
    setSupBalance(supplier.outstandingBalance || 0);
    setSupStatus(supplier.status || "active");
    setIsEditSupplierOpen(true);
  };

  const handleAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supPhone) return;

    try {
      await createSupplierMutation.mutateAsync({
        name: supName,
        contactPerson: supContact,
        email: supEmail,
        phone: supPhone,
        address: supAddress,
        outstandingBalance: Number(supBalance) || 0,
        status: supStatus,
      });

      setIsAddSupplierOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create supplier");
    }
  };

  const handleEditSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !supName || !supPhone) return;

    try {
      await updateSupplierMutation.mutateAsync({
        name: supName,
        contactPerson: supContact,
        email: supEmail,
        phone: supPhone,
        address: supAddress,
        outstandingBalance: Number(supBalance) || 0,
        status: supStatus,
      });

      setIsEditSupplierOpen(false);
      setEditingSupplier(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update supplier");
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"?`)) return;

    try {
      await deleteSupplierMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete supplier");
    }
  };

  const handleAddOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSupplier || !orderItems[0].name) return;

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
    setIsAddOrderOpen(false);
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
  };

  const handleOrderItemChange = (index: number, field: keyof PurchaseOrder["items"][0], value: any) => {
    const updated = [...orderItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setOrderItems(updated);
  };

  const handleAddRow = () => {
    setOrderItems([...orderItems, { name: "", quantity: 10, cost: 0 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (orderItems.length === 1) return;
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
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
        <form onSubmit={handleAddSupplierSubmit} className="space-y-4">
          <InputField
            label="Supplier Company Name"
            required
            placeholder="e.g. Apollo Pharmacy Distributors"
            value={supName}
            onChange={(e) => setSupName(e.target.value)}
          />
          <InputField
            label="Contact Person"
            placeholder="e.g. John Doe"
            value={supContact}
            onChange={(e) => setSupContact(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Email Address"
              type="email"
              placeholder="supplier@email.com"
              value={supEmail}
              onChange={(e) => setSupEmail(e.target.value)}
            />
            <InputField
              label="Phone Number"
              required
              placeholder="e.g. +91-9999888877"
              value={supPhone}
              onChange={(e) => setSupPhone(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Outstanding Balance (₹)"
              type="number"
              placeholder="0"
              value={supBalance}
              onChange={(e) => setSupBalance(Number(e.target.value))}
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
            onChange={(e) => setSupAddress(e.target.value)}
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
          <form onSubmit={handleEditSupplierSubmit} className="space-y-4">
            <InputField
              label="Supplier Company Name"
              required
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
            />
            <InputField
              label="Contact Person"
              value={supContact}
              onChange={(e) => setSupContact(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Email Address"
                type="email"
                value={supEmail}
                onChange={(e) => setSupEmail(e.target.value)}
              />
              <InputField
                label="Phone Number"
                required
                value={supPhone}
                onChange={(e) => setSupPhone(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Outstanding Balance (₹)"
                type="number"
                value={supBalance}
                onChange={(e) => setSupBalance(Number(e.target.value))}
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
              onChange={(e) => setSupAddress(e.target.value)}
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
        <form onSubmit={handleAddOrderSubmit} className="space-y-4">
          <SelectField
            label="Choose Supplier"
            required
            value={orderSupplier}
            onChange={(e) => setOrderSupplier(e.target.value)}
          >
            <option value="">-- Select Supplier --</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s.name}>
                {s.name} ({s.supplierId || s._id.slice(-6)})
              </option>
            ))}
          </SelectField>

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
              {orderItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-end bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Medicine Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ibuprofen 400mg"
                      value={item.name}
                      onChange={(e) => handleOrderItemChange(index, "name", e.target.value)}
                      className="w-full rounded border border-slate-350 bg-white p-1 text-xs text-slate-800 outline-none"
                    />
                  </div>

                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Qty</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleOrderItemChange(index, "quantity", e.target.value)}
                      className="w-full rounded border border-slate-350 bg-white p-1 text-xs text-slate-850 outline-none"
                    />
                  </div>

                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Cost (₹)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={item.cost}
                      onChange={(e) => handleOrderItemChange(index, "cost", e.target.value)}
                      className="w-full rounded border border-slate-350 bg-white p-1 text-xs text-slate-850 outline-none"
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
              ))}
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
