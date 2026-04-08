import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, refreshAccessToken, type Actor, type AuthResult, type LoginPayload, type SignupPayload } from "@/lib/api";

interface AuthState {
  user: Actor | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithTokens: (result: AuthResult) => void;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<Actor>) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Actor | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore user from localStorage on mount & silently refresh access token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // If "Remember me" was unchecked, sessionStorage had a marker.
        // Browser restart clears sessionStorage, so if marker is absent but tokens exist, clear them.
        const sessionOnly = localStorage.getItem("customer_refreshToken") && !sessionStorage.getItem("customer_session_only") && !localStorage.getItem("customer_remember_me");
        if (sessionOnly && localStorage.getItem("customer_user")) {
          localStorage.removeItem("customer_accessToken");
          localStorage.removeItem("customer_refreshToken");
          localStorage.removeItem("customer_user");
          if (!cancelled) setLoading(false);
          return;
        }

        const stored = localStorage.getItem("customer_user");
        if (stored) {
          setUser(JSON.parse(stored));
          // Use the shared singleton refresh to avoid race conditions
          const hasRefresh = localStorage.getItem("customer_refreshToken");
          if (hasRefresh) {
            const ok = await refreshAccessToken();
            if (!ok && !cancelled) {
              // Refresh failed — session truly expired, clear user
              setUser(null);
            }
          }
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await api.login(payload);
    if (res.data) {
      localStorage.setItem("customer_accessToken", res.data.accessToken);
      localStorage.setItem("customer_refreshToken", res.data.refreshToken);
      localStorage.setItem("customer_user", JSON.stringify(res.data.actor));
      setUser(res.data.actor);
    }
  }, []);

  const loginWithTokens = useCallback((result: AuthResult) => {
    localStorage.setItem("customer_accessToken", result.accessToken);
    localStorage.setItem("customer_refreshToken", result.refreshToken);
    localStorage.setItem("customer_user", JSON.stringify(result.actor));
    setUser(result.actor);
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    await api.signup(payload);
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    localStorage.removeItem("customer_accessToken");
    localStorage.removeItem("customer_refreshToken");
    localStorage.removeItem("customer_user");
    localStorage.removeItem("customer_remember_me");
    sessionStorage.removeItem("customer_session_only");
    setUser(null);
  }, []);

  const updateUser = useCallback((partial: Partial<Actor>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem("customer_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithTokens, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
