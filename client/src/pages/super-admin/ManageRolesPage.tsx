import { ShieldCheck, Users2, KeyRound, Lock } from "lucide-react";
import { useRoles } from "../../features/roles";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { KpiCard } from "../../components/ui/KpiCard";

export function ManageRolesPage() {
  const { data: roles, isLoading } = useRoles();

  const totalPermissions = roles ? new Set(roles.flatMap((r) => r.permissions)).size : 0;
  const totalAssigned = roles?.reduce((sum, r) => sum + r.assignedUsers, 0) ?? 0;

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400">Settings &gt; Access Control</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">System Roles &amp; Permissions</h1>
          <p className="text-xs text-slate-500">Live role-based access control (RBAC) matrix for hospital clinical stations.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
          <Lock className="h-3.5 w-3.5 text-emerald-700" />
          <span>7 Core Canonical Roles</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Standard System Roles" value={roles?.length ?? 7} icon={<ShieldCheck className="h-4 w-4" />} />
        <KpiCard label="Total Assigned Users" value={totalAssigned} icon={<Users2 className="h-4 w-4" />} />
        <KpiCard label="Configured Permissions" value={totalPermissions} icon={<KeyRound className="h-4 w-4" />} />
      </div>

      {isLoading && (
        <div className="py-8 text-center text-xs text-slate-400 font-medium">
          Loading system roles from database...
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {roles?.map((role) => (
          <Card key={role.role} className="p-4 border-slate-200 hover:border-emerald-300 transition-colors">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">{role.label}</h3>
                <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {role.role}
                </span>
              </div>
              <Badge tone="info">{role.assignedUsers} users assigned</Badge>
            </div>
            
            <p className="mb-3 text-xs text-slate-500 leading-relaxed">{role.description}</p>
            
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Core Permissions</p>
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {p}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
