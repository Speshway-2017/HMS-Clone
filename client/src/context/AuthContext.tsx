import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, getApiErrorMessage } from "../lib/api";
import { tokenStorage } from "../lib/tokenStorage";
import { AuthUser } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity session timeout

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      await api.post("/auth/logout", { refreshToken });
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStorage.clear();
      tokenStorage.broadcastSessionEvent("LOGOUT");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!tokenStorage.get()) {
      setIsLoading(false);
      return;
    }

    api
      .get<{ data: { user: AuthUser } }>("/auth/me")
      .then((res) => setUser(res.data.data.user))
      .catch(() => {
        tokenStorage.clear();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Subscribe to cross-tab BroadcastChannel session events
  useEffect(() => {
    const unsubscribe = tokenStorage.subscribeSessionEvents((event) => {
      if (event.type === "LOGIN" && user && event.userId !== user.id) {
        // Another user logged in in a different tab — invalidate current tab session
        tokenStorage.clear();
        setUser(null);
      } else if (event.type === "LOGOUT" || event.type === "SESSION_INVALIDATED") {
        tokenStorage.clear();
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Inactivity session timeout listener
  useEffect(() => {
    if (!user) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert("Session timed out due to inactivity. Please log in again.");
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [user, logout]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{ data: { user: AuthUser; token: string; refreshToken: string } }>("/auth/login", {
        email,
        password,
      });

      const loggedUser = res.data.data.user;
      tokenStorage.set(res.data.data.token, res.data.data.refreshToken);
      tokenStorage.broadcastSessionEvent("LOGIN", loggedUser.id);
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
