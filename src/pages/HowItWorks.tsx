import Navigation from "@/components/Navigation";
import HowItWorksSection from "@/components/HowItWorksSection";
import Footer from "@/components/Footer";

const HowItWorks = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-20">
        <HowItWorksSection />
      </div>
      <Footer />
    </div>
  );
};

export default HowItWorks;
