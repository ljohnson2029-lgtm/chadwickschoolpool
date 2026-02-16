import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingTour, useOnboardingTour } from "@/components/OnboardingTour";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Radio, 
  Map as MapIcon, 
  MessageSquare, 
  Calendar, 
  ArrowRight,
  Hand,
  Car,
  CheckCircle2,
  Clock,
  Users,
  Link2,
  GraduationCap,
  MapPin,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { isStudent as checkIsStudent } from "@/lib/permissions";
import StudentDashboard from "@/components/StudentDashboard";
import { TopConnections } from "@/components/TopConnections";

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

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  school: string;
  age: number;
  grade_level: string | null;
}

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { showTour, completeTour } = useOnboardingTour();
  const [myBroadcastPosts, setMyBroadcastPosts] = useState<BroadcastRide[]>([]);
  const [nearbyBroadcasts, setNearbyBroadcasts] = useState<BroadcastRide[]>([]);
  const [activeConversations, setActiveConversations] = useState<Conversation[]>([]);
  const [pendingConversationsCount, setPendingConversationsCount] = useState(0);
  const [privateRequestsReceived, setPrivateRequestsReceived] = useState<PrivateRequest[]>([]);
  const [pendingPrivateRequestsCount, setPendingPrivateRequestsCount] = useState(0);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isUserStudent, setIsUserStudent] = useState(false);

  const shouldUseStudentDashboard = profile?.account_type === 'student' || isUserStudent;

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!user) return;
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
        const userIds = [...new Set(myPosts.map(p => p.user_id))];
        let profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username')
            .in('id', userIds);
          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, any>);
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
        .limit(5);
      
      if (broadcasts) {
        const userIds = [...new Set(broadcasts.map(b => b.user_id))];
        let profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username')
            .in('id', userIds);
          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, any>);
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
        .limit(3);
      
      if (conversations) {
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
            profilesMap = profiles.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, any>);
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

      // Fetch private requests received
      const { data: receivedPrivate } = await supabase
        .from('private_ride_requests')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (receivedPrivate) {
        const senderIds = [...new Set(receivedPrivate.map(r => r.sender_id))];
        let senderProfiles: Record<string, any> = {};
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username')
            .in('id', senderIds);
          if (profiles) {
            senderProfiles = profiles.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, any>);
          }
        }
        const enrichedReceived = receivedPrivate.map(r => ({
          ...r,
          sender: senderProfiles[r.sender_id] || null
        }));
        setPrivateRequestsReceived(enrichedReceived as any);
        setPendingPrivateRequestsCount(enrichedReceived.filter(r => r.status === 'pending').length);
      }

      // Fetch children
      const { data: childrenData } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('first_name', { ascending: true });
      
      if (childrenData) setChildren(childrenData as Child[]);

      setLoading(false);
    };

    fetchDashboardData();
  }, [user, shouldUseStudentDashboard]);

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    return username.substring(0, 2).toUpperCase();
  };

  const getName = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return username;
  };

  if (!user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (shouldUseStudentDashboard) {
    return <StudentDashboard />;
  }

  const totalActiveRides = myBroadcastPosts.length;
  const totalPending = pendingPrivateRequestsCount + pendingConversationsCount;

  return (
    <DashboardLayout>
      {showTour && <OnboardingTour onComplete={completeTour} />}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">

        {/* ── HERO HEADER ── */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {getInitials(profile.first_name, profile.last_name, profile.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Welcome back, {profile.first_name || profile.username}!
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage your carpools and connect with Chadwick families
              </p>
            </div>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 sm:mb-8">
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                <Car className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalActiveRides}</p>
                <p className="text-xs text-muted-foreground">Active Rides</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalPending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeConversations.length}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{children.length}</p>
                <p className="text-xs text-muted-foreground">Children</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
          <Card
            className="rounded-lg shadow-sm border-2 border-transparent hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
            onClick={() => navigate('/post-ride?type=offer')}
          >
            <CardContent className="p-5 sm:p-6">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-3">
                <Car className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Offer a Ride</h3>
              <p className="text-xs text-muted-foreground">Share your commute with another family</p>
            </CardContent>
          </Card>

          <Card
            className="rounded-lg shadow-sm border-2 border-transparent hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
            onClick={() => navigate('/post-ride?type=request')}
          >
            <CardContent className="p-5 sm:p-6">
              <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center mb-3">
                <Hand className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Request a Ride</h3>
              <p className="text-xs text-muted-foreground">Ask for help getting your kids to school</p>
            </CardContent>
          </Card>

          <Card
            className="rounded-lg shadow-sm border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
            onClick={() => navigate('/find-rides')}
          >
            <CardContent className="p-5 sm:p-6">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-3">
                <MapIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">View Map</h3>
              <p className="text-xs text-muted-foreground">Browse rides and parents near you</p>
            </CardContent>
          </Card>
        </div>

        {/* ── MAIN GRID (2 columns on desktop) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── MY RIDES ── */}
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">My Rides</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/my-rides')} className="gap-1 text-xs h-8">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1,2].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
                </div>
              ) : myBroadcastPosts.length === 0 ? (
                <div className="text-center py-8">
                  <Radio className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground mb-3">No active rides</p>
                  <Button size="sm" onClick={() => navigate('/post-ride')} className="gap-1.5">
                    Post a Ride
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {myBroadcastPosts.slice(0, 5).map((ride) => (
                    <div
                      key={ride.id}
                      className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/my-rides')}
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className={`flex-shrink-0 gap-1 ${
                          ride.type === 'offer'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {ride.type === 'offer' ? <Car className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
                          {ride.type === 'offer' ? 'Offer' : 'Request'}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ride.pickup_location}</p>
                          <p className="text-xs text-muted-foreground truncate">to {ride.dropoff_location}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(ride.ride_date), 'MMM d')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ride.ride_time}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {ride.type === 'offer' ? ride.seats_available : ride.seats_needed}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── NEARBY RIDES ── */}
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Nearby Rides</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/find-rides')} className="gap-1 text-xs h-8">
                  See All <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : nearbyBroadcasts.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground mb-3">No rides available nearby</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/find-rides')} className="gap-1.5">
                    <MapIcon className="h-3.5 w-3.5" /> Open Map
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {nearbyBroadcasts.map((ride) => (
                    <div
                      key={ride.id}
                      className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/find-rides')}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(ride.profiles?.first_name || null, ride.profiles?.last_name || null, ride.profiles?.username || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium truncate">
                              {getName(ride.profiles?.first_name || null, ride.profiles?.last_name || null, ride.profiles?.username || '')}
                            </p>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-0.5 ${
                              ride.type === 'offer'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                            }`}>
                              {ride.type === 'offer' ? 'Offer' : 'Request'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {ride.pickup_location} → {ride.dropoff_location}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(ride.ride_date), 'MMM d')}</span>
                            <span>{ride.ride_time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── RECENT MESSAGES ── */}
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold">Recent Messages</CardTitle>
                  {pendingConversationsCount > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-xs h-5 min-w-5 px-1.5">
                      {pendingConversationsCount}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/conversations')} className="gap-1 text-xs h-8">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : activeConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeConversations.slice(0, 3).map((conv) => {
                    const isRecipient = conv.recipient_id === user.id;
                    const otherParty = isRecipient ? conv.sender_profile : conv.recipient_profile;
                    const isUnread = conv.status === 'pending' && isRecipient;

                    return (
                      <div
                        key={conv.id}
                        className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                          isUnread ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-accent/50'
                        }`}
                        onClick={() => navigate('/conversations')}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {getInitials(otherParty?.first_name || null, otherParty?.last_name || null, otherParty?.username || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                                {getName(otherParty?.first_name || null, otherParty?.last_name || null, otherParty?.username || '')}
                              </p>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                conv.status === 'accepted'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {conv.status === 'accepted' ? 'Connected' : 'Pending'}
                              </Badge>
                            </div>
                            {conv.rides && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {conv.rides.pickup_location} → {conv.rides.dropoff_location}
                              </p>
                            )}
                          </div>
                          {isUnread && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── MY FAMILY (children) ── */}
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">My Family</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="gap-1 text-xs h-8">
                  Manage <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1,2].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : children.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground mb-3">No children added yet</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/profile')} className="gap-1.5">
                    <User className="h-3.5 w-3.5" /> Add Child
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {children.map((child) => (
                    <div key={child.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-secondary/20 text-secondary text-xs font-semibold">
                            {child.first_name?.[0]?.toUpperCase() || child.name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {child.first_name && child.last_name 
                              ? `${child.first_name} ${child.last_name}` 
                              : child.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {child.grade_level && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                {child.grade_level}
                              </span>
                            )}
                            <span>{child.school}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* ── TOP CONNECTIONS ── */}
        <div className="mt-6">
          <TopConnections limit={5} variant="dashboard" />
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
