export type Role =
  | "super_admin"
  | "hospital_admin"
  | "admin"
  | "receptionist"
  | "doctor"
  | "pharmacist"
  | "staff"
  | "nurse"
  | "patient";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  hospital: string | null;
  avatarUrl?: string;
  status: "active" | "inactive";
  lastLogin: string | null;
}

export const ROLE_HOME_PATH: Record<Role, string> = {
  super_admin: "/super-admin",
  hospital_admin: "/admin",
  admin: "/admin",
  receptionist: "/receptionist",
  doctor: "/doctor",
  pharmacist: "/pharmacy",
  staff: "/staff",
  nurse: "/staff",
  patient: "/patient",
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  hospital_admin: "Hospital Admin",
  admin: "Hospital Admin",
  receptionist: "Receptionist",
  doctor: "Doctor",
  pharmacist: "Pharmacist",
  staff: "Clinical Staff",
  nurse: "Clinical Staff",
  patient: "Patient",
};
