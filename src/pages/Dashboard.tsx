import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingTour, useOnboardingTour } from "@/components/OnboardingTour";
import { Car, Hand, Map as MapIcon, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isStudent as checkIsStudent } from "@/lib/permissions";
import StudentDashboard from "@/components/StudentDashboard";
import { WeekCalendar } from "@/components/student/WeekCalendar";
import type { FamilyRide } from "@/hooks/useLinkedParentRides";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { showTour, completeTour } = useOnboardingTour();
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
        setIsUserStudent(checkIsStudent(data.email));
      }
    };
    fetchUserEmail();
  }, [user, profile?.account_type]);

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

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
