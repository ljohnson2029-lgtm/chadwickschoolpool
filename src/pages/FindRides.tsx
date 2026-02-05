import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Hand,
  Car,
  Search,
  Map as MapIcon,
  List,
  AlertCircle,
  Phone,
  Mail,
  CheckCircle
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/usePagination";
import { format } from "date-fns";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";
import FindRidesMap from "@/components/FindRidesMap";
import RideUserBadge from "@/components/RideUserBadge";
import { isParent as checkIsParent, isStudent as checkIsStudent, getStudentPermissionError } from "@/lib/permissions";

interface BroadcastRide {
  id: string;
  user_id: string;
  type: 'request' | 'offer';
  pickup_location: string;
  dropoff_location: string;
  ride_date: string;
  ride_time: string;
  seats_needed: number | null;
  seats_available: number | null;
  route_details: string | null;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string;
    phone_number?: string | null;
    share_phone?: boolean | null;
    share_email?: boolean | null;
  } | null;
  userEmail?: string;
  hasAcceptedConnection?: boolean;
}

const FindRides = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [broadcasts, setBroadcasts] = useState<BroadcastRide[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showRequests, setShowRequests] = useState(true);
  const [showOffers, setShowOffers] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isUserParent, setIsUserParent] = useState(false);
  const [isUserStudent, setIsUserStudent] = useState(false);
  const [acceptedRideIds, setAcceptedRideIds] = useState<Set<string>>(new Set());
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch user email and determine role
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', user.id)
        .single();
      
      if (data?.email) {
        setUserEmail(data.email);
        setIsUserParent(checkIsParent(data.email));
        setIsUserStudent(checkIsStudent(data.email));
      }
    };
    fetchUserInfo();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchBroadcastRides();
  }, [user]);

  const fetchBroadcastRides = async () => {
    if (!user) return;

    setLoadingRides(true);
    
    const { data: ridesData, error: ridesError } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'active')
      .gte('ride_date', new Date().toISOString().split('T')[0])
      .order('ride_date', { ascending: true })
      .order('ride_time', { ascending: true });

    if (ridesError) {
      console.error('Error fetching broadcast rides:', ridesError);
      setLoadingRides(false);
      return;
    }

    const userIds = [...new Set(ridesData?.map(r => r.user_id) || [])];
    
    let profilesMap: Record<string, any> = {};
    let emailsMap: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, phone_number, share_phone, share_email')
        .in('id', userIds);
      
      if (profilesData) {
        profilesMap = profilesData.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
      }

      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, email')
        .in('user_id', userIds);
      
      if (usersData) {
        emailsMap = usersData.reduce((acc, u) => {
          acc[u.user_id] = u.email;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    const combinedData = (ridesData || []).map(ride => ({
      ...ride,
      profiles: profilesMap[ride.user_id] || null,
      userEmail: emailsMap[ride.user_id] || null
    }));

   // Fetch accepted conversations to mark rides as "full"
   // Use is_fulfilled column from rides table for "Ride Full" status
   const ridesWithConnectionStatus = combinedData.map(ride => ({
     ...ride,
     hasAcceptedConnection: (ride as any).is_fulfilled === true
   }));
   
   // Keep this for backwards compatibility but it's now derived from is_fulfilled
   const acceptedIds = new Set(
     ridesWithConnectionStatus.filter(r => r.hasAcceptedConnection).map(r => r.id)
   );
   setAcceptedRideIds(acceptedIds);
   
   setBroadcasts(ridesWithConnectionStatus as any);
    setLoadingRides(false);
  };

  const handleRespondToRide = async (ride: BroadcastRide) => {
    if (!isUserParent) return;
    
    try {
      const { error } = await supabase
        .from('ride_conversations')
        .insert({
          ride_id: ride.id,
          sender_id: user?.id,
          recipient_id: ride.user_id,
          status: 'pending',
          message: ride.type === 'request' 
            ? `I can help with your ride request!`
            : `I'd like to join your offered ride!`
        });

      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }
      
      navigate('/conversations');
    } catch (err) {
      console.error('Error responding to ride:', err);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const filteredRides = broadcasts.filter(r => {
    if (!showRequests && r.type === 'request') return false;
    if (!showOffers && r.type === 'offer') return false;
    if (debouncedSearch && 
        !r.pickup_location.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
        !r.dropoff_location.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  });

  const {
    visibleItems,
    hasMore,
    loadMore,
    loadedCount,
    totalCount,
  } = useInfiniteScroll({ items: filteredRides, pageSize: 12 });

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

  const RideCard = ({ ride }: { ride: BroadcastRide }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <RideUserBadge
              userId={ride.user_id}
              firstName={ride.profiles?.first_name || null}
              lastName={ride.profiles?.last_name || null}
              username={ride.profiles?.username || 'Unknown'}
              accountType="parent"
              email={ride.userEmail}
              phoneNumber={ride.profiles?.phone_number}
              shareEmail={ride.profiles?.share_email ?? false}
              sharePhone={ride.profiles?.share_phone ?? false}
              isCurrentUser={ride.user_id === user?.id}
              viewerIsStudent={isUserStudent}
              variant="full"
              showViewButton={true}
            />
          </div>
          <Badge className={`gap-1 ml-2 ${ride.type === 'request' ? 'bg-red-500' : 'bg-green-500'}`}>
            {ride.type === 'request' ? <Hand className="h-3 w-3" /> : <Car className="h-3 w-3" />}
            {ride.type === 'request' ? 'Request' : 'Offer'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium">{ride.pickup_location}</div>
            <div className="text-muted-foreground">to {ride.dropoff_location}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(new Date(ride.ride_date), 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {ride.ride_time}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
         {ride.hasAcceptedConnection ? (
           <span className="text-amber-600 font-medium">Ride Connected</span>
         ) : ride.type === 'offer'
            ? `${ride.seats_available} seats available`
            : `${ride.seats_needed} seats needed`}
        </div>

        {ride.route_details && (
          <p className="text-sm text-muted-foreground pt-2 border-t">
            {ride.route_details}
          </p>
        )}

        {/* Action Button - Different for Parents vs Students */}
       {ride.hasAcceptedConnection && ride.user_id !== user?.id ? (
         <Button 
           className="w-full gap-2"
           disabled
           variant="secondary"
         >
           <Users className="h-4 w-4" />
           Ride Full
         </Button>
       ) : isUserParent ? (
          <Button 
            className="w-full gap-2"
            onClick={() => handleRespondToRide(ride)}
           disabled={ride.user_id === user?.id || ride.hasAcceptedConnection}
          >
           {ride.user_id === user?.id && ride.hasAcceptedConnection ? (
             <>
               <CheckCircle className="h-4 w-4" />
               Connected
             </>
           ) : ride.type === 'request' ? (
              <>
                <Car className="h-4 w-4" />
                I Can Help!
              </>
            ) : (
              <>
                <Hand className="h-4 w-4" />
                I Need This!
              </>
            )}
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="w-full gap-2"
                disabled
                variant="secondary"
              >
                {ride.type === 'request' ? (
                  <>
                    <Car className="h-4 w-4" />
                    I Can Help!
                  </>
                ) : (
                  <>
                    <Hand className="h-4 w-4" />
                    I Need This!
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Only parents can manage rides. Ask your parent for help.</p>
            </TooltipContent>
          </Tooltip>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-7xl">
        <Breadcrumbs items={[{ label: "Find Rides" }]} />

        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Find Rides</h1>
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
                Browse available rides on the map or list
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <MapIcon className="h-4 w-4 mr-2" />
                Map View
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                List View
              </Button>
            </div>
          </div>

          {isUserStudent && (
            <Alert className="mt-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <span className="font-medium">Student Account - View Only</span>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You can browse all rides, but ask your parent to manage ride requests and offers.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {viewMode === 'list' && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="show-requests" 
                    checked={showRequests} 
                    onCheckedChange={setShowRequests}
                  />
                  <Label htmlFor="show-requests" className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    Ride Requests
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="show-offers" 
                    checked={showOffers} 
                    onCheckedChange={setShowOffers}
                  />
                  <Label htmlFor="show-offers" className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Ride Offers
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse" className="gap-2">
              <MapIcon className="h-4 w-4" />
              Browse Rides
            </TabsTrigger>
            <TabsTrigger value="post" className="gap-2" disabled={isUserStudent}>
              <Hand className="h-4 w-4" />
              Post a Ride
              {isUserStudent && <span className="text-xs">(Parents Only)</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {viewMode === 'map' ? (
              <FindRidesMap 
                height="500px"
                showRequests={showRequests}
                showOffers={showOffers}
                onToggleRequests={setShowRequests}
                onToggleOffers={setShowOffers}
              />
            ) : (
              <>
                {loadingRides ? (
                  <div className="text-center py-12">Loading rides...</div>
                ) : filteredRides.length === 0 ? (
                  <EmptyState
                    icon={Car}
                    title="No Rides Found"
                    description={!showRequests && !showOffers 
                      ? "Enable ride requests or offers to see results"
                      : "No rides match your current filters"}
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleItems.map((ride) => (
                        <RideCard key={ride.id} ride={ride} />
                      ))}
                    </div>
                    <LoadMoreButton
                      onLoadMore={loadMore}
                      hasMore={hasMore}
                      loadedCount={loadedCount}
                      totalCount={totalCount}
                    />
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="post" className="space-y-6">
            {isUserStudent ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {getStudentPermissionError("post rides")}
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs defaultValue="request" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="request" className="gap-2">
                    <Hand className="h-4 w-4" />
                    Request a Ride
                  </TabsTrigger>
                  <TabsTrigger value="offer" className="gap-2">
                    <Car className="h-4 w-4" />
                    Offer a Ride
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="request">
                  <Card className="p-6">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold mb-2">I need a ride</h2>
                      <p className="text-muted-foreground">
                        Post a ride request that all parents can see
                      </p>
                    </div>
                    <RideRequestForm 
                      onSuccess={() => fetchBroadcastRides()}
                      isBroadcast={true}
                    />
                  </Card>
                </TabsContent>

                <TabsContent value="offer">
                  <Card className="p-6">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold mb-2">I can offer a ride</h2>
                      <p className="text-muted-foreground">
                        Post a ride offer that all parents can see
                      </p>
                    </div>
                    <RideOfferForm 
                      onSuccess={() => fetchBroadcastRides()}
                      isBroadcast={true}
                    />
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default FindRides;
