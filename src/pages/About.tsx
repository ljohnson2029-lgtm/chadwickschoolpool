import Navigation from "@/components/Navigation";
import MissionSection from "@/components/MissionSection";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-20">
        <MissionSection />
      </div>
      <Footer />
    </div>
  );
};

export default About;
