export const ROLES = ["super_admin", "hospital_admin", "accountant"] as const;
export type Role = (typeof ROLES)[number];
