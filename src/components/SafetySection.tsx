import { Shield, Lock, UserCheck, MessageSquare, Eye, Database } from "lucide-react";

const securityFeatures = [
  {
    icon: UserCheck,
    title: "Veracross Verification",
    description: "All students and staff are verified through Chadwick's Veracross system for guaranteed authenticity.",
  },
  {
    icon: Shield,
    title: "Two-Factor Authentication",
    description: "Parents benefit from robust 2FA protection, adding an extra layer of security to every account.",
  },
  {
    icon: Lock,
    title: "Admin Approval Process",
    description: "Every new account undergoes manual review and approval by administrators before activation.",
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
    <section id="safety" className="py-24 lg:py-32 relative overflow-hidden hero-gradient">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-64 h-64 bg-teal/10 rounded-full blur-3xl animate-glow" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-glow" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-up">
            Your Family's Safety Comes First
          </h2>
          <div className="w-24 h-1 bg-teal mx-auto rounded-full mb-6" />
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Built with multiple layers of security to protect what matters most
          </p>
        </div>

        {/* Security Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-white/8 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-teal/50 hover:bg-white/12 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Glow Effect on Hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal/0 to-teal/0 group-hover:from-teal/10 group-hover:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Icon */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-teal/20 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <Icon className="w-8 h-8 text-teal" />
                  </div>
                  {/* Pulse Effect */}
                  <div className="absolute inset-0 w-16 h-16 bg-teal/20 rounded-2xl animate-ping opacity-0 group-hover:opacity-75" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-teal transition-colors">
                  {feature.title}
                </h3>
                <p className="text-white/70 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Security Badge */}
        <div className="mt-20 text-center animate-fade-up" style={{ animationDelay: "600ms" }}>
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-8 py-4">
            <Shield className="w-6 h-6 text-teal animate-glow" />
            <span className="text-white font-semibold text-lg">
              Enterprise-Grade Security Standards
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SafetySection;
