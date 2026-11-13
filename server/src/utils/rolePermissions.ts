import { Role } from "./roles";

export const ROLE_PERMISSIONS: Record<Role, { label: string; description: string; permissions: string[] }> = {
  super_admin: {
    label: "Super Admin",
    description: "Full network oversight across every hospital, branch, CMS, public pages, and admin accounts.",
    permissions: ["Full System Access", "Manage Institutions", "Website CMS Control", "Public Enquiries", "Security Override"],
  },
  hospital_admin: {
    label: "Hospital Admin",
    description: "Runs day-to-day operations, departments, clinical workforce, and facilities for an assigned hospital.",
    permissions: ["Manage Staff", "View Hospital Analytics", "Manage Departments", "Inventory Control", "Bed & Ward Management"],
  },
  admin: {
    label: "Hospital Admin",
    description: "Runs day-to-day operations, departments, clinical workforce, and facilities for an assigned hospital.",
    permissions: ["Manage Staff", "View Hospital Analytics", "Manage Departments", "Inventory Control", "Bed & Ward Management"],
  },
  doctor: {
    label: "Doctor",
    description: "Provides medical care, creates prescriptions, manages IP/OP records, and orders lab tests.",
    permissions: ["Patient Consultation", "Electronic Prescriptions", "Clinical Notes", "IP/OP Management"],
  },
  receptionist: {
    label: "Receptionist",
    description: "Manages patient onboarding, schedules appointments, and handles clinic front desk operations.",
    permissions: ["Patient Registration", "Appointment Scheduling", "Visitor Log", "Billing Intake", "Patient Management", "Queue Management"],
  },
  pharmacist: {
    label: "Pharmacist",
    description: "Verifies prescriptions, dispenses medicines, manages inventory, and handles pharmacy billing.",
    permissions: ["Verify Prescriptions", "Dispense Medicines", "Inventory Management", "Pharmacy Billing"],
  },
  staff: {
    label: "Clinical Staff",
    description: "Provides direct patient care, records vital signs, administers medications, handles shift handovers, and manages ward workflows.",
    permissions: ["Record Vitals", "Administer Medications", "Ward Management", "Patient Care", "Shift Handover", "Nursing Notes"],
  },
  nurse: {
    label: "Clinical Staff",
    description: "Provides direct patient care, records vital signs, administers medications, handles shift handovers, and manages ward workflows.",
    permissions: ["Record Vitals", "Administer Medications", "Ward Management", "Patient Care", "Shift Handover", "Nursing Notes"],
  },
  patient: {
    label: "Patient",
    description: "Accesses own medical records, prescriptions, billing summaries, and appointments scheduler.",
    permissions: ["View Personal Records", "View Prescriptions", "Book Appointments", "View Billing"],
  },
  accountant: {
    label: "Accountant (Consolidated)",
    description: "Legacy financial management role; consolidated under Hospital Admin.",
    permissions: ["Billing Operations", "Financial Reports"],
  },
  laboratory: {
    label: "Laboratory (Consolidated)",
    description: "Legacy laboratory role; diagnostic processing managed via doctor orders.",
    permissions: ["Manage Test Requests", "Report Delivery"],
  },
};
