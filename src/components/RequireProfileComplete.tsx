import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const PUBLIC_ROUTES = [
  "/", "/about", "/features", "/safety", "/how-it-works",
  "/register", "/login", "/verify-email", "/request-access",
  "/privacy", "/terms", "/help", "/profile/setup"
];

const RequireProfileComplete = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  // Not logged in or on a public route — let through
  if (!user || PUBLIC_ROUTES.some(r => location.pathname === r || location.pathname.startsWith("/profile/setup"))) {
    return <>{children}</>;
  }

  // Profile not yet loaded — wait
  if (!profile) return null;

  // Profile incomplete — redirect to setup
  if (!profile.profile_complete) {
    return <Navigate to="/profile/setup" replace />;
  }

  return <>{children}</>;
};

export default RequireProfileComplete;
