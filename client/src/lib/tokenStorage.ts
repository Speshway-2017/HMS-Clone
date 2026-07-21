const TOKEN_KEY = "hms_token";
const REFRESH_TOKEN_KEY = "hms_refresh_token";

// Cross-tab broadcast channel for single active session enforcement per browser profile
let sessionChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    sessionChannel = new BroadcastChannel("hms_session_channel");
  }
} catch (e) {
  console.warn("BroadcastChannel not supported", e);
}

type SessionEventListener = (event: { type: "LOGIN" | "LOGOUT" | "SESSION_INVALIDATED"; userId?: string }) => void;
const listeners = new Set<SessionEventListener>();

if (sessionChannel) {
  sessionChannel.onmessage = (event) => {
    listeners.forEach((listener) => listener(event.data));
  };
}

export const tokenStorage = {
  get(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },
  set(token: string, refreshToken?: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },
  clear(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  broadcastSessionEvent(type: "LOGIN" | "LOGOUT" | "SESSION_INVALIDATED", userId?: string): void {
    if (sessionChannel) {
      sessionChannel.postMessage({ type, userId });
    }
  },
  subscribeSessionEvents(listener: SessionEventListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
