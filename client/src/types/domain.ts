export interface Hospital {
  _id: string;
  name: string;
  code: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string;
  licenseUrl: string;
  bedCapacity: number;
  status: "active" | "inactive";
  opExpiryLimit?: number;
  availableLabTests?: string[];
  availableRadiologyTests?: string[];
  investigationPrices?: Record<string, number>;
  createdAt: string;
  primaryAdminName?: string | null;
  
  // Customization fields
  heroBannerUrl?: string;
  aboutText?: string;
  googleMapsLink?: string;
  workingHours?: string;
  footerText?: string;
  socialLinks?: Record<string, string>;
  faqs?: { q: string; a: string }[];
  heroTitle?: string;
  heroSub?: string;
  whyChooseUs?: { title: string; desc: string }[];
  missionText?: string;
  visionText?: string;
  valuesText?: string;
}

export interface Branch {
  _id: string;
  hospital: { _id: string; name: string } | string;
  name: string;
  branchId: string;
  category: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  headName: string;
  totalStaff: number;
  status: "active" | "on_leave" | "critical" | "inactive";
  createdAt: string;
}

export interface Department {
  _id: string;
  hospital: { _id: string; name: string } | string;
  branch: { _id: string; name: string } | string | null;

  // Core identity
  name: string;
  code: string;
  description: string;
  specialization: string;
  category: string;

  // Leadership
  headName: string;
  departmentHead: { _id: string; name: string; specialization?: string } | string | null;

  // Location
  location: string;
  floor: string;
  building: string;

  // Operations
  totalBeds: number;
  occupiedBeds: number;
  doctors: number;
  nurses: number;
  support: number;
  services: string[];
  rating: number;
  status:
    | "operational"
    | "critical_load"
    | "peak_hours"
    | "inactive"
    | "under_maintenance"
    | "temporarily_closed";

  // Extended details
  consultationFee: number;
  isEmergency: boolean;
  colorTheme: string;
  displayOrder: number;

  // Soft-disable
  isDisabled: boolean;
  disabledAt: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: "hospital_admin" | "accountant";
  hospital: { _id: string; name: string } | string | null;
  title: string;
  phone: string;
  employeeId: string;
  avatarUrl: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface RoleInfo {
  _id?: string;
  role: string;
  label: string;
  description: string;
  permissions: string[];
  assignedUsers: number;
  isCustom?: boolean;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface Doctor {
  _id: string;
  department: { _id: string; name: string } | string | null;
  name: string;
  email: string;
  phone: string;
  photoUrl: string;
  specialization: string;
  qualification: string;
  licenseNo: string;
  bio: string;
  status: "on_duty" | "on_leave" | "off_duty";
  rating: number;
  workingHours?: Array<{ day: string; from: string; to: string; active: boolean }>;
  consultationSettings?: { slotDuration: number; maxPatients: number; breakTime: string };
  monthlyAvailability?: Array<{ date: string; from: string; to: string; active: boolean }>;
  languages?: string;
  consultationFee?: string;
  opExpiryLimit?: number;
}

export interface Staff {
  _id: string;
  department: { _id: string; name: string } | string | null;
  name: string;
  email: string;
  phone: string;
  photoUrl: string;
  role: string;
  employeeId: string;
  qualifications: string;
  dateOfJoining: string | null;
  dutyStatus: "on_duty" | "late" | "off_duty" | "on_leave";
  checkInTime: string;
  taskLoad: number;
  rating: number;
  assignedPatients?: any[];
}

export interface MedicalHistoryEntry {
  _id: string;
  date: string;
  visitType: string;
  doctorName: string;
  department: string;
  diagnosis: string;
  notes: string;
  status: string;
}

export interface Patient {
  _id: string;
  name: string;
  email: string;
  phone: string;
  age: number | null;
  gender: string;
  bloodGroup: string;
  address: string;
  assignedDoctor: { _id: string; name: string } | string | null;
  status: "admitted" | "opd" | "discharged";
  isActive?: boolean;
  allergies: string;
  uhid?: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  medicalHistory: MedicalHistoryEntry[];
  createdAt: string;
}

export interface Appointment {
  _id: string;
  referenceId: string;
  patient: { _id: string; name: string } | string;
  doctor: { _id: string; name: string; specialization?: string } | string;
  department: { _id: string; name: string } | string | null;
  date: string;
  time: string;
  type: string;
  status: "pending_payment" | "scheduled" | "checked_in" | "in_consultation" | "completed" | "cancelled" | "no_show";
  meetingLink?: string;
  notes: string;
  chiefComplaint?: string;
  symptoms?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  advice?: string;
  cancellationReason?: string;
  cancellationRemarks?: string;
  refundRequired?: boolean;
  rescheduleHistory?: Array<{
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    oldToken: string;
    newToken: string;
    rescheduledBy: string;
    reason: string;
    timestamp: string;
  }>;
  vitals?: {
    temperature?: string;
    bloodPressure?: string;
    pulseRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    weight?: string;
  };
}

export interface InventoryItem {
  _id: string;
  name: string;
  strength?: string;
  sku: string;
  category: "medicines" | "equipment" | "consumables";
  description: string;
  unit: string;
  stockQty: number;
  reorderLevel: number;
  maxLevel: number;
  unitCost: number;
  supplier: string;
  storageCondition: string;
  stockStatus: "critical" | "low" | "optimal";
}

export interface InvoiceItem {
  description: string;
  category: string;
  quantity: number;
  amount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
  insuranceCovered: number;
  patientBalance: number;
}

export interface Invoice {
  _id: string;
  patient: { _id: string; name: string } | string;
  items: InvoiceItem[];
  taxRate: number;
  serviceFee: number;
  insuranceCoveragePercent: number;
  status: "pending" | "partially_paid" | "paid" | "overdue";
  issuedAt: string;
  dueDate: string | null;
  totals: InvoiceTotals;
  billingType?: string;
}
