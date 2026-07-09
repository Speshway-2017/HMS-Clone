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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{ data: { user: AuthUser; token: string } }>("/auth/login", { email, password });
      tokenStorage.set(res.data.data.token);
      setUser(res.data.data.user);
      return res.data.data.user;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      tokenStorage.clear();
      setUser(null);
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
