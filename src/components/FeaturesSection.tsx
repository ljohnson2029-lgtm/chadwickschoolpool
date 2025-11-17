import { Lock, Users, MessageSquare, Calendar, Shield, Smartphone } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Two-Factor Authentication",
    description: "Secure your account with robust 2FA protection, adding an extra layer of security with every login.",
  },
  {
    icon: Users,
    title: "Smart Matching",
    description: "Find families along your route with our intelligent matching algorithm that considers location and schedule.",
  },
  {
    icon: MessageSquare,
    title: "Secure Messaging",
    description: "Connect safely with verified families through our encrypted messaging system built for privacy.",
  },
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description: "Coordinate pickups and drop-offs effortlessly with intuitive scheduling tools and calendar sync.",
  },
  {
    icon: Shield,
    title: "Safety First",
    description: "Verified members-only platform with admin approval and secure data handling for peace of mind.",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Access SchoolPool anytime, anywhere on any device with our responsive, mobile-optimized platform.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,212,170,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(212,100,250,0.05),transparent_50%)]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-up">
            Why Choose SchoolPool?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to make carpooling safe, simple, and efficient
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mt-6" />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-white rounded-3xl p-8 border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Icon */}
                <div className="mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary p-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <Icon className="w-full h-full text-white" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
