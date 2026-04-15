import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import LandingHowItWorks from "@/components/LandingHowItWorks";
import LandingFeatures from "@/components/LandingFeatures";
import LandingTrust from "@/components/LandingTrust";
import Footer from "@/components/Footer";
import CreatorFooter from "@/components/CreatorFooter";
import PageTransition from "@/components/PageTransition";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navigation />
        <HeroSection />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingTrust />
        <Footer />
        <CreatorFooter />
      </div>
    </PageTransition>
  );
};

export default Index;
