import { Role } from "./roles";

export const ROLE_PERMISSIONS: Record<Role, { label: string; description: string; permissions: string[] }> = {
  super_admin: {
    label: "Super Admin",
    description: "Full network oversight across every hospital, branch, and admin account.",
    permissions: ["Full System Access", "Manage Institutions", "Financial Auditing", "Security Override"],
  },
  hospital_admin: {
    label: "Hospital Admin",
    description: "Runs day-to-day operations for a single assigned hospital.",
    permissions: ["Manage Staff", "View Hospital Analytics", "Manage Departments", "Inventory Control"],
  },
  accountant: {
    label: "Accountant",
    description: "Handles billing, payroll, claims, and financial reporting for an assigned hospital.",
    permissions: ["Billing Operations", "Payroll Processing", "Insurance Claims", "Financial Reports"],
  },
};
