import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  CreditCard, 
  AlertCircle, 
  FileText, 
  CheckCircle, 
  Printer, 
  Clock, 
  Layers, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  ArrowRight, 
  Eye, 
  RefreshCw, 
  X,
  User,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import {
  usePayBilling,
  usePendingInvoices,
  usePaymentHistory,
  useCompletedInvoices
} from "../../features/receptionist";
import {
  useAdmittedPatients,
  useIPBillDetails,
  useCreateIPBill,
  useAddIPBillItem,
  useUpdateIPBillItem,
  useDeleteIPBillItem,
  useGenerateIPBillInvoice,
  usePostIPBillPayment,
  useIPBillReceiptDetails
} from "../../features/ipBills";
import { api } from "../../lib/api";
import { socket } from "../../lib/socket";
import { InputField, SelectField } from "../../components/ui/Field";
import { formatINR } from "../../lib/currency";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";

interface Props {
  activeTab?: "consultation" | "pending" | "completed" | "collections" | "ip";
}

const SECTIONS = [
  "Accommodation Charges",
  "Doctor Visit Charges",
  "Nursing Charges",
  "Procedure Charges",
  "Operation Charges",
  "Laboratory Charges",
  "Radiology Charges",
  "Pharmacy Charges",
  "Consumables",
  "Medical Equipment",
  "Oxygen Charges",
  "Blood Charges",
  "Miscellaneous Charges"
];

const calculateStayDays = (admissionDate: any, dischargeDate?: any): number => {
  if (!admissionDate) return 1;
  const start = new Date(admissionDate);
  const end = dischargeDate ? new Date(dischargeDate) : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
};

interface AccordionGroup {
  id: string;
  name: string;
  categories: string[];
  subtotal: number;
  itemCount: number;
  items: any[];
}

const groupIPItems = (items: any[]) => {
  const groups: AccordionGroup[] = [
    { id: "accommodation", name: "Accommodation Charges", categories: ["Accommodation Charges"], subtotal: 0, itemCount: 0, items: [] },
    { id: "doctor", name: "Doctor Charges", categories: ["Doctor Visit Charges", "Doctor Charges"], subtotal: 0, itemCount: 0, items: [] },
    { id: "clinical", name: "Clinical Services", categories: ["Laboratory Charges", "Radiology Charges", "Procedure Charges", "Operation Charges", "Operation Theatre Charges"], subtotal: 0, itemCount: 0, items: [] },
    { id: "pharmacy", name: "Pharmacy", categories: ["Pharmacy Charges"], subtotal: 0, itemCount: 0, items: [] },
    { id: "nursing", name: "Nursing & Support", categories: ["Nursing Charges", "Consumables", "Medical Equipment", "Equipment Charges", "Oxygen Charges", "Blood Charges", "ICU Charges", "Diet Charges"], subtotal: 0, itemCount: 0, items: [] },
    { id: "other", name: "Other Charges", categories: ["Admission Charges", "Miscellaneous Charges", "Miscellaneous"], subtotal: 0, itemCount: 0, items: [] },
    { id: "discount", name: "Discount & Insurance", categories: ["Discounts", "Insurance / TPA", "Advance Payments"], subtotal: 0, itemCount: 0, items: [] }
  ];

  items.forEach(item => {
    const group = groups.find(g => g.categories.includes(item.category));
    if (group) {
      group.items.push(item);
      group.subtotal += item.total || 0;
      group.itemCount += 1;
    } else {
      const other = groups.find(g => g.id === "other")!;
      other.items.push(item);
      other.subtotal += item.total || 0;
      other.itemCount += 1;
    }
  });

  return groups.filter(g => g.items.length > 0);
};

