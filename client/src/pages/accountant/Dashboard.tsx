import { Receipt, CreditCard, FileWarning } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";

export function AccountantDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Overview</h1>
        <p className="text-sm text-slate-500">Billing, payments, and claims for your hospital.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Outstanding Invoices" value="86" icon={<Receipt className="h-5 w-5" />} emphasis />
        <KpiCard label="Payments This Month" value="$342,900" icon={<CreditCard className="h-5 w-5" />} />
        <KpiCard label="Pending Claims" value="14" icon={<FileWarning className="h-5 w-5" />} />
      </div>

      <Card>
        <p className="text-sm text-slate-500">
          This is the Accountant dashboard shell. Billing/payroll/claims/expense screens are built out in the next
          phase.
        </p>
      </Card>
    </div>
  );
}
