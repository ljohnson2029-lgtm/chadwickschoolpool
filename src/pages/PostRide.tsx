import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/ui/card";
import { Hand, Car, School, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";
import { cn } from "@/lib/utils";

const CHADWICK_SCHOOL_ADDRESS = '26800 S Academy Dr, Palos Verdes Peninsula, CA 90274';

const PostRide = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedType, setSelectedType] = useState<'request' | 'offer' | null>(null);

  const destination = searchParams.get('destination');
  const origin = searchParams.get('origin');
  const prefillPickup = origin === 'chadwick' ? CHADWICK_SCHOOL_ADDRESS : undefined;
  const prefillDropoff = destination === 'chadwick' ? CHADWICK_SCHOOL_ADDRESS : undefined;
  const showSchoolInfo = destination === 'chadwick' || origin === 'chadwick';

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  const handleSuccess = () => navigate('/family-carpools');

  if (loading || !user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-2xl">
        <Breadcrumbs items={[{ label: "Post a Ride" }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Post a Ride</h1>
          <p className="text-muted-foreground">
            Create a public post that all parents can see and respond to
          </p>
        </div>

        {showSchoolInfo && (
          <Alert className="mb-6 border-secondary/30 bg-secondary/5">
            <School className="h-4 w-4 text-secondary" />
            <AlertDescription className="text-foreground">
              {destination === 'chadwick' 
                ? 'Ride to Chadwick School — destination pre-filled.'
                : 'Ride from Chadwick School — origin pre-filled.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Type Selection Cards */}
        {!selectedType && (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setSelectedType('request')}
              className="group text-left"
            >
              <Card className={cn(
                "p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-md cursor-pointer",
                "border-border hover:border-red-300 dark:hover:border-red-700"
              )}>
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Hand className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">I Need a Ride</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Post a request and let other parents know you need help getting your kids to school.
                </p>
                <div className="flex items-center text-sm font-medium text-red-600 dark:text-red-400 gap-1">
                  Request a ride <ArrowRight className="h-4 w-4" />
                </div>
              </Card>
            </button>

            <button
              onClick={() => setSelectedType('offer')}
              className="group text-left"
            >
              <Card className={cn(
                "p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-md cursor-pointer",
                "border-border hover:border-emerald-300 dark:hover:border-emerald-700"
              )}>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Car className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">I Can Drive</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Offer available seats in your car and help another family with their commute.
                </p>
                <div className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 gap-1">
                  Offer a ride <ArrowRight className="h-4 w-4" />
                </div>
              </Card>
            </button>
          </div>
        )}

        {/* Form */}
        {selectedType && (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedType(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to options
            </button>
            
            {selectedType === 'request' ? (
              <RideRequestForm 
                onSuccess={handleSuccess}
                isBroadcast={true}
                prefillPickup={prefillPickup}
                prefillDropoff={prefillDropoff}
              />
            ) : (
              <RideOfferForm 
                onSuccess={handleSuccess}
                isBroadcast={true}
                prefillPickup={prefillPickup}
                prefillDropoff={prefillDropoff}
              />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PostRide;
