import { Shield, Lock, UserCheck, MessageSquare, Eye, Database } from "lucide-react";

const securityFeatures = [
  {
    icon: UserCheck,
    title: "Two-Factor Authentication",
    description: "All accounts are protected with robust 2FA, ensuring only verified users can access the platform.",
  },
  {
    icon: Shield,
    title: "Admin Verification",
    description: "Every new account undergoes manual review and approval by administrators before activation.",
  },
  {
    icon: Lock,
    title: "Admin Approval Process",
    description: "Every new member is carefully vetted and approved to maintain our trusted community standards.",
  },
  {
    icon: MessageSquare,
    title: "Secure Messaging",
    description: "All communications are encrypted end-to-end, ensuring your conversations remain private.",
  },
  {
    icon: Eye,
    title: "Active Monitoring",
    description: "Our team actively monitors platform activity to maintain a safe, trusted community environment.",
  },
  {
    icon: Database,
    title: "Encrypted Data Storage",
    description: "Your personal information is protected with enterprise-grade encryption at rest and in transit.",
  },
];

const SafetySection = () => {
  return (
    <section id="safety" className="py-24 lg:py-32 bg-gradient-to-br from-secondary/5 via-white to-primary/5 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(0,212,170,0.1),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(0,150,255,0.1),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-block mb-6 px-6 py-2 bg-primary/10 rounded-full">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Security First</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-up">
            Your Family's Safety Comes First
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built with multiple layers of security to protect what matters most
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-secondary to-primary mx-auto rounded-full mt-6" />
        </div>

        {/* Security Features Grid - Compact Cards with Icons Left */}
        <div className="max-w-4xl mx-auto space-y-4">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group flex items-start gap-6 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-l-4 border-primary hover:border-secondary hover:shadow-xl transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-md">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Badge */}
        <div className="mt-20 text-center animate-fade-up" style={{ animationDelay: "600ms" }}>
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-xl border border-border rounded-full px-8 py-4 shadow-lg">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-foreground font-semibold text-lg">
              Enterprise-Grade Security Standards
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SafetySection;
