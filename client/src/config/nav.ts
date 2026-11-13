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
  ClipboardList,
  Settings,
  Scissors,
  Video,
  BedDouble,
  Activity,
  Pill,
  ClipboardCheck,
  Truck,
  User,
  Heart,
  ScanLine,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { Role } from "../types/auth";
import type { ComponentType } from "react";

export type LucideIcon = ComponentType<any>;

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  description?: string;
}

export interface NavDropdownItem {
  label: string;
  path: string;
  icon: LucideIcon;
  description?: string;
}

export type NavGroupItem =
  | {
      type: "link";
      label: string;
      path: string;
      icon: LucideIcon;
    }
  | {
      type: "dropdown";
      label: string;
      icon: LucideIcon;
      items: NavDropdownItem[];
    };

export const NAV_GROUPS_BY_ROLE: Record<Role, NavGroupItem[]> = {
  super_admin: [
    {
      type: "link",
      label: "Dashboard",
      path: "/super-admin",
      icon: LayoutDashboard,
    },
    {
      type: "dropdown",
      label: "Network & Facilities",
      icon: Building2,
      items: [
        { label: "Hospitals", path: "/super-admin/hospitals", icon: Building2, description: "Hospital directory & institutions" },
        { label: "Branches", path: "/super-admin/branches", icon: Network, description: "Branch clinic locations" },
        { label: "Departments", path: "/super-admin/departments", icon: FolderTree, description: "Clinical & medical divisions" },
      ],
    },
    {
      type: "dropdown",
      label: "Administration & Roles",
      icon: ShieldCheck,
      items: [
        { label: "Admins", path: "/super-admin/admins", icon: UserCog, description: "Hospital administrator accounts" },
        { label: "Manage Roles", path: "/super-admin/roles", icon: ShieldCheck, description: "System RBAC permission matrix" },
      ],
    },
    {
      type: "dropdown",
      label: "Analytics & Reports",
      icon: BarChart3,
      items: [
        { label: "Analytics", path: "/super-admin/analytics", icon: BarChart3, description: "Enterprise metrics & utilization" },
        { label: "Reports", path: "/super-admin/reports", icon: FileText, description: "Audit logs & institutional exports" },
      ],
    },
    {
      type: "dropdown",
      label: "Website CMS",
      icon: Globe,
      items: [
        { label: "Website Content", path: "/super-admin/cms", icon: Globe, description: "Public hospital pages & hero" },
        { label: "Public Enquiries", path: "/super-admin/enquiries", icon: ClipboardList, description: "Visitor contact submissions" },
        { label: "Manage Blogs", path: "/super-admin/blogs", icon: FileText, description: "Medical articles & news updates" },
      ],
    },
  ],

  hospital_admin: [
    {
      type: "link",
      label: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
    },
    {
      type: "dropdown",
      label: "Medical Staff & Departments",
      icon: Stethoscope,
      items: [
        { label: "Doctors", path: "/admin/doctors", icon: Stethoscope, description: "Doctor directory & specialties" },
        { label: "Clinical Staff", path: "/admin/staff", icon: UserCheck, description: "Nurses & administrative staff" },
        { label: "Departments", path: "/admin/departments", icon: FolderTree, description: "Clinical departments & OPDs" },
      ],
    },
    {
      type: "dropdown",
      label: "Patients & Schedule",
      icon: Users,
      items: [
        { label: "Patients", path: "/admin/patients", icon: Users, description: "Patient master directory" },
        { label: "Appointments", path: "/admin/appointments", icon: CalendarClock, description: "Doctor appointment calendar" },
      ],
    },
    {
      type: "dropdown",
      label: "Operations & Assets",
      icon: Boxes,
      items: [
        { label: "Beds & Wards", path: "/admin/beds", icon: BedDouble, description: "Ward bed allocation & status" },
        { label: "Inventory", path: "/admin/inventory", icon: Boxes, description: "Medical consumables & pharmacy stock" },
        { label: "Revenue Analytics", path: "/admin/finance", icon: Wallet, description: "Hospital revenue & collections" },
      ],
    },
  ],

  admin: [
    {
      type: "link",
      label: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
    },
    {
      type: "dropdown",
      label: "Medical Staff & Departments",
      icon: Stethoscope,
      items: [
        { label: "Doctors", path: "/admin/doctors", icon: Stethoscope, description: "Doctor directory & specialties" },
        { label: "Clinical Staff", path: "/admin/staff", icon: UserCheck, description: "Nurses & administrative staff" },
        { label: "Departments", path: "/admin/departments", icon: FolderTree, description: "Clinical departments & OPDs" },
      ],
    },
    {
      type: "dropdown",
      label: "Patients & Schedule",
      icon: Users,
      items: [
        { label: "Patients", path: "/admin/patients", icon: Users, description: "Patient master directory" },
        { label: "Appointments", path: "/admin/appointments", icon: CalendarClock, description: "Doctor appointment calendar" },
      ],
    },
    {
      type: "dropdown",
      label: "Operations & Assets",
      icon: Boxes,
      items: [
        { label: "Beds & Wards", path: "/admin/beds", icon: BedDouble, description: "Ward bed allocation & status" },
        { label: "Inventory", path: "/admin/inventory", icon: Boxes, description: "Medical consumables & pharmacy stock" },
        { label: "Revenue Analytics", path: "/admin/finance", icon: Wallet, description: "Hospital revenue & collections" },
      ],
    },
  ],

  receptionist: [
    {
      type: "link",
      label: "Dashboard",
      path: "/receptionist",
      icon: LayoutDashboard,
    },
    {
      type: "dropdown",
      label: "Patient Desk & Queue",
      icon: Users,
      items: [
        { label: "Patient Directory", path: "/receptionist/patients", icon: Users, description: "Patient registration & UHID search" },
        { label: "Appointments", path: "/receptionist/appointments", icon: CalendarClock, description: "Booking calendar & appointment slots" },
        { label: "Live OP Queue", path: "/receptionist/queue", icon: ClipboardList, description: "Waitlist tokens & doctor calls" },
        { label: "Doctor Availability", path: "/receptionist/doctors", icon: Stethoscope, description: "Doctor duty roster & OPD status" },
      ],
    },
    {
      type: "dropdown",
      label: "Care Desk & Billing",
      icon: Wallet,
      items: [
        { label: "OP Consultations", path: "/receptionist/op", icon: UserCheck, description: "OP check-in & token workflow" },
        { label: "IP Admissions", path: "/receptionist/ip", icon: Building2, description: "Inpatient admission & bed check-in" },
        { label: "Frontdesk Billing", path: "/receptionist/billing", icon: Wallet, description: "Payments, invoices & cashier receipts" },
      ],
    },
    {
      type: "link",
      label: "Reports",
      path: "/receptionist/reports",
      icon: BarChart3,
    },
  ],

  doctor: [
    {
      type: "link",
      label: "Dashboard",
      path: "/doctor",
      icon: LayoutDashboard,
    },
    {
      type: "dropdown",
      label: "Clinical Care",
      icon: Activity,
      items: [
        { label: "OP Consultations", path: "/doctor/op-management", icon: Activity, description: "Live OPD queue & prescription charting" },
        { label: "Inpatient Rounds", path: "/doctor/ip-management", icon: BedDouble, description: "Admitted patient care & bed chart" },
        { label: "Patient Records", path: "/doctor/patient-records", icon: Users, description: "Medical history & lab investigations" },
      ],
    },
    {
      type: "dropdown",
      label: "Surgical & Telehealth",
      icon: Scissors,
      items: [
        { label: "Operation Theatre", path: "/doctor/ot", icon: Scissors, description: "Surgical schedule & OT notes" },
        { label: "Telemedicine", path: "/doctor/telemedicine", icon: Video, description: "Online video consultations" },
      ],
    },
    {
      type: "link",
      label: "Performance",
      path: "/doctor/performance",
      icon: BarChart3,
    },
  ],

  pharmacist: [
    {
      type: "link",
      label: "Dashboard",
      path: "/pharmacy",
      icon: LayoutDashboard,
    },
    {
      type: "dropdown",
      label: "Prescriptions & Dispensing",
      icon: Pill,
      items: [
        { label: "Prescriptions", path: "/pharmacy/prescriptions", icon: ClipboardCheck, description: "Doctor prescription verification" },
        { label: "Medicine Dispensing", path: "/pharmacy/dispensing", icon: Pill, description: "Fulfill & dispense medicines" },
      ],
    },
    {
      type: "dropdown",
      label: "Stock & Procurement",
      icon: Boxes,
      items: [
        { label: "Pharmacy Inventory", path: "/pharmacy/inventory", icon: Boxes, description: "Medicine stock & batch expiries" },
        { label: "Suppliers & Vendors", path: "/pharmacy/suppliers", icon: Truck, description: "Purchase orders & supplier ledger" },
      ],
    },
    {
      type: "dropdown",
      label: "Billing & Analytics",
      icon: Wallet,
      items: [
        { label: "Pharmacy POS Billing", path: "/pharmacy/billing", icon: Wallet, description: "Counter sales & pharmacy receipts" },
        { label: "Sales Analytics", path: "/pharmacy/analytics", icon: BarChart3, description: "Dispensing revenue & volume trends" },
      ],
    },
  ],

  staff: [
    {
      type: "link",
      label: "Dashboard",
      path: "/staff",
      icon: LayoutDashboard,
    },
    {
      type: "dropdown",
      label: "Inpatient Care",
      icon: Activity,
      items: [
        { label: "Assigned Patients", path: "/staff/patients", icon: Users, description: "Shift patient roster & bed list" },
        { label: "Medication Admin", path: "/staff/medications", icon: Pill, description: "Drug administration & MAR" },
        { label: "Vitals Monitoring", path: "/staff/vitals", icon: Activity, description: "Blood pressure, pulse, SpO2 & temp" },
        { label: "Nursing Notes", path: "/staff/notes", icon: FileText, description: "Clinical observation documentation" },
        { label: "Care Plans", path: "/staff/care-plans", icon: ClipboardCheck, description: "Patient recovery & nursing protocols" },
      ],
    },
    {
      type: "dropdown",
      label: "Ward Station & Handover",
      icon: BedDouble,
      items: [
        { label: "Ward & Beds", path: "/staff/wards", icon: BedDouble, description: "Ward capacity & bed assignments" },
        { label: "Task Delegation", path: "/staff/assign-task", icon: ClipboardCheck, description: "Clinical shift duty assignments" },
        { label: "Shift Handover", path: "/staff/shift-handover", icon: ClipboardList, description: "Nurse-to-nurse shift debrief" },
        { label: "Emergency Alerts", path: "/staff/alerts", icon: AlertTriangle, description: "Code alerts & rapid response notifications" },
      ],
    },
  ],

  nurse: [
    {
      type: "link",
      label: "Dashboard",
      path: "/staff",
      icon: LayoutDashboard,
    },
    {
      type: "dropdown",
      label: "Inpatient Care",
      icon: Activity,
      items: [
        { label: "Assigned Patients", path: "/staff/patients", icon: Users, description: "Shift patient roster & bed list" },
        { label: "Medication Admin", path: "/staff/medications", icon: Pill, description: "Drug administration & MAR" },
        { label: "Vitals Monitoring", path: "/staff/vitals", icon: Activity, description: "Blood pressure, pulse, SpO2 & temp" },
        { label: "Nursing Notes", path: "/staff/notes", icon: FileText, description: "Clinical observation documentation" },
        { label: "Care Plans", path: "/staff/care-plans", icon: ClipboardCheck, description: "Patient recovery & nursing protocols" },
      ],
    },
    {
      type: "dropdown",
      label: "Ward Station & Handover",
      icon: BedDouble,
      items: [
        { label: "Ward & Beds", path: "/staff/wards", icon: BedDouble, description: "Ward capacity & bed assignments" },
        { label: "Task Delegation", path: "/staff/assign-task", icon: ClipboardCheck, description: "Clinical shift duty assignments" },
        { label: "Shift Handover", path: "/staff/shift-handover", icon: ClipboardList, description: "Nurse-to-nurse shift debrief" },
        { label: "Emergency Alerts", path: "/staff/alerts", icon: AlertTriangle, description: "Code alerts & rapid response notifications" },
      ],
    },
  ],

  patient: [
    {
      type: "link",
      label: "Dashboard",
      path: "/patient",
      icon: LayoutDashboard,
    },
    {
      type: "dropdown",
      label: "Appointments & Care",
      icon: CalendarClock,
      items: [
        { label: "Book Appointment", path: "/patient/appointments", icon: CalendarClock, description: "Consultation slots with doctor" },
        { label: "Telehealth Video", path: "/patient/telehealth", icon: Video, description: "Online video consultations" },
      ],
    },
    {
      type: "dropdown",
      label: "My Health Records",
      icon: Heart,
      items: [
        { label: "Medical History", path: "/patient/history", icon: Heart, description: "Clinical profile & health history" },
        { label: "Prescriptions", path: "/patient/prescriptions", icon: Pill, description: "Active medication prescriptions" },
        { label: "Diagnostic Reports", path: "/patient/reports", icon: FileText, description: "Pathology & blood test reports" },
        { label: "Radiology & Scans", path: "/patient/imaging", icon: ScanLine, description: "Ultrasound, X-ray & imaging" },
      ],
    },
    {
      type: "dropdown",
      label: "Billing & Coverage",
      icon: Wallet,
      items: [
        { label: "Invoices & Payments", path: "/patient/billing", icon: Wallet, description: "Billing statements & payment receipts" },
        { label: "Insurance Coverage", path: "/patient/insurance", icon: ShieldCheck, description: "Health insurance & policy claims" },
      ],
    },
  ],
};

// Flattened list for quick lookups and mobile search
export const NAV_BY_ROLE: Record<Role, NavItem[]> = Object.fromEntries(
  Object.entries(NAV_GROUPS_BY_ROLE).map(([role, groups]) => [
    role,
    groups.flatMap((g) =>
      g.type === "link"
        ? [{ label: g.label, path: g.path, icon: g.icon }]
        : g.items.map((sub) => ({ label: sub.label, path: sub.path, icon: sub.icon, description: sub.description }))
    ),
  ])
) as Record<Role, NavItem[]>;
