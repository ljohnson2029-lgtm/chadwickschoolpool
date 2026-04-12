import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import CreatorFooter from "@/components/CreatorFooter";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Navigation />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 pt-20">
        <div className="text-center space-y-6">
          <h1 className="text-8xl font-bold text-primary">404</h1>
          <p className="text-2xl font-semibold text-foreground">Oops! Page not found</p>
          <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/")} size="lg" className="mt-4">
            Return to Home
          </Button>
        </div>
      </div>
      <CreatorFooter />
    </>
  );
};

export default NotFound;
