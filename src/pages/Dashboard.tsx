import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  SkeletonQuickActionCard, 
  SkeletonRideCard, 
  SkeletonListItem 
} from "@/components/ui/skeleton-card";
import { OnboardingTour, useOnboardingTour } from "@/components/OnboardingTour";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  Send,
  Users,
  Link2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { isStudent as checkIsStudent } from "@/lib/permissions";
import StudentDashboard from "@/components/StudentDashboard";

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

interface PrivateRequest {
  id: string;
  request_type: 'request' | 'offer';
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  ride_date: string;
  pickup_time: string;
  message: string | null;
  created_at: string;
  sender?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
  recipient?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
}

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { showTour, completeTour } = useOnboardingTour();
  const [myBroadcastPosts, setMyBroadcastPosts] = useState<BroadcastRide[]>([]);
  const [nearbyBroadcasts, setNearbyBroadcasts] = useState<BroadcastRide[]>([]);
  const [activeConversations, setActiveConversations] = useState<Conversation[]>([]);
  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);
  const [pendingConversationsCount, setPendingConversationsCount] = useState(0);
  const [privateRequestsSent, setPrivateRequestsSent] = useState<PrivateRequest[]>([]);
  const [privateRequestsReceived, setPrivateRequestsReceived] = useState<PrivateRequest[]>([]);
  const [pendingPrivateRequestsCount, setPendingPrivateRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isUserStudent, setIsUserStudent] = useState(false);

  const shouldUseStudentDashboard = profile?.account_type === 'student' || isUserStudent;

  // Fetch user email to determine if student
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!user) return;

      // If profile already says student, avoid extra query.
      if (profile?.account_type === 'student') {
        setIsUserStudent(true);
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', user.id)
        .single();
      if (data?.email) {
        setUserEmail(data.email);
        setIsUserStudent(checkIsStudent(data.email));
      }
    };
    fetchUserEmail();
  }, [user, profile?.account_type]);

  useEffect(() => {
    if (!user) return;

    // Students use the student dashboard; skip parent dashboard data fetching.
    if (shouldUseStudentDashboard) {
      setLoading(false);
      return;
    }
    
    const fetchDashboardData = async () => {
      setLoading(true);

      // Fetch my broadcast posts
      const { data: myPosts } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', user.id)
        .eq('transaction_type', 'broadcast')
        .eq('status', 'active')
        .gte('ride_date', new Date().toISOString().split('T')[0])
        .order('ride_date', { ascending: true });
      
      if (myPosts) {
        // Fetch profiles for these posts
        const userIds = [...new Set(myPosts.map(p => p.user_id))];
        let profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username')
            .in('id', userIds);
          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }
        setMyBroadcastPosts(myPosts.map(post => ({
          ...post,
          profiles: profilesMap[post.user_id] || null
        })) as any);
      }

      // Fetch nearby broadcasts (from others)
      const { data: broadcasts } = await supabase
        .from('rides')
        .select('*')
        .eq('transaction_type', 'broadcast')
        .eq('status', 'active')
        .neq('user_id', user.id)
        .gte('ride_date', new Date().toISOString().split('T')[0])
        .order('ride_date', { ascending: true })
        .limit(3);
      
      if (broadcasts) {
        // Fetch profiles for these broadcasts
        const userIds = [...new Set(broadcasts.map(b => b.user_id))];
        let profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username')
            .in('id', userIds);
          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }
        setNearbyBroadcasts(broadcasts.map(b => ({
          ...b,
          profiles: profilesMap[b.user_id] || null
        })) as any);
      }

      // Fetch active conversations
      const { data: conversations } = await supabase
        .from('ride_conversations')
        .select('*, rides(type, ride_date, ride_time, pickup_location, dropoff_location)')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (conversations) {
        // Fetch profiles for senders and recipients
        const profileIds = [...new Set([
          ...conversations.map(c => c.sender_id),
          ...conversations.map(c => c.recipient_id)
        ])];
        let profilesMap: Record<string, any> = {};
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username')
            .in('id', profileIds);
          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }
        const enrichedConversations = conversations.map(c => ({
          ...c,
          sender_profile: profilesMap[c.sender_id] || null,
          recipient_profile: profilesMap[c.recipient_id] || null
        }));
        setActiveConversations(enrichedConversations as any);
        const pendingCount = enrichedConversations.filter(c => 
          c.status === 'pending' && c.recipient_id === user.id
        ).length;
        setPendingConversationsCount(pendingCount);
      }

      // Fetch upcoming confirmed rides
      const { data: upcoming } = await supabase
        .from('ride_conversations')
        .select('*, rides(type, ride_date, ride_time, pickup_location, dropoff_location)')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
        .limit(5);
      
      if (upcoming) {
        // Fetch profiles for senders and recipients
        const profileIds = [...new Set([
          ...upcoming.map(c => c.sender_id),
          ...upcoming.map(c => c.recipient_id)
        ])];
        let profilesMap: Record<string, any> = {};
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username')
            .in('id', profileIds);
          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }
        // Filter to only show future rides
        const futureRides = upcoming.filter(ride => {
          if (!ride.rides?.ride_date) return false;
          return new Date(ride.rides.ride_date) >= new Date(new Date().toISOString().split('T')[0]);
        }).map(r => ({
          ...r,
          sender_profile: profilesMap[r.sender_id] || null,
          recipient_profile: profilesMap[r.recipient_id] || null
        }));
        setUpcomingRides(futureRides);
      }

      // Fetch private requests sent
      const { data: sentPrivate } = await supabase
        .from('private_ride_requests')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (sentPrivate) {
        // Fetch recipient profiles
        const recipientIds = [...new Set(sentPrivate.map(r => r.recipient_id))];
        let recipientProfiles: Record<string, any> = {};
        if (recipientIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username')
            .in('id', recipientIds);
          if (profiles) {
            recipientProfiles = profiles.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }
        setPrivateRequestsSent(sentPrivate.map(r => ({
          ...r,
          recipient: recipientProfiles[r.recipient_id] || null
        })) as any);
      }

      // Fetch private requests received
      const { data: receivedPrivate } = await supabase
        .from('private_ride_requests')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (receivedPrivate) {
        // Fetch sender profiles
        const senderIds = [...new Set(receivedPrivate.map(r => r.sender_id))];
        let senderProfiles: Record<string, any> = {};
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username')
            .in('id', senderIds);
          if (profiles) {
            senderProfiles = profiles.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }
        const enrichedReceived = receivedPrivate.map(r => ({
          ...r,
          sender: senderProfiles[r.sender_id] || null
        }));
        setPrivateRequestsReceived(enrichedReceived as any);
        const pendingPrivateCount = enrichedReceived.filter(r => r.status === 'pending').length;
        setPendingPrivateRequestsCount(pendingPrivateCount);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [user, shouldUseStudentDashboard]);

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  // Both students and parents now see the same unified UI

  if (!user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header skeleton */}
          <div className="mb-8">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>

          {/* Quick Actions skeleton */}
          <div className="mb-8">
            <Skeleton className="h-8 w-40 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SkeletonQuickActionCard />
              <SkeletonQuickActionCard />
              <SkeletonQuickActionCard />
            </div>
          </div>

          {/* Broadcast Posts skeleton */}
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonRideCard />
              <SkeletonRideCard />
            </div>
          </div>

          {/* Private Requests skeleton */}
          <div>
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <SkeletonListItem />
                <SkeletonListItem />
              </div>
              <div className="space-y-3">
                <SkeletonListItem />
                <SkeletonListItem />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (shouldUseStudentDashboard) {
    return <StudentDashboard />;
  }

  return (
    <DashboardLayout>
      {showTour && <OnboardingTour onComplete={completeTour} />}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {profile.first_name}!</h1>
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
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {isUserStudent 
              ? 'View carpool information and browse available rides'
              : 'Manage your carpools and find ride partners'
            }
          </p>
        </div>

        {/* Student Alert */}
        {isUserStudent && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Student Account - View Only</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    You can browse all rides, but ask your parent to manage ride requests and offers.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/family-links')}
                    className="mt-2 gap-2"
                  >
                    <Link2 className="h-4 w-4" />
                    Link to Parent
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 1: Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Find Rides (Browse + Post) */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 active:scale-[0.98]" onClick={() => navigate('/find-rides')}>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 sm:p-3 rounded-full bg-primary/10">
                    <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">Find Rides</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Browse & post public</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 hidden sm:block">
                  Browse available rides or post your own for all parents to see
                </p>
                <Button className="w-full gap-2 h-10 sm:h-11">
                  <Radio className="h-4 w-4" />
                  View Rides
                </Button>
              </CardContent>
            </Card>

            {/* My Rides (All Management) */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 active:scale-[0.98]" onClick={() => navigate('/my-rides')}>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 sm:p-3 rounded-full bg-green-500/10">
                    <Car className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">My Rides</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">All your rides</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 hidden sm:block">
                  Manage your posted rides and private requests
                </p>
                <Button variant="outline" className="w-full gap-2 h-10 sm:h-11">
                  <Car className="h-4 w-4" />
                  View All
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 2: Your Broadcast Posts */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold">Your Broadcast Posts</h2>
            <Button variant="ghost" onClick={() => navigate('/my-rides')} className="gap-2 text-sm h-9">
              <span className="hidden sm:inline">View All</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonRideCard />
              <SkeletonRideCard />
            </div>
          ) : myBroadcastPosts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Broadcast Posts</h3>
                <p className="text-muted-foreground mb-4">
                  {isUserStudent 
                    ? 'Your linked parents will post rides here'
                    : 'Post your first ride to find carpool partners!'
                  }
                </p>
                {isUserStudent ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button disabled className="gap-2">
                          <Plus className="h-4 w-4" />
                          Post a Ride
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Only parents can post rides. Ask your parent for help.</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button onClick={() => navigate('/post-ride')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Post a Ride
                  </Button>
                )}
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

        {/* SECTION 4: Private Ride Requests */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Private Ride Requests</h2>
            <Button variant="ghost" onClick={() => navigate('/requests/private')} className="gap-2">
              View All
              {pendingPrivateRequestsCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {pendingPrivateRequestsCount}
                </Badge>
              )}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pending Requests for You */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending for You</CardTitle>
                <CardDescription>Requests awaiting your response</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
                ) : privateRequestsReceived.filter(r => r.status === 'pending').length === 0 ? (
                  <div className="text-center py-6">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {privateRequestsReceived
                      .filter(r => r.status === 'pending')
                      .slice(0, 3)
                      .map((request) => (
                        <div key={request.id} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(
                                  request.sender?.first_name || null,
                                  request.sender?.last_name || null,
                                  request.sender?.username || ''
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {request.sender?.first_name} {request.sender?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {request.request_type === 'request' ? '🙏 Ride Request' : '🚗 Ride Offer'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(request.ride_date), 'MMM d')} at {request.pickup_time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                      onClick={() => navigate('/requests/private')}
                    >
                      View All Pending
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Your Sent Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Sent Requests</CardTitle>
                <CardDescription>Requests you've sent to other parents</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
                ) : privateRequestsSent.length === 0 ? (
                  <div className="text-center py-6">
                    <Send className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-3">No requests sent yet</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/map/find-parents')}
                      className="gap-2"
                    >
                      <MapIcon className="h-4 w-4" />
                      Find Parents on Map
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {privateRequestsSent.slice(0, 3).map((request) => {
                      const statusColor = 
                        request.status === 'accepted' ? 'text-green-600' :
                        request.status === 'declined' ? 'text-red-600' :
                        'text-yellow-600';
                      
                      return (
                        <div key={request.id} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(
                                  request.recipient?.first_name || null,
                                  request.recipient?.last_name || null,
                                  request.recipient?.username || ''
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {request.recipient?.first_name} {request.recipient?.last_name}
                              </p>
                              <p className={`text-xs ${statusColor} font-medium capitalize`}>
                                {request.status === 'accepted' && '✓ '}
                                {request.status === 'declined' && '✗ '}
                                {request.status}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(request.ride_date), 'MMM d')} at {request.pickup_time}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                      onClick={() => navigate('/requests/private')}
                    >
                      View All Requests
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 5: Active Conversations */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Your Ride Connections</h2>
            <Button variant="ghost" onClick={() => navigate('/conversations')} className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading connections...
              </CardContent>
            </Card>
          ) : activeConversations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Ride Connections</h3>
                <p className="text-muted-foreground mb-4">
                  Join a ride or fulfill a request to connect with other parents
                </p>
                <Button variant="outline" onClick={() => navigate('/find-rides')} className="gap-2">
                  <Radio className="h-4 w-4" />
                  Browse Rides
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeConversations.map((conv) => {
                const isRecipient = conv.recipient_id === user.id;
                const otherParty = isRecipient ? conv.sender_profile : conv.recipient_profile;

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
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
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
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 6: Upcoming Rides */}
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
