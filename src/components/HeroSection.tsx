import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Shield, Users, Car } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-primary">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_25%_25%,hsl(0_0%_100%/0.15),transparent_50%),radial-gradient(circle_at_75%_75%,hsl(37_52%_55%/0.2),transparent_50%)]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-32 text-center">
        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight tracking-tight mb-6">
          Carpooling Made Easy
          <span className="block text-secondary mt-2">for Chadwick Families</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
          Join your school community in coordinating safe, reliable rides. Built by Chadwick parents, for Chadwick parents.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
          <Button
            onClick={() => navigate("/register")}
            size="lg"
            className="text-lg px-10 py-6 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
          >
            Sign Up Free
          </Button>
          <Button
            onClick={() => {
              const el = document.getElementById("how-it-works");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            size="lg"
            variant="outline"
            className="text-lg px-10 py-6 rounded-full border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 transition-all duration-300 font-semibold"
          >
            Learn More
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap gap-8 justify-center">
          <div className="flex items-center gap-2 text-primary-foreground/70">
            <Shield className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium">Verified families only</span>
          </div>
          <div className="flex items-center gap-2 text-primary-foreground/70">
            <Users className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium">Trusted community</span>
          </div>
          <div className="flex items-center gap-2 text-primary-foreground/70">
            <Car className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium">100% free to use</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
