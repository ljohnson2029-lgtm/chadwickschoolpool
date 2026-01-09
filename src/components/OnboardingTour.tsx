import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Map, Users, Car, Shield, X, ChevronRight, ChevronLeft } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
}

const tourSteps: TourStep[] = [
  {
    title: "Find Parents Near You",
    description: "Use the interactive map to find other Chadwick parents along your route. Filter by distance and availability to find the perfect carpool match.",
    icon: Map,
  },
  {
    title: "Connect with Families",
    description: "Send ride requests or offers to other verified parents. Link your student's account so they can stay informed about their rides.",
    icon: Users,
  },
  {
    title: "Manage Your Carpools",
    description: "Post ride offers when you're driving, or request rides when you need them. Track all your carpools in one place.",
    icon: Car,
  },
  {
    title: "Your Privacy Matters",
    description: "Control what information is visible to others. Your exact address is never shared, and only verified Chadwick families can access the platform.",
    icon: Shield,
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [neverShow, setNeverShow] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (neverShow) {
      localStorage.setItem("onboarding-tour-completed", "true");
    }
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    if (neverShow) {
      localStorage.setItem("onboarding-tour-completed", "true");
    }
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  const CurrentIcon = tourSteps[currentStep].icon;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={handleSkip}
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <CurrentIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center">{tourSteps[currentStep].title}</CardTitle>
          <CardDescription className="text-center">
            {tourSteps[currentStep].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-4">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep ? "bg-primary" : "bg-muted"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button onClick={handleNext} className="flex-1">
              {currentStep === tourSteps.length - 1 ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="never-show"
              checked={neverShow}
              onCheckedChange={(checked) => setNeverShow(checked === true)}
            />
            <Label htmlFor="never-show" className="text-sm text-muted-foreground cursor-pointer">
              Don't show this again
            </Label>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export const useOnboardingTour = () => {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("onboarding-tour-completed");
    if (!completed) {
      // Slight delay to let the page load first
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTour = () => {
    setShowTour(false);
  };

  return { showTour, completeTour };
};