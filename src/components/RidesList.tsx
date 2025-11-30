import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, Clock, Users, User, Map } from "lucide-react";

  interface Ride {
    id: string;
    user_id: string;
    type: string;
    pickup_location: string;
    dropoff_location: string;
    ride_date: string;
    ride_time: string;
    seats_needed: number | null;
    seats_available: number | null;
    route_details: string | null;
    is_recurring: boolean;
    recurring_days: string[] | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      username: string;
    } | null;
  }

const RidesList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserRole(data?.role || null);
    };

    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (userRole !== null) {
      fetchRides();
    }
  }, [userRole]);

  const fetchRides = async () => {
    try {
      let parentIds: string[] = [];

      // If student, get rides from linked parents
      if (userRole === 'student' && user) {
        const { data: links } = await supabase
          .from('account_links')
          .select('parent_id')
          .eq('student_id', user.id)
          .eq('status', 'approved');

        if (links && links.length > 0) {
          parentIds = links.map(link => link.parent_id);
        }
      }

      // Build the query
      let query = supabase
        .from("rides")
        .select("*")
        .eq("status", "active");

      // If student with linked parents, only show parent's rides
      if (userRole === 'student') {
        if (parentIds.length > 0) {
          query = query.in('user_id', parentIds);
        } else {
          // No linked parents, show no rides
          setRides([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query
        .order("ride_date", { ascending: true })
        .order("ride_time", { ascending: true });

      if (error) throw error;

      // Fetch profile data separately for each ride
      const ridesWithProfiles = await Promise.all(
        (data || []).map(async (ride) => {
          const { data: profileData } = await (supabase as any)
            .from("profiles")
            .select("first_name, last_name, username")
            .eq("id", ride.user_id)
            .maybeSingle();

          return {
            ...ride,
            profiles: profileData,
          };
        })
      );

      setRides(ridesWithProfiles as unknown as Ride[]);
    } catch (error) {
      console.error("Error fetching rides:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const RideCard = ({ ride }: { ride: Ride }) => {
    const parentName = ride.profiles
      ? `${ride.profiles.first_name || ""} ${ride.profiles.last_name || ""}`.trim() || ride.profiles.username
      : "Unknown";

    const isOwnRide = ride.user_id === user?.id;
    const showParentBadge = userRole === 'student' && !isOwnRide;

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{parentName}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={ride.type === "offer" ? "default" : "secondary"}>
                  {ride.type === "offer" ? "Offering Ride" : "Requesting Ride"}
                </Badge>
                {showParentBadge && (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                    Created by {parentName}
                  </Badge>
                )}
              </div>
            </div>
            {ride.is_recurring && (
              <Badge variant="outline">Recurring</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">{ride.pickup_location}</div>
              <div className="text-muted-foreground">to {ride.dropoff_location}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {formatDate(ride.ride_date)}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              {formatTime(ride.ride_time)}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            {ride.type === "offer"
              ? `${ride.seats_available} seats available`
              : `${ride.seats_needed} seats needed`}
          </div>

          {ride.route_details && (
            <div className="text-sm text-muted-foreground pt-2 border-t">
              {ride.route_details}
            </div>
          )}

          {ride.is_recurring && ride.recurring_days && (
            <div className="text-sm pt-2 border-t">
              <span className="text-muted-foreground">Repeats: </span>
              {ride.recurring_days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(", ")}
            </div>
          )}

          <div className="pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => navigate('/map')}
            >
              <Map className="h-4 w-4" />
              View on Map
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading rides...</div>;
  }

  const requests = rides.filter(r => r.type === "request");
  const offers = rides.filter(r => r.type === "offer");

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="all">All Rides ({rides.length})</TabsTrigger>
        <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
        <TabsTrigger value="offers">Offers ({offers.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-6">
        {rides.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {userRole === 'student' ? 'No Family Carpools Yet' : 'No Rides Available'}
            </p>
            <p className="text-muted-foreground">
              {userRole === 'student' 
                ? "Link to your parent's account to see their carpools" 
                : "Be the first to post a ride!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="requests" className="mt-6">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No ride requests available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="offers" className="mt-6">
        {offers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No ride offers available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default RidesList;
