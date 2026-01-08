import { MapPin, Calendar, Users, MessageSquare, Shield } from "lucide-react";

const features = [
  {
    icon: MapPin,
    text: "Find parents along your route to school",
  },
  {
    icon: Calendar,
    text: "Schedule one-time or recurring carpools",
  },
  {
    icon: Users,
    text: "Link student and parent accounts",
  },
  {
    icon: MessageSquare,
    text: "Direct messaging between families",
  },
  {
    icon: Shield,
    text: "Chadwick School verified accounts only",
  },
];

const LandingFeatures = () => {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features for safe and easy carpooling
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-4 bg-card rounded-xl p-5 border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <p className="text-lg text-foreground font-medium">
                  {feature.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
