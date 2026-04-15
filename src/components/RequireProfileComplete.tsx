import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const RequireProfileComplete = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const isSetupRoute = location.pathname.startsWith("/profile/setup");

  if (loading) return null;
  if (!user) return <>{children}</>;
  if (!profile) {
    return isSetupRoute ? <>{children}</> : <Navigate to="/profile/setup" replace state={{ from: location.pathname }} />;
  }

  if (!profile.profile_complete && !isSetupRoute) {
    return <Navigate to="/profile/setup" replace state={{ from: location.pathname }} />;
  }

  if (profile.profile_complete && isSetupRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RequireProfileComplete;

