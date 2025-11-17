import { UserPlus, CheckCircle, Users, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create Account",
    description: "Register with your email and set up two-factor authentication for enhanced security.",
  },
  {
    number: 2,
    icon: CheckCircle,
    title: "Get Approved",
    description: "Quick verification process ensures all members are legitimate Chadwick families.",
  },
  {
    number: 3,
    icon: Users,
    title: "Find Matches",
    description: "Discover nearby families with matching schedules and routes using our smart algorithm.",
  },
  {
    number: 4,
    icon: Car,
    title: "Start Carpooling",
    description: "Schedule rides, coordinate pickups, and enjoy stress-free daily commutes together.",
  },
];

const HowItWorksSection = () => {
  const navigate = useNavigate();

  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-gradient-to-br from-primary/5 via-white to-secondary/5 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,212,170,0.08),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(212,100,250,0.08),transparent_50%)]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-up">
            Getting Started is Simple
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join Chadwick School's carpooling community in four easy steps
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mt-6" />
        </div>

        {/* Desktop - Vertical Stepper Layout */}
        <div className="hidden lg:block max-w-3xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="relative flex gap-8 items-center mb-12 last:mb-0 animate-fade-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-16 top-32 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary ml-0.5" />
                )}

                {/* Number Badge - Larger */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full opacity-20 blur-xl" />
                    <div className="relative w-full h-full bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-2xl">
                      {step.number}
                    </div>
                  </div>
                </div>

                {/* Content Card */}
                <div className="flex-1 bg-white rounded-3xl p-8 border-2 border-border hover:border-primary/50 hover:shadow-2xl transition-all duration-300 group">
                  <div className="flex items-start gap-6">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-10 h-10 text-primary" />
                    </div>
                    
                    {/* Text */}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-lg">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile/Tablet Layout */}
        <div className="lg:hidden space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="relative flex gap-6 items-start animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Vertical Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-8 top-20 bottom-0 w-0.5 bg-primary/30" />
                )}

                {/* Number Badge */}
                <div className="relative z-10 flex-shrink-0 animate-bounce-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-card p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 bg-primary/10 p-3 rounded-xl">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center animate-fade-up" style={{ animationDelay: "600ms" }}>
          <Button
            onClick={() => navigate("/register")}
            size="lg"
            className="text-lg px-12 py-6 rounded-full bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-xl"
          >
            Get Started Today
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
