export type Role = "super_admin" | "hospital_admin" | "accountant" | "receptionist" | "doctor" | "pharmacist" | "laboratory" | "nurse" | "patient";

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
  accountant: "/accountant",
  receptionist: "/receptionist",
  doctor: "/doctor",
  pharmacist: "/pharmacy",
  laboratory: "/laboratory",
  nurse: "/nurse",
  patient: "/patient",
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  hospital_admin: "Hospital Admin",
  accountant: "Accountant",
  receptionist: "Receptionist",
  doctor: "Doctor",
  pharmacist: "Pharmacist",
  laboratory: "Laboratory",
  nurse: "Nurse",
  patient: "Patient",
};

