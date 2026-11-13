import { Role } from "../types/auth";

declare global {
  interface Window {
    electronAPI?: {
      isElectron?: boolean;
      platform?: string;
      getServerPort?: () => Promise<number>;
      getClientPort?: () => Promise<number>;
      isDev?: () => Promise<boolean>;
      quitApp?: () => void;
      navigate?: (route: string) => void;
    };
  }
}

/**
 * Safely checks whether the application is running inside the Electron Desktop environment.
 * Prefers the contextBridge exposed window.electronAPI.isElectron flag.
 */
export const isElectron = (): boolean => {
  return typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron);
};

/**
 * Roles permitted to authenticate and access the HMS Desktop Application.
 * Patient accounts are strictly prohibited on desktop.
 */
export const DESKTOP_ALLOWED_ROLES: Role[] = [
  "super_admin",
  "hospital_admin",
  "admin",
  "receptionist",
  "doctor",
  "pharmacist",
  "staff",
  "nurse",
];
