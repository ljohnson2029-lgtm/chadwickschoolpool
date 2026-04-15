import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Map as MapIcon, List, Hand, Car, Plus, RefreshCw, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";
import RidesList, { type Ride } from "@/components/RidesList";
import ParentSearchBar from "@/components/ParentSearchBar";

// Lazy load the heavy map component (1.6MB!)
const FindRidesMap = lazy(() => import("@/components/FindRidesMap"));

// Loading placeholder for map
const MapLoadingPlaceholder = () => (
  <div className="w-full h-[500px] bg-muted/30 rounded-lg flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Loading map...</p>
    </div>
  </div>
);

const FamilyCarpools = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [showRequests, setShowRequests] = useState(true);
  const [showOffers, setShowOffers] = useState(true);
  const [showHome, setShowHome] = useState(false);
  const [showSchool, setShowSchool] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [focusRide, setFocusRide] = useState<{
    id: string;
    pickup_latitude: number | null;
    pickup_longitude: number | null;
    pickup_location: string;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    // Brief delay so loading state is visible
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Rides updated", { duration: 2000 });
    }, 800);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const isUserParent = profile?.account_type === 'parent';
  const isUserStudent = profile?.account_type === 'student';

  const handleRideCreated = () => {
    setRefreshKey((prev) => prev + 1);
    setShowRequestDialog(false);
    setShowOfferDialog(false);
  };

  const handleViewOnMap = (ride: Ride) => {
    // Switch to map view and focus on the ride
    setViewMode('map');
    setFocusRide({
      id: ride.id,
      pickup_latitude: (ride as any).pickup_latitude || null,
      pickup_longitude: (ride as any).pickup_longitude || null,
      pickup_location: ride.pickup_location
    });
  };

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
      <div className="container mx-auto px-4 max-w-7xl">
        <Breadcrumbs items={[{ label: "Family Carpools" }]} />
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Family Carpools</h1>
                <Badge 
                  variant={isUserStudent ? 'secondary' : 'default'}
                  className={isUserStudent 
                    ? 'bg-blue-500/10 text-blue-600' 
                    : 'bg-green-500/10 text-green-600'
                  }
                >
                  {isUserStudent ? 'Student Account' : 'Parent Account'}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Browse, request, and offer rides to families
              </p>
            </div>
            
            {/* View Toggle & Refresh */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                List View
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <MapIcon className="h-4 w-4 mr-2" />
                Map View
              </Button>
            </div>
          </div>

          {/* Student Alert */}
          {isUserStudent && (
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <span className="font-medium">Student Account - View Only</span>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You can browse all rides, but ask your parent to manage ride requests and offers.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons - Always visible for both roles */}
          <div className="flex gap-3 flex-wrap">
            {isUserParent ? (
              <>
                <Button 
                  onClick={() => setShowRequestDialog(true)}
                  variant="secondary"
                  className="gap-2 bg-muted hover:bg-muted/80 text-foreground"
                >
                  <Hand className="h-4 w-4" />
                  Post Ride Request
                </Button>
                <Button 
                  onClick={() => setShowOfferDialog(true)}
                  className="gap-2"
                >
                  <Car className="h-4 w-4" />
                  Post Ride Offer
                </Button>
              </>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      className="gap-2"
                      disabled
                    >
                      <Hand className="h-4 w-4" />
                      Post Ride Request
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Only parents can post ride requests</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      className="gap-2"
                      disabled
                    >
                      <Car className="h-4 w-4" />
                      Post Ride Offer
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Only parents can post ride offers</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Parent Search */}
          <ParentSearchBar />

          {/* Map View */}
          {viewMode === 'map' && (
            <Suspense fallback={<MapLoadingPlaceholder />}>
              <FindRidesMap 
                height="500px"
                showRequests={showRequests}
                showOffers={showOffers}
                onToggleRequests={setShowRequests}
                onToggleOffers={setShowOffers}
                showHome={showHome}
                showSchool={showSchool}
                onToggleHome={setShowHome}
                onToggleSchool={setShowSchool}
                focusRide={focusRide}
                onFocusRideHandled={() => setFocusRide(null)}
              />
            </Suspense>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <RidesList key={refreshKey} onViewOnMap={handleViewOnMap} />
          )}
        </div>

        {/* Post Ride Request Dialog */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Hand className="h-5 w-5" />
                Post a Ride Request
              </DialogTitle>
            </DialogHeader>
            <RideRequestForm onSuccess={handleRideCreated} />
          </DialogContent>
        </Dialog>

        {/* Post Ride Offer Dialog */}
        <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Post a Ride Offer
              </DialogTitle>
            </DialogHeader>
            <RideOfferForm onSuccess={handleRideCreated} />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default FamilyCarpools;