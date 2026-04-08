import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { adminApi, type Actor, type AuthResult } from "../lib/adminApi";

interface AdminAuthState {
  user: Actor | null;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Actor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("adminUser");
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const login = useCallback(async (payload: { email: string; password: string }) => {
    const res = await adminApi.login(payload);
    if (res.data) {
      if (!["admin", "employee"].includes(res.data.actor.role)) {
        throw new Error("Access denied. Admin or employee credentials required.");
      }
      localStorage.setItem("adminAccessToken", res.data.accessToken);
      localStorage.setItem("adminRefreshToken", res.data.refreshToken);
      localStorage.setItem("adminUser", JSON.stringify(res.data.actor));
      setUser(res.data.actor);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await adminApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem("adminAccessToken");
    localStorage.removeItem("adminRefreshToken");
    localStorage.removeItem("adminUser");
    setUser(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
