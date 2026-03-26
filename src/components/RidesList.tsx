import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Clock, Users, Map, Radio, Car, Hand, CheckCircle, Loader2, X, GraduationCap, Trash2 } from "lucide-react";
import { InstantJoinRideDialog, InstantOfferRideDialog } from "./ConfirmDialogs";
import ParentProfilePopup from "./ParentProfilePopup";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { isParent as checkIsParent, isStudent as checkIsStudent } from "@/lib/permissions";
import { format } from "date-fns";

interface RideChild {
  first_name: string;
  last_name: string;
  grade_level: string | null;
}

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
  is_fulfilled?: boolean;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    username: string;
    grade_level: string | null;
    phone_number?: string | null;
    share_phone?: boolean | null;
    share_email?: boolean | null;
  } | null;
  userEmail?: string;
  children?: RideChild[];
}

interface RideResponse {
  ride_id: string;
  status: string;
}

interface RideConnection {
  ride_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string | null;
  sender_phone: string | null;
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
  const [rideConnections, setRideConnections] = useState<RideConnection[]>([]);
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

  // Fetch connections to user's own rides (where someone has joined/helped)
  const fetchRideConnections = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('ride_conversations')
      .select('ride_id, sender_id, status')
      .eq('recipient_id', user.id)
      .eq('status', 'accepted');
    
