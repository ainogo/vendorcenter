import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/vendor/hooks/useVendorAuth";

type Props = {
  children: ReactNode;
};

export default function RequireVendorOnboardingComplete({ children }: Props) {
  const {
    user,
    loading: authLoading,
    onboardingStatus,
    onboardingLoading,
    refreshOnboardingStatus,
  } = useAuth();

  useEffect(() => {
    if (!authLoading && user && onboardingStatus === "unknown") {
      void refreshOnboardingStatus();
    }
  }, [authLoading, user, onboardingStatus, refreshOnboardingStatus]);

  if (authLoading || onboardingLoading || (user && onboardingStatus === "unknown")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (onboardingStatus !== "complete") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
