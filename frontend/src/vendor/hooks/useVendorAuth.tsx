import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { vendorApi, type Actor, type AuthResult, type LoginPayload, type SignupPayload } from "@/vendor/lib/vendorApi";

interface AuthState {
  user: Actor | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithTokens: (result: AuthResult) => void;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const VendorAuthContext = createContext<AuthState | undefined>(undefined);

export function VendorAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Actor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("vendor_user");
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await vendorApi.login(payload);
    if (res.data) {
      if (res.data.actor.role !== "vendor") {
        throw new Error("This portal is for vendors only. Please use the customer site.");
      }
      localStorage.setItem("vendor_accessToken", res.data.accessToken);
      localStorage.setItem("vendor_refreshToken", res.data.refreshToken);
      localStorage.setItem("vendor_user", JSON.stringify(res.data.actor));
      setUser(res.data.actor);
    }
  }, []);

  const loginWithTokens = useCallback((result: AuthResult) => {
    localStorage.setItem("vendor_accessToken", result.accessToken);
    localStorage.setItem("vendor_refreshToken", result.refreshToken);
    localStorage.setItem("vendor_user", JSON.stringify(result.actor));
    setUser(result.actor);
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    await vendorApi.signup(payload);
  }, []);

  const logout = useCallback(async () => {
    try { await vendorApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem("vendor_accessToken");
    localStorage.removeItem("vendor_refreshToken");
    localStorage.removeItem("vendor_user");
    setUser(null);
  }, []);

  return (
    <VendorAuthContext.Provider value={{ user, loading, login, loginWithTokens, signup, logout }}>
      {children}
    </VendorAuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(VendorAuthContext);
  if (!ctx) throw new Error("useAuth must be used within VendorAuthProvider");
  return ctx;
}
