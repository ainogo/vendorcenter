import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpId, setOtpId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithTokens } = useAuth();
  const navigate = useNavigate();

  const routeByRole = (role: string) => {
    if (role === "vendor") {
      toast.info("Redirecting to Vendor Portal…");
      const vendorUrl = import.meta.env.VITE_VENDOR_PORTAL_URL || "http://localhost:8080";
      window.location.href = `${vendorUrl}/dashboard`;
      return;
    }
    if (role === "admin") {
      toast.info("Redirecting to Admin Portal…");
      window.location.href = "/company.html";
      return;
    }
    navigate("/");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill all fields"); return; }
    setLoading(true);
    try {
      await login({ email, password });
      const stored = localStorage.getItem("customer_user");
      const role = stored ? JSON.parse(stored).role : "customer";
      toast.success("Welcome back!");
      routeByRole(role);
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!otpEmail) { toast.error("Enter your email"); return; }
    setLoading(true);
    try {
      const res = await api.requestOtp(otpEmail, "login");
      if (res.data) {
        setOtpId(res.data.otpId);
        setOtpSent(true);
        toast.success("OTP sent to your email");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) { toast.error("Enter 6-digit OTP"); return; }
    setLoading(true);
    try {
      const res = await api.verifyOtp(otpId, otpCode, "login");
      if (res.data?.accessToken && res.data?.refreshToken && res.data?.actor) {
        loginWithTokens({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
          actor: res.data.actor,
        });
        toast.success("Welcome back!");
        routeByRole(res.data.actor.role);
      } else {
        toast.error("OTP verified but login failed. Please try email login.");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-lg">V</span>
            </div>
            <span className="font-display font-bold text-xl">
              Vendor<span className="gradient-text">Center</span>
            </span>
          </Link>

          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted-foreground mb-8">Sign in to your account to continue</p>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">OTP Login</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form className="space-y-4" onSubmit={handleEmailLogin}>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Email address" type="email" className="pl-10 h-12 rounded-xl" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Password"
                    type={showPassword ? "text" : "password"}
                    className="pl-10 pr-10 h-12 rounded-xl"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-border" />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-12 gradient-bg text-primary-foreground border-0 rounded-xl font-semibold text-base">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Sign In
                  {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <form className="space-y-4" onSubmit={e => e.preventDefault()}>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Email address for OTP" type="email" className="pl-10 h-12 rounded-xl" value={otpEmail} onChange={e => setOtpEmail(e.target.value)} />
                </div>

                {otpSent && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <Input placeholder="Enter 6-digit OTP" maxLength={6} className="h-12 rounded-xl text-center tracking-[0.5em] font-mono text-lg" value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      OTP sent! Check your email.
                    </p>
                  </motion.div>
                )}

                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => otpSent ? handleVerifyOtp() : handleSendOtp()}
                  className="w-full h-12 gradient-bg text-primary-foreground border-0 rounded-xl font-semibold text-base"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  {otpSent ? "Verify OTP" : "Send OTP"}
                  {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm text-muted-foreground">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-11 rounded-xl">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button variant="outline" className="h-11 rounded-xl">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Apple
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right - Visual */}
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/15 blur-3xl animate-float" />
          <div className="absolute bottom-20 -left-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        </div>
        <div className="relative text-center text-background max-w-sm">
          <div className="w-20 h-20 rounded-3xl gradient-bg flex items-center justify-center mx-auto mb-8 animate-pulse-glow">
            <span className="text-primary-foreground font-display font-bold text-3xl">V</span>
          </div>
          <h2 className="font-display text-3xl font-bold mb-4">Your Local Marketplace</h2>
          <p className="text-background/70 leading-relaxed">
            Connect with thousands of verified service providers. Book, manage, and review — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
