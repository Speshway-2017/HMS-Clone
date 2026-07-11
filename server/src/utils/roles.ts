export const ROLES = ["super_admin", "hospital_admin", "accountant", "doctor", "receptionist", "pharmacist", "laboratory"] as const;
export type Role = (typeof ROLES)[number];

