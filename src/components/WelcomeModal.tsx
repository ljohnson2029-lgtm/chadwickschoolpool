import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MapPin, Users, Car, Link2, Calendar, GraduationCap } from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  accountType: "student" | "parent" | "staff";
  firstName?: string;
}

const WelcomeModal = ({ open, onClose, accountType, firstName }: WelcomeModalProps) => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    onClose();
    if (accountType === "student") {
      navigate("/family-links");
    } else {
      navigate("/profile");
    }
  };

  const isStudent = accountType === "student";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            {isStudent ? "🎓" : "👋"} Welcome to SchoolPool{firstName ? `, ${firstName}` : ""}!
          </DialogTitle>
          <DialogDescription className="text-center">
            {isStudent
              ? "Your student account is ready. Here's what's next:"
              : "Your account is ready. Let's get you set up:"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isStudent ? (
            <>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Link to Your Parent</p>
                  <p className="text-sm text-muted-foreground">
                    Connect with your parent's account for approval
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">View Carpool Schedule</p>
                  <p className="text-sm text-muted-foreground">
                    See your family's upcoming rides and plans
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Stay Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Get updates about your rides and family carpools
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Add Your Home Address</p>
                  <p className="text-sm text-muted-foreground">
                    Set your location to find families on your route
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Find Carpool Partners</p>
                  <p className="text-sm text-muted-foreground">
                    Discover nearby Chadwick families for carpooling
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Create or Request Rides</p>
                  <p className="text-sm text-muted-foreground">
                    Offer seats or find rides for your children
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <Button onClick={handleGetStarted} className="w-full">
          {isStudent ? "Link to Parent" : "Complete My Profile"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;
