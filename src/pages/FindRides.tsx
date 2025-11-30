import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Radio,
  Hand,
  Car,
  Map as MapIcon,
  Search,
  Filter
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import CarpoolMapView from "@/components/CarpoolMapView";

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
  } | null;
}

const FindRides = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [broadcasts, setBroadcasts] = useState<BroadcastRide[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");

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
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        profiles!rides_user_id_fkey(id, first_name, last_name, username)
      `)
      .eq('transaction_type', 'broadcast')
      .eq('status', 'active')
      .gte('ride_date', new Date().toISOString().split('T')[0])
      .order('ride_date', { ascending: true })
      .order('ride_time', { ascending: true });

    if (error) {
      console.error('Error fetching broadcast rides:', error);
    } else {
      setBroadcasts(data as any || []);
    }
    setLoadingRides(false);
  };

  const handleRespondToRide = async (ride: BroadcastRide) => {
    // Create a conversation entry
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
    } else {
      navigate('/conversations');
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const filteredRequests = broadcasts.filter(r => {
    if (r.type !== 'request') return false;
    if (searchQuery && !r.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !r.dropoff_location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredOffers = broadcasts.filter(r => {
    if (r.type !== 'offer') return false;
    if (searchQuery && !r.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !r.dropoff_location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(ride.profiles?.first_name || null, ride.profiles?.last_name || null, ride.profiles?.username || '')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {ride.profiles?.first_name} {ride.profiles?.last_name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">@{ride.profiles?.username}</p>
            </div>
          </div>
          <Badge className="gap-1">
            <Radio className="h-3 w-3" />
            Public Post
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
          {ride.type === 'offer'
            ? `${ride.seats_available} seats available`
            : `${ride.seats_needed} seats needed`}
        </div>

        {ride.route_details && (
          <p className="text-sm text-muted-foreground pt-2 border-t">
            {ride.route_details}
          </p>
        )}

        <Button 
          className="w-full gap-2"
          onClick={() => handleRespondToRide(ride)}
          disabled={ride.user_id === user?.id}
        >
          {ride.type === 'request' ? (
            <>
              <Hand className="h-4 w-4" />
              I Can Help!
            </>
          ) : (
            <>
              <Car className="h-4 w-4" />
              I Need This!
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-7xl">
        <Breadcrumbs items={[{ label: "Find Rides" }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Find Rides</h1>
          <p className="text-muted-foreground">
            Browse public ride posts or use the map to send direct requests
          </p>
        </div>

        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available" className="gap-2">
              <Radio className="h-4 w-4" />
              Available Rides
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <MapIcon className="h-4 w-4" />
              Find on Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
            {/* Search and Filter Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={directionFilter} onValueChange={setDirectionFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Directions</SelectItem>
                      <SelectItem value="to-school">To School</SelectItem>
                      <SelectItem value="from-school">From School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Ride Requests and Offers Tabs */}
            <Tabs defaultValue="requests" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="requests">
                  Ride Requests ({filteredRequests.length})
                </TabsTrigger>
                <TabsTrigger value="offers">
                  Ride Offers ({filteredOffers.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="requests">
                {loadingRides ? (
                  <div className="text-center py-12">Loading rides...</div>
                ) : filteredRequests.length === 0 ? (
                  <EmptyState
                    icon={Hand}
                    title="No Ride Requests"
                    description="No parents have posted ride requests yet. Be the first!"
                    action={{
                      label: "Post a Request",
                      onClick: () => navigate('/post-ride')
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRequests.map((ride) => (
                      <RideCard key={ride.id} ride={ride} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="offers">
                {loadingRides ? (
                  <div className="text-center py-12">Loading rides...</div>
                ) : filteredOffers.length === 0 ? (
                  <EmptyState
                    icon={Car}
                    title="No Ride Offers"
                    description="No parents have offered rides yet. Post one to help!"
                    action={{
                      label: "Offer a Ride",
                      onClick: () => navigate('/post-ride')
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOffers.map((ride) => (
                      <RideCard key={ride.id} ride={ride} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapIcon className="h-5 w-5" />
                  Direct Requests via Map
                </CardTitle>
                <CardDescription>
                  Click on parent markers to send private ride requests or offers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CarpoolMapView height="600px" />
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
              <strong>Tip:</strong> Map interactions create private, 1-on-1 ride conversations that appear in "My Conversations"
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default FindRides;
