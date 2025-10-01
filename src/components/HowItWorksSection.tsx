import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Search, MessageCircle, CarFront, ArrowRight } from "lucide-react";

const HowItWorksSection = () => {
  const steps = [
    {
      number: "01",
      icon: UserPlus,
      title: "Create Your Profile",
      description: "Sign up with your Chadwick Veracross registered email. Complete your profile with your location, schedule preferences, and any special requirements.",
      color: "primary",
    },
    {
      number: "02",
      icon: Search,
      title: "Find Matches",
      description: "Browse families in your area looking for carpool partners. Filter by location, schedule, grade level, and other preferences to find the perfect match.",
      color: "secondary",
    },
    {
      number: "03",
      icon: MessageCircle,
      title: "Connect and Plan",
      description: "Use our secure messaging system to introduce yourself, discuss schedules, and plan your carpool arrangement. Build trust and coordinate details directly.",
      color: "accent",
    },
    {
      number: "04",
      icon: CarFront,
      title: "Start Carpooling",
      description: "Begin your carpool journey! Coordinate pickup times, locations, and enjoy the benefits of shared transportation with your trusted school community.",
      color: "primary",
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "primary":
        return "bg-primary/10 text-primary";
      case "secondary":
        return "bg-secondary/10 text-secondary";
      case "accent":
        return "bg-accent/10 text-accent";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  return (
    <section id="how-it-works" className="bg-muted/30">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Getting started with SchoolPool is simple and straightforward. Follow these four easy steps to begin your carpooling journey.
          </p>
        </div>

        {/* Desktop Timeline View */}
        <div className="hidden lg:block mb-16">
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute top-24 left-0 right-0 h-1 bg-border" style={{ left: "10%", right: "10%" }} />
            
            <div className="grid grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  {/* Number Badge */}
                  <div className={`w-16 h-16 rounded-full ${getColorClasses(step.color)} flex items-center justify-center text-2xl font-bold mb-6 mx-auto relative z-10 bg-background border-4 border-background shadow-lg`}>
                    {step.number}
                  </div>
                  
                  {/* Card */}
                  <Card className="hover-lift h-full">
                    <CardContent className="p-6 text-center">
                      <div className={`w-12 h-12 rounded-full ${getColorClasses(step.color)} flex items-center justify-center mx-auto mb-4`}>
                        <step.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                  
                  {/* Arrow (except for last item) */}
                  {index < steps.length - 1 && (
                    <div className="absolute top-8 -right-4 z-20">
                      <ArrowRight className="w-8 h-8 text-border" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Stacked View */}
        <div className="lg:hidden space-y-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getColorClasses(step.color)} flex items-center justify-center text-xl font-bold`}>
                      {step.number}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <step.icon className={`w-6 h-6 ${step.color === 'primary' ? 'text-primary' : step.color === 'secondary' ? 'text-secondary' : 'text-accent'}`} />
                        <h3 className="text-xl font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Connector (except for last item) */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-4">
                  <div className="w-1 h-8 bg-border" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-6 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-2 border-border">
            <div>
              <h3 className="text-2xl font-bold mb-2">Ready to Get Started?</h3>
              <p className="text-muted-foreground">Join the SchoolPool community today and experience smarter carpooling.</p>
            </div>
            <Button variant="hero" size="xl">
              Sign Up Now
              <ArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
