import { useState, useEffect } from "react";
import {
  FileWarning,
  Search,
  Check,
  X,
  Eye,
  ShieldAlert,
  TrendingUp,
  IndianRupee,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";

interface Claim {
  _id: string;
  patientName: string;
  patientPhone: string;
  insuranceProvider: string;
  policyNumber: string;
  invoiceId: string;
  claimAmount: number;
  approvedAmount?: number;
  status: "Pending Verification" | "Approved" | "Rejected" | "Settled";
  reimbursementStatus?: string;
  notes?: string;
  submittedAt: string;
}

const STATUS_TONE = {
  "Pending Verification": "warning",
  "Approved": "info",
  "Settled": "success",
  "Rejected": "danger"
} as const;

export function AccountantClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Modals state
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Form inputs for verification
  const [actionStatus, setActionStatus] = useState<"Approved" | "Rejected">("Approved");
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClaims = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get<{ status: string; data: Claim[] }>("/accountant/claims");
      setClaims(res.data.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? err.message ?? "Failed to fetch claims.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleOpenVerify = (claim: Claim) => {
    setSelectedClaim(claim);
    setApprovedAmount(claim.claimAmount);
    setActionStatus("Approved");
    setNotes("");
    setIsVerifyOpen(true);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;

    setIsSubmitting(true);
    try {
      await api.post(`/accountant/claims/${selectedClaim._id}/verify`, {
        status: actionStatus,
        approvedAmount: actionStatus === "Approved" ? approvedAmount : 0,
        notes
      });
      setIsVerifyOpen(false);
      setSelectedClaim(null);
      fetchClaims();
    } catch (err: any) {
      alert(err.response?.data?.message ?? err.message ?? "Failed to verify claim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettleClaim = async (claimId: string) => {
    if (!confirm("Are you sure you want to mark this claim as settled?")) return;
    try {
      await api.post(`/accountant/claims/${claimId}/settle`);
      fetchClaims();
    } catch (err: any) {
      alert(err.response?.data?.message ?? err.message ?? "Failed to settle claim.");
    }
  };

  // Metrics
  const pendingCount = claims.filter(c => c.status === "Pending Verification").length;
  const approvedTotal = claims.filter(c => c.status === "Approved").reduce((sum, c) => sum + (c.approvedAmount ?? 0), 0);
  const settledTotal = claims.filter(c => c.status === "Settled").reduce((sum, c) => sum + (c.approvedAmount ?? 0), 0);

  // Filters
  const filteredClaims = claims.filter((claim) => {
    const matchesSearch = claim.patientName.toLowerCase().includes(search.toLowerCase()) ||
                          claim._id.toLowerCase().includes(search.toLowerCase()) ||
                          claim.policyNumber.toLowerCase().includes(search.toLowerCase());
    
    if (filterStatus === "All") return matchesSearch;
    return matchesSearch && claim.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insurance Claims Management</h1>
          <p className="text-sm text-slate-500 font-medium">Verify claim requests, manage approvals, and track settlements.</p>
        </div>
        <button
          onClick={fetchClaims}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-650 hover:bg-slate-50 transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Insurance Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard 
          label="Claims Pending Verification" 
          value={`${pendingCount} Claims`} 
          icon={<ShieldAlert className="h-5 w-5" />} 
        />
        <KpiCard 
          label="Approved (Pre-settled)" 
          value={`₹${approvedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} 
          icon={<TrendingUp className="h-5 w-5" />} 
        />
        <KpiCard 
          label="Total Settled Reimbursements" 
          value={`₹${settledTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} 
          icon={<IndianRupee className="h-5 w-5" />} 
          emphasis 
        />
      </div>

      {/* Filters & search */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {["All", "Pending Verification", "Approved", "Settled", "Rejected"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filterStatus === status ? "bg-navy-55 text-navy-700 font-bold" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Claims List Table */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by Patient, Claim ID or Policy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 mb-4 text-sm">
            <AlertCircle className="h-5 w-5" />
            {errorMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[850px]">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Claim ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Insurance Provider</th>
                <th className="px-4 py-3">Claim Amount</th>
                <th className="px-4 py-3">Approved Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-navy-550" />
                    Loading insurance claims...
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No claim records found.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim._id} className="hover:bg-slate-50 text-slate-700">
                    <td className="px-4 py-3 font-mono text-xs text-slate-650 font-semibold whitespace-nowrap">
                      {claim._id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{claim.patientName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{claim.patientPhone}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-slate-800 text-xs font-medium">{claim.insuranceProvider}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Policy: {claim.policyNumber}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                      ₹{claim.claimAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700 whitespace-nowrap">
                      ₹{claim.approvedAmount ? claim.approvedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge tone={STATUS_TONE[claim.status]} className="w-36">
                        {claim.status}
                      </Badge>
                      {claim.reimbursementStatus && (
                        <div className="text-[9px] text-slate-400 italic mt-0.5">{claim.reimbursementStatus}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(claim.submittedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {claim.status === "Pending Verification" && (
                        <button
                          onClick={() => handleOpenVerify(claim)}
                          className="inline-flex items-center gap-0.5 rounded bg-navy-700 hover:bg-navy-800 text-white px-2 py-1 text-xs font-semibold shadow"
                        >
                          Verify/Approve
                        </button>
                      )}
                      {claim.status === "Approved" && (
                        <button
                          onClick={() => handleSettleClaim(claim._id)}
                          className="inline-flex items-center gap-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-xs font-semibold shadow"
                        >
                          Mark Settled
                        </button>
                      )}
                      {claim.notes && (
                        <button
                          onClick={() => alert(`Verification Notes:\n${claim.notes}`)}
                          className="rounded-lg p-1 text-slate-450 hover:bg-slate-50 font-semibold text-xs border border-slate-200"
                        >
                          Notes
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Verify / Approve Claim */}
      <Modal
        title="Verify Insurance Claim Request"
        isOpen={isVerifyOpen}
        onClose={() => {
          setIsVerifyOpen(false);
          setSelectedClaim(null);
        }}
      >
        {selectedClaim && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Patient Name:</span>
                <span className="font-semibold text-slate-800">{selectedClaim.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span>Insurance Provider:</span>
                <span className="font-semibold text-slate-800">{selectedClaim.insuranceProvider}</span>
              </div>
              <div className="flex justify-between">
                <span>Requested Claim Amount:</span>
                <span className="font-bold text-slate-900">₹{selectedClaim.claimAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <SelectField
              label="Action Status"
              value={actionStatus}
              onChange={(e) => setActionStatus(e.target.value as any)}
              required
            >
              <option value="Approved">Approve Claim (Full/Partial)</option>
              <option value="Rejected">Reject Claim Request</option>
            </SelectField>

            {actionStatus === "Approved" && (
              <InputField
                label="Approved Reimbursement Amount (₹)"
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(parseFloat(e.target.value) || 0)}
                required
                min={1}
                max={selectedClaim.claimAmount}
              />
            )}

            <TextareaField
              label="Verification Notes / Exclusions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={actionStatus === "Rejected"}
              rows={3}
              placeholder="e.g. Approved under Star Comprehensive policy cover rules."
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsVerifyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Decision"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
