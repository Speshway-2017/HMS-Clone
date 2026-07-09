import {
  LayoutDashboard,
  Building2,
  Network,
  FolderTree,
  ShieldCheck,
  UserCog,
  BarChart3,
  FileText,
  Stethoscope,
  Users,
  CalendarClock,
  UserCheck,
  Wallet,
  Boxes,
  Receipt,
  CreditCard,
  FileWarning,
  Banknote,
  TrendingUp,
  ClipboardList,
  History,
  type LucideIcon,
} from "lucide-react";
import { Role } from "../types/auth";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  super_admin: [
    { label: "Dashboard", path: "/super-admin", icon: LayoutDashboard },
    { label: "Hospitals", path: "/super-admin/hospitals", icon: Building2 },
    { label: "Branches", path: "/super-admin/branches", icon: Network },
    { label: "Departments", path: "/super-admin/departments", icon: FolderTree },
    { label: "Admins", path: "/super-admin/admins", icon: UserCog },
    { label: "Manage Roles", path: "/super-admin/roles", icon: ShieldCheck },
    { label: "Analytics", path: "/super-admin/analytics", icon: BarChart3 },
    { label: "Reports", path: "/super-admin/reports", icon: FileText },
  ],
  hospital_admin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Doctors", path: "/admin/doctors", icon: Stethoscope },
    { label: "Patients", path: "/admin/patients", icon: Users },
    { label: "Appointments", path: "/admin/appointments", icon: CalendarClock },
    { label: "Staff", path: "/admin/staff", icon: UserCheck },
    { label: "Departments", path: "/admin/departments", icon: FolderTree },
    { label: "Finance", path: "/admin/finance", icon: Wallet },
    { label: "Inventory", path: "/admin/inventory", icon: Boxes },
    { label: "Roles", path: "/admin/roles", icon: ShieldCheck },
  ],
  accountant: [
    { label: "Dashboard", path: "/accountant", icon: LayoutDashboard },
    { label: "Billing", path: "/accountant/billing", icon: Receipt },
    { label: "Payments", path: "/accountant/payments", icon: CreditCard },
    { label: "Insurance Claims", path: "/accountant/claims", icon: FileWarning },
    { label: "Payroll", path: "/accountant/payroll", icon: Banknote },
    { label: "Expenses", path: "/accountant/expenses", icon: ClipboardList },
    { label: "Financial Analytics", path: "/accountant/analytics", icon: TrendingUp },
    { label: "Audit Logs", path: "/accountant/audit-logs", icon: History },
  ],
};
