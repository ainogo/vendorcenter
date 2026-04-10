import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { LocationProvider } from "@/hooks/useLocation";
import { AnimatePresence, motion } from "framer-motion";
import PageLoader from "@/components/ui/PageLoader";
import SEO from "@/components/SEO";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Services from "./pages/Services";
import Explore from "./pages/Explore";
import Account from "./pages/Account";
import VendorDetail from "./pages/VendorDetail";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";
import Payment from "./pages/Payment";
import CustomerAddresses from "./pages/CustomerAddresses";
import NotFound from "./pages/NotFound";
import AiAssistantChat from "./components/AiAssistantChat";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<><SEO title="Login" path="/login" noindex /><Login /></>} />
          <Route path="/register" element={<><SEO title="Register" path="/register" noindex /><Register /></>} />
          <Route path="/forgot-password" element={<><SEO title="Forgot Password" path="/forgot-password" noindex /><ForgotPassword /></>} />
          <Route path="/services" element={<><SEO title="Browse Services" description="Find trusted local service providers near you. Plumbing, electrical, cleaning, and more." path="/services" /><Services /></>} />
          <Route path="/vendor/:vendorId" element={<VendorDetail />} />
          <Route path="/v/:vendorId" element={<VendorDetail />} />
          <Route path="/account" element={<><SEO title="My Account" path="/account" noindex /><Account /></>} />
          <Route path="/addresses" element={<><SEO title="My Addresses" path="/addresses" noindex /><CustomerAddresses /></>} />
          <Route path="/explore" element={<><SEO title="Explore Services" description="Discover local services and vendors in your area." path="/explore" /><Explore /></>} />
          <Route path="/about" element={<><SEO title="About Us" description="Learn about VendorCenter — India's trusted marketplace connecting customers with verified local service providers." path="/about" /><About /></>} />
          <Route path="/privacy" element={<><SEO title="Privacy Policy" path="/privacy" /><Privacy /></>} />
          <Route path="/terms" element={<><SEO title="Terms of Service" path="/terms" /><Terms /></>} />
          <Route path="/cookies" element={<><SEO title="Cookie Policy" path="/cookies" /><Cookies /></>} />
          <Route path="/pay/:bookingId" element={<><SEO title="Payment" noindex /><Payment /></>} />
          <Route path="*" element={<><SEO title="Page Not Found" noindex /><NotFound /></>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocationProvider>
      <TooltipProvider>
        <PageLoader />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
          <AiAssistantChat />
        </BrowserRouter>
      </TooltipProvider>
      </LocationProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
