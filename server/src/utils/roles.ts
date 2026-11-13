export const ROLES = [
  "super_admin",
  "hospital_admin",
  "admin",
  "receptionist",
  "pharmacist",
  "doctor",
  "staff",
  "nurse",
  "patient",
  "accountant",
  "laboratory",
] as const;

export type Role = (typeof ROLES)[number];
