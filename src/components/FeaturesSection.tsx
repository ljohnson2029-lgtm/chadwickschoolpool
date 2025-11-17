import { School, Users, Lock, Calendar, Shield, Smartphone } from "lucide-react";

const features = [
  {
    icon: School,
    title: "Veracross Integration",
    description: "Login with your existing Chadwick credentials for seamless verification and enhanced security.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Users,
    title: "Smart Matching",
    description: "Find families along your route with our intelligent matching algorithm that considers location and schedule.",
    gradient: "from-teal to-emerald-500",
  },
  {
    icon: Lock,
    title: "Secure Messaging",
    description: "Connect safely with verified families through our encrypted messaging system built for privacy.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description: "Coordinate pickups and drop-offs effortlessly with intuitive scheduling tools and calendar sync.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: Shield,
    title: "Safety First",
    description: "Verified members-only platform with admin approval, background checks, and secure data handling.",
    gradient: "from-green-500 to-teal-600",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Access SchoolPool anytime, anywhere on any device with our responsive, mobile-optimized platform.",
    gradient: "from-indigo-500 to-blue-600",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 lg:py-32 bg-soft-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-navy mb-6 animate-fade-up">
            Why Choose SchoolPool?
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-teal to-teal-light mx-auto rounded-full" />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-white rounded-3xl p-8 border border-gray-100 hover:border-teal/50 transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Icon */}
                <div className="mb-6">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                    <Icon className="w-full h-full text-white" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-navy mb-4 group-hover:text-teal transition-colors">
                  {feature.title}
                </h3>
                <p className="text-charcoal/80 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal/0 to-teal/0 group-hover:from-teal/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
