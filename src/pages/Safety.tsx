import Navigation from "@/components/Navigation";
import SafetySection from "@/components/SafetySection";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";

const Safety = () => {
  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-20">
          <SafetySection />
        </div>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Safety;
