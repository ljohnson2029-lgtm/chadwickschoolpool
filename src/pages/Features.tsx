import Navigation from "@/components/Navigation";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";

const Features = () => {
  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-20">
          <FeaturesSection />
        </div>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Features;
