import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Heart, CheckCircle, Clock, Leaf, Shield } from "lucide-react";

const MissionSection = () => {
  const parentBenefits = [
    { icon: Clock, text: "Reduce daily driving time and stress" },
    { icon: Users, text: "Connect with other families in your school community" },
    { icon: Leaf, text: "Save money on gas and vehicle wear" },
    { icon: Leaf, text: "Contribute to a greener environment" },
    { icon: Heart, text: "Build lasting friendships for your children" },
    { icon: Shield, text: "Gain backup transportation options" },
  ];

  return (
    <section id="mission" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,212,170,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(212,100,250,0.05),transparent_50%)]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-up">Our Mission</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Building a stronger, more connected Chadwick community through collaborative transportation
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mt-6" />
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* For Students */}
          <Card className="hover-lift border-2 animate-fade-up hover:-translate-y-2 transition-all duration-300">
            <CardHeader>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Created by Students, For Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                We understand the challenges of CUP requirements firsthand. SchoolPool was designed to make getting to school easier, more sustainable, and more enjoyable by connecting students and families who share the same journey.
              </p>
            </CardContent>
          </Card>

          {/* For Parents */}
          <Card className="hover-lift border-2 animate-fade-up hover:-translate-y-2 transition-all duration-300" style={{ animationDelay: "150ms" }}>
            <CardHeader>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 shadow-lg">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">For Parents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Give back to your community while freeing up valuable personal time. SchoolPool helps you coordinate with other families, reduce your driving responsibilities, and contribute to a more sustainable future for our children.
              </p>
            </CardContent>
          </Card>

          {/* Why Parents Love It */}
          <Card className="hover-lift border-2 animate-fade-up hover:-translate-y-2 transition-all duration-300" style={{ animationDelay: "300ms" }}>
            <CardHeader>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Why Parents Love SchoolPool</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {parentBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <benefit.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">100%</div>
            <div className="text-muted-foreground">School Verified</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-secondary mb-2">Safe</div>
            <div className="text-muted-foreground">Trusted Community</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-accent mb-2">Easy</div>
            <div className="text-muted-foreground">Simple Setup</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">Free</div>
            <div className="text-muted-foreground">No Hidden Costs</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
