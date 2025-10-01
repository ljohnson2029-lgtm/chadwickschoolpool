import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Families carpooling at Chadwick School"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-background/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 section-container">
        <div className="max-w-3xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Connect with{" "}
            <span className="gradient-text">Chadwick Families</span>{" "}
            for Smarter Carpooling
          </h1>
          
          <div className="space-y-4 text-lg sm:text-xl text-muted-foreground mb-8">
            <p className="leading-relaxed">
              <strong className="text-foreground">Solving CUP Requirements Together:</strong> Navigate Conditional Use Permit challenges while building a stronger school community.
            </p>
            <p className="leading-relaxed">
              <strong className="text-foreground">Environmental Impact:</strong> Reduce traffic congestion and carbon emissions, one carpool at a time.
            </p>
            <p className="leading-relaxed">
              <strong className="text-foreground">Local & Connected:</strong> Built exclusively for Chadwick families, ensuring trust and safety in every ride.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="hero" size="xl">
              Get Started
              <ArrowRight className="ml-2" />
            </Button>
            <Button variant="outline" size="xl" className="border-2">
              Learn More
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-muted-foreground">School-Verified Families</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-muted-foreground">Secure Communication</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-muted-foreground">Community-Driven</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-primary/50 flex items-start justify-center p-2">
          <div className="w-1 h-2 rounded-full bg-primary/50" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
