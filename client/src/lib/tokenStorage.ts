const TOKEN_KEY = "hms_token";

/**
 * sessionStorage is scoped per browsing tab/window (unlike cookies or
 * localStorage, which are shared across every tab of the same origin) —
 * that's what lets different accounts be logged in simultaneously in
 * different windows.
 */
export const tokenStorage = {
  get(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    sessionStorage.removeItem(TOKEN_KEY);
  },
};
