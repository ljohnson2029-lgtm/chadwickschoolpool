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
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-up">
            Your Family's Safety Comes First
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built with multiple layers of security to protect what matters most
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mt-6" />
        </div>

        {/* Security Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-white rounded-3xl p-8 border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Glow Effect on Hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:to-transparent transition-opacity duration-300" />

                {/* Icon */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Security Badge */}
        <div className="mt-20 text-center animate-fade-up" style={{ animationDelay: "600ms" }}>
          <div className="inline-flex items-center gap-3 bg-card backdrop-blur-xl border border-border rounded-full px-8 py-4 shadow-lg">
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
