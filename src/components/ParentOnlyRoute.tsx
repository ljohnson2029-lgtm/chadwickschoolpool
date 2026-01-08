import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ParentOnlyRouteProps {
  children: ReactNode;
}

const ParentOnlyRoute = ({ children }: ParentOnlyRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
      return;
    }

    if (!loading && profile?.account_type === "student") {
      toast({
        title: "Access Restricted",
        description: "This feature is only available for parent accounts.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [user, profile, loading, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || profile?.account_type === "student") {
    return null;
  }

  return <>{children}</>;
};

export default ParentOnlyRoute;
