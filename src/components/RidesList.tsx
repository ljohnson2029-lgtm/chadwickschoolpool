import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Calendar, Clock, Users, User, Map, Radio, Car, Hand, CheckCircle, Loader2, X } from "lucide-react";
import RideUserBadge from "./RideUserBadge";
import { InstantJoinRideDialog, InstantOfferRideDialog } from "./ConfirmDialogs";
import { useToast } from "@/hooks/use-toast";
import { isParent as checkIsParent, isStudent as checkIsStudent } from "@/lib/permissions";

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
  transaction_type?: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    username: string;
    grade_level: string | null;
  } | null;
}

interface RideResponse {
  ride_id: string;
  status: string;
}

interface OwnerContact {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

interface RidesListProps {
  onViewOnMap?: (ride: Ride) => void;
}

const RidesList = ({ onViewOnMap }: RidesListProps = {}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isUserParent, setIsUserParent] = useState(false);
  const [isUserStudent, setIsUserStudent] = useState(false);
  
  // Response tracking
  const [userResponses, setUserResponses] = useState<RideResponse[]>([]);
  const [respondingToRide, setRespondingToRide] = useState<Ride | null>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rideOwnerContact, setRideOwnerContact] = useState<OwnerContact | null>(null);
  const [showSuccessInfo, setShowSuccessInfo] = useState(false);

  // Fetch user role and email
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserRole(roleData?.role || null);
      
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', user.id)
        .single();
      
      if (userData?.email) {
        setUserEmail(userData.email);
        setIsUserParent(checkIsParent(userData.email));
        setIsUserStudent(checkIsStudent(userData.email));
      }
    };

    fetchUserInfo();
  }, [user]);

  // Fetch user's existing responses
  const fetchUserResponses = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('ride_conversations')
      .select('ride_id, status')
      .eq('sender_id', user.id);
    
    if (!error && data) {
      setUserResponses(data);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserResponses();
    }
  }, [user, fetchUserResponses]);

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
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from("rides")
        .select("*")
        .eq("status", "active")
        .gte("ride_date", today);

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
            .select("first_name, last_name, username, grade_level")
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

  // Get display name with proper fallbacks
  const getDisplayName = (ride: Ride): string => {
    if (ride.profiles?.first_name && ride.profiles?.last_name) {
      return `${ride.profiles.first_name} ${ride.profiles.last_name}`;
    }
    if (ride.profiles?.first_name) {
      return ride.profiles.first_name;
    }
    if (ride.profiles?.username && ride.profiles.username.trim()) {
      return ride.profiles.username;
    }
    return 'Parent';
  };

  // Get user's response status for a ride
  const getUserResponseStatus = (rideId: string): string | null => {
    const response = userResponses.find(r => r.ride_id === rideId);
    return response?.status || null;
  };

  // Initiate response flow
  const initiateRespondToRide = (ride: Ride) => {
    setRespondingToRide(ride);
    if (ride.type === 'offer') {
      setShowJoinDialog(true);
    } else {
      setShowOfferDialog(true);
    }
  };

  // Handle the actual response after confirmation
  const handleConfirmResponse = async () => {
    if (!user || !respondingToRide) return;
    setActionLoading(true);

    const ownerName = respondingToRide.profiles?.first_name 
      ? `${respondingToRide.profiles.first_name} ${respondingToRide.profiles.last_name || ''}`.trim()
      : respondingToRide.profiles?.username || 'the ride owner';

    try {
      // First, fetch the owner's contact info
      const { data: ownerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone_number, share_email, share_phone')
        .eq('id', respondingToRide.user_id)
        .single();

      const { data: ownerUser } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', respondingToRide.user_id)
        .single();

      // Create the conversation with ACCEPTED status immediately (no pending)
      const { error } = await supabase
        .from('ride_conversations')
        .insert({
          ride_id: respondingToRide.id,
          sender_id: user.id,
          recipient_id: respondingToRide.user_id,
          status: 'accepted',
          message: respondingToRide.type === 'request' 
            ? `I can help with your ride request!`
            : `I'd like to join your offered ride!`
        });

      if (error) {
        console.error('Error responding to ride:', error);
        toast({
          title: "Error",
          description: "Failed to send your request. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Send notification to ride owner about the connection
      try {
        await supabase.functions.invoke('create-notification', {
          body: {
            userId: respondingToRide.user_id,
            type: 'ride_connected',
            message: respondingToRide.type === 'request'
              ? `${profile?.first_name || 'Someone'} is helping with your ride on ${respondingToRide.ride_date}! Contact them to coordinate.`
              : `${profile?.first_name || 'Someone'} joined your ride on ${respondingToRide.ride_date}! Contact them to coordinate.`
          }
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      // Set contact info for success display
      setRideOwnerContact({
        firstName: ownerProfile?.first_name || ownerName,
        lastName: ownerProfile?.last_name || '',
        email: ownerProfile?.share_email !== false ? ownerUser?.email || null : null,
        phone: ownerProfile?.share_phone ? ownerProfile.phone_number : null,
      });
      setShowSuccessInfo(true);

      toast({
        title: "You're connected! 🎉",
        description: `Contact ${ownerName} to coordinate pickup details.`,
      });

      // Refresh user responses to update button state
      await fetchUserResponses();
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
      setShowJoinDialog(false);
      setShowOfferDialog(false);
      // Keep respondingToRide for success info display
    }
  };

  const RideCard = ({ ride }: { ride: Ride }) => {
    const isOwnRide = ride.user_id === user?.id;
    const responseStatus = getUserResponseStatus(ride.id);
    const hasPendingResponse = responseStatus === 'pending';
    const hasAcceptedResponse = responseStatus === 'accepted';
    const hasDeclinedResponse = responseStatus === 'declined';

    // Render action button based on state
    const renderActionButton = () => {
      if (isOwnRide) {
        return (
          <Button className="w-full gap-2" disabled variant="secondary" size="sm">
            <CheckCircle className="h-4 w-4" />
            Your ride
          </Button>
        );
      }

      if (!isUserParent) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="w-full gap-2" disabled variant="secondary" size="sm">
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
              <p>Only parents can manage rides</p>
            </TooltipContent>
          </Tooltip>
        );
      }

      if (hasPendingResponse) {
        return (
          <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" disabled size="sm">
            <CheckCircle className="h-4 w-4" />
            Connected!
          </Button>
        );
      }

      if (hasAcceptedResponse) {
        return (
          <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" disabled size="sm">
            <CheckCircle className="h-4 w-4" />
            {ride.type === 'request' ? 'Offer Accepted!' : 'Approved!'}
          </Button>
        );
      }

      if (hasDeclinedResponse) {
        return (
          <Button className="w-full gap-2" disabled variant="secondary" size="sm">
            <X className="h-4 w-4" />
            {ride.type === 'request' ? 'Offer Declined' : 'Declined'}
          </Button>
        );
      }

      // No existing response - show action button
      return (
        <Button 
          className="w-full gap-2"
          size="sm"
          onClick={() => initiateRespondToRide(ride)}
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
      );
    };

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Clickable user profile */}
              <RideUserBadge
                userId={ride.user_id}
                firstName={ride.profiles?.first_name || null}
                lastName={ride.profiles?.last_name || null}
                username={getDisplayName(ride)}
                gradeLevel={ride.profiles?.grade_level || null}
                accountType="parent"
                isCurrentUser={isOwnRide}
                viewerIsStudent={userRole === 'student'}
                variant="compact"
              />
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={ride.type === "offer" ? "default" : "secondary"}>
                  {ride.type === "offer" ? "Offering Ride" : "Requesting Ride"}
                </Badge>
                {ride.transaction_type === 'broadcast' && (
                  <Badge className="gap-1 bg-purple-600 dark:bg-purple-700">
                    <Radio className="h-3 w-3" />
                    Public
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

          {/* Action buttons */}
          <div className="pt-3 border-t space-y-2">
            {renderActionButton()}
            
            {onViewOnMap && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => onViewOnMap(ride)}
              >
                <Map className="h-4 w-4" />
                View on Map
              </Button>
            )}
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
    <>
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

      {/* Join Ride Confirmation Dialog */}
      <InstantJoinRideDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        onConfirm={handleConfirmResponse}
        ownerName={
          respondingToRide?.profiles?.first_name 
            ? `${respondingToRide.profiles.first_name} ${respondingToRide.profiles.last_name || ''}`.trim()
            : respondingToRide?.profiles?.username || 'the ride owner'
        }
        rideDate={respondingToRide?.ride_date || ''}
        rideTime={respondingToRide?.ride_time || ''}
        loading={actionLoading}
        showSuccess={showSuccessInfo}
        ownerContact={rideOwnerContact}
        onClose={() => {
          setShowSuccessInfo(false);
          setRideOwnerContact(null);
          setRespondingToRide(null);
        }}
      />

      {/* Offer Ride Confirmation Dialog */}
      <InstantOfferRideDialog
        open={showOfferDialog}
        onOpenChange={setShowOfferDialog}
        onConfirm={handleConfirmResponse}
        requesterName={
          respondingToRide?.profiles?.first_name 
            ? `${respondingToRide.profiles.first_name} ${respondingToRide.profiles.last_name || ''}`.trim()
            : respondingToRide?.profiles?.username || 'the requester'
        }
        rideDate={respondingToRide?.ride_date || ''}
        rideTime={respondingToRide?.ride_time || ''}
        loading={actionLoading}
        showSuccess={showSuccessInfo}
        requesterContact={rideOwnerContact}
        onClose={() => {
          setShowSuccessInfo(false);
          setRideOwnerContact(null);
          setRespondingToRide(null);
        }}
      />
    </>
  );
};

export default RidesList;
export type { Ride };
