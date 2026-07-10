import { useState, useEffect } from "react";
import { 
  FileWarning, 
  Search, 
  Check, 
  X, 
  Eye, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

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
  
  // Modals state
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Form inputs for verification
  const [actionStatus, setActionStatus] = useState<"Approved" | "Rejected">("Approved");
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Check LocalStorage or seed default claims
    const saved = localStorage.getItem("hms_claims");
    if (saved) {
      setClaims(JSON.parse(saved));
    } else {
      const defaultClaims: Claim[] = [
        {
          _id: "CLM-90218",
          patientName: "Aarav Sharma",
          patientPhone: "9876543210",
          insuranceProvider: "Star Health Insurance",
          policyNumber: "POL-STAR-88129",
          invoiceId: "INV-29910",
          claimAmount: 85000,
          status: "Pending Verification",
          submittedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          _id: "CLM-90219",
          patientName: "Priya Patel",
          patientPhone: "9812739281",
          insuranceProvider: "HDFC ERGO",
          policyNumber: "POL-HDFC-99120",
          invoiceId: "INV-29912",
          claimAmount: 142000,
          status: "Pending Verification",
          submittedAt: new Date(Date.now() - 2 * 86400000).toISOString()
        },
        {
          _id: "CLM-90101",
          patientName: "Rohan Das",
          patientPhone: "8712398412",
          insuranceProvider: "ICICI Lombard",
          policyNumber: "POL-ICICI-10219",
          invoiceId: "INV-28410",
          claimAmount: 43000,
          approvedAmount: 43000,
          status: "Settled",
          submittedAt: new Date(Date.now() - 10 * 86400000).toISOString()
        },
        {
          _id: "CLM-90052",
          patientName: "Neha Nair",
          patientPhone: "7012391202",
          insuranceProvider: "Max Bupa",
          policyNumber: "POL-MAX-30219",
          invoiceId: "INV-28102",
          claimAmount: 65000,
          status: "Rejected",
          notes: "Pre-existing health condition exclusions apply.",
          submittedAt: new Date(Date.now() - 12 * 86400000).toISOString()
        }
      ];
      setClaims(defaultClaims);
      localStorage.setItem("hms_claims", JSON.stringify(defaultClaims));
    }
  }, []);

  const saveClaims = (newClaims: Claim[]) => {
    setClaims(newClaims);
    localStorage.setItem("hms_claims", JSON.stringify(newClaims));
  };

  const handleOpenVerify = (claim: Claim) => {
    setSelectedClaim(claim);
    setApprovedAmount(claim.claimAmount);
    setActionStatus("Approved");
    setNotes("");
    setIsVerifyOpen(true);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;

    const updatedClaims = claims.map((c) => {
      if (c._id === selectedClaim._id) {
        return {
          ...c,
          status: actionStatus,
          approvedAmount: actionStatus === "Approved" ? approvedAmount : 0,
          notes,
          reimbursementStatus: actionStatus === "Approved" ? "Processing Reimbursement" : undefined
        };
      }
      return c;
    });

    saveClaims(updatedClaims);
    setIsVerifyOpen(false);
    setSelectedClaim(null);
  };

  const handleSettleClaim = (claimId: string) => {
    const updatedClaims = claims.map((c) => {
      if (c._id === claimId) {
        return {
          ...c,
          status: "Settled" as const,
          reimbursementStatus: "Disbursed"
        };
      }
      return c;
    });
    saveClaims(updatedClaims);
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
          value={`₹${approvedTotal.toLocaleString("en-IN")}`} 
          icon={<TrendingUp className="h-5 w-5" />} 
        />
        <KpiCard 
          label="Total Settled Reimbursements" 
          value={`₹${settledTotal.toLocaleString("en-IN")}`} 
          icon={<DollarSign className="h-5 w-5" />} 
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
              filterStatus === status ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:bg-slate-55"
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Claim ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Insurance Provider</th>
                <th className="px-4 py-3">Claim Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No insurance claims found.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim._id} className="hover:bg-slate-50 text-slate-700">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {claim._id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{claim.patientName}</span>
                      <span className="ml-1.5 text-xs text-slate-500">({claim.patientPhone})</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{claim.insuranceProvider}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-850 whitespace-nowrap">
                      ₹{claim.claimAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge tone={STATUS_TONE[claim.status]} className="w-36">{claim.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {claim.status === "Pending Verification" && (
                        <button
                          onClick={() => handleOpenVerify(claim)}
                          className="inline-flex items-center gap-1 rounded bg-navy-700 hover:bg-navy-800 text-white px-2 py-1 text-xs font-semibold shadow"
                        >
                          Verify Claim
                        </button>
                      )}
                      {claim.status === "Approved" && (
                        <button
                          onClick={() => handleSettleClaim(claim._id)}
                          className="inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-xs font-semibold shadow"
                        >
                          Mark Settled
                        </button>
                      )}
                      {(claim.status === "Settled" || claim.status === "Rejected") && (
                        <button
                          onClick={() => {
                            setSelectedClaim(claim);
                            setIsVerifyOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-xs font-semibold border"
                        >
                          View Details
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

      {/* Modal: Claim Verification & Action */}
      <Modal
        title={selectedClaim?.status !== "Pending Verification" ? "Claim details" : "Verify Claim request"}
        isOpen={isVerifyOpen}
        onClose={() => {
          setIsVerifyOpen(false);
          setSelectedClaim(null);
        }}
      >
        {selectedClaim && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 border">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Claim ID</span>
                <span className="font-semibold text-slate-800">{selectedClaim._id}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Patient</span>
                <span className="font-semibold text-slate-800">{selectedClaim.patientName}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Invoice Ref</span>
                <span className="font-semibold text-slate-800 font-mono">{selectedClaim.invoiceId}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Provider</span>
                <span className="font-semibold text-slate-800">{selectedClaim.insuranceProvider}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Policy No</span>
                <span className="font-semibold text-slate-800 font-mono">{selectedClaim.policyNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billed Invoice Amount</span>
                <span className="font-bold text-slate-800">₹{selectedClaim.claimAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {selectedClaim.status === "Pending Verification" ? (
              <>
                <SelectField
                  label="Claim decision"
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
                    onChange={(e) => setApprovedAmount(Number(e.target.value))}
                    max={selectedClaim.claimAmount}
                    min="1"
                    required
                  />
                )}

                <TextareaField
                  label="Internal verification notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., star health pre-authorization approved, document copy uploaded."
                  required
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" type="button" onClick={() => { setIsVerifyOpen(false); setSelectedClaim(null); }}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Save Verification
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-4 text-xs space-y-2">
                  <div className="flex items-center gap-1 font-semibold text-slate-800 mb-1">
                    {selectedClaim.status === "Approved" || selectedClaim.status === "Settled" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-650" />
                    )}
                    Claim Decision: <span className="capitalize">{selectedClaim.status}</span>
                  </div>
                  {selectedClaim.approvedAmount && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Approved Reimbursement:</span>
                      <span className="font-bold text-slate-800">₹{selectedClaim.approvedAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {selectedClaim.notes && (
                    <div>
                      <span className="text-slate-500 block mb-1">Assessor Notes:</span>
                      <p className="bg-slate-100 p-2 rounded text-slate-700 font-mono text-[11px]">{selectedClaim.notes}</p>
                    </div>
                  )}
                  {selectedClaim.reimbursementStatus && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reimbursement Status:</span>
                      <span className="font-semibold text-navy-700">{selectedClaim.reimbursementStatus}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="secondary" onClick={() => { setIsVerifyOpen(false); setSelectedClaim(null); }}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
