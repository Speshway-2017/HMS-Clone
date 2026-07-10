import { Link } from "react-router-dom";
import { ShieldCheck, Users2, KeyRound, Plus, Pencil, Trash2 } from "lucide-react";
import { useRoles, useDeleteRole } from "../../features/roles";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { KpiCard } from "../../components/ui/KpiCard";
import { Button } from "../../components/ui/Button";

export function ManageRolesPage() {
  const { data: roles, isLoading } = useRoles();
  const { user } = useAuth();
  const deleteRole = useDeleteRole();

  const totalPermissions = roles ? new Set(roles.flatMap((r) => r.permissions)).size : 0;
  const totalAssigned = roles?.reduce((sum, r) => sum + r.assignedUsers, 0) ?? 0;

  const basePath = user?.role === "super_admin" ? "/super-admin" : "/admin";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">Settings &gt; Manage Roles</p>
          <h1 className="text-2xl font-bold text-slate-900">System Roles &amp; Permissions</h1>
          <p className="text-sm text-slate-500">Configure and review access levels for your healthcare staff.</p>
        </div>
        <Link to={`${basePath}/roles/new`}>
          <Button variant="primary">
            <Plus className="h-4 w-4" /> Add Role
          </Button>
        </Link>
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
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-800">{role.label}</h3>
                {role.isCustom && <Badge tone="warning">Custom</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="info">{role.assignedUsers} users assigned</Badge>
                {role.isCustom && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Link to={`${basePath}/roles/${role._id}/edit`} className="hover:text-navy-700" title="Edit Role">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => {
                        if (role.assignedUsers > 0) {
                          alert("Cannot delete this role because users are currently assigned to it.");
                          return;
                        }
                        if (confirm(`Delete role "${role.label}"? This cannot be undone.`)) {
                          deleteRole.mutate(role._id!);
                        }
                      }}
                      className="hover:text-red-600 transition-colors"
                      title="Delete Role"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
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
