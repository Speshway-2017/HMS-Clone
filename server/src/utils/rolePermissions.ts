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
  doctor: {
    label: "Doctor",
    description: "Provides medical care, creates prescriptions, manages IP/OP records, and orders lab tests.",
    permissions: ["Patient Consultation", "Electronic Prescriptions", "Clinical Notes", "IP/OP Management"],
  },
  receptionist: {
    label: "Receptionist",
    description: "Manages patient onboarding, schedules appointments, and handles clinic front desk operations.",
    permissions: ["Patient Registration", "Appointment Scheduling", "Visitor Log", "Billing Intake", "Patient Management", "Appointment Booking", "Billing Operations", "Queue Management"],
  },
};

