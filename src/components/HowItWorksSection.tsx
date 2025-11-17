import { UserPlus, CheckCircle, Users, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create Account",
    description: "Register with Veracross or as a parent with verified credentials for instant trust.",
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
    <section id="how-it-works" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,212,170,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(212,100,250,0.05),transparent_50%)]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-navy mb-6 animate-fade-up">
            Getting Started is Simple
          </h2>
          <p className="text-xl text-charcoal/70 max-w-2xl mx-auto">
            Join Chadwick School's carpooling community in four easy steps
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-teal to-teal-light mx-auto rounded-full mt-6" />
        </div>

        {/* Desktop Timeline */}
        <div className="hidden lg:block relative">
          {/* Connecting Line */}
          <div className="absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-teal via-teal-light to-teal" 
               style={{ 
                 width: 'calc(100% - 128px)', 
                 left: '64px',
                 background: 'repeating-linear-gradient(90deg, hsl(var(--teal)) 0px, hsl(var(--teal)) 10px, transparent 10px, transparent 20px)'
               }} 
          />

          {/* Steps */}
          <div className="grid grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="relative flex flex-col items-center text-center animate-fade-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Number Badge */}
                  <div className="relative z-10 w-32 h-32 mb-6 animate-bounce-in" style={{ animationDelay: `${index * 150}ms` }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-teal to-teal-light rounded-full opacity-20 blur-xl animate-glow" />
                    <div className="relative w-full h-full bg-gradient-to-br from-teal to-teal-light rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-xl">
                      {step.number}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="mb-6 bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                    <Icon className="w-12 h-12 text-teal" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-navy mb-3">
                    {step.title}
                  </h3>
                  <p className="text-charcoal/70 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
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
                  <div className="absolute left-8 top-20 bottom-0 w-0.5 bg-teal/30" />
                )}

                {/* Number Badge */}
                <div className="relative z-10 flex-shrink-0 animate-bounce-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="w-16 h-16 bg-gradient-to-br from-teal to-teal-light rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 bg-teal/10 p-3 rounded-xl">
                      <Icon className="w-6 h-6 text-teal" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-navy mb-2">
                        {step.title}
                      </h3>
                      <p className="text-charcoal/70 text-sm leading-relaxed">
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
            className="text-lg px-12 py-6 rounded-full bg-gradient-to-r from-teal to-teal-light text-white hover:scale-105 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-xl"
          >
            Get Started Today
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
