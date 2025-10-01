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
    <section id="mission" className="bg-muted/30">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">Our Mission</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Building a stronger, more connected Chadwick community through collaborative transportation
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* For Students */}
          <Card className="hover-lift border-2">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
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
          <Card className="hover-lift border-2">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-secondary" />
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
          <Card className="hover-lift border-2 bg-accent/5">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-2xl">Why Parents Love SchoolPool</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {parentBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <benefit.icon className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
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