export function BillingPage({ activeTab = "consultation" }: Props) {
  const [tab, setTab] = useState<"consultation" | "pending" | "completed" | "collections" | "ip">(activeTab as any);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  // Selected billing states (OPD)
  const [invoice, setInvoice] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Cash" | "Card" | "Mixed">("UPI");
  const [payAmount, setPayAmount] = useState("");

  // Mixed Payment breakdowns (OPD)
  const [upiAmount, setUpiAmount] = useState("0");
  const [cashAmount, setCashAmount] = useState("0");
  const [cardAmount, setCardAmount] = useState("0");

  useEffect(() => {
    if (invoice) {
      const initialAmt = invoice.totals?.patientBalance !== undefined 
        ? invoice.totals.patientBalance 
        : invoice.totals?.total || 0;
      setPayAmount(initialAmt.toString());
      setUpiAmount("0");
      setCashAmount("0");
      setCardAmount("0");
    } else {
      setPayAmount("");
    }
  }, [invoice]);

  // Receipt outcomes (OPD)
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Data-consistent hooks (OPD)
  const payMutation = usePayBilling();
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = usePendingInvoices();
  const { data: completedData, isLoading: completedLoading } = useCompletedInvoices();
  const { data: collectionsData, isLoading: collectionsLoading } = usePaymentHistory("today");

  const pendingInvoices = pendingData?.invoices ?? [];
  const completedInvoices = completedData?.invoices ?? [];
  const todayPayments = collectionsData?.payments ?? [];
  const todayTotal = collectionsData?.totalAmount ?? 0;

  // ── IP Billing States ──
  const [admissionSearch, setAdmissionSearch] = useState("");
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  
  // Accordion UI state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [addManualGroup, setAddManualGroup] = useState<string | null>(null);
  const [manualCategory, setManualCategory] = useState("");

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Custom Inline Add state per category
  const [addItemCategory, setAddItemCategory] = useState<string | null>(null);
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [itemDays, setItemDays] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemDiscount, setItemDiscount] = useState(0);
  const [itemTax, setItemTax] = useState(0);

  // Edit item inline state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editDays, setEditDays] = useState(1);
  const [editPrice, setEditPrice] = useState(0);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editTax, setEditTax] = useState(0);

  // Bill configuration state
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed");
  const [hospitalDiscount, setHospitalDiscount] = useState(0);
  const [doctorDiscount, setDoctorDiscount] = useState(0);
  const [managementDiscount, setManagementDiscount] = useState(0);
  
  const [taxRateVal, setTaxRateVal] = useState(5); // Default GST 5%
  
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [claimAmount, setClaimAmount] = useState(0);
  const [patientShare, setPatientShare] = useState(0);

  // Receive Payments state (IP)
  const [showIPPaymentModal, setShowIPPaymentModal] = useState(false);
  const [ipPayAmount, setIPPayAmount] = useState(0);
  const [ipPayMethod, setIPPayMethod] = useState("UPI");
  const [ipPayTxId, setIPPayTxId] = useState("");

  // Mixed Payment breakdown (IP)
  const [ipUpiAmt, setIpUpiAmt] = useState(0);
  const [ipCashAmt, setIpCashAmt] = useState(0);
  const [ipCardAmt, setIpCardAmt] = useState(0);
  const [ipChequeAmt, setIpChequeAmt] = useState(0);
  const [ipInsAmt, setIpInsAmt] = useState(0);

  // Printable Receipt Details Modal (IP)
  const [showIPReceiptModal, setShowIPReceiptModal] = useState(false);
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);

  // IP React Queries & Mutations
  const { data: admittedPatients, refetch: refetchAdmissions } = useAdmittedPatients(admissionSearch);
  const { data: ipBillData, refetch: refetchBillDetails, isLoading: billLoading } = useIPBillDetails(selectedAdmissionId || undefined);

  const createBillMutation = useCreateIPBill();
  const addBillItemMutation = useAddIPBillItem(ipBillData?.bill?._id, selectedAdmissionId || undefined);
  const updateBillItemMutation = useUpdateIPBillItem(ipBillData?.bill?._id, selectedAdmissionId || undefined);
  const deleteBillItemMutation = useDeleteIPBillItem(ipBillData?.bill?._id, selectedAdmissionId || undefined);
  const generateInvoiceMutation = useGenerateIPBillInvoice(ipBillData?.bill?._id, selectedAdmissionId || undefined);
  const postPaymentMutation = usePostIPBillPayment(ipBillData?.bill?._id, selectedAdmissionId || undefined);

  const { data: receiptDetails } = useIPBillReceiptDetails(ipBillData?.bill?._id, selectedReceiptPaymentId || undefined);

  // Socket sync integrations
  useEffect(() => {
    const handleUpdateEvent = (data: any) => {
      console.log("Socket billing sync received:", data);
      if (selectedAdmissionId && (data.admissionId === selectedAdmissionId || data.type === "BILL_PAYMENT_PROCESSED" || data.type === "BILL_INVOICE_GENERATED")) {
        refetchBillDetails();
      }
      refetchAdmissions();
    };

    socket.on("ip_bill_update", handleUpdateEvent);
    socket.on("ip_billing_update", handleUpdateEvent);
    socket.on("dashboard_update", handleUpdateEvent);

    return () => {
      socket.off("ip_bill_update", handleUpdateEvent);
      socket.off("ip_billing_update", handleUpdateEvent);
      socket.off("dashboard_update", handleUpdateEvent);
    };
  }, [selectedAdmissionId, refetchBillDetails, refetchAdmissions]);

  useEffect(() => {
    if (ipBillData?.items) {
      const activeGroups = groupIPItems(ipBillData.items);
      const initial: Record<string, boolean> = {};
      activeGroups.forEach(g => {
        initial[g.id] = true;
      });
      setExpandedGroups(initial);
    }
  }, [ipBillData?.items]);

  // OPD Redirect check
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const invId = params.get("invoiceId");
    if (invId) {
      loadInvoice(invId);
      setTab("consultation");
    }
  }, [location]);

  const loadInvoice = async (id: string) => {
    setInvoiceLoading(true);
    try {
      const res = await api.get<any>(`/invoices/${id}`);
      setInvoice(res.data?.data?.invoice || res.data);
      setReceiptData(null);
    } catch {
      alert("Failed to fetch invoice details");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const maxDue = invoice.totals?.patientBalance !== undefined 
      ? invoice.totals.patientBalance 
      : invoice.totals?.total || 0;

    let amt = parseFloat(payAmount);
    if (paymentMethod === "Mixed") {
      amt = parseFloat(upiAmount || "0") + parseFloat(cashAmount || "0") + parseFloat(cardAmount || "0");
    }

    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    if (amt > maxDue + 0.01) {
      alert(`Payment amount (${formatINR(amt)}) cannot exceed the remaining due amount (${formatINR(maxDue)})`);
      return;
    }

    const payload = {
      invoiceId: invoice._id,
      amount: amt,
      paymentMethod,
      mixedDetails: paymentMethod === "Mixed" ? {
        upiAmount: parseFloat(upiAmount || "0"),
        cashAmount: parseFloat(cashAmount || "0"),
        cardAmount: parseFloat(cardAmount || "0"),
      } : undefined
    };

    try {
      const result = await payMutation.mutateAsync(payload);
      setReceiptData(result);
      setInvoice(null);
      refetchPending();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to process payment");
    }
  };

  // ── IP Calculations (Client-Side dynamic totals based on selected options) ──
  const gross = ipBillData?.items?.reduce((sum: number, x: any) => sum + x.total, 0) || 0;
  const grossTax = gross * (taxRateVal / 100);
  const discountTotal = discountType === "percentage"
    ? gross * ((hospitalDiscount + doctorDiscount + managementDiscount) / 100)
    : (hospitalDiscount + doctorDiscount + managementDiscount);

  const insuranceTotal = paymentMode !== "Cash" ? approvedAmount : 0;
  const advance = ipBillData?.bill?.advancePaid || 0;
  
  const grandTotal = gross + grossTax - discountTotal;
  const outstanding = Math.max(0, grandTotal - insuranceTotal - advance);

  const handleCreateIPBill = async () => {
    if (!selectedAdmissionId) return;
    try {
      await createBillMutation.mutateAsync({ admissionId: selectedAdmissionId });
      alert("Inpatient Draft Bill created successfully.");
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to create inpatient bill");
    }
  };

  const handleAddBillItem = async (category: string) => {
    if (!itemDesc || itemPrice <= 0) {
      alert("Please provide Description and Unit Price.");
      return;
    }
    try {
      await addBillItemMutation.mutateAsync({
        category,
        description: itemDesc,
        quantity: itemQty,
        days: itemDays,
        unitPrice: itemPrice,
        discount: itemDiscount,
        tax: itemTax
      });
      setItemDesc("");
      setItemQty(1);
      setItemDays(1);
      setItemPrice(0);
      setItemDiscount(0);
      setItemTax(0);
      setAddItemCategory(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to add charge item");
    }
  };

  const handleStartEditItem = (item: any) => {
    setEditingItemId(item._id);
    setEditQty(item.quantity);
    setEditDays(item.days);
    setEditPrice(item.unitPrice);
    setEditDiscount(item.discount || 0);
    setEditTax(item.tax || 0);
  };

  const handleUpdateBillItem = async (itemId: string) => {
    try {
      await updateBillItemMutation.mutateAsync({
        itemId,
        quantity: editQty,
        days: editDays,
        unitPrice: editPrice,
        discount: editDiscount,
        tax: editTax
      });
      setEditingItemId(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to update charge item");
    }
  };

  const handleDeleteBillItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this custom charge?")) return;
    try {
      await deleteBillItemMutation.mutateAsync(itemId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to delete charge item");
    }
  };

  const handleGenerateInvoice = async () => {
    if (gross === 0) {
      alert("Cannot generate invoice for a bill with zero items.");
      return;
    }
    if (!window.confirm("Are you sure you want to lock the bill and generate the invoice? This is permanent.")) return;
    try {
      await generateInvoiceMutation.mutateAsync({
        discountType,
        hospitalDiscount,
        doctorDiscount,
        managementDiscount,
        approvedAmount,
        claimAmount,
        patientShare,
        paymentMode,
        taxRate: taxRateVal
      });
      alert("GST Invoice generated successfully.");
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to generate invoice");
    }
  };

  const handlePostIPPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ipPayAmount <= 0) return;

    let mixed = undefined;
    if (ipPayMethod === "Mixed") {
      mixed = {
        upiAmount: ipUpiAmt,
        cashAmount: ipCashAmt,
        cardAmount: ipCardAmt,
        chequeAmount: ipChequeAmt,
        insuranceAmount: ipInsAmt
      };
    }

    try {
      const res = await postPaymentMutation.mutateAsync({
        amount: ipPayAmount,
        paymentMethod: ipPayMethod,
        mixedDetails: mixed,
        transactionId: ipPayTxId || `TXN-IP-${Date.now().toString().slice(-6)}`
      });
      alert("Payment processed successfully.");
      setSelectedReceiptPaymentId(res.payment._id);
      setShowIPPaymentModal(false);
      setShowIPReceiptModal(true);
      setIPPayAmount(0);
      setIPPayTxId("");
      setIpUpiAmt(0);
      setIpCashAmt(0);
      setIpCardAmt(0);
      setIpChequeAmt(0);
      setIpInsAmt(0);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to process transaction");
    }
  };

  const pendingColumns = [
    {
      header: "Invoice Date",
      render: (row: any) => <span className="text-xs text-slate-600">{new Date(row.issuedAt).toLocaleDateString("en-IN")}</span>
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-455 font-mono">{row.patient?.uhid}</div>
        </div>
      )
    },
    {
      header: "Amount Due",
      render: (row: any) => (
        <span className="text-xs font-semibold text-slate-800">
          {formatINR(row.totals?.patientBalance !== undefined ? row.totals.patientBalance : row.totals?.total)}
        </span>
      )
    },
    {
      header: "Action",
      render: (row: any) => (
        <Button
          type="button"
          onClick={() => {
            if (row.billingType === "IP" || row.outstanding !== undefined) {
              setSelectedAdmissionId(row.admission?._id || row.admission);
              setTab("ip");
            } else {
              loadInvoice(row._id);
              setTab("consultation");
            }
          }}
          className="text-xs px-3 py-1 flex items-center gap-1"
        >
          <CreditCard className="h-3.5 w-3.5" /> Process Payment
        </Button>
      )
    }
  ];

  const completedColumns = [
    {
      header: "Date",
      render: (row: any) => <span className="text-xs text-slate-600">{new Date(row.updatedAt || row.issuedAt).toLocaleDateString("en-IN")}</span>
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-455 font-mono">{row.patient?.uhid}</div>
        </div>
      )
    },
    {
      header: "Amount Paid",
      render: (row: any) => <span className="text-xs font-semibold text-emerald-700">{formatINR(row.totals?.total)}</span>
    },
    {
      header: "Status",
      render: () => <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold uppercase">Paid</span>
    }
  ];

  const collectionsColumns = [
    {
      header: "Paid At",
      render: (row: any) => <span className="text-xs text-slate-600">{new Date(row.paidAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
    },
    {
      header: "Patient",
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.patient?.name}</div>
          <div className="text-[10px] text-slate-455 font-mono">{row.patient?.uhid}</div>
        </div>
      )
    },
    {
      header: "Method",
      render: (row: any) => <span className="text-xs font-medium text-slate-700">{row.paymentMethod}</span>
    },
    {
      header: "Amount",
      render: (row: any) => <span className="text-xs font-semibold text-slate-800">{formatINR(row.amount)}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header and top tab triggers */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing Desk</h1>
          <p className="text-sm text-slate-500">Collect consultation fees, manage inpatient bills, and track receipts.</p>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setTab("consultation")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "consultation" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" /> Consultation Payment
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "pending" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" /> Pending Bills
            {pendingInvoices.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-[9px] font-bold">{pendingInvoices.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab("ip")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "ip" ? "bg-navy-50 text-navy-700 font-bold animate-pulse" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> IP Billing
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "completed" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" /> Completed
          </button>
          <button
            onClick={() => setTab("collections")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "collections" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Today's Collections
          </button>
        </div>
      </div>

      {/* OPD Consultation Billing Tab */}
      {tab === "consultation" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {invoiceLoading ? (
              <div className="p-12 text-center text-slate-400">Loading invoice details...</div>
            ) : invoice ? (
              <Card className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Invoice ID: {invoice._id}</h3>
                    <p className="text-[10px] text-slate-400">Issued: {new Date(invoice.issuedAt).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase">
                    Unpaid
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Patient Name</span>
                    <span className="font-bold text-slate-800">{invoice.patient?.name || "Walk-in Patient"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">UHID</span>
                    <span className="font-bold text-slate-800 font-mono">{invoice.patient?.uhid || "—"}</span>
                  </div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-slate-400 font-semibold uppercase">
                      <th className="py-2">Description</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Price</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-50 text-slate-650">
                        <td className="py-2">{item.description}</td>
                        <td className="py-2 text-center">{item.quantity}</td>
                        <td className="py-2 text-right">{formatINR(item.amount)}</td>
                        <td className="py-2 text-right font-semibold">{formatINR(item.quantity * item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex flex-col items-end text-xs space-y-1 pt-2">
                  <div className="flex justify-between w-48 text-slate-500">
                    <span>Subtotal:</span>
                    <span>{formatINR(invoice.totals?.subtotal)}</span>
                  </div>
                  <div className="flex justify-between w-48 text-slate-500">
                    <span>Tax:</span>
                    <span>{formatINR(invoice.totals?.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between w-48 text-slate-850 font-bold border-t pt-1 text-sm">
                    <span>Total Bill:</span>
                    <span>{formatINR(invoice.totals?.total)}</span>
                  </div>
                  {invoice.totals?.patientBalance !== undefined && invoice.totals.patientBalance < invoice.totals?.total && (
                    <div className="flex justify-between w-48 text-amber-700 font-bold text-xs pt-1">
                      <span>Remaining Due:</span>
                      <span>{formatINR(invoice.totals.patientBalance)}</span>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="py-12 text-center text-slate-450 italic">
                No selected invoice. Use "Pending Bills" to process payment.
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {invoice && (
              <Card className="space-y-4">
                <h3 className="text-sm font-bold text-slate-850 border-b pb-2">Process Receipt Payment</h3>
                <form onSubmit={handleProcessPayment} className="space-y-3">
                  <SelectField
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash Handover</option>
                    <option value="Card">Card Terminal</option>
                    <option value="Mixed">Mixed Payment</option>
                  </SelectField>

                  {paymentMethod === "Mixed" && (
                    <div className="space-y-2 border-t pt-2 text-xs">
                      <InputField label="UPI Amount (₹)" type="number" value={upiAmount} onChange={(e) => setUpiAmount(e.target.value)} />
                      <InputField label="Cash Amount (₹)" type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
                      <InputField label="Card Amount (₹)" type="number" value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} />
                    </div>
                  )}

                  {paymentMethod !== "Mixed" && (
                    <InputField
                      label="Payment Amount (₹)"
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      max={invoice.totals?.patientBalance !== undefined ? invoice.totals.patientBalance : invoice.totals?.total}
                      min="1"
                      required
                    />
                  )}

                  <Button type="submit" className="w-full" disabled={payMutation.isPending}>
                    {payMutation.isPending ? "Processing..." : `Confirm & Collect ${formatINR(
                      paymentMethod === "Mixed" 
                        ? (parseFloat(upiAmount || "0") + parseFloat(cashAmount || "0") + parseFloat(cardAmount || "0")) 
                        : (parseFloat(payAmount || "0"))
                    )}`}
                  </Button>
                </form>
              </Card>
            )}

            {receiptData && (
              <Card className="space-y-4 border-t-4 border-t-green-600 bg-green-50/10">
                <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                  <CheckCircle className="h-5 w-5 text-green-600" /> Payment Processed Successfully
                </div>
                <div className="text-xs space-y-1 text-slate-650">
                  <p><strong>Receipt Number:</strong> {receiptData.receiptNumber || "RCP-3342"}</p>
                  <p><strong>Transaction ID:</strong> {receiptData.payment?.transactionId || "N/A"}</p>
                  <p><strong>Paid Amount:</strong> {formatINR(receiptData.receipt?.amount || receiptData.payment?.amount)}</p>
                </div>
                <Button
                  onClick={() => {
                    alert("Printing receipt details...");
                    window.print();
                  }}
                  variant="secondary"
                  className="w-full flex items-center justify-center gap-1.5 text-xs py-2"
                >
                  <Printer className="h-4 w-4" /> Print Payment Receipt
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* OPD Pending Bills Tab */}
      {tab === "pending" && (
        <Card>
          <h2 className="text-base font-bold text-slate-800 mb-4">Pending Consultation Bills</h2>
          {pendingLoading ? (
            <div className="py-8 text-center text-slate-400">Loading pending list...</div>
          ) : (
            <DataTable columns={pendingColumns} rows={pendingInvoices} rowKey={(row) => row._id} />
          )}
        </Card>
      )}

      {/* OPD Completed Bills Tab */}
      {tab === "completed" && (
        <Card>
          <h2 className="text-base font-bold text-slate-800 mb-4">Completed Payments History</h2>
          {completedLoading ? (
            <div className="py-8 text-center text-slate-400">Loading completed bills...</div>
          ) : (
            <DataTable columns={completedColumns} rows={completedInvoices} rowKey={(row) => row._id} />
          )}
        </Card>
      )}

      {/* OPD Today's Collections Tab */}
      {tab === "collections" && (
        <Card className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-base font-bold text-slate-800">Collections Summary Today</h2>
            <span className="text-sm font-bold text-navy-700 bg-navy-50 border px-3 py-1 rounded">Total Received: {formatINR(todayTotal)}</span>
          </div>
          {collectionsLoading ? (
            <div className="py-8 text-center text-slate-400">Loading collections queue...</div>
          ) : (
            <DataTable columns={collectionsColumns} rows={todayPayments} rowKey={(row) => row._id} />
          )}
        </Card>
      )}

      {/* ── INPATIENT (IP) BILLING WORKSPACE TAB ── */}
      {tab === "ip" && (
        <div className="space-y-6">
          {!selectedAdmissionId ? (
            // Search and Select Patient Selector
            <Card className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Select Admitted Inpatient</h2>
              <div className="relative max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search admitted patient by UHID, Name, Admission No, Bed..."
                  value={admissionSearch}
                  onChange={(e) => setAdmissionSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                />
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-left text-sm min-w-[700px]">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Admission ID</th>
                      <th className="px-4 py-3">Patient Details</th>
                      <th className="px-4 py-3">Ward / Bed</th>
                      <th className="px-4 py-3">Attending Doctor</th>
                      <th className="px-4 py-3">Admission Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!admittedPatients || admittedPatients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No currently admitted inpatients found.
                        </td>
                      </tr>
                    ) : (
                      admittedPatients.map((adm) => (
                        <tr key={adm._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-xs text-slate-700">
                            {adm.admissionNumber}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{adm.patient?.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{adm.patient?.uhid} — {adm.patient?.phone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-150">
                              {adm.ward} / Bed: {adm.bed?.bedNumber || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-650">
                            Dr. {adm.admittingDoctor?.name || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {new Date(adm.admissionDate).toLocaleDateString()} {adm.admissionTime}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedAdmissionId(adm._id)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-navy-700 hover:bg-navy-800 rounded-md px-3 py-1.5 transition shadow-sm"
                            >
                              Open Bill <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            // Inpatient active bill workspace
            <div className="space-y-6">
              {/* Active patient banner header */}
              <div className="flex items-center justify-between bg-navy-50 border border-navy-150 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Layers className="h-6 w-6 text-navy-700 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-navy-800">Inpatient Billing Workspace</h3>
                    <p className="text-xs text-navy-600">
                      Active Stay: <span className="font-semibold">{ipBillData?.bill?.patient?.name || "Loading..."}</span> ({ipBillData?.bill?.patient?.uhid})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAdmissionId(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm"
                >
                  <X className="h-4 w-4" /> Close Workspace
                </button>
              </div>

              {billLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-8 w-8 text-navy-600 animate-spin" />
                  <span className="text-sm font-semibold text-slate-500">Loading bill workspace details...</span>
                </div>
              ) : !ipBillData?.bill ? (
                // Step 3: Create IP Bill Draft
                <Card className="text-center py-12 space-y-4">
                  <div className="text-slate-450 italic text-sm">
                    No active Inpatient bill exists for this admission. Let's create a new draft bill.
                  </div>
                  <Button
                    onClick={handleCreateIPBill}
                    className="inline-flex items-center gap-2 bg-navy-700 hover:bg-navy-800 text-white font-bold"
                  >
                    <Plus className="h-4.5 w-4.5" /> Create IP Bill
                  </Button>
                </Card>
              ) : (
                // Step 4: Full Inpatient Billing Workspace Grid
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Left Column: Details and 16 Sections */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Patient detail card stay information */}
                    <Card className="space-y-4">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <User className="h-4.5 w-4.5 text-navy-600" /> Stay Details Card
                      </h3>
                      {ipBillData?.bill && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Patient Name</span>
                            <span className="font-bold text-slate-800">{ipBillData.bill.patient?.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">UHID</span>
                            <span className="font-bold text-slate-750 font-mono">{ipBillData.bill.patient?.uhid}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">IP / Admission No</span>
                            <span className="font-bold text-slate-750 font-mono">{ipBillData.bill.admission?.admissionNumber || ipBillData.bill.billNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Age / Gender</span>
                            <span className="font-bold text-slate-700">{ipBillData.bill.patient?.age} Yrs / <span className="capitalize">{ipBillData.bill.patient?.gender}</span></span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Mobile Phone</span>
                            <span className="font-bold text-slate-700 font-mono">{ipBillData.bill.patient?.phone}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Admitting Doctor</span>
                            <span className="font-bold text-slate-700">Dr. {ipBillData.bill.admission?.attenderName || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Admission Date & Time</span>
                            <span className="font-bold text-slate-700">
                              {new Date(ipBillData.bill.admission?.admissionDate).toLocaleDateString()} {ipBillData.bill.admission?.admissionTime}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Ward / Room / Bed</span>
                            <span className="font-bold text-slate-750">
                              {ipBillData.bill.admission?.ward} / Room / Bed: {ipBillData.bill.admission?.attenderPhone || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Expected Discharge</span>
                            <span className="font-bold text-slate-700">{ipBillData.bill.admission?.expectedStay || "Routine Stay"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Stay Length</span>
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {calculateStayDays(ipBillData.bill.admission?.admissionDate, ipBillData.bill.admission?.dischargeDate)} Days Stay
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Billing Mode / Status</span>
                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 capitalize border border-blue-200">
                              {ipBillData.bill.status} Draft Invoice
                            </span>
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* 16 Sections of Billing Workspace */}
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="h-5 w-5 text-navy-700" /> Billing Category Sections
                      </h3>

                      {groupIPItems(ipBillData?.items || []).map((group) => {
                        const isExpanded = !!expandedGroups[group.id];
                        const isAdding = addManualGroup === group.id;

                        return (
                          <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                            {/* Accordion Header */}
                            <div 
                              onClick={() => toggleGroup(group.id)}
                              className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none border-b border-slate-200/50 transition"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                                <h4 className="text-sm font-bold text-slate-700">{group.name}</h4>
                                <span className="bg-navy-50 text-navy-700 text-[10px] font-bold px-2 py-0.5 rounded border border-navy-150 ml-2">
                                  {group.itemCount} {group.itemCount === 1 ? "Item" : "Items"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-slate-800">
                                  {formatINR(group.subtotal)}
                                </span>
                                {ipBillData.bill.status === "Draft" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (addManualGroup === group.id) {
                                        setAddManualGroup(null);
                                      } else {
                                        setAddManualGroup(group.id);
                                        setManualCategory(group.categories[0]);
                                      }
                                    }}
                                    className="p-1 rounded bg-navy-600 hover:bg-navy-700 text-white transition flex items-center justify-center"
                                    title="Add manual item"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Accordion Body */}
                            {isExpanded && (
                              <div className="p-4 space-y-4 bg-white">
                                {/* Add manual item form */}
                                {isAdding && (
                                  <div className="p-4 bg-slate-50 border rounded-lg space-y-3">
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Add Custom Charge details</h5>
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                      {group.categories.length > 1 && (
                                        <div className="text-xs">
                                          <label className="block text-slate-500 font-semibold mb-1">Select Specific Category *</label>
                                          <select
                                            value={manualCategory}
                                            onChange={(e) => setManualCategory(e.target.value)}
                                            className="w-full rounded border border-slate-250 p-1.5 outline-none bg-white text-xs"
                                          >
                                            {group.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                          </select>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input
                                          type="text"
                                          placeholder="Service / Item Description"
                                          value={itemDesc}
                                          onChange={(e) => setItemDesc(e.target.value)}
                                          className="rounded border border-slate-200 p-1.5 text-xs outline-none bg-white focus:border-navy-500"
                                        />
                                        <div className="grid grid-cols-5 gap-2">
                                          <input
                                            type="number"
                                            placeholder="Qty"
                                            value={itemQty || ""}
                                            onChange={(e) => setItemQty(Number(e.target.value))}
                                            className="rounded border border-slate-200 p-1.5 text-xs outline-none text-center bg-white"
                                            title="Quantity"
                                            min="1"
                                          />
                                          <input
                                            type="number"
                                            placeholder="Days"
                                            value={itemDays || ""}
                                            onChange={(e) => setItemDays(Number(e.target.value))}
                                            className="rounded border border-slate-200 p-1.5 text-xs outline-none text-center bg-white"
                                            title="Days"
                                            min="1"
                                          />
                                          <input
                                            type="number"
                                            placeholder="Price"
                                            value={itemPrice || ""}
                                            onChange={(e) => setItemPrice(Number(e.target.value))}
                                            className="rounded border border-slate-200 p-1.5 text-xs outline-none text-right bg-white col-span-2"
                                            title="Price"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleAddBillItem(manualCategory);
                                              setAddManualGroup(null);
                                            }}
                                            className="bg-navy-700 hover:bg-navy-800 text-white rounded text-xs font-bold"
                                            title="Submit item"
                                          >
                                            ✓
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Items list table */}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead>
                                      <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                                        <th className="py-2">Category</th>
                                        <th className="py-2">Description / Item</th>
                                        <th className="py-2 text-center">Qty</th>
                                        <th className="py-2 text-center">Days</th>
                                        <th className="py-2 text-right">Price</th>
                                        <th className="py-2 text-right">Discount</th>
                                        <th className="py-2 text-right">Tax</th>
                                        <th className="py-2 text-right">Total</th>
                                        <th className="py-2 text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-650">
                                      {group.items.map((item: any) => {
                                        const isEditing = editingItemId === item._id;

                                        return (
                                          <tr key={item._id} className="hover:bg-slate-50/50">
                                            <td className="py-2 text-[10px] font-bold text-slate-400 uppercase">
                                              {item.category}
                                            </td>
                                            <td className="py-2 font-medium text-slate-850">
                                              {item.description}
                                            </td>
                                            <td className="py-2 text-center">
                                              {isEditing ? (
                                                <input
                                                  type="number"
                                                  value={editQty}
                                                  onChange={(e) => setEditQty(Number(e.target.value))}
                                                  className="w-10 rounded border border-slate-200 text-center p-0.5"
                                                />
                                              ) : (
                                                item.quantity
                                              )}
                                            </td>
                                            <td className="py-2 text-center">
                                              {isEditing ? (
                                                <input
                                                  type="number"
                                                  value={editDays}
                                                  onChange={(e) => setEditDays(Number(e.target.value))}
                                                  className="w-10 rounded border border-slate-200 text-center p-0.5"
                                                />
                                              ) : (
                                                item.days
                                              )}
                                            </td>
                                            <td className="py-2 text-right font-mono">
                                              {isEditing ? (
                                                <input
                                                  type="number"
                                                  value={editPrice}
                                                  onChange={(e) => setEditPrice(Number(e.target.value))}
                                                  className="w-14 rounded border border-slate-200 text-right p-0.5"
                                                />
                                              ) : (
                                                formatINR(item.unitPrice)
                                              )}
                                            </td>
                                            <td className="py-2 text-right text-red-500 font-semibold font-mono">
                                              {isEditing ? (
                                                <input
                                                  type="number"
                                                  value={editDiscount}
                                                  onChange={(e) => setEditDiscount(Number(e.target.value))}
                                                  className="w-12 rounded border border-slate-200 text-right p-0.5"
                                                />
                                              ) : (
                                                `-${formatINR(item.discount || 0)}`
                                              )}
                                            </td>
                                            <td className="py-2 text-right text-slate-500 font-medium font-mono">
                                              {isEditing ? (
                                                <input
                                                  type="number"
                                                  value={editTax}
                                                  onChange={(e) => setEditTax(Number(e.target.value))}
                                                  className="w-12 rounded border border-slate-200 text-right p-0.5"
                                                />
                                              ) : (
                                                `+${formatINR(item.tax || 0)}`
                                              )}
                                            </td>
                                            <td className="py-2 text-right font-bold text-slate-800 font-mono">
                                              {isEditing 
                                                ? formatINR((editQty * editDays * editPrice) - editDiscount + editTax)
                                                : formatINR(item.total)
                                              }
                                            </td>
                                            <td className="py-2 text-right">
                                              {item.isSystemGenerated ? (
                                                <span className="inline-flex rounded bg-emerald-50 border border-emerald-200 text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider text-emerald-700 shadow-sm">
                                                  Auto
                                                </span>
                                              ) : ipBillData.bill.status === "Draft" ? (
                                                <div className="flex justify-end gap-1.5">
                                                  {isEditing ? (
                                                    <>
                                                      <button
                                                        onClick={() => handleUpdateBillItem(item._id)}
                                                        className="p-1 rounded bg-navy-50 hover:bg-navy-100 text-navy-700"
                                                        title="Save changes"
                                                      >
                                                        <Save className="h-3.5 w-3.5" />
                                                      </button>
                                                      <button
                                                        onClick={() => setEditingItemId(null)}
                                                        className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-500"
                                                        title="Cancel edit"
                                                      >
                                                        <X className="h-3.5 w-3.5" />
                                                      </button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <button
                                                        onClick={() => handleStartEditItem(item)}
                                                        className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-650"
                                                        title="Edit details"
                                                      >
                                                        <Edit className="h-3.5 w-3.5" />
                                                      </button>
                                                      <button
                                                        onClick={() => handleDeleteBillItem(item._id)}
                                                        className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-500"
                                                        title="Delete item"
                                                      >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                      </button>
                                                    </>
                                                  )}
                                                </div>
                                              ) : (
                                                <span className="text-[10px] text-slate-400 italic font-semibold">Locked</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Actions, Billing Summary and Payments */}
                  <div className="space-y-6">
                    {/* Billing Summary Step 7 */}
                    <Card className="space-y-4 border-t-4 border-t-navy-700 bg-navy-50/50 shadow-md">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <CreditCard className="h-4.5 w-4.5 text-navy-600" /> Billing Summary
                      </h3>
                      <div className="space-y-2 text-xs border-b border-slate-100 pb-3">
                        <div className="flex justify-between text-slate-550">
                          <span>Gross Inpatient Bill (₹):</span>
                          <span className="font-semibold text-slate-800">{formatINR(gross)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-550 gap-2">
                          <div className="flex items-center gap-1">
                            <span>GST Tax Rate (%):</span>
                            {ipBillData.bill.status === "Draft" ? (
                              <input
                                type="number"
                                value={taxRateVal}
                                onChange={(e) => setTaxRateVal(Number(e.target.value))}
                                className="w-12 rounded border text-center p-0.5 text-[10px]"
                                min="0"
                                max="100"
                              />
                            ) : (
                              <span className="font-bold text-slate-800">{ipBillData.bill.taxRate}%</span>
                            )}
                          </div>
                          <span className="font-semibold text-slate-800">+{formatINR(grossTax)}</span>
                        </div>
                        <div className="flex justify-between text-red-650">
                          <span>Total Discount Benefit:</span>
                          <span className="font-bold">-{formatINR(discountTotal)}</span>
                        </div>
                        {paymentMode !== "Cash" && (
                          <div className="flex justify-between text-emerald-700 font-medium">
                            <span>Insurance / TPA Split:</span>
                            <span>-{formatINR(insuranceTotal)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-800 border-t border-slate-200/50 pt-2 font-bold text-sm">
                          <span>Grand Total Bill:</span>
                          <span className="text-slate-900">{formatINR(grandTotal)}</span>
                        </div>
                        <div className="flex justify-between text-blue-700 font-medium pt-1">
                          <span>Advance Paid (INR):</span>
                          <span>{formatINR(advance)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Outstanding Due</span>
                          <span className={`text-lg font-black font-mono ${outstanding > 1 ? "text-red-600" : "text-emerald-700"}`}>
                            {formatINR(outstanding)}
                          </span>
                        </div>
                        {ipBillData.bill.status === "Generated" && (
                          <Button
                            onClick={() => setShowIPPaymentModal(true)}
                            className="bg-navy-600 hover:bg-navy-700 text-white text-[10px] py-1.5 font-bold"
                          >
                            Receive Payment
                          </Button>
                        )}
                      </div>
                    </Card>

                    {/* Step 8: Discounts Configuration Form */}
                    {ipBillData.bill.status === "Draft" && (
                      <Card className="space-y-4 bg-white">
                        <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                          Discounts Split
                        </h3>
                        <div className="space-y-3">
                          <SelectField
                            label="Discount Mode"
                            value={discountType}
                            onChange={(e: any) => setDiscountType(e.target.value)}
                          >
                            <option value="fixed">Fixed INR Amount (₹)</option>
                            <option value="percentage">Percentage (%)</option>
                          </SelectField>
                          <div className="grid grid-cols-3 gap-2">
                            <InputField label="Hospital" type="number" value={hospitalDiscount || ""} onChange={(e) => setHospitalDiscount(Number(e.target.value))} />
                            <InputField label="Doctor" type="number" value={doctorDiscount || ""} onChange={(e) => setDoctorDiscount(Number(e.target.value))} />
                            <InputField label="Management" type="number" value={managementDiscount || ""} onChange={(e) => setManagementDiscount(Number(e.target.value))} />
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Insurance splits configuration form */}
                    {ipBillData.bill.status === "Draft" && (
                      <Card className="space-y-4 bg-white">
                        <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                          Insurance / TPA Split
                        </h3>
                        <div className="space-y-3">
                          <SelectField
                            label="Insurance Split Mode"
                            value={paymentMode}
                            onChange={(e: any) => setPaymentMode(e.target.value)}
                          >
                            <option value="Cash">Cash / Self-Pay</option>
                            <option value="Insurance">Insurance Policy</option>
                            <option value="Corporate">Corporate Sponsorship</option>
                            <option value="TPA">Third Party Administrator (TPA)</option>
                          </SelectField>
                          {paymentMode !== "Cash" && (
                            <div className="space-y-2 border-t pt-2 text-xs">
                              <InputField label="Claim Amount (₹)" type="number" value={claimAmount || ""} onChange={(e) => setClaimAmount(Number(e.target.value))} />
                              <InputField label="Approved Amount (₹)" type="number" value={approvedAmount || ""} onChange={(e) => setApprovedAmount(Number(e.target.value))} />
                              <InputField label="Co-Pay / Patient Share (₹)" type="number" value={patientShare || ""} onChange={(e) => setPatientShare(Number(e.target.value))} />
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Step 11: Discharge Block Dues Warning */}
                    {outstanding > 1 && ipBillData.bill.status === "Generated" && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2 text-xs text-red-700">
                        <div className="flex items-center gap-1.5 font-bold text-red-800">
                          <AlertTriangle className="h-4.5 w-4.5" />
                          <span>Discharge Blocked</span>
                        </div>
                        <p className="leading-relaxed">
                          Pending dues must be cleared before discharge. Outstanding balance of {formatINR(outstanding)} remaining.
                        </p>
                      </div>
                    )}

                    {outstanding <= 1 && ipBillData.bill.status === "Generated" && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-xs flex items-start gap-2 text-green-700">
                        <CheckCircle className="h-4.5 w-4.5 shrink-0 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-bold text-green-800">Dues Settled</p>
                          <p className="mt-0.5 leading-snug">Patient is cleared for discharge validation once payment is locked.</p>
                        </div>
                      </div>
                    )}

                    {/* Step 8: Locked generated invoices actions */}
                    {ipBillData.bill.status === "Draft" ? (
                      <Button
                        onClick={handleGenerateInvoice}
                        className="w-full py-2.5 font-black text-xs uppercase bg-navy-700 hover:bg-navy-800 text-white rounded-lg transition-all"
                        disabled={generateInvoiceMutation.isPending}
                      >
                        {generateInvoiceMutation.isPending ? "Generating Invoice..." : "Generate Final Bill"}
                      </Button>
                    ) : (
                      <div className="p-3 bg-slate-50 border rounded-lg text-center text-xs text-slate-500 font-bold uppercase tracking-wide">
                        🔐 Bill locked - Status: {ipBillData.bill.status}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Process Inpatient Payment Transaction */}
      <Modal
        title="Receive Inpatient Payment"
        isOpen={showIPPaymentModal}
        onClose={() => setShowIPPaymentModal(false)}
      >
        <form onSubmit={handlePostIPPayment} className="space-y-4">
          <InputField
            label="Transaction Amount (₹)"
            type="number"
            value={ipPayAmount || ""}
            onChange={(e) => setIPPayAmount(Number(e.target.value))}
            min="1"
            required
          />

          <SelectField
            label="Payment Mode"
            value={ipPayMethod}
            onChange={(e: any) => setIPPayMethod(e.target.value)}
          >
            <option value="UPI">UPI / QR Scan</option>
            <option value="Cash">Cash Handover</option>
            <option value="Card">Credit/Debit Card Terminal</option>
            <option value="Cheque">Physical Cheque</option>
            <option value="Insurance">Insurance / TPA Split</option>
            <option value="Mixed">Mixed Payment</option>
          </SelectField>

          {ipPayMethod === "Mixed" && (
            <div className="space-y-2 border-t pt-2 text-xs">
              <InputField label="UPI Split (₹)" type="number" value={ipUpiAmt || ""} onChange={(e) => setIpUpiAmt(Number(e.target.value))} />
              <InputField label="Cash Split (₹)" type="number" value={ipCashAmt || ""} onChange={(e) => setIpCashAmt(Number(e.target.value))} />
              <InputField label="Card Split (₹)" type="number" value={ipCardAmt || ""} onChange={(e) => setIpCardAmt(Number(e.target.value))} />
              <InputField label="Cheque Split (₹)" type="number" value={ipChequeAmt || ""} onChange={(e) => setIpChequeAmt(Number(e.target.value))} />
              <InputField label="Insurance Split (₹)" type="number" value={ipInsAmt || ""} onChange={(e) => setIpInsAmt(Number(e.target.value))} />
            </div>
          )}

          <InputField
            label="Reference ID / Transaction Number"
            value={ipPayTxId}
            onChange={(e) => setIPPayTxId(e.target.value)}
            placeholder="e.g. Bank trace, cheque number..."
          />

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" type="button" onClick={() => setShowIPPaymentModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={postPaymentMutation.isPending}>
              {postPaymentMutation.isPending ? "Processing Payment..." : "Process payment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Printable Inpatient Receipt Details */}
      <Modal
        title="Printable Inpatient Receipt"
        isOpen={showIPReceiptModal}
        onClose={() => setShowIPReceiptModal(false)}
      >
        {receiptDetails && (
          <div className="space-y-6">
            <div id="receipt-print-area" className="space-y-4">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-navy-700">HMS Hospital Network</h3>
                  <p className="text-[10px] text-slate-400">Inpatient Payments Desk</p>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-bold text-slate-800">RECEIPT</h4>
                  <p className="text-[10px] font-mono text-slate-400">Receipt No: {receiptDetails.receiptNumber}</p>
                  <p className="text-[10px] text-slate-400">Date: {new Date(receiptDetails.paymentDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-b pb-3">
                <div>
                  <span className="text-slate-400 block font-semibold">Patient Name:</span>
                  <span className="font-bold text-slate-750">{receiptDetails.bill?.patient?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">UHID / Bill No:</span>
                  <span className="font-bold text-slate-750 font-mono">{receiptDetails.bill?.patient?.uhid} / {receiptDetails.bill?.billNumber}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-650">
                  <span>Collected By:</span>
                  <span>{receiptDetails.collectedBy?.name || "Cashier"}</span>
                </div>
                <div className="flex justify-between text-slate-650">
                  <span>Payment Mode:</span>
                  <span className="font-bold text-slate-750">{receiptDetails.paymentMode}</span>
                </div>
                {receiptDetails.payment?.transactionId && (
                  <div className="flex justify-between text-slate-650">
                    <span>Transaction ID:</span>
                    <span className="font-mono text-slate-750">{receiptDetails.payment.transactionId}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5 text-sm font-bold text-slate-800">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-700">{formatINR(receiptDetails.amount)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="secondary" onClick={() => setShowIPReceiptModal(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
