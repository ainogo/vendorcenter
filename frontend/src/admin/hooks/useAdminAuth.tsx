import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { adminApi, type Actor, type AuthResult } from "../lib/adminApi";

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface AdminAuthState {
  user: Actor | null;
  loading: boolean;
  permissions: string[];
  hasPermission: (perm: string) => boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Actor | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("adminUser");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Fetch permissions after user is set
  useEffect(() => {
    if (!user) {
      setPermissions([]);
      return;
    }
    adminApi.getMyPermissions()
      .then(res => {
        if (res.data) setPermissions(res.data.permissions);
      })
      .catch(() => {});
  }, [user]);

  const hasPermission = useCallback((perm: string) => {
    if (permissions.includes("*")) return true;
    return permissions.includes(perm);
  }, [permissions]);

  const performLogout = useCallback(() => {
    try { adminApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem("adminAccessToken");
    localStorage.removeItem("adminRefreshToken");
    localStorage.removeItem("adminUser");
    setUser(null);
    setPermissions([]);
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
    performLogout();
  }, [performLogout]);

  // Inactivity auto-logout (10 min)
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        performLogout();
        window.location.href = "/company/login";
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, performLogout]);

  // Back-button logout protection: push dummy history state when on dashboard,
  // intercept popstate to logout instead of navigating back to pre-login pages
  useEffect(() => {
    if (!user) return;

    // Push a guard state so back button hits our listener first
    window.history.pushState({ adminGuard: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      // If user presses back and pops our guard state, log them out
      if (!e.state?.adminGuard) {
        performLogout();
        window.location.href = "/company/login";
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [user, performLogout]);

  return (
    <AdminAuthContext.Provider value={{ user, loading, permissions, hasPermission, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
