import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Radio, 
  Map as MapIcon, 
  MessageSquare, 
  Calendar, 
  Plus,
  ArrowRight,
  Hand,
  Car,
  CheckCircle2,
  Clock,
  Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface BroadcastRide {
  id: string;
  type: 'request' | 'offer';
  pickup_location: string;
  dropoff_location: string;
  ride_date: string;
  ride_time: string;
  seats_needed?: number;
  seats_available?: number;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  } | null;
}

interface Conversation {
  id: string;
  status: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  message: string | null;
  rides: {
    type: string;
    ride_date: string;
    ride_time: string;
    pickup_location: string;
    dropoff_location: string;
  } | null;
  sender_profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  } | null;
  recipient_profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  } | null;
}

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [myBroadcastPosts, setMyBroadcastPosts] = useState<BroadcastRide[]>([]);
  const [nearbyBroadcasts, setNearbyBroadcasts] = useState<BroadcastRide[]>([]);
  const [activeConversations, setActiveConversations] = useState<Conversation[]>([]);
  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);
  const [pendingConversationsCount, setPendingConversationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      setLoading(true);

      // Fetch my broadcast posts
      const { data: myPosts } = await supabase
        .from('rides')
        .select('*, profiles!rides_user_id_fkey(first_name, last_name, username)')
        .eq('user_id', user.id)
        .eq('transaction_type', 'broadcast')
        .eq('status', 'active')
        .gte('ride_date', new Date().toISOString().split('T')[0])
        .order('ride_date', { ascending: true });
      
      if (myPosts) setMyBroadcastPosts(myPosts as any);

      // Fetch nearby broadcasts (from others)
      const { data: broadcasts } = await supabase
        .from('rides')
        .select('*, profiles!rides_user_id_fkey(first_name, last_name, username)')
        .eq('transaction_type', 'broadcast')
        .eq('status', 'active')
        .neq('user_id', user.id)
        .gte('ride_date', new Date().toISOString().split('T')[0])
        .order('ride_date', { ascending: true })
        .limit(3);
      
      if (broadcasts) setNearbyBroadcasts(broadcasts as any);

      // Fetch active conversations
      const { data: conversations } = await supabase
        .from('ride_conversations')
        .select(`
          *,
          rides!ride_conversations_ride_id_fkey(type, ride_date, ride_time, pickup_location, dropoff_location),
          sender_profile:profiles!ride_conversations_sender_id_fkey(first_name, last_name, username),
          recipient_profile:profiles!ride_conversations_recipient_id_fkey(first_name, last_name, username)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (conversations) {
        setActiveConversations(conversations as any);
        const pendingCount = conversations.filter(c => 
          c.status === 'pending' && c.recipient_id === user.id
        ).length;
        setPendingConversationsCount(pendingCount);
      }

      // Fetch upcoming confirmed rides
      const { data: upcoming } = await supabase
        .from('ride_conversations')
        .select(`
          *,
          rides!ride_conversations_ride_id_fkey(type, ride_date, ride_time, pickup_location, dropoff_location),
          sender_profile:profiles!ride_conversations_sender_id_fkey(first_name, last_name, username),
          recipient_profile:profiles!ride_conversations_recipient_id_fkey(first_name, last_name, username)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
        .limit(5);
      
      if (upcoming) {
        // Filter to only show future rides
        const futureRides = upcoming.filter(ride => {
          if (!ride.rides?.ride_date) return false;
          return new Date(ride.rides.ride_date) >= new Date(new Date().toISOString().split('T')[0]);
        });
        setUpcomingRides(futureRides);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  if (!user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {profile.first_name}!</h1>
          <p className="text-muted-foreground">Manage your carpools and find ride partners</p>
        </div>

        {/* SECTION 1: Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Post a Ride (Broadcast) */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2" onClick={() => navigate('/post-ride')}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Radio className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Post a Ride</CardTitle>
                    <CardDescription>Post to everyone</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Share your ride request or offer publicly for all parents to see
                </p>
                <Button className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Create Post
                </Button>
              </CardContent>
            </Card>

            {/* Find on Map (Direct) */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2" onClick={() => navigate('/map')}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <MapIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Find on Map</CardTitle>
                    <CardDescription>Individual requests</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Send private ride requests to specific parents near your route
                </p>
                <Button variant="outline" className="w-full gap-2">
                  <MapIcon className="h-4 w-4" />
                  Open Map
                </Button>
              </CardContent>
            </Card>

            {/* My Conversations (Direct Negotiations) */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 relative" onClick={() => navigate('/conversations')}>
              {pendingConversationsCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full">
                  {pendingConversationsCount}
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">My Conversations</CardTitle>
                    <CardDescription>Direct negotiations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View and manage your private ride conversations
                </p>
                <Button variant="outline" className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  View Conversations
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 2: Your Broadcast Posts */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Your Broadcast Posts</h2>
            <Button variant="ghost" onClick={() => navigate('/my-rides')} className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading your posts...
              </CardContent>
            </Card>
          ) : myBroadcastPosts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Broadcast Posts</h3>
                <p className="text-muted-foreground mb-4">
                  Post your first ride to find carpool partners!
                </p>
                <Button onClick={() => navigate('/post-ride')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Post a Ride
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myBroadcastPosts.slice(0, 4).map((ride) => (
                <Card key={ride.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge className="gap-1">
                        {ride.type === 'request' ? (
                          <>
                            <Hand className="h-3 w-3" />
                            Request
                          </>
                        ) : (
                          <>
                            <Car className="h-3 w-3" />
                            Offer
                          </>
                        )}
                      </Badge>
                      <Badge variant="secondary">
                        <Radio className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <p className="font-medium">{ride.pickup_location}</p>
                      <p className="text-muted-foreground">to {ride.dropoff_location}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{format(new Date(ride.ride_date), 'MMM d')}</span>
                      <span>{ride.ride_time}</span>
                      <span>
                        {ride.type === 'request' 
                          ? `${ride.seats_needed} seats needed`
                          : `${ride.seats_available} seats available`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: Available Rides Near You */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Available Rides Near You</h2>
            <Button variant="ghost" onClick={() => navigate('/find-rides')} className="gap-2">
              See All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading nearby rides...
              </CardContent>
            </Card>
          ) : nearbyBroadcasts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Available Rides</h3>
                <p className="text-muted-foreground mb-4">
                  Check back later or try the map to send direct requests
                </p>
                <Button variant="outline" onClick={() => navigate('/map')} className="gap-2">
                  <MapIcon className="h-4 w-4" />
                  Open Map
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {nearbyBroadcasts.map((ride) => (
                <Card key={ride.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/find-rides')}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(ride.profiles?.first_name || null, ride.profiles?.last_name || null, ride.profiles?.username || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{ride.profiles?.first_name} {ride.profiles?.last_name}</p>
                          <Badge variant="outline" className="gap-1">
                            {ride.type === 'request' ? (
                              <>
                                <Hand className="h-3 w-3" />
                                Request
                              </>
                            ) : (
                              <>
                                <Car className="h-3 w-3" />
                                Offer
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {ride.pickup_location} → {ride.dropoff_location}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <span>{format(new Date(ride.ride_date), 'MMM d')}</span>
                          <span>{ride.ride_time}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1">
                        View
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 4: Active Conversations */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Active Conversations</h2>
            <Button variant="ghost" onClick={() => navigate('/conversations')} className="gap-2">
              View All
              {pendingConversationsCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {pendingConversationsCount}
                </Badge>
              )}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading conversations...
              </CardContent>
            </Card>
          ) : activeConversations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Conversations</h3>
                <p className="text-muted-foreground mb-4">
                  Send a direct request from the map to start a conversation
                </p>
                <Button variant="outline" onClick={() => navigate('/map')} className="gap-2">
                  <MapIcon className="h-4 w-4" />
                  Find Parents on Map
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeConversations.map((conv) => {
                const isRecipient = conv.recipient_id === user.id;
                const otherParty = isRecipient ? conv.sender_profile : conv.recipient_profile;
                const statusIcon = conv.status === 'accepted' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : conv.status === 'pending' ? (
                  <Clock className="h-4 w-4 text-yellow-600" />
                ) : (
                  <Send className="h-4 w-4 text-blue-600" />
                );

                return (
                  <Card key={conv.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/conversations')}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(otherParty?.first_name || null, otherParty?.last_name || null, otherParty?.username || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{otherParty?.first_name} {otherParty?.last_name}</p>
                            <div className="flex items-center gap-1">
                              {statusIcon}
                              <span className="text-xs text-muted-foreground capitalize">
                                {conv.status}
                              </span>
                            </div>
                          </div>
                          {conv.rides && (
                            <>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.rides.pickup_location} → {conv.rides.dropoff_location}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span>{format(new Date(conv.rides.ride_date), 'MMM d')}</span>
                                <span>{conv.rides.ride_time}</span>
                                <Badge variant="outline" className="text-xs">
                                  {conv.rides.type === 'request' ? 'Request' : 'Offer'}
                                </Badge>
                              </div>
                            </>
                          )}
                        </div>
                        {isRecipient && conv.status === 'pending' && (
                          <Badge variant="default">Action Required</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 5: Upcoming Rides */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Upcoming Rides</h2>
          </div>
          
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading upcoming rides...
              </CardContent>
            </Card>
          ) : upcomingRides.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Rides</h3>
                <p className="text-muted-foreground">
                  You don't have any confirmed rides yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingRides.map((ride) => {
                const isDriver = ride.sender_id === user.id && ride.rides?.type === 'offer';
                const otherParty = ride.sender_id === user.id ? ride.recipient_profile : ride.sender_profile;

                return (
                  <Card key={ride.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Confirmed
                        </Badge>
                        {isDriver && (
                          <Badge variant="outline">You're Driving</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(otherParty?.first_name || null, otherParty?.last_name || null, otherParty?.username || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{otherParty?.first_name} {otherParty?.last_name}</p>
                          <p className="text-xs text-muted-foreground">@{otherParty?.username}</p>
                        </div>
                      </div>
                      
                      {ride.rides && (
                        <>
                          <Separator />
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(ride.rides.ride_date), 'EEEE, MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {ride.rides.ride_time}
                            </div>
                          </div>
                          <Separator />
                          <div className="text-sm space-y-1">
                            <p className="font-medium">{ride.rides.pickup_location}</p>
                            <p className="text-muted-foreground">to {ride.rides.dropoff_location}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
