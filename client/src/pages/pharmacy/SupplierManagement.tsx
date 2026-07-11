import { useState, useEffect } from "react";
import { Truck, Plus, Search, Eye, ShoppingBag, History, FileText, CheckCircle } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField } from "../../components/ui/Field";

interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  outstandingBalance: number;
}

interface PurchaseOrder {
  _id: string;
  supplierName: string;
  items: { name: string; quantity: number; cost: number }[];
  date: string;
  totalCost: number;
  status: "Pending" | "Ordered" | "Delivered" | "Cancelled";
}

export function PharmacySupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"suppliers" | "orders">("suppliers");
  const [search, setSearch] = useState("");

  // Modals state
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // New Supplier Form State
  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supAddress, setSupAddress] = useState("");

  // New Order Form State
  const [orderSupplier, setOrderSupplier] = useState("");
  const [orderItems, setOrderItems] = useState<{ name: string; quantity: number; cost: number }[]>([
    { name: "", quantity: 10, cost: 0 }
  ]);

  useEffect(() => {
    // Load suppliers
    const savedSuppliers = localStorage.getItem("hms_pharmacy_suppliers");
    if (savedSuppliers) {
      setSuppliers(JSON.parse(savedSuppliers));
    } else {
      localStorage.setItem("hms_pharmacy_suppliers", JSON.stringify([]));
      setSuppliers([]);
    }

    // Load POs
    const savedOrders = localStorage.getItem("hms_pharmacy_purchase_orders");
    if (savedOrders) {
      setPurchaseOrders(JSON.parse(savedOrders));
    } else {
      localStorage.setItem("hms_pharmacy_purchase_orders", JSON.stringify([]));
      setPurchaseOrders([]);
    }
  }, []);

  const handleAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supPhone) return;

    const newSupplier: Supplier = {
      _id: `SUP-${Math.floor(10 + Math.random() * 90)}`,
      name: supName,
      contactPerson: supContact,
      email: supEmail,
      phone: supPhone,
      address: supAddress,
      outstandingBalance: 0
    };

    const updated = [...suppliers, newSupplier];
    setSuppliers(updated);
    localStorage.setItem("hms_pharmacy_suppliers", JSON.stringify(updated));

    // Reset Form
    setSupName("");
    setSupContact("");
    setSupEmail("");
    setSupPhone("");
    setSupAddress("");
    setIsAddSupplierOpen(false);
  };

  const handleAddOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSupplier || !orderItems[0].name) return;

    const total = orderItems.reduce((acc, curr) => acc + (curr.quantity * curr.cost), 0);
    const newPO: PurchaseOrder = {
      _id: `PO-${Math.floor(7000 + Math.random() * 900)}`,
      supplierName: orderSupplier,
      items: orderItems.map(it => ({ ...it, quantity: Number(it.quantity), cost: Number(it.cost) })),
      date: new Date().toISOString().split("T")[0],
      totalCost: total,
      status: "Ordered"
    };

    // Update supplier balance
    const updatedSuppliers = suppliers.map(s => 
      s.name === orderSupplier 
        ? { ...s, outstandingBalance: s.outstandingBalance + total } 
        : s
    );
    setSuppliers(updatedSuppliers);
    localStorage.setItem("hms_pharmacy_suppliers", JSON.stringify(updatedSuppliers));

    const updatedPOs = [newPO, ...purchaseOrders];
    setPurchaseOrders(updatedPOs);
    localStorage.setItem("hms_pharmacy_purchase_orders", JSON.stringify(updatedPOs));

    // Reset Form
    setOrderSupplier("");
    setOrderItems([{ name: "", quantity: 10, cost: 0 }]);
    setIsAddOrderOpen(false);
  };

  const handleReceiveOrder = (poId: string) => {
    // Set status to Delivered
    const updatedPOs = purchaseOrders.map(po => {
      if (po._id === poId) {
        return { ...po, status: "Delivered" as const };
      }
      return po;
    });
    setPurchaseOrders(updatedPOs);
    localStorage.setItem("hms_pharmacy_purchase_orders", JSON.stringify(updatedPOs));

    // Add PO items to medicine inventory
    const targetPO = purchaseOrders.find(po => po._id === poId);
    const savedMeds = localStorage.getItem("hms_pharmacy_medicines");
    if (targetPO && savedMeds) {
      const medsArray = JSON.parse(savedMeds);
      targetPO.items.forEach(poItem => {
        const existing = medsArray.find((m: any) => m.name.toLowerCase() === poItem.name.toLowerCase());
        if (existing) {
          existing.stockQty += poItem.quantity;
        } else {
          // Add new item to inventory
          medsArray.push({
            _id: `MED-${Math.floor(100 + Math.random() * 900)}`,
            name: poItem.name,
            category: "General",
            sku: `SKU-${poItem.name.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
            stockQty: poItem.quantity,
            reorderLevel: 20,
            expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0], // default 1 yr
            price: poItem.cost * 1.5, // 50% markup
            batchNo: `B-${Math.floor(100 + Math.random() * 900)}`,
            supplier: targetPO.supplierName
          });
        }
      });
      localStorage.setItem("hms_pharmacy_medicines", JSON.stringify(medsArray));
    }

    if (selectedOrder?._id === poId) {
      setSelectedOrder({ ...selectedOrder, status: "Delivered" });
    }
  };

  const handleOrderItemChange = (index: number, field: keyof PurchaseOrder["items"][0], value: any) => {
    const updated = [...orderItems];
    updated[index] = {
      ...updated[index],
      [field]: value
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

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
    s._id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPOs = purchaseOrders.filter(po => 
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
            <Button onClick={() => setIsAddSupplierOpen(true)} className="flex items-center gap-2">
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
            rows={filteredSuppliers}
            emptyMessage="No suppliers found."
            columns={[
              {
                header: "ID",
                render: (r) => <span className="font-bold text-navy-700">{r._id}</span>
              },
              {
                header: "Supplier Name",
                render: (r) => <span className="font-semibold text-slate-800">{r.name}</span>
              },
              {
                header: "Contact Person",
                render: (r) => <span className="text-slate-700">{r.contactPerson}</span>
              },
              {
                header: "Contact Info",
                render: (r) => (
                  <div className="text-xs">
                    <div>{r.phone}</div>
                    <div className="text-slate-400">{r.email}</div>
                  </div>
                )
              },
              {
                header: "Outstanding Balance",
                render: (r) => (
                  <span className={`font-bold ${r.outstandingBalance > 0 ? "text-amber-600" : "text-slate-650"}`}>
                    ₹{r.outstandingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                )
              },
              {
                header: "Actions",
                render: (r) => (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setSelectedSupplier(r);
                    }} 
                    className="p-1 hover:text-navy-700"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )
              }
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
                render: (r) => <span className="font-bold text-navy-700">{r._id}</span>
              },
              {
                header: "Supplier",
                render: (r) => <span className="font-semibold text-slate-800">{r.supplierName}</span>
              },
              {
                header: "Items Count",
                render: (r) => (
                  <span className="text-xs font-mono">
                    {r.items.length} items ({r.items.reduce((acc, c) => acc + c.quantity, 0)} units)
                  </span>
                )
              },
              {
                header: "Total Cost",
                render: (r) => <span className="font-bold">₹{r.totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              },
              {
                header: "Order Date",
                render: (r) => <span className="text-xs text-slate-600">{r.date}</span>
              },
              {
                header: "Status",
                render: (r) => {
                  const tone = 
                    r.status === "Delivered" ? "success" : 
                    r.status === "Ordered" ? "info" : 
                    r.status === "Pending" ? "warning" : "danger";
                  return <Badge tone={tone}>{r.status}</Badge>;
                }
              },
              {
                header: "Actions",
                render: (r) => (
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedOrder(r);
                      }} 
                      className="p-1 hover:text-navy-700"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {r.status === "Ordered" && (
                      <Button
                        onClick={() => handleReceiveOrder(r._id)}
                        className="py-1 px-2 bg-green-700 hover:bg-green-800 text-xs flex items-center gap-1"
                        title="Mark Delivered & Restock"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Receive
                      </Button>
                    )}
                  </div>
                )
              }
            ]}
          />
        </Card>
      )}

      {/* Supplier Detail Modal */}
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
              <div className="text-xs text-slate-500">ID: {selectedSupplier._id}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Contact Person</div>
                <div className="font-semibold text-slate-800">{selectedSupplier.contactPerson}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Phone</div>
                <div className="text-slate-800 font-mono">{selectedSupplier.phone}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Email Address</div>
                <div className="text-slate-850">{selectedSupplier.email}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Outstanding Dues</div>
                <div className="font-bold text-amber-600">₹{selectedSupplier.outstandingBalance.toLocaleString("en-IN")}</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Full Address</div>
              <div className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{selectedSupplier.address}</div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedSupplier(null)}>Close</Button>
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
                <Badge tone={selectedOrder.status === "Delivered" ? "success" : "info"}>{selectedOrder.status}</Badge>
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
              <Button variant="secondary" onClick={() => setSelectedOrder(null)}>Close</Button>
              {selectedOrder.status === "Ordered" && (
                <Button 
                  onClick={() => handleReceiveOrder(selectedOrder._id)} 
                  className="bg-green-700 hover:bg-green-800"
                >
                  Confirm Shipment Delivery
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add Supplier Modal */}
      <Modal 
        title="Add Supplier Profile" 
        isOpen={isAddSupplierOpen} 
        onClose={() => setIsAddSupplierOpen(false)}
      >
        <form onSubmit={handleAddSupplierSubmit} className="space-y-4">
          <InputField
            label="Supplier Company Name"
            required
            placeholder="e.g. Apollo Pharma Distributors"
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
              label="Email"
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
          <InputField
            label="Full Business Address"
            placeholder="e.g. Office Suite 120, Trade Center, Delhi"
            value={supAddress}
            onChange={(e) => setSupAddress(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsAddSupplierOpen(false)}>Cancel</Button>
            <Button type="submit">Save Supplier</Button>
          </div>
        </form>
      </Modal>

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
            {suppliers.map(s => (
              <option key={s._id} value={s.name}>{s.name}</option>
            ))}
          </SelectField>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase items</span>
              <Button type="button" variant="ghost" onClick={handleAddRow} className="text-xs py-1 px-2 border border-slate-200">
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
            <Button type="button" variant="secondary" onClick={() => setIsAddOrderOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Purchase Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