    if (!error && data && data.length > 0) {
      // Fetch sender profiles
      const senderIds = [...new Set(data.map(c => c.sender_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, phone_number, share_phone, share_email')
        .in('id', senderIds);
      
      const { data: users } = await supabase
        .from('users')
        .select('user_id, email')
        .in('user_id', senderIds);
      
      const connections: RideConnection[] = data.map(conv => {
        const profile = profiles?.find(p => p.id === conv.sender_id);
        const userEmail = users?.find(u => u.user_id === conv.sender_id)?.email;
        
        return {
          ride_id: conv.ride_id,
          sender_id: conv.sender_id,
          sender_name: profile?.first_name 
            ? `${profile.first_name} ${profile.last_name || ''}`.trim()
            : profile?.username || 'Someone',
          sender_email: profile?.share_email !== false ? userEmail || null : null,
          sender_phone: profile?.share_phone ? profile.phone_number : null,
          status: conv.status,
        };
      });
      
      setRideConnections(connections);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserResponses();
      fetchRideConnections();
    }
  }, [user, fetchUserResponses, fetchRideConnections]);

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
          setRides([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query
        .order("ride_date", { ascending: true })
        .order("ride_time", { ascending: true });

      if (error) throw error;

      const allRides = data || [];
      const userIds = [...new Set(allRides.map((r: any) => r.user_id))];

      // Fetch profiles, emails, and children in parallel
      let profilesMap: Record<string, any> = {};
      let emailsMap: Record<string, string> = {};
      let childrenMap: Record<string, RideChild[]> = {};

      if (userIds.length > 0) {
        const [profilesResult, usersResult, childrenResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, first_name, last_name, username, grade_level, phone_number, share_phone, share_email")
            .in("id", userIds),
          supabase.from("users").select("user_id, email").in("user_id", userIds),
          supabase.from("children").select("user_id, first_name, last_name, grade_level").in("user_id", userIds),
        ]);

        if (profilesResult.data) {
          profilesResult.data.forEach(p => { profilesMap[p.id] = p; });
        }
        if (usersResult.data) {
          usersResult.data.forEach(u => { emailsMap[u.user_id] = u.email; });
        }
        if (childrenResult.data) {
          childrenResult.data.forEach(c => {
            if (!childrenMap[c.user_id]) childrenMap[c.user_id] = [];
            childrenMap[c.user_id].push({ first_name: c.first_name, last_name: c.last_name, grade_level: c.grade_level });
          });
        }
      }

      const ridesWithProfiles = allRides.map((ride: any) => ({
        ...ride,
        profiles: profilesMap[ride.user_id] || null,
        userEmail: emailsMap[ride.user_id] || null,
        children: childrenMap[ride.user_id] || [],
      }));

      setRides(ridesWithProfiles as unknown as Ride[]);
    } catch (error) {
      console.error("Error fetching rides:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return timeStr;
    }
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

  // Get connection info for user's own ride
  const getRideConnection = (rideId: string): RideConnection | null => {
    return rideConnections.find(c => c.ride_id === rideId) || null;
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

      // For ride offers: create as PENDING (needs owner approval)
      // For ride requests: create as ACCEPTED immediately (instant help)
      const isOffer = respondingToRide.type === 'offer';
      const conversationStatus = isOffer ? 'pending' : 'accepted';

      const { error } = await supabase
        .from('ride_conversations')
        .insert({
          ride_id: respondingToRide.id,
          sender_id: user.id,
          recipient_id: respondingToRide.user_id,
          status: conversationStatus,
          message: isOffer
            ? `I'd like to join your offered ride!`
            : `I can help with your ride request!`
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

      // Send notification to ride owner
      const senderName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : 'Someone';
      const rideDate = respondingToRide.ride_date;
      const rideTime = respondingToRide.ride_time;

      try {
        await supabase.functions.invoke('create-notification', {
          body: {
            userId: respondingToRide.user_id,
            type: isOffer ? 'ride_join_request' : 'ride_accepted',
            message: isOffer
              ? `🙋 ${senderName} has requested to join your ride on ${rideDate} at ${rideTime}`
              : `${senderName} is helping with your ride on ${rideDate}! Contact them to coordinate.`
          }
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      if (isOffer) {
        // Pending flow - show request sent confirmation
        toast({
          title: "Request Sent! ✉️",
          description: `Your request to join ${ownerName}'s ride has been sent. You'll be notified when they respond.`,
        });
      } else {
        // Instant connection flow for ride requests
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
      }

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
    const connection = isOwnRide ? getRideConnection(ride.id) : null;
    const hasConnection = !!connection;
    const rideIsFull = ride.is_fulfilled === true && !isOwnRide && !hasAcceptedResponse;
    const [showProfilePopup, setShowProfilePopup] = useState(false);
    const [fetchedChildren, setFetchedChildren] = useState<RideChild[]>([]);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const badgeTooltipText = ride.type === 'request'
      ? 'This parent is requesting help from someone to fulfill this route'
      : 'This parent is offering to drive others this route';

    console.log('[RidesList] Rendering ride badge', {
      rideId: ride.id,
      rideType: ride.type,
      badgeLabel: ride.type === 'request' ? 'Ride Request' : 'Ride Offer',
      badgeTooltipText,
    });

    // Fetch children from children table via edge function if client-side data is empty (RLS)
    useEffect(() => {
      if (ride.children && ride.children.length > 0) {
        setFetchedChildren(ride.children);
        return;
      }
      const fetchChildren = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('get-parent-profile', {
            body: { parentId: ride.user_id },
          });
          if (!error && data?.profile?.linked_students) {
            setFetchedChildren(data.profile.linked_students.map((s: any) => ({
              first_name: s.first_name,
              last_name: s.last_name,
              grade_level: s.grade_level,
            })));
          }
        } catch (err) {
          console.error('Error fetching children:', err);
        }
      };
      fetchChildren();
    }, [ride.user_id, ride.children]);

    const seatsCount = ride.type === "offer" ? ride.seats_available : ride.seats_needed;

    // Render action button based on state
    const renderActionButton = () => {
      if (isOwnRide) {
        if (hasConnection) {
          return (
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" disabled size="sm">
              <CheckCircle className="h-4 w-4" />
              Confirmed!
            </Button>
          );
        }
        return (
          <Button className="w-full gap-2" disabled variant="secondary" size="sm">
            <CheckCircle className="h-4 w-4" />
            Your ride (waiting)
          </Button>
        );
      }

      if (rideIsFull) {
        return (
          <Button className="w-full gap-2" disabled variant="secondary" size="sm">
            <Users className="h-4 w-4" />
            Ride Full
          </Button>
        );
      }

      if (!isUserParent) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="w-full gap-2" disabled variant="secondary" size="sm">
                {ride.type === 'request' ? (
                  <><Car className="h-4 w-4" /> I Can Help!</>
                ) : (
                  <><Hand className="h-4 w-4" /> Request to Join</>
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
          <Button className="w-full gap-2 bg-amber-500 hover:bg-amber-600" disabled size="sm">
            <Clock className="h-4 w-4" />
            Request Pending
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

      return (
        <Button 
          className="w-full gap-2"
          size="sm"
          onClick={() => initiateRespondToRide(ride)}
        >
          {ride.type === 'request' ? (
            <><Car className="h-4 w-4" /> I Can Help!</>
          ) : (
            <><Hand className="h-4 w-4" /> Request to Join</>
          )}
        </Button>
      );
    };

    return (
      <Card className="hover:shadow-lg transition-shadow overflow-visible">
        <CardHeader className="pb-2 pt-4 px-4 overflow-visible">
          <div className="flex items-start justify-between gap-2 overflow-visible">
          <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold truncate">{getDisplayName(ride)}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs flex-shrink-0"
                  onClick={() => setShowProfilePopup(!showProfilePopup)}
                >
                  View
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Parent/Adult
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 overflow-visible">
              <div className="group relative inline-flex">
                <Badge
                  title={badgeTooltipText}
                  aria-label={badgeTooltipText}
                  className={ride.type === "request" ? "bg-destructive text-destructive-foreground cursor-help" : "bg-primary text-primary-foreground cursor-help"}
                >
                  {ride.type === "request" ? (
                    <><Hand className="h-3 w-3 mr-1" /> Ride Request</>
                  ) : (
                    <><Car className="h-3 w-3 mr-1" /> Ride Offer</>
                  )}
                </Badge>
                <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-64 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md group-hover:block">
                  {badgeTooltipText}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Popup */}
          {showProfilePopup && (
            <div className="mt-2">
              <ParentProfilePopup
                parentId={ride.user_id}
                distance={0}
                onClose={() => setShowProfilePopup(false)}
                onRequestRide={() => {}}
                onOfferRide={() => {}}
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-3 px-4 pb-4 pt-0">
          {/* Route */}
          <div className="text-sm space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Route</p>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Pickup</p>
              <p className="font-medium">{ride.pickup_location}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Dropoff</p>
              <p className="font-medium">{ride.dropoff_location}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(ride.ride_date + 'T00:00:00'), "EEEE, MMMM d, yyyy")}</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTime(ride.ride_time)}</span>
          </div>

          {/* Seats */}
          {seatsCount != null && (
            <div className="text-sm">
              <span className="font-medium">{ride.type === "request" ? "Seats Needed" : "Seats Available"}: {seatsCount}</span>
            </div>
          )}

          {/* Children */}
          {fetchedChildren.length > 0 && (
            <div className="border-t pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Children</p>
              {fetchedChildren.map((child, idx) => (
                <div key={idx} className="text-sm flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{child.first_name} {child.last_name}</span>
                  {child.grade_level && (
                    <span className="text-muted-foreground">• {child.grade_level}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Show connection info for user's own confirmed rides */}
          {isOwnRide && hasConnection && connection && (
            <div className="pt-3 border-t bg-green-50 dark:bg-green-950/30 -mx-4 px-4 pb-3 rounded-b-lg">
              <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                ✓ Connected with: {connection.sender_name}
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                {connection.sender_email && (
                  <a href={`mailto:${connection.sender_email}`} className="text-primary hover:underline flex items-center gap-1">
                    📧 {connection.sender_email}
                  </a>
                )}
                {connection.sender_phone && (
                  <a href={`tel:${connection.sender_phone}`} className="text-primary hover:underline flex items-center gap-1">
                    📞 {connection.sender_phone}
                  </a>
                )}
              </div>
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

            {isOwnRide && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Ride
              </Button>
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Ride</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this ride? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async (e) => {
                    e.preventDefault();
                    setDeleting(true);
                    try {
                      // Delete pending conversations for this ride
                      await supabase
                        .from('ride_conversations')
                        .update({ status: 'declined' })
                        .eq('ride_id', ride.id)
                        .eq('status', 'pending');

                      // Delete the ride
                      const { error } = await supabase
                        .from('rides')
                        .delete()
                        .eq('id', ride.id)
                        .eq('user_id', user!.id);

                      if (error) throw error;

                      // Remove from local state
                      setRides(prev => prev.filter(r => r.id !== ride.id));
                      toast({ title: "Ride deleted", description: "Your ride has been removed." });
                      setShowDeleteDialog(false);
                    } catch (err: any) {
                      console.error('Error deleting ride:', err);
                      toast({ title: "Error", description: "Failed to delete ride. Please try again.", variant: "destructive" });
                    } finally {
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
