import Navigation from "@/components/Navigation";
import HowItWorksSection from "@/components/HowItWorksSection";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";

const HowItWorks = () => {
  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-20">
          <HowItWorksSection />
        </div>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default HowItWorks;
