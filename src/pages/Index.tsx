import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import LandingFeatures from "@/components/LandingFeatures";
import LandingHowItWorks from "@/components/LandingHowItWorks";
import LandingTrust from "@/components/LandingTrust";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";

const Index = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navigation />
        <HeroSection />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingTrust />
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Index;
