import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Shield, MessageSquare, Calendar, CheckCircle } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const trustIndicators = [
    { icon: Shield, text: "Verified Chadwick families" },
    { icon: MessageSquare, text: "Secure messaging" },
    { icon: Calendar, text: "Easy scheduling" },
  ];

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden hero-gradient">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blob" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blob" style={{ animationDelay: "5s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/5 rounded-full blob" style={{ animationDelay: "10s" }} />
      </div>

      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-8">
            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight animate-fade-up">
              Safe, Simple School Carpooling
              <span className="block text-primary mt-2">for Chadwick School Families</span>
            </h1>

            {/* Subtitle */}
            <p 
              className="text-lg sm:text-xl lg:text-2xl text-white/85 max-w-2xl mx-auto lg:mx-0 animate-fade-up"
              style={{ animationDelay: "100ms" }}
            >
              Connect with verified families for stress-free daily commutes
            </p>

            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-up"
              style={{ animationDelay: "200ms" }}
            >
              <Button
                onClick={() => navigate("/register")}
                size="lg"
                className="text-lg px-10 py-6 rounded-full bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-xl"
              >
                Get Started
              </Button>
              <Button
                onClick={() => scrollToSection("how-it-works")}
                size="lg"
                variant="ghost"
                className="text-lg px-8 py-6 rounded-full bg-white/10 backdrop-blur-lg border-2 border-white/20 text-white hover:bg-white/20 hover:border-white hover:-translate-y-0.5 transition-all duration-300"
              >
                Learn More
                <ChevronDown className="ml-2 h-5 w-5 animate-bounce" />
              </Button>
            </div>

            {/* Trust Indicators */}
            <div 
              className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start animate-fade-up"
              style={{ animationDelay: "300ms" }}
            >
              {trustIndicators.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-white/90 animate-fade-up"
                  style={{ animationDelay: `${400 + index * 100}ms` }}
                >
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm sm:text-base">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Illustration */}
          <div 
            className="relative animate-slide-in-right"
            style={{ animationDelay: "400ms" }}
          >
            <div className="relative floating-animation">
              {/* Main Illustration Container */}
              <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                {/* Floating UI Elements */}
                <div className="space-y-4">
                  {/* Route Card */}
                  <div className="bg-white rounded-2xl p-6 shadow-xl animate-fade-in">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-2 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>

                  {/* Message Card */}
                  <div 
                    className="bg-white rounded-2xl p-6 shadow-xl ml-8 animate-fade-in"
                    style={{ animationDelay: "200ms" }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                        <div className="h-2 bg-gray-100 rounded w-2/3" />
                      </div>
                    </div>
                  </div>

                  {/* Safety Badge */}
                  <div 
                    className="bg-white rounded-2xl p-6 shadow-xl animate-fade-in"
                    style={{ animationDelay: "400ms" }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center animate-glow">
                        <Shield className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                        <div className="h-2 bg-gray-100 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Circles */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-glow" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/20 rounded-full blur-2xl animate-glow" style={{ animationDelay: "1s" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={() => scrollToSection("features")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors scroll-bounce"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  );
};

export default HeroSection;
