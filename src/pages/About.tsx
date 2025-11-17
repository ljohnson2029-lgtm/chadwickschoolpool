import Navigation from "@/components/Navigation";
import MissionSection from "@/components/MissionSection";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";

const About = () => {
  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-20">
          <MissionSection />
        </div>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default About;
