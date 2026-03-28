import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

import { Car, Hand, Map as MapIcon, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isStudent as checkIsStudent } from "@/lib/permissions";
import StudentDashboard from "@/components/StudentDashboard";
import { WeekCalendar } from "@/components/student/WeekCalendar";
import type { FamilyRide } from "@/hooks/useLinkedParentRides";
import { addDays, startOfWeek, format, getDay } from "date-fns";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [isUserStudent, setIsUserStudent] = useState(false);
  const [myRides, setMyRides] = useState<any[]>([]);
  const [recurringScheduleRides, setRecurringScheduleRides] = useState<FamilyRide[]>([]);
  const [loading, setLoading] = useState(true);

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
        setIsUserStudent(checkIsStudent(data.email));
      }
    };
    fetchUserEmail();
  }, [user, profile?.account_type]);

  // Fetch rides for schedule
  useEffect(() => {
    if (!user || shouldUseStudentDashboard) {
      setLoading(false);
      return;
    }
    const fetchRides = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch user's rides that have accepted conversations (confirmed rides only)
      const { data: confirmedConvos } = await supabase
        .from('ride_conversations')
        .select('ride_id')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const confirmedRideIds = confirmedConvos?.map(c => c.ride_id) || [];

      // Also fetch user's own rides that are confirmed
      const { data: ownRides } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('is_fulfilled', true)
        .gte('ride_date', today)
        .order('ride_date', { ascending: true });

      // Fetch rides user joined via conversations
      let joinedRides: any[] = [];
      if (confirmedRideIds.length > 0) {
        const { data } = await supabase
          .from('rides')
          .select('*')
          .in('id', confirmedRideIds)
          .eq('status', 'active')
          .gte('ride_date', today)
          .order('ride_date', { ascending: true });
        joinedRides = data || [];
      }

      // Merge and deduplicate
      const allRides = [...(ownRides || []), ...joinedRides];
      const uniqueRides = Array.from(new Map(allRides.map(r => [r.id, r])).values());
      setMyRides(uniqueRides);
      setLoading(false);
    };
    fetchRides();
  }, [user, shouldUseStudentDashboard]);

  // Fetch recurring schedules for dashboard calendar
  useEffect(() => {
    if (!user || shouldUseStudentDashboard) return;
    const fetchRecurring = async () => {
      const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

      // Get accepted recurring schedules
      const { data: spaces } = await supabase
        .from("series_spaces")
        .select("id, parent_a_id, parent_b_id")
        .or(`parent_a_id.eq.${user.id},parent_b_id.eq.${user.id}`);

      if (!spaces || spaces.length === 0) return;

      const spaceIds = spaces.map(s => s.id);
      const { data: schedules } = await supabase
        .from("recurring_schedules")
        .select("*")
        .in("space_id", spaceIds)
        .eq("status", "accepted");

      if (!schedules || schedules.length === 0) return;

      // Get cancellations
      const scheduleIds = schedules.map((s: any) => s.id);
      const { data: cancellations } = await supabase
        .from("schedule_cancellations")
        .select("schedule_id, cancelled_date, cancelled_day")
        .in("schedule_id", scheduleIds);

      const cancelledSet = new Set(
        (cancellations || []).map(c => `${c.schedule_id}-${c.cancelled_date}`)
      );

      // Get driver names
      const driverIds = new Set<string>();
      for (const sched of schedules) {
        const assignments = (sched as any).day_assignments || [];
        for (const a of assignments) {
          driverIds.add(a.driver_id);
        }
      }
      const { data: driverProfiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", Array.from(driverIds));
      const driverNameMap: Record<string, string> = {};
      for (const p of (driverProfiles || [])) {
        driverNameMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ");
      }

      // Generate occurrences for next 4 weeks
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const generated: FamilyRide[] = [];

      for (const sched of schedules) {
        const assignments = ((sched as any).day_assignments || []) as { day: string; driver_id: string }[];

        for (let w = 0; w < 4; w++) {
          for (const { day, driver_id } of assignments) {
            const dayIdx = DAY_INDEX[day];
            if (dayIdx === undefined) continue;
            const date = addDays(addDays(weekStart, w * 7), (dayIdx + 6) % 7);
            const dateStr = format(date, "yyyy-MM-dd");
            if (date < today && dateStr !== format(today, "yyyy-MM-dd")) continue;

            const isCancelled = cancelledSet.has(`${(sched as any).id}-${dateStr}`);

            // Pick the correct time
            const isWed = day === "Wed";
            let rideTime: string = "";
            if (driver_id === (sched as any).proposer_id) {
              rideTime = (isWed ? (sched as any).proposer_wednesday_time : (sched as any).proposer_regular_time) || "";
            } else {
              rideTime = (isWed ? (sched as any).recipient_wednesday_time : (sched as any).recipient_regular_time) || "";
            }

            const driverName = driverNameMap[driver_id] || "Driver";

            generated.push({
              id: `schedule-${(sched as any).id}-${dateStr}-${day}`,
              type: "offer",
              ride_date: dateStr,
              ride_time: rideTime,
              pickup_location: "Carpool pickup",
              dropoff_location: "Chadwick School",
              pickup_latitude: null,
              pickup_longitude: null,
              dropoff_latitude: null,
              dropoff_longitude: null,
              seats_available: null,
              seats_needed: null,
              status: isCancelled ? "cancelled" : "active",
              user_id: driver_id,
              parent_id: user.id,
              parent_name: `${driverName} driving`,
              parent_email: "",
              connected_parent_name: null,
            });
          }
        }
      }
      setRecurringScheduleRides(generated);
    };
    fetchRecurring();
  }, [user, shouldUseStudentDashboard, profile]);

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    return username.substring(0, 2).toUpperCase();
  };

  if (!user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
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

        {/* ── QUICK ACTIONS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            onClick={() => navigate('/family-carpools')}
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

        {/* ── MY SCHEDULE (Week Calendar) ── */}
        <Card className="rounded-lg shadow-sm mt-6 sm:mt-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                My Schedule
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-rides')} className="gap-1 text-xs h-8">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <WeekCalendar
              rides={[
                ...myRides.map((ride): FamilyRide => ({
                  id: ride.id,
                  type: ride.type,
                  ride_date: ride.ride_date,
                  ride_time: ride.ride_time,
                  pickup_location: ride.pickup_location,
                  dropoff_location: ride.dropoff_location,
                  pickup_latitude: null,
                  pickup_longitude: null,
                  dropoff_latitude: null,
                  dropoff_longitude: null,
                  seats_available: ride.seats_available ?? null,
                  seats_needed: ride.seats_needed ?? null,
                  status: 'active',
                  user_id: user.id,
                  parent_id: user.id,
                  parent_name: profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile.username,
                  parent_email: '',
                  connected_parent_name: null,
                })),
                ...recurringScheduleRides,
              ]}
              loading={loading}
            />
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
