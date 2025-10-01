import { Card, CardContent } from "@/components/ui/card";
import { Shield, CheckCircle, Mail, MessageCircle, Lock, Users } from "lucide-react";

const SafetySection = () => {
  const safetyFeatures = [
    {
      icon: Mail,
      title: "Veracross Email Verification",
      description: "All users must authenticate using their official Chadwick Veracross email with 2-factor authentication, ensuring every member is a verified school family.",
    },
    {
      icon: MessageCircle,
      title: "Built-in Communication",
      description: "Secure messaging system allows parents to coordinate directly, discuss schedules, and build trust before committing to a carpool arrangement.",
    },
    {
      icon: Users,
      title: "Community Trust",
      description: "Connect only with other Chadwick families. Our exclusive network ensures you're carpooling within your trusted school community.",
    },
    {
      icon: Lock,
      title: "Privacy Protected",
      description: "Your personal information is kept secure. Share only what you're comfortable with, and communicate through our protected platform.",
    },
  ];

  return (
    <section id="safety" className="bg-background">
      <div className="section-container">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-6">
            <Shield className="w-8 h-8 text-secondary" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">Safety First</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your family's safety and security is our top priority. Every feature is designed with trust and verification at its core.
          </p>
        </div>

        {/* Main Verification Highlight */}
        <Card className="mb-12 border-2 border-secondary/20 bg-secondary/5 shadow-lg">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-secondary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">100% School-Verified Families</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Every member of SchoolPool must verify their identity through their official Chadwick Veracross email with 2-factor authentication. This ensures that only legitimate Chadwick families can access the platform, creating a trusted and secure environment for everyone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safety Features Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {safetyFeatures.map((feature, index) => (
            <Card key={index} className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-muted border-2 border-border">
            <Shield className="w-5 h-5 text-secondary" />
            <span className="font-semibold">Trusted by Chadwick Families</span>
            <Shield className="w-5 h-5 text-secondary" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SafetySection;
