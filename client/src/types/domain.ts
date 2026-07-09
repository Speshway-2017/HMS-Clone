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
  createdAt: string;
  primaryAdminName?: string | null;
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
  branch: string | null;
  name: string;
  description: string;
  category: string;
  headName: string;
  totalBeds: number;
  doctors: number;
  nurses: number;
  support: number;
  services: string[];
  rating: number;
  status: "operational" | "critical_load" | "peak_hours" | "inactive";
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
  role: string;
  label: string;
  description: string;
  permissions: string[];
  assignedUsers: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
