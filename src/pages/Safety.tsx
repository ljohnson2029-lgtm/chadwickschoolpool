import Navigation from "@/components/Navigation";
import SafetySection from "@/components/SafetySection";
import Footer from "@/components/Footer";

const Safety = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-20">
        <SafetySection />
      </div>
      <Footer />
    </div>
  );
};

export default Safety;
