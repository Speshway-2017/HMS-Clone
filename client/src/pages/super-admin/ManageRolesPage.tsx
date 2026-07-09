import { ShieldCheck, Users2, KeyRound } from "lucide-react";
import { useRoles } from "../../features/roles";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { KpiCard } from "../../components/ui/KpiCard";

export function ManageRolesPage() {
  const { data: roles, isLoading } = useRoles();

  const totalPermissions = roles ? new Set(roles.flatMap((r) => r.permissions)).size : 0;
  const totalAssigned = roles?.reduce((sum, r) => sum + r.assignedUsers, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Settings &gt; Manage Roles</p>
        <h1 className="text-2xl font-bold text-slate-900">System Roles &amp; Permissions</h1>
        <p className="text-sm text-slate-500">Configure and review access levels for your healthcare staff.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Roles" value={roles?.length ?? 0} icon={<ShieldCheck className="h-5 w-5" />} />
        <KpiCard label="Assigned Users" value={totalAssigned} icon={<Users2 className="h-5 w-5" />} />
        <KpiCard label="Distinct Permissions" value={totalPermissions} icon={<KeyRound className="h-5 w-5" />} />
      </div>

      {isLoading && <p className="text-slate-400">Loading...</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {roles?.map((role) => (
          <Card key={role.role}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{role.label}</h3>
              <Badge tone="info">{role.assignedUsers} users assigned</Badge>
            </div>
            <p className="mb-4 text-sm text-slate-500">{role.description}</p>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Core Permissions</p>
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((p) => (
                <Badge key={p} tone="neutral">
                  {p}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
